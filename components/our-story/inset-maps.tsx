"use client";

// Hand-authored stylized inset maps that swap in for the orthographic globe
// when an event needs city-level detail (Chicago neighborhoods, San Jose).
// Both render at the same 1320×1320 viewBox the globe uses.

import { useMemo } from "react";
import type { TimelineEvent, InsetMarker } from "./timeline-events";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function activeWindow(progress: number, at = 0, until = 1) {
  return progress >= at && progress <= until;
}

function PulseMarker({
  x,
  y,
  color = "var(--os-red)",
  label,
  opacity = 1,
  sizeBase = 14,
}: {
  x: number;
  y: number;
  color?: string;
  label?: string;
  opacity?: number;
  sizeBase?: number;
}) {
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <circle r={sizeBase * 2.4} fill={color} opacity="0.16">
        <animate
          attributeName="r"
          values={`${sizeBase * 1.6};${sizeBase * 3.2};${sizeBase * 1.6}`}
          dur="2.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.22;0.0;0.22"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r={sizeBase} fill={color} stroke="rgba(20,18,14,0.55)" strokeWidth="1.5" />
      <circle r={sizeBase * 0.4} fill="rgba(244,241,234,0.95)" />
      {label && (
        <g transform={`translate(${sizeBase * 1.8}, ${-sizeBase * 0.2})`}>
          <rect x="0" y="-12" width={label.length * 8.6 + 16} height="24" fill="rgba(20,18,14,0.92)" />
          <text
            x="8"
            y="6"
            fill="var(--os-bg)"
            fontSize="13"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.14em"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

// ── CHICAGO NEIGHBORHOOD INSET ──────────────────────────────────────
const CHICAGO_NEIGHBORHOODS = [
  { id: "lincoln-square", name: "LINCOLN SQ.", points: "180,200 460,200 460,400 180,400" },
  { id: "andersonville", name: "ANDERSONVILLE", points: "460,200 720,200 720,360 460,360" },
  { id: "edgewater", name: "EDGEWATER", points: "720,200 960,200 960,360 720,360" },
  { id: "north-center", name: "NORTH CENTER", points: "180,400 460,400 460,600 180,600" },
  { id: "ravenswood", name: "RAVENSWOOD", points: "460,360 720,360 720,560 460,560" },
  { id: "uptown", name: "UPTOWN", points: "720,360 960,360 960,560 720,560" },
  { id: "roscoe-village", name: "ROSCOE VILLAGE", points: "180,600 420,600 420,760 180,760" },
  { id: "lakeview", name: "LAKEVIEW", points: "420,560 720,560 720,780 420,780" },
  { id: "buena-park", name: "BUENA PARK", points: "720,560 960,560 960,720 720,720" },
  { id: "logan-square", name: "LOGAN SQ.", points: "100,760 360,760 360,980 100,980" },
  { id: "bucktown", name: "BUCKTOWN", points: "360,780 600,780 600,980 360,980" },
  { id: "lincoln-park", name: "LINCOLN PARK", points: "600,780 880,780 880,1020 600,1020" },
  { id: "old-town", name: "OLD TOWN", points: "600,1020 880,1020 880,1140 600,1140" },
];

const LAKE_PATH =
  "M 960,120 C 1010,300 990,520 970,720 C 980,900 1000,1080 880,1180 L 1240,1180 L 1240,120 Z";

function polygonCenter(pointsStr: string) {
  const pts = pointsStr.trim().split(/\s+/).map((p) => p.split(",").map(Number));
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

function ChicagoInset({ event, progress }: { event: TimelineEvent; progress: number }) {
  const highlights = event.cityHighlights || [];
  const markers = (event.markers || []).filter((m): m is InsetMarker => "x" in m);

  const fillById = useMemo(() => {
    const m: Record<string, { color: string; opacity: number }> = {};
    for (const h of highlights) {
      if (!activeWindow(progress, h.at, h.until)) continue;
      const span = Math.max(0.0001, (h.until ?? 1) - (h.at ?? 0));
      const u = clamp01((progress - (h.at ?? 0)) / span);
      const fadeIn = h.fade !== "out" ? Math.min(1, u * 3) : Math.max(0, 1 - u * 1.3);
      m[h.id] = { color: h.color, opacity: fadeIn };
    }
    return m;
  }, [highlights, progress]);

  return (
    <svg viewBox="0 0 1320 1320" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <pattern id="chiGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="var(--os-rule)" strokeWidth="0.6" opacity="0.35" />
        </pattern>
      </defs>

      <rect x="60" y="120" width="1180" height="1080" fill="url(#chiGrid)" />

      <path d={LAKE_PATH} fill="var(--os-ink)" opacity="0.06" />
      <path d={LAKE_PATH} fill="none" stroke="var(--os-ink)" strokeWidth="1.2" opacity="0.45" />
      <text
        x="1100"
        y="640"
        fontSize="26"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.34em"
        fill="var(--os-ink-3)"
        textAnchor="middle"
        transform="rotate(90 1100 640)"
      >
        LAKE MICHIGAN
      </text>

      <g transform="translate(140, 180)" fill="var(--os-ink-3)" opacity="0.7">
        <path d="M 0,-26 L 8,8 L 0,2 L -8,8 Z" fill="var(--os-ink)" />
        <text
          x="0"
          y="34"
          fontSize="14"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          textAnchor="middle"
          letterSpacing="0.2em"
        >
          N
        </text>
      </g>

      {CHICAGO_NEIGHBORHOODS.map((n) => {
        const hi = fillById[n.id];
        const fill = hi ? hi.color : "rgba(244,241,234,0.55)";
        const fillOp = hi ? hi.opacity : 1;
        const center = polygonCenter(n.points);
        const isHi = !!hi;
        return (
          <g key={n.id}>
            <polygon
              points={n.points}
              fill={fill}
              fillOpacity={fillOp}
              stroke={isHi ? "var(--os-ink)" : "var(--os-ink-2)"}
              strokeWidth={isHi ? 2 : 1}
              opacity={isHi ? 1 : 0.92}
            />
            <text
              x={center.x}
              y={center.y}
              fontSize={isHi ? 20 : 15}
              fontWeight={isHi ? 700 : 500}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              letterSpacing="0.16em"
              fill="var(--os-ink)"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={isHi ? 1 : 0.7}
            >
              {n.name}
            </text>
          </g>
        );
      })}

      <text
        x="160"
        y="1230"
        fontSize="22"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.32em"
        fill="var(--os-ink-2)"
      >
        CHICAGO · NORTH SIDE
      </text>

      {markers.map((m, i) => {
        if (!activeWindow(progress, m.at, m.until)) return null;
        const span = Math.max(0.0001, (m.until ?? 1) - (m.at ?? 0));
        const u = clamp01((progress - (m.at ?? 0)) / span);
        const opacity = Math.min(1, u * 3);
        return <PulseMarker key={i} x={m.x} y={m.y} color={m.color} label={m.label} opacity={opacity} />;
      })}
    </svg>
  );
}

// ── SAN JOSE INSET ──────────────────────────────────────────────────
const SJ_DISTRICTS = [
  { id: "diridon", name: "DIRIDON", points: "120,360 320,360 320,560 120,560" },
  { id: "civic", name: "CIVIC CENTER", points: "320,260 560,260 560,460 320,460" },
  { id: "downtown-core", name: "DOWNTOWN CORE", points: "560,300 800,300 800,520 560,520" },
  { id: "sjsu", name: "SAN JOSÉ STATE", points: "800,300 1080,300 1080,560 800,560" },
  { id: "sofa", name: "SOFA", points: "560,520 800,520 800,720 560,720" },
  { id: "guadalupe", name: "GUADALUPE PARK", points: "320,460 560,460 560,720 320,720" },
  { id: "japantown", name: "JAPANTOWN", points: "560,140 880,140 880,300 560,300" },
  { id: "willow-glen-n", name: "WILLOW GLEN", points: "440,720 760,720 760,920 440,920" },
  { id: "naglee", name: "NAGLEE PARK", points: "800,560 1080,560 1080,800 800,800" },
];

const SJ_HIGHWAYS = [
  { d: "M 240,140 L 240,920", label: "87" },
  { d: "M 120,840 L 1100,860", label: "280" },
  { d: "M 1080,140 C 1100,400 1080,700 980,920", label: "" },
];

function SanJoseInset({ event, progress }: { event: TimelineEvent; progress: number }) {
  const highlights = event.cityHighlights || [];
  const markers = (event.markers || []).filter((m): m is InsetMarker => "x" in m);

  const fillById = useMemo(() => {
    const m: Record<string, { color: string; opacity: number }> = {};
    for (const h of highlights) {
      if (!activeWindow(progress, h.at, h.until)) continue;
      const span = Math.max(0.0001, (h.until ?? 1) - (h.at ?? 0));
      const u = clamp01((progress - (h.at ?? 0)) / span);
      const fadeIn = h.fade !== "out" ? Math.min(1, u * 3) : Math.max(0, 1 - u * 1.3);
      m[h.id] = { color: h.color, opacity: fadeIn };
    }
    return m;
  }, [highlights, progress]);

  return (
    <svg viewBox="0 0 1320 1320" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <pattern id="sjGrid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--os-rule)" strokeWidth="0.6" opacity="0.35" />
        </pattern>
      </defs>

      <rect x="60" y="80" width="1180" height="1100" fill="url(#sjGrid)" />

      {SJ_HIGHWAYS.map((h, i) => (
        <g key={i}>
          <path d={h.d} fill="none" stroke="var(--os-ink-3)" strokeWidth="6" opacity="0.5" strokeLinecap="round" />
          <path d={h.d} fill="none" stroke="var(--os-bg)" strokeWidth="1.2" strokeDasharray="6 8" opacity="0.9" />
        </g>
      ))}

      <g transform="translate(140, 140)" fill="var(--os-ink-3)" opacity="0.7">
        <path d="M 0,-26 L 8,8 L 0,2 L -8,8 Z" fill="var(--os-ink)" />
        <text x="0" y="34" fontSize="14" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="middle" letterSpacing="0.2em">
          N
        </text>
      </g>

      {SJ_DISTRICTS.map((d) => {
        const hi = fillById[d.id];
        const fill = hi ? hi.color : "rgba(244,241,234,0.55)";
        const fillOp = hi ? hi.opacity : 1;
        const center = polygonCenter(d.points);
        const isHi = !!hi;
        return (
          <g key={d.id}>
            <polygon
              points={d.points}
              fill={fill}
              fillOpacity={fillOp}
              stroke={isHi ? "var(--os-ink)" : "var(--os-ink-2)"}
              strokeWidth={isHi ? 2 : 1}
              opacity={isHi ? 1 : 0.92}
            />
            <text
              x={center.x}
              y={center.y}
              fontSize={isHi ? 22 : 14}
              fontWeight={isHi ? 700 : 500}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              letterSpacing="0.18em"
              fill="var(--os-ink)"
              textAnchor="middle"
              dominantBaseline="middle"
              opacity={isHi ? 1 : 0.7}
            >
              {d.name}
            </text>
          </g>
        );
      })}

      <text
        x="160"
        y="1230"
        fontSize="22"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.32em"
        fill="var(--os-ink-2)"
      >
        DOWNTOWN SAN JOSÉ · CALIFORNIA
      </text>

      {markers.map((m, i) => {
        if (!activeWindow(progress, m.at, m.until)) return null;
        const span = Math.max(0.0001, (m.until ?? 1) - (m.at ?? 0));
        const u = clamp01((progress - (m.at ?? 0)) / span);
        const opacity = Math.min(1, u * 3);
        return <PulseMarker key={i} x={m.x} y={m.y} color={m.color} label={m.label} opacity={opacity} />;
      })}
    </svg>
  );
}

export function InsetMap({ event, progress }: { event: TimelineEvent; progress: number }) {
  if (!event || !event.inset) return null;
  if (event.inset.kind === "chicago") return <ChicagoInset event={event} progress={progress} />;
  if (event.inset.kind === "sanjose") return <SanJoseInset event={event} progress={progress} />;
  return null;
}
