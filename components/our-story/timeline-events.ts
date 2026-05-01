// Chronological story events for the Our Story timeline.
//
// centerOn:  initial camera position when this step starts. If omitted,
//            inherits from the previous event's last waypoint/marker.
// Journey:   { kind: 'boat'|'plane', waypoints, start, end, label }
// Marker:    { lon, lat, color, label, at, until }
// Highlight: { iso, color, at, until, fade: 'in'|'out' }
//   For US states, use stateName: 'Illinois' instead of iso.

export type LonLat = [number, number];

export interface CenterOn {
  lon: number;
  lat: number;
  zoom?: number;
}

export interface Journey {
  kind: "boat" | "plane";
  waypoints: LonLat[];
  start: number;
  end: number;
  label?: string;
}

export interface Highlight {
  iso?: string;
  stateName?: string;
  color: string;
  at?: number;
  until?: number;
  fade?: "in" | "out";
}

export interface CityHighlight {
  id: string;
  color: string;
  at?: number;
  until?: number;
  fade?: "in" | "out";
}

export interface GlobeMarker {
  lon: number;
  lat: number;
  color: string;
  label?: string;
  at?: number;
  until?: number;
}

export interface InsetMarker {
  x: number;
  y: number;
  color: string;
  label?: string;
  at?: number;
  until?: number;
}

export type Marker = GlobeMarker | InsetMarker;

export interface CityMarker {
  lon: number;
  lat: number;
  color: string;
  radius?: number;
  at?: number;
  until?: number;
}

export type CameraMode = "arc" | "static";

export interface TimelineEvent {
  id: string;
  year: string;
  chapter: string;
  title: string;
  body: string;
  duration: number;
  centerOn?: CenterOn;
  cameraMode?: CameraMode;
  showCountries?: boolean;
  showUSStates?: boolean;
  inset?: { kind: "chicago" | "sanjose" };
  intro?: { region: "illinois" | "bay-area" };
  highlights?: Highlight[];
  cityHighlights?: CityHighlight[];
  journeys?: Journey[];
  markers?: Marker[];
  cityMarkers?: CityMarker[];
}

