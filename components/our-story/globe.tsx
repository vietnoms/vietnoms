"use client";

// 1320×1320 native monochrome orthographic globe, rendered responsive.
// Real country outlines, country/state highlight, animated journeys,
// rotate + zoom-on-subject.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoInterpolate,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { LonLat, TimelineEvent } from "./timeline-events";

interface CountryProps {
  name?: string;
  [key: string]: unknown;
}
type CountryFeature = Feature<Geometry, CountryProps>;

// ── Topojson loaders (cached promises) ──────────────────────────────
let _worldPromise: Promise<{ countries: FeatureCollection<Geometry, CountryProps> }> | null = null;
function loadWorld() {
  if (_worldPromise) return _worldPromise;
  _worldPromise = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
    .then((r) => r.json())
    .then((topo: Topology) => ({
      countries: feature(
        topo,
        topo.objects.countries as GeometryCollection<CountryProps>
      ) as FeatureCollection<Geometry, CountryProps>,
    }));
  return _worldPromise;
}

let _statesPromise: Promise<{ states: FeatureCollection<Geometry, CountryProps> }> | null = null;
function loadUSStates() {
  if (_statesPromise) return _statesPromise;
  _statesPromise = fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/states-10m.json")
    .then((r) => r.json())
    .then((topo: Topology) => ({
      states: feature(
        topo,
        topo.objects.states as GeometryCollection<CountryProps>
      ) as FeatureCollection<Geometry, CountryProps>,
    }));
  return _statesPromise;
}

// ── Helpers ─────────────────────────────────────────────────────────
const ISO_BY_NAME: Record<string, string> = {
  Vietnam: "VNM",
  Thailand: "THA",
  "United States of America": "USA",
};
function isoOf(f: CountryFeature): string | null {
  const name = f.properties?.name;
  return (name && ISO_BY_NAME[name]) || null;
}

const interpolateGC = (a: LonLat, b: LonLat, t: number): LonLat =>
  geoInterpolate(a, b)(t) as LonLat;
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpAngle(a: number, b: number, t: number) {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
}

function wpsOf(j: { waypoints?: LonLat[] }): LonLat[] {
  if (j.waypoints && j.waypoints.length >= 2) return j.waypoints;
  return [];
}

function interpolatePath(wps: LonLat[], eased: number): LonLat {
  if (wps.length < 2) return wps[0] || [0, 0];
  const segs = wps.length - 1;
  const u = Math.max(0, Math.min(1, eased)) * segs;
  const i = Math.min(segs - 1, Math.floor(u));
  const t = u - i;
  return interpolateGC(wps[i], wps[i + 1], t);
}

