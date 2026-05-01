"use client";

// Intermediate state/region maps that play between a globe view and a city
// inset map. Loads real US-Census county polygons (us-atlas) for geographic
// outlines.

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature, merge } from "topojson-client";
import type {
  Topology,
  GeometryCollection,
  Polygon as TopoPolygon,
  MultiPolygon as TopoMultiPolygon,
} from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";

interface CountyProps {
  name?: string;
  [key: string]: unknown;
}

interface CountyData {
  raw: Topology;
  counties: FeatureCollection<Geometry, CountyProps>;
  states: FeatureCollection<Geometry, CountyProps>;
}

let _countiesPromise: Promise<CountyData> | null = null;
function loadCounties(): Promise<CountyData> {
  if (_countiesPromise) return _countiesPromise;
  _countiesPromise = fetch("https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-10m.json")
    .then((r) => r.json())
    .then((topo: Topology) => ({
      raw: topo,
      counties: feature(
        topo,
        topo.objects.counties as GeometryCollection<CountyProps>
      ) as FeatureCollection<Geometry, CountyProps>,
      states: feature(
        topo,
        topo.objects.states as GeometryCollection<CountyProps>
      ) as FeatureCollection<Geometry, CountyProps>,
    }));
  return _countiesPromise;
}

function useCounties() {
  const [data, setData] = useState<CountyData | null>(null);
  useEffect(() => {
    let alive = true;
    loadCounties().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

interface BayCity {
  id: string;
  name: string;
  lon: number;
  lat: number;
  r: number;
  highlight?: boolean;
}

const BAY_CITIES: BayCity[] = [
  { id: "sf", name: "SAN FRANCISCO", lon: -122.45, lat: 37.77, r: 22 },
  { id: "dalycity", name: "DALY CITY", lon: -122.47, lat: 37.7, r: 9 },
  { id: "sanmateo", name: "SAN MATEO", lon: -122.325, lat: 37.56, r: 11 },
  { id: "redwood", name: "REDWOOD CITY", lon: -122.23, lat: 37.485, r: 10 },
  { id: "paloalto", name: "PALO ALTO", lon: -122.143, lat: 37.442, r: 11 },
  { id: "mtnview", name: "MOUNTAIN VIEW", lon: -122.083, lat: 37.386, r: 10 },
  { id: "sunnyvale", name: "SUNNYVALE", lon: -122.036, lat: 37.369, r: 12 },
  { id: "cupertino", name: "CUPERTINO", lon: -122.032, lat: 37.323, r: 10 },
  { id: "santaclara", name: "SANTA CLARA", lon: -121.955, lat: 37.354, r: 12 },
  { id: "sanjose", name: "SAN JOSÉ", lon: -121.886, lat: 37.339, r: 26, highlight: true },
  { id: "milpitas", name: "MILPITAS", lon: -121.907, lat: 37.43, r: 9 },
  { id: "fremont", name: "FREMONT", lon: -121.989, lat: 37.549, r: 14 },
  { id: "hayward", name: "HAYWARD", lon: -122.081, lat: 37.669, r: 12 },
  { id: "oakland", name: "OAKLAND", lon: -122.272, lat: 37.805, r: 18 },
  { id: "berkeley", name: "BERKELEY", lon: -122.272, lat: 37.872, r: 11 },
  { id: "richmond", name: "RICHMOND", lon: -122.343, lat: 37.936, r: 10 },
];

interface RegionConfig {
  label: string;
  kind: "counties" | "cities";
  highlightFIPS?: string;
  countyFilter: (id: string | number) => boolean;
  cities?: BayCity[];
  focusLonLat?: [number, number];
  statesToOutline: string[];
}

const REGIONS: Record<string, RegionConfig> = {
  illinois: {
    label: "ILLINOIS · COOK COUNTY",
    kind: "counties",
    highlightFIPS: "17031",
    countyFilter: (id) => String(id).startsWith("17"),
    statesToOutline: ["17"],
  },
  "bay-area": {
    label: "BAY AREA · SAN JOSÉ",
    kind: "cities",
    countyFilter: (id) =>
      ["06001", "06013", "06075", "06081", "06085", "06087", "06041"].includes(String(id)),
    cities: BAY_CITIES,
    focusLonLat: [-121.886, 37.339],
    statesToOutline: [],
  },
};

interface RegionMapProps {
  regionKey: string;
  zoomT?: number;
  label?: string;
}

export function RegionMap({ regionKey, zoomT = 0, label }: RegionMapProps) {
  const data = useCounties();
  const region = REGIONS[regionKey];

  const built = useMemo(() => {
    if (!data || !region) return null;
    const allCounties = data.counties.features.filter((f) =>
      region.countyFilter(f.id as string | number)
    );

    const projection = geoMercator().fitExtent(
      [
        [120, 220],
        [1200, 1100],
      ],
      { type: "FeatureCollection", features: allCounties } as FeatureCollection<Geometry>
    );
    const path = geoPath(projection);

    let target: Feature<Geometry, CountyProps> | undefined;
    let targetCentroid: [number, number] = [660, 660];
    let landOutline: string | null = null;
    let cityPoints: Array<BayCity & { x: number; y: number }> | undefined;
    let countyCentroids:
      | Array<{ id: string | number; name: string; centroid: [number, number] }>
      | undefined;

    if (region.kind === "counties") {
      target = allCounties.find((f) => String(f.id) === region.highlightFIPS);
      targetCentroid = target ? (path.centroid(target) as [number, number]) : [660, 660];
      countyCentroids = allCounties.map((c) => ({
        id: c.id as string | number,
        name: c.properties?.name || "",
        centroid: path.centroid(c) as [number, number],
      }));
    } else if (region.kind === "cities" && region.cities) {
      const countyArcs = (
        data.raw.objects.counties as GeometryCollection<CountyProps>
      ).geometries.filter((g) =>
        region.countyFilter(((g as unknown) as { id: string | number }).id)
      ) as Array<TopoPolygon<CountyProps> | TopoMultiPolygon<CountyProps>>;
      const merged = merge(data.raw, countyArcs);
      landOutline = path(merged) ?? null;
      cityPoints = region.cities.map((c) => {
        const projected = projection([c.lon, c.lat]);
        return { ...c, x: projected ? projected[0] : 0, y: projected ? projected[1] : 0 };
      });
      const f = region.focusLonLat ? projection(region.focusLonLat) : null;
      targetCentroid =
        f && isFinite(f[0]) ? [f[0], f[1]] : [660, 660];
    }

    const states = (data.states.features || []).filter((s) =>
      region.statesToOutline.includes(String(s.id))
    );
    return { allCounties, target, path, targetCentroid, states, countyCentroids, landOutline, cityPoints };
  }, [data, region]);

  if (!built) {
    return (
      <svg viewBox="0 0 1320 1320" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
        <text
          x="660"
          y="660"
          textAnchor="middle"
          fontSize="20"
          fontFamily="ui-monospace, monospace"
          fill="var(--os-ink-3)"
          letterSpacing="0.18em"
        >
          LOADING…
        </text>
      </svg>
    );
  }

  const z = 1 + zoomT * 2.5;
  const [cx, cy] = built.targetCentroid;
  const tx = 660 - cx * z;
  const ty = 660 - cy * z;

  const isCities = region.kind === "cities";
  const waterFill = isCities ? "rgba(120, 168, 196, 0.28)" : null;

  return (
    <svg viewBox="0 0 1320 1320" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <pattern id="rmGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="var(--os-rule)" strokeWidth="0.6" opacity="0.3" />
        </pattern>
        {waterFill && (
          <pattern id="rmWater" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill={waterFill} />
            <path d="M0 7 Q 3.5 4, 7 7 T 14 7" fill="none" stroke="rgba(82, 124, 152, 0.55)" strokeWidth="0.6" />
          </pattern>
        )}
      </defs>
      <rect x="60" y="120" width="1180" height="1080" fill={waterFill ? "url(#rmWater)" : "url(#rmGrid)"} />

      {isCities && (
        <>
          <text
            x="780"
            y="660"
            textAnchor="middle"
            fontSize="30"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.36em"
            fill="rgba(82, 124, 152, 0.85)"
            fontStyle="italic"
          >
            SAN FRANCISCO BAY
          </text>
          <text
            x="220"
            y="940"
            textAnchor="middle"
            fontSize="22"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.30em"
            fill="rgba(82, 124, 152, 0.75)"
            fontStyle="italic"
          >
            PACIFIC OCEAN
          </text>
        </>
      )}

      <g transform={`translate(${tx} ${ty}) scale(${z})`}>
        {built.states.map((s) => (
          <path
            key={"s" + s.id}
            d={built.path(s) || ""}
            fill="rgba(244,241,234,0.4)"
            stroke="var(--os-ink)"
            strokeWidth={1.6 / z}
          />
        ))}

        {region.kind === "counties" && (
          <>
            {built.allCounties.map((c) => {
              const isHi = String(c.id) === region.highlightFIPS;
              return (
                <path
                  key={c.id as string | number}
                  d={built.path(c) || ""}
                  fill={isHi ? "var(--os-yellow)" : "rgba(244,241,234,0.92)"}
                  stroke="var(--os-ink)"
                  strokeWidth={(isHi ? 2.4 : 1.4) / z}
                  opacity={isHi ? 1 : 0.96}
                />
              );
            })}
            {built.countyCentroids?.map((c) => {
              const isHi = String(c.id) === region.highlightFIPS;
              const [lx, ly] = c.centroid;
              if (!isFinite(lx) || !isFinite(ly)) return null;
              const tScale = 1 / z;
              return (
                <g key={"lbl" + c.id} transform={`translate(${lx} ${ly}) scale(${tScale})`}>
                  <text
                    textAnchor="middle"
                    fontSize={isHi ? 28 : 22}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    letterSpacing="0.20em"
                    fontWeight={isHi ? 700 : 500}
                    fill="var(--os-ink)"
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(244,241,234,0.85)",
                      strokeWidth: isHi ? 5 : 3,
                      strokeLinejoin: "round",
                    }}
                  >
                    {c.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {isCities && built.landOutline && (
          <>
            <path
              d={built.landOutline}
              fill="rgba(244,241,234,0.94)"
              stroke="var(--os-ink)"
              strokeWidth={2.0 / z}
            />
            {built.cityPoints?.map((c) => {
              if (!isFinite(c.x) || !isFinite(c.y)) return null;
              return (
                <circle
                  key={c.id}
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill={c.highlight ? "var(--os-yellow)" : "rgba(244,241,234,0.98)"}
                  stroke="var(--os-ink)"
                  strokeWidth={(c.highlight ? 3.2 : 1.8) / z}
                />
              );
            })}
            {built.cityPoints?.map((c) => {
              if (!isFinite(c.x) || !isFinite(c.y)) return null;
              const tScale = 1 / z;
              const dy = c.highlight ? c.r + 8 : -(c.r + 6);
              const baseline = c.highlight ? "hanging" : "auto";
              return (
                <g key={"clbl" + c.id} transform={`translate(${c.x} ${c.y + dy}) scale(${tScale})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline={baseline}
                    fontSize={c.highlight ? 28 : 18}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    letterSpacing="0.20em"
                    fontWeight={c.highlight ? 700 : 500}
                    fill="var(--os-ink)"
                    style={{
                      paintOrder: "stroke",
                      stroke: "rgba(244,241,234,0.92)",
                      strokeWidth: c.highlight ? 6 : 4,
                      strokeLinejoin: "round",
                    }}
                  >
                    {c.name}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </g>

      <text
        x="160"
        y="1230"
        fontSize="22"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.32em"
        fill="var(--os-ink-2)"
      >
        {label || region.label}
      </text>
    </svg>
  );
}