const RAW_EVENTS: TimelineEvent[] = [
  {
    id: "1978-departure",
    year: "1978",
    chapter: "I. DEPARTURE",
    title: "Duc Ngo (21) and Anh Hoang (18) leave Vietnam",
    body: "After the fall of Saigon, they board a small boat with 21 other people in search of safety, drifting to a tiny island off the Thai coast.",
    duration: 12000,
    centerOn: { lon: 109.2, lat: 13.78, zoom: 2.0 },
    highlights: [
      { iso: "VNM", color: "var(--os-yellow)", at: 0.0, until: 0.85, fade: "out" },
    ],
    journeys: [
      {
        kind: "boat",
        waypoints: [
          [109.2, 13.78],
          [109.3, 12.2],
          [108.4, 10.4],
          [106.3, 9.1],
          [104.8, 8.4],
          [103.2, 8.7],
          [101.8, 8.55],
          [100.74, 8.39],
        ],
        start: 0.05,
        end: 0.85,
        label: "BOAT",
      },
    ],
    markers: [
      {
        lon: 100.74,
        lat: 8.39,
        color: "var(--os-red)",
        label: "KO KRA ISLAND",
        at: 0.86,
        until: 1.0,
      },
    ],
  },

  {
    id: "1978-songkhla",
    year: "1978–79",
    chapter: "II. SONGKHLA",
    title: "Months at sea and on a Thai island, then Songkhla refugee camp",
    body: "After spending months at sea and on a Thai island, they find their way to Songkhla refugee camp in Thailand.",
    duration: 10000,
    journeys: [
      {
        kind: "boat",
        waypoints: [
          [100.74, 8.39],
          [100.69, 7.5],
          [100.59, 7.2],
        ],
        start: 0.15,
        end: 0.8,
        label: "BOAT",
      },
    ],
    cityMarkers: [
      { lon: 100.59, lat: 7.2, color: "var(--os-yellow)", radius: 18, at: 0.0, until: 1.0 },
    ],
    markers: [
      {
        lon: 100.59,
        lat: 7.2,
        color: "var(--os-red)",
        label: "SONGKHLA REFUGEE CAMP",
        at: 0.78,
        until: 1.0,
      },
    ],
  },

  {
    id: "chicago-arrival",
    year: "1979",
    chapter: "III. CHICAGO",
    title: "They fly to Chicago, IL to begin their life in America",
    body: "From Hat Yai across the Pacific to O'Hare and a new home on the North Side.",
    duration: 14000,
    cameraMode: "arc",
    showUSStates: true,
    highlights: [
      { stateName: "Illinois", color: "var(--os-yellow)", at: 0.55, until: 1.0, fade: "in" },
    ],
    journeys: [
      {
        kind: "plane",
        waypoints: [
          [100.39, 6.93],
          [121.77, 12.88],
          [145.0, 15.2],
          [170.0, 21.0],
          [-160.0, 28.0],
          [-130.0, 38.0],
          [-110.0, 41.0],
          [-87.9, 41.97],
        ],
        start: 0.08,
        end: 0.92,
        label: "FLIGHT · HDY → ORD",
      },
    ],
    markers: [
      {
        lon: -87.65,
        lat: 41.85,
        color: "var(--os-red)",
        label: "CHICAGO, IL",
        at: 0.85,
        until: 1.0,
      },
    ],
  },

  {
    id: "1984-saigon-little-home",
    year: "1984",
    chapter: "IV. SAIGON LITTLE HOME",
    title: "Anh Hoang opens Saigon Little Home in Ravenswood",
    body: "At 21, Anh Hoang purchases a Thai restaurant and turns it into her own — Saigon Little Home — building a long menu of Vietnamese dishes from her family's table.",
    duration: 11000,
    inset: { kind: "chicago" },
    intro: { region: "illinois" },
    centerOn: { lon: -87.68, lat: 41.97, zoom: 8.0 },
    cityHighlights: [
      { id: "ravenswood", color: "var(--os-yellow)", at: 0.05, until: 1.0, fade: "in" },
    ],
    markers: [
      { x: 590, y: 460, color: "var(--os-red)", label: "SAIGON LITTLE HOME", at: 0.55, until: 1.0 },
    ],
  },

  {
    id: "1989-viet-born",
    year: "1989",
    chapter: "V. VIET",
    title: "Anh Hoang gives birth to Viet Ngo",
    body: "A son joins the family in Chicago.",
    duration: 8000,
    inset: { kind: "chicago" },
    intro: { region: "illinois" },
    centerOn: { lon: -87.68, lat: 41.97, zoom: 8.0 },
    cityHighlights: [
      { id: "ravenswood", color: "var(--os-yellow)", at: 0.0, until: 1.0, fade: "in" },
    ],
    markers: [
      { x: 590, y: 460, color: "var(--os-red)", label: "VIET NGO · BORN 1989", at: 0.2, until: 1.0 },
    ],
  },

  {
    id: "1993-san-jose",
    year: "1993",
    chapter: "VI. SAN JOSÉ",
    title: "The family move to California",
    body: "Duc, Anh, Viet (4) and his sister (3) leave Chicago and fly west — from O'Hare to SFO — settling in San Jose, where they still live today.",
    duration: 12000,
    centerOn: { lon: -110.0, lat: 39.5, zoom: 3.0 },
    cameraMode: "static",
    showCountries: true,
    showUSStates: true,
    highlights: [
      { stateName: "California", color: "var(--os-yellow)", at: 0.55, until: 1.0, fade: "in" },
    ],
    journeys: [
      {
        kind: "plane",
        waypoints: [
          [-87.9, 41.97],
          [-95.0, 40.5],
          [-105.0, 39.5],
          [-115.0, 38.5],
          [-122.37, 37.62],
        ],
        start: 0.1,
        end: 0.82,
        label: "FLIGHT · ORD → SFO",
      },
    ],
    markers: [
      { lon: -121.89, lat: 37.34, color: "var(--os-red)", label: "SAN JOSÉ, CA", at: 0.78, until: 1.0 },
    ],
  },

  {
    id: "2018-vietnoms",
    year: "2018",
    chapter: "VII. VIETNOMS",
    title: "Viet Ngo opens Vietnoms at SoFA Market",
    body: "Viet opens Vietnoms in downtown San Jose — fast-casual Vietnamese rooted in his mother's recipes, preserving the flavor of her generation for the next.",
    duration: 12000,
    inset: { kind: "sanjose" },
    intro: { region: "bay-area" },
    centerOn: { lon: -121.88, lat: 37.33, zoom: 8.0 },
    cityHighlights: [
      { id: "sofa", color: "var(--os-yellow)", at: 0.05, until: 1.0, fade: "in" },
    ],
    markers: [
      { x: 680, y: 620, color: "var(--os-red)", label: "SOFA MARKET · VIETNOMS", at: 0.5, until: 1.0 },
    ],
  },
];

// Auto-resolve centerOn: any event without one inherits from where the
// previous event left off (last journey waypoint, last marker, or its centerOn).
function resolveCenterOn(events: TimelineEvent[]): TimelineEvent[] {
  events.forEach((e, i) => {
    if (e.centerOn) return;
    if (i === 0) {
      const j0 = (e.journeys || [])[0];
      if (j0 && j0.waypoints && j0.waypoints[0]) {
        const [lon, lat] = j0.waypoints[0];
        e.centerOn = { lon, lat, zoom: 2.0 };
      } else {
        e.centerOn = { lon: 0, lat: 20, zoom: 1.4 };
      }
      return;
    }
    const prev = events[i - 1];
    const lastJ = (prev.journeys || []).slice(-1)[0];
    if (lastJ && lastJ.waypoints && lastJ.waypoints.length) {
      const [lon, lat] = lastJ.waypoints[lastJ.waypoints.length - 1];
      e.centerOn = { lon, lat, zoom: 4.0 };
      return;
    }
    const lastM = (prev.markers || []).slice(-1)[0];
    if (lastM && "lon" in lastM) {
      e.centerOn = { lon: lastM.lon, lat: lastM.lat, zoom: 4.0 };
      return;
    }
    e.centerOn = { ...(prev.centerOn || { lon: 0, lat: 20, zoom: 1.4 }) };
  });
  return events;
}

export const EVENTS: TimelineEvent[] = resolveCenterOn(RAW_EVENTS);