function stitch(pts: Array<[number, number] | null>): string {
  const segs: Array<Array<[number, number]>> = [];
  let cur: Array<[number, number]> = [];
  for (const p of pts) {
    if (p) cur.push(p);
    else {
      if (cur.length) segs.push(cur);
      cur = [];
    }
  }
  if (cur.length) segs.push(cur);
  return segs
    .map((s) => "M" + s.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L"))
    .join(" ");
}

// ── Camera tuning (was driven by Tweaks panel; now hard-coded) ──────
export interface CameraTuning {
  travelZoom?: number;
  arrivalZoom?: number;
  dampMs?: number;
}

interface GlobeProps {
  size?: number;
  event: TimelineEvent;
  progress: number;
  playing: boolean;
  cameraTuning?: CameraTuning;
}

export function Globe({
  size = 1320,
  event,
  progress,
  playing,
  cameraTuning = {},
}: GlobeProps) {
  const [world, setWorld] = useState<{
    countries: FeatureCollection<Geometry, CountryProps>;
  } | null>(null);
  const [usStates, setUsStates] = useState<{
    states: FeatureCollection<Geometry, CountryProps>;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    loadWorld().then((w) => {
      if (alive) setWorld(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (event && event.showUSStates && !usStates) {
      let alive = true;
      loadUSStates().then((s) => {
        if (alive) setUsStates(s);
      });
      return () => {
        alive = false;
      };
    }
  }, [event, usStates]);

  // Continuous slow drift
  const [spin, setSpin] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  useEffect(() => {
    lastRef.current = performance.now();
    let alive = true;
    const tick = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (playing) setSpin((s) => (s + (dt / 1000) * 3) % 360);
      if (alive) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // Subject = currently-active vehicle's lon/lat (or focus / active marker)
  // Zoom curve: high at start (departure), low mid-journey (overview), high at end (arrival).
  const subject = useMemo(() => {
    const travelZoom = cameraTuning.travelZoom ?? 1.7;
    const closeZoom = cameraTuning.arrivalZoom ?? 4.0;

    if (event.cameraMode === "static" && event.centerOn) {
      return {
        lon: event.centerOn.lon,
        lat: event.centerOn.lat,
        zoom: event.centerOn.zoom || 1.6,
      };
    }

    const closeWeight = (t: number) => {
      const x = Math.max(0, Math.min(1, t));
      return (Math.cos(2 * Math.PI * x) + 1) / 2;
    };

    if (event.journeys) {
      for (const j of event.journeys) {
        const local = (progress - j.start) / ((j.end - j.start) || 0.001);
        if (local > 0 && local < 1) {
          const wps = wpsOf(j);
          const eased = easeInOut(Math.max(0, Math.min(1, local)));
          const here = interpolatePath(wps, eased);
          if (event.cameraMode === "arc") {
            const w = closeWeight(local);
            const zoom = lerp(travelZoom, closeZoom, w);
            return { lon: here[0], lat: here[1], zoom };
          }
          const startZoom = (event.centerOn && event.centerOn.zoom) || closeZoom * 0.6;
          const zoom = lerp(startZoom, closeZoom, eased);
          return { lon: here[0], lat: here[1], zoom };
        }
      }
    }
    if (event.markers) {
      for (const m of event.markers) {
        if ("lon" in m && progress >= (m.at ?? 0) && progress <= (m.until ?? 1)) {
          return { lon: m.lon, lat: m.lat, zoom: closeZoom };
        }
      }
    }
    if (event.centerOn) {
      return {
        lon: event.centerOn.lon,
        lat: event.centerOn.lat,
        zoom: event.centerOn.zoom || 1.6,
      };
    }
    return { lon: 0, lat: 20, zoom: 1 };
  }, [event, progress, cameraTuning.travelZoom, cameraTuning.arrivalZoom]);

  // Eased camera (rotation + zoom). Updates every frame to chase the subject.
  const camRef = useRef(
    (() => {
      if (event && event.centerOn) {
        return {
          lambda: -event.centerOn.lon,
          phi: -event.centerOn.lat,
          zoom: event.centerOn.zoom || 1.6,
        };
      }
      return { lambda: 0, phi: -20, zoom: 1.4 };
    })()
  );
  const [, force] = useState(0);
  const baseDamp = cameraTuning.dampMs ?? 380;
  const tightDamp = event && event.cameraMode === "arc";
  const dampMs = tightDamp ? Math.min(baseDamp, 160) : baseDamp;

  useEffect(() => {
    let alive = true;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.exp(-dt / dampMs);
      const targetLambda = -subject.lon + spin * 0.05;
      const targetPhi = -subject.lat;
      camRef.current.lambda = lerpAngle(camRef.current.lambda, targetLambda, k);
      camRef.current.phi = lerp(camRef.current.phi, targetPhi, k);
      camRef.current.zoom = lerp(camRef.current.zoom, subject.zoom, k * 0.7);
      force((n) => (n + 1) % 1e6);
      if (alive) requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, [subject.lon, subject.lat, subject.zoom, spin, dampMs]);

  const cam = camRef.current;
  const baseR = size / 2 - 8;

  const projection = useMemo(() => {
    return geoOrthographic()
      .scale(baseR * cam.zoom)
      .translate([size / 2, size / 2])
      .clipAngle(90)
      .rotate([cam.lambda, cam.phi, 0]);
  }, [size, baseR, cam.lambda, cam.phi, cam.zoom]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Highlight ramps in/out across its [at, until] window.
  const highlights = useMemo(() => {
    const m = new Map<string, { color: string; opacity: number }>();
    if (event && event.highlights) {
      for (const h of event.highlights) {
        const at = h.at ?? 0;
        const until = h.until ?? 1;
        if (progress < at || progress > until) continue;
        const span = Math.max(0.0001, until - at);
        const u = (progress - at) / span;
        let opacity = 1;
        if (h.fade === "in") opacity = Math.min(1, u * 2);
        else if (h.fade === "out") opacity = Math.max(0, 1 - u * 2);
        if (opacity > 0.01) {
          const key = h.iso ? "iso:" + h.iso : "state:" + h.stateName;
          m.set(key, { color: h.color || "var(--os-yellow)", opacity });
        }
      }
    }
    return m;
  }, [event, progress]);

  // Active markers (red dots etc.)
  const activeMarkers = useMemo(() => {
    if (!event || !event.markers) return [];
    type Active = { color: string; label?: string; opacity: number; xy: [number, number] };
    const out: Active[] = [];
    for (const m of event.markers) {
      if (!("lon" in m)) continue;
      const at = m.at ?? 0;
      const until = m.until ?? 1;
      if (progress < at || progress > until) continue;
      const span = Math.max(0.0001, until - at);
      const u = (progress - at) / span;
      const opacity = Math.min(1, u * 3);
      const xy = projection([m.lon, m.lat]);
      if (xy && isFinite(xy[0]) && isFinite(xy[1])) {
        out.push({ color: m.color, label: m.label, opacity, xy: xy as [number, number] });
      }
    }
    return out;
  }, [event, progress, projection]);

  // Static city dots (filled disc, no pulse, no label)
  const activeCityMarkers = useMemo(() => {
    if (!event || !event.cityMarkers) return [];
    const out: Array<{
      color: string;
      radius?: number;
      xy: [number, number];
    }> = [];
    for (const m of event.cityMarkers) {
      const at = m.at ?? 0;
      const until = m.until ?? 1;
      if (progress < at || progress > until) continue;
      const xy = projection([m.lon, m.lat]);
      if (!xy || !isFinite(xy[0]) || !isFinite(xy[1])) continue;
      out.push({ color: m.color, radius: m.radius, xy: xy as [number, number] });
    }
    return out;
  }, [event, progress, projection]);

  const vehicles = useMemo(() => {
    if (!event || !event.journeys) return [];
    return event.journeys.map((j, i) => {
      const wps = wpsOf(j);
      const span = (j.end - j.start) || 0.001;
      const local = (progress - j.start) / span;
      const t = Math.max(0, Math.min(1, local));
      const eased = easeInOut(t);
      const here = interpolatePath(wps, eased);
      const xy = projection(here);
      const fullPts: Array<[number, number] | null> = [];
      const perLeg = 60;
      for (let li = 0; li < wps.length - 1; li++) {
        for (let s = 0; s <= perLeg; s++) {
          const tt = s / perLeg;
          const ll = interpolateGC(wps[li], wps[li + 1], tt);
          const p = projection(ll);
          fullPts.push(p && isFinite(p[0]) && isFinite(p[1]) ? (p as [number, number]) : null);
        }
      }
      const trail = stitch(fullPts);
      const upTo: Array<[number, number]> = [];
      const totalSamples = 120;
      for (let s = 0; s <= totalSamples; s++) {
        const tt = (s / totalSamples) * eased;
        const ll = interpolatePath(wps, tt);
        const p = projection(ll);
        if (p && isFinite(p[0]) && isFinite(p[1])) upTo.push(p as [number, number]);
      }
      const trailNow = upTo.length
        ? "M" + upTo.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join("L")
        : "";
      let heading = 0;
      if (upTo.length >= 2) {
        const a = upTo[upTo.length - 2];
        const b = upTo[upTo.length - 1];
        heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      }
      const onFront = !!xy && isFinite(xy[0]) && isFinite(xy[1]);
      return {
        j,
        i,
        t,
        xy: xy as [number, number] | null,
        onFront,
        trail,
        trailNow,
        heading,
      };
    });
  }, [event, progress, projection]);

  if (!world) {
    return (
      <svg
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <circle cx={size / 2} cy={size / 2} r={baseR} fill="none" stroke="#1a1a1a" strokeOpacity="0.15" />
      </svg>
    );
  }

  const strokeBase = 2.6;
  const strokeHi = 4.2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="globeClip">
          <circle cx={size / 2} cy={size / 2} r={baseR} />
        </clipPath>
        <radialGradient id="globeShade" cx="40%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
        </radialGradient>
        <radialGradient id="globeFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ece7dc" />
        </radialGradient>
      </defs>

      <circle
        cx={size / 2}
        cy={size / 2}
        r={baseR}
        fill="url(#globeFill)"
        stroke="#1a1a1a"
        strokeOpacity="0.55"
        strokeWidth={strokeBase}
      />

      <g clipPath="url(#globeClip)">
        <path
          d={pathGen(geoGraticule10()) || ""}
          fill="none"
          stroke="#1a1a1a"
          strokeOpacity="0.08"
          strokeWidth={strokeBase * 0.7}
        />

        {world.countries.features.map((f, i) => {
          const d = pathGen(f as GeoPermissibleObjects);
          if (!d) return null;
          const iso = isoOf(f as CountryFeature);
          const hi = iso && highlights.get("iso:" + iso);
          return (
            <path
              key={i}
              d={d}
              fill={hi ? hi.color : "none"}
              fillOpacity={hi ? hi.opacity : 1}
              stroke="#1a1a1a"
              strokeOpacity={hi ? 0.95 : 0.6}
              strokeWidth={hi ? strokeHi : strokeBase}
            />
          );
        })}

        {event && event.showUSStates && usStates &&
          usStates.states.features.map((f, i) => {
            const d = pathGen(f as GeoPermissibleObjects);
            if (!d) return null;
            const name = (f as CountryFeature).properties?.name;
            const hi = name && highlights.get("state:" + name);
            return (
              <path
                key={"st" + i}
                d={d}
                fill={hi ? hi.color : "none"}
                fillOpacity={hi ? hi.opacity : 1}
                stroke="#1a1a1a"
                strokeOpacity={hi ? 0.95 : 0.45}
                strokeWidth={hi ? strokeHi * 0.85 : strokeBase * 0.65}
              />
            );
          })}

        {vehicles.map((v) => (
          <g key={v.i}>
            <path
              d={v.trail}
              fill="none"
              stroke="#1a1a1a"
              strokeOpacity="0.18"
              strokeWidth={strokeBase * 0.9}
              strokeDasharray="4 8"
            />
            <path
              d={v.trailNow}
              fill="none"
              stroke="#1a1a1a"
              strokeOpacity="0.95"
              strokeWidth={strokeBase * 1.6}
              strokeDasharray={v.j.kind === "plane" ? "10 8" : "6 5"}
              strokeLinecap="round"
            />
            {v.onFront && v.xy && v.t > 0 && v.t < 1 && (
              <g transform={`translate(${v.xy[0].toFixed(2)},${v.xy[1].toFixed(2)})`}>
                {v.j.kind === "boat" ? (
                  <BoatGlyph scale={cam.zoom} />
                ) : (
                  <PlaneGlyph rotate={v.heading} scale={cam.zoom} />
                )}
              </g>
            )}
          </g>
        ))}

        {activeCityMarkers.map((cm, i) => (
          <circle
            key={"cm" + i}
            cx={cm.xy[0]}
            cy={cm.xy[1]}
            r={cm.radius || 14}
            fill={cm.color}
            opacity="0.95"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="1.5"
          />
        ))}

        {activeMarkers.map((mk, i) => (
          <Marker
            key={"mk" + i}
            xy={mk.xy}
            color={mk.color}
            label={mk.label}
            opacity={mk.opacity}
            zoom={cam.zoom}
          />
        ))}

        <circle cx={size / 2} cy={size / 2} r={baseR} fill="url(#globeShade)" pointerEvents="none" />
      </g>

      <circle
        cx={size / 2}
        cy={size / 2}
        r={baseR}
        fill="none"
        stroke="#1a1a1a"
        strokeOpacity="0.7"
        strokeWidth={strokeBase}
      />
    </svg>
  );
}

function BoatGlyph({ scale = 1 }: { scale?: number }) {
  const s = 7 / Math.max(1, scale * 0.85);
  return (
    <g transform={`scale(${s})`}>
      <circle r="3.4" fill="#f4f1ea" stroke="#1a1a1a" strokeWidth="0.55" />
      <path d="M -2.2 0.4 L 2.2 0.4 L 1.4 1.6 L -1.4 1.6 Z" fill="#1a1a1a" />
      <path d="M 0 -2 L 1.6 0.2 L 0 0.2 Z" fill="#1a1a1a" />
      <line x1="0" y1="-2" x2="0" y2="0.4" stroke="#1a1a1a" strokeWidth="0.45" />
    </g>
  );
}

function Marker({
  xy,
  color = "var(--os-red)",
  label,
  opacity = 1,
  zoom = 1,
}: {
  xy: [number, number];
  color?: string;
  label?: string;
  opacity?: number;
  zoom?: number;
}) {
  const baseR = 10 / Math.max(1, zoom * 0.8);
  return (
    <g transform={`translate(${xy[0].toFixed(2)},${xy[1].toFixed(2)})`} style={{ opacity }}>
      <circle
        r={baseR * 2.4}
        fill="none"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth={1.4 / Math.max(1, zoom * 0.8)}
      >
        <animate
          attributeName="r"
          values={`${baseR};${baseR * 3.2};${baseR}`}
          dur="2.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-opacity"
          values="0.55;0;0.55"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r={baseR * 1.6} fill={color} fillOpacity="0.18" />
      <circle
        r={baseR * 0.7}
        fill={color}
        stroke="#1a1a1a"
        strokeWidth={0.6 / Math.max(1, zoom * 0.8)}
      />
      {label && (
        <g transform={`translate(${baseR * 1.2}, ${-baseR * 1.1})`}>
          <rect
            x="0"
            y={-7 / Math.max(1, zoom * 0.8)}
            width={(label.length * 5.4) / Math.max(1, zoom * 0.8)}
            height={11 / Math.max(1, zoom * 0.8)}
            fill="#f4f1ea"
            stroke="#1a1a1a"
            strokeOpacity="0.4"
            strokeWidth={0.4 / Math.max(1, zoom * 0.8)}
          />
          <text
            x={2 / Math.max(1, zoom * 0.8)}
            y={1.5 / Math.max(1, zoom * 0.8)}
            fontSize={7 / Math.max(1, zoom * 0.8)}
            fontFamily="'JetBrains Mono', monospace"
            fill="#1a1a1a"
            letterSpacing="0.5"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function PlaneGlyph({ rotate = 0, scale = 1 }: { rotate?: number; scale?: number }) {
  const s = 11 / Math.max(1, scale * 0.85);
  return (
    <g transform={`scale(${s}) rotate(${rotate.toFixed(1)})`}>
      <circle r="4.2" fill="#f4f1ea" stroke="#1a1a1a" strokeOpacity="0.35" strokeWidth="0.35" />
      <path
        d="
          M 3.0 0
          L 1.4 -0.45
          L 0.4 -0.5
          L 0.2 -2.6
          L -0.4 -2.85
          L -0.6 -0.55
          L -2.0 -0.55
          L -2.45 -1.45
          L -2.85 -1.45
          L -2.7 -0.35
          L -2.85 0
          L -2.7 0.35
          L -2.85 1.45
          L -2.45 1.45
          L -2.0 0.55
          L -0.6 0.55
          L -0.4 2.85
          L 0.2 2.6
          L 0.4 0.5
          L 1.4 0.45
          Z"
        fill="#1a1a1a"
        stroke="#1a1a1a"
        strokeWidth="0.15"
        strokeLinejoin="round"
      />
    </g>
  );
}

interface WhirlProps {
  size?: number;
  innerR?: number;
  playing?: boolean;
}

export function Whirl({ size = 1600, innerR = 700, playing = true }: WhirlProps) {
  const c = size / 2;
  const ring = (r: number, dash: string, dur: number, dir = 1, opacity = 0.5, w = 2.4) => (
    <g
      style={{
        transformOrigin: `${c}px ${c}px`,
        animation: `os-whirl-spin ${dur}s linear infinite ${dir > 0 ? "" : "reverse"}`,
        animationPlayState: playing ? "running" : "paused",
      }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="#1a1a1a"
        strokeOpacity={opacity}
        strokeWidth={w}
        strokeDasharray={dash}
      />
    </g>
  );
  const arc = (r: number, sweep: number, dur: number, dir = 1, opacity = 0.7, w = 3) => {
    const start = -90;
    const end = start + sweep;
    const sx = c + r * Math.cos((start * Math.PI) / 180);
    const sy = c + r * Math.sin((start * Math.PI) / 180);
    const ex = c + r * Math.cos((end * Math.PI) / 180);
    const ey = c + r * Math.sin((end * Math.PI) / 180);
    const large = sweep > 180 ? 1 : 0;
    const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
    return (
      <g
        style={{
          transformOrigin: `${c}px ${c}px`,
          animation: `os-whirl-spin ${dur}s linear infinite ${dir > 0 ? "" : "reverse"}`,
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        <path d={d} fill="none" stroke="#1a1a1a" strokeOpacity={opacity} strokeWidth={w} strokeLinecap="round" />
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="50%" stopColor="#1a1a1a" stopOpacity="0" />
          <stop offset="80%" stopColor="#1a1a1a" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={innerR + 120} fill="url(#halo)" />

      {ring(innerR + 30, "3 12", 60, 1, 0.45, 2)}
      {ring(innerR + 60, "6 18", 90, -1, 0.35, 2.6)}
      {ring(innerR + 95, "3 10", 72, 1, 0.28, 1.8)}
      {ring(innerR + 140, "10 28", 130, -1, 0.22, 3)}

      {arc(innerR + 42, 140, 36, -1, 0.85, 3.4)}
      {arc(innerR + 80, 70, 28, 1, 0.7, 3)}
      {arc(innerR + 120, 30, 20, 1, 0.6, 2.6)}
      {arc(innerR + 170, 18, 14, -1, 0.5, 2.2)}

      <g
        style={{
          transformOrigin: `${c}px ${c}px`,
          animation: `os-whirl-spin 180s linear infinite`,
          animationPlayState: playing ? "running" : "paused",
        }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const r1 = innerR + 195;
          const r2 = r1 + (i % 5 === 0 ? 16 : 8);
          const x1 = c + Math.cos(a) * r1;
          const y1 = c + Math.sin(a) * r1;
          const x2 = c + Math.cos(a) * r2;
          const y2 = c + Math.sin(a) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#1a1a1a"
              strokeOpacity={i % 5 === 0 ? 0.55 : 0.25}
              strokeWidth={2}
            />
          );
        })}
      </g>
    </svg>
  );
}
