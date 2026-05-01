"use client";

// Full-bleed responsive globe stage with overlay UI.
// The Tweaks panel from the prototype is dropped; tuning constants are inlined.

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { EVENTS, type TimelineEvent } from "./timeline-events";
import { Globe, Whirl } from "./globe";
import { RegionMap } from "./region-maps";
import { InsetMap } from "./inset-maps";

// Camera tuning — formerly the TWEAK_DEFAULTS block.
const TUNING = {
  arrivalZoom: 4.0,
  travelZoom: 1.7,
  cameraDampMs: 240,
  autoplay: true,
};

interface Engine {
  index: number;
  progress: number;
  playing: boolean;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  restart: () => void;
  toggle: () => void;
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function useTimelineEngine(events: TimelineEvent[]): Engine {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(TUNING.autoplay);
  const lastRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    lastRef.current = performance.now();
    let alive = true;
    const tick = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;
      if (playing) {
        setProgress((p) => {
          const ev = events[index];
          const dur = ev?.duration || 8000;
          const next = p + dt / dur;
          if (next >= 1) {
            if (index < events.length - 1) {
              setIndex((i) => i + 1);
              return 0;
            }
            return 1;
          }
          return next;
        });
      }
      if (alive) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [playing, index, events]);

  const goTo = useCallback(
    (i: number) => {
      setIndex(Math.max(0, Math.min(events.length - 1, i)));
      setProgress(0);
      lastRef.current = performance.now();
    },
    [events.length]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const restart = useCallback(() => goTo(0), [goTo]);
  const toggle = useCallback(() => setPlaying((p) => !p), []);

  return { index, progress, playing, goTo, next, prev, restart, toggle };
}

export function OurStoryTimeline() {
  const events = EVENTS;
  const eng = useTimelineEngine(events);
  const cur = events[eng.index];
  const isMobile = useIsMobile();

  const cameraTuning = {
    travelZoom: TUNING.travelZoom,
    arrivalZoom: TUNING.arrivalZoom,
    dampMs: TUNING.cameraDampMs,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        eng.toggle();
      } else if (e.key === "ArrowRight") eng.next();
      else if (e.key === "ArrowLeft") eng.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [eng]);

  const isInset = !!cur.inset;
  const hasRegion = isInset && cur.intro && cur.intro.region;
  const p = eng.progress;
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  let globeOp = 1;
  let regionOp = 0;
  let insetOp = 0;
  let regionZoomT = 0;
  if (hasRegion) {
    const tGR = clamp01((p - 0.1) / 0.18);
    const tRI = clamp01((p - 0.42) / 0.18);
    globeOp = 1 - tGR;
    regionOp = tGR * (1 - tRI);
    insetOp = tRI;
    regionZoomT = clamp01((p - 0.1) / 0.5);
  } else if (isInset) {
    const t = clamp01((p - 0.05) / 0.18);
    globeOp = 1 - t;
    insetOp = t;
  }

  const globeEvent = isInset
    ? { ...cur, journeys: undefined, markers: undefined, cityMarkers: undefined, cameraMode: undefined }
    : cur;
  const globeCam = isInset
    ? { ...cameraTuning, dampMs: Math.max(900, cameraTuning.dampMs * 4) }
    : cameraTuning;

  const globeVisuals = (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: globeOp,
          transition: "opacity 220ms linear",
        }}
      >
        <Globe
          size={1320}
          event={globeEvent}
          progress={eng.progress}
          playing={eng.playing}
          cameraTuning={globeCam}
        />
      </div>
      {hasRegion && cur.intro && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: regionOp,
            transition: "opacity 220ms linear",
            pointerEvents: "none",
          }}
        >
          <RegionMap regionKey={cur.intro.region} zoomT={regionZoomT} />
        </div>
      )}
      {isInset && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: insetOp,
            transition: "opacity 220ms linear",
            pointerEvents: insetOp > 0.5 ? "auto" : "none",
          }}
        >
          <InsetMap event={cur} progress={eng.progress} />
        </div>
      )}
    </>
  );

  const eventPanel = (compact: boolean) => (
    <div style={compact ? S.eventInnerCompact : S.eventInner}>
      <div className="os-mono" style={S.eventMeta}>
        <span>{cur.year}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{cur.id.toUpperCase()}</span>
      </div>
      <h2 className="os-display" style={compact ? S.eventTitleCompact : S.eventTitle}>
        {cur.title}
      </h2>
      {!compact && <p style={S.eventBody}>{cur.body}</p>}
      {compact && <p style={S.eventBodyCompact}>{cur.body}</p>}
      <div style={S.progressTrack}>
        <div style={{ ...S.progressFill, width: `${(eng.progress * 100).toFixed(1)}%` }} />
      </div>
      {!compact && (
        <div className="os-mono" style={S.legend}>
          {cur.journeys?.map((j, i) => {
            const span = j.end - j.start || 0.001;
            const local = (eng.progress - j.start) / span;
            const active = local > 0 && local < 1;
            const done = local >= 1;
            const dot = j.kind === "boat" ? "◆" : "▲";
            return (
              <span
                key={i}
                style={{
                  ...S.chip,
                  opacity: active ? 1 : done ? 0.55 : 0.4,
                  borderColor: active ? "var(--os-ink)" : "var(--os-rule)",
                }}
              >
                <span style={{ marginRight: 6 }}>{dot}</span>
                {j.label || j.kind.toUpperCase()}
                <span style={{ opacity: 0.6, marginLeft: 6 }}>
                  {active ? `${Math.round(local * 100)}%` : done ? "✓" : "—"}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="os-root" style={S.shellMobile}>
        <header style={S.topbarMobile}>
          <div className="os-mono" style={S.kicker}>OUR STORY</div>
          <div className="os-mono" style={S.counter}>
            {String(eng.index + 1).padStart(2, "0")}{" "}
            <span style={{ opacity: 0.4 }}>/</span> {String(events.length).padStart(2, "0")}
          </div>
        </header>

        <div style={S.eventPanelMobile}>
          {eventPanel(true)}
        </div>

        <div style={S.globeAreaMobile}>
          <Whirl size={1600} innerR={700} playing={eng.playing} />
          <div style={S.globeInnerMobile}>
            {globeVisuals}
          </div>
        </div>

        <div style={S.bottombarMobile}>
          <Controls eng={eng} events={events} />
          <Timeline eng={eng} events={events} />
        </div>
      </div>
    );
  }

  return (
    <div className="os-root" style={S.shell}>
      <div style={S.globeLayer}>
        <div style={S.globeBox}>
          <Whirl size={1600} innerR={700} playing={eng.playing} />
          <div style={S.globeInner}>
            {globeVisuals}
          </div>
        </div>
      </div>

      <div style={S.vignette} aria-hidden="true" />

      <header style={S.topbar}>
        <div className="os-mono" style={S.kicker}>OUR STORY</div>
        <div className="os-mono" style={S.counter}>
          {String(eng.index + 1).padStart(2, "0")}{" "}
          <span style={{ opacity: 0.4 }}>/</span> {String(events.length).padStart(2, "0")}
        </div>
      </header>

      <div style={S.centerLabel} aria-hidden="true">
        <span className="os-display" style={S.yearBig}>
          {cur.year}
        </span>
      </div>

      <div style={S.eventOverlay}>
        {eventPanel(false)}
      </div>

      <div style={S.bottombar}>
        <Controls eng={eng} events={events} />
        <Timeline eng={eng} events={events} />
      </div>
    </div>
  );
}

function Controls({ eng, events }: { eng: Engine; events: TimelineEvent[] }) {
  return (
    <div style={S.controls}>
      <button style={S.btn} onClick={eng.restart} title="Restart">
        <Icon kind="restart" />
        <span className="os-mono" style={{ marginLeft: 8 }}>RESTART</span>
      </button>
      <button style={S.btn} onClick={eng.prev} title="Previous (←)" disabled={eng.index === 0}>
        <Icon kind="prev" />
        <span className="os-mono" style={{ marginLeft: 8 }}>PREV</span>
      </button>
      <button style={{ ...S.btn, ...S.btnPrimary }} onClick={eng.toggle} title="Play / Pause (space)">
        <Icon kind={eng.playing ? "pause" : "play"} />
        <span className="os-mono" style={{ marginLeft: 8 }}>{eng.playing ? "PAUSE" : "PLAY"}</span>
      </button>
      <button style={S.btn} onClick={eng.next} title="Next (→)" disabled={eng.index === events.length - 1}>
        <span className="os-mono" style={{ marginRight: 8 }}>NEXT</span>
        <Icon kind="next" />
      </button>
    </div>
  );
}

function Timeline({ eng, events }: { eng: Engine; events: TimelineEvent[] }) {
  return (
    <div style={S.timelineWrap}>
      <div style={S.timelineRule} />
      <div style={S.timelineRow}>
        {events.map((ev, i) => {
          const active = i === eng.index;
          const done = i < eng.index;
          return (
            <button
              key={ev.id}
              onClick={() => eng.goTo(i)}
              style={{
                ...S.tick,
                ...(active ? S.tickActive : {}),
                ...(done ? S.tickDone : {}),
              }}
              title={`${ev.year} — ${ev.title}`}
            >
              <span style={{ ...S.tickDot, background: active ? "var(--os-ink)" : "var(--os-bg)" }} />
              <span className="os-display" style={S.tickYear}>
                {ev.year}
              </span>
              <span className="os-mono" style={S.tickLabel}>
                {ev.title.length > 48 ? ev.title.slice(0, 48) + "…" : ev.title}
              </span>
              {active && (
                <span style={S.tickProgressTrack}>
                  <span style={{ ...S.tickProgressFill, width: `${(eng.progress * 100).toFixed(1)}%` }} />
                </span>
              )}
            </button>
          );
        })}
        <div className="os-mono" style={S.tickPlaceholder}>
          + MORE TO COME
        </div>
      </div>
    </div>
  );
}

function Icon({ kind }: { kind: "play" | "pause" | "next" | "prev" | "restart" }) {
  const s: CSSProperties = { width: 12, height: 12, display: "inline-block" };
  const c = "currentColor";
  switch (kind) {
    case "play":
      return (
        <svg style={s} viewBox="0 0 12 12">
          <path d="M3 2 L10 6 L3 10 Z" fill={c} />
        </svg>
      );
    case "pause":
      return (
        <svg style={s} viewBox="0 0 12 12">
          <rect x="3" y="2" width="2.2" height="8" fill={c} />
          <rect x="6.8" y="2" width="2.2" height="8" fill={c} />
        </svg>
      );
    case "next":
      return (
        <svg style={s} viewBox="0 0 12 12">
          <path d="M3 2 L8 6 L3 10 Z" fill={c} />
          <rect x="8.5" y="2" width="1.2" height="8" fill={c} />
        </svg>
      );
    case "prev":
      return (
        <svg style={s} viewBox="0 0 12 12">
          <path d="M9 2 L4 6 L9 10 Z" fill={c} />
          <rect x="2.3" y="2" width="1.2" height="8" fill={c} />
        </svg>
      );
    case "restart":
      return (
        <svg style={s} viewBox="0 0 12 12" fill="none" stroke={c} strokeWidth="1.4">
          <path d="M3 6 a 3 3 0 1 0 1 -2.2" />
          <path d="M3 2 V 4 H 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

const S: Record<string, CSSProperties> = {
  shell: {
    position: "relative",
    width: "100%",
    minHeight: "100dvh",
    overflow: "hidden",
    color: "var(--os-ink)",
    background: "var(--os-bg)",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
  },
  globeLayer: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  },
  globeBox: {
    position: "relative",
    width: "min(110vmin, 1320px)",
    height: "min(110vmin, 1320px)",
    maxWidth: "100vw",
    maxHeight: "100vh",
  },
  globeInner: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(82vmin, 980px)",
    height: "min(82vmin, 980px)",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(244,241,234,0.55) 75%, rgba(244,241,234,0.92) 100%)",
  },
  topbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: "20px clamp(16px, 4vw, 48px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    letterSpacing: "0.22em",
    color: "var(--os-ink-3)",
  },
  kicker: { fontSize: 11, letterSpacing: "0.28em" },
  counter: { fontSize: 11, letterSpacing: "0.28em" },
  centerLabel: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
  },
  yearBig: {
    fontSize: "clamp(72px, 18vmin, 220px)",
    color: "var(--os-ink)",
    opacity: 0.06,
    letterSpacing: "0.04em",
    userSelect: "none",
  },
  eventOverlay: {
    position: "absolute",
    left: "clamp(16px, 4vw, 48px)",
    top: "clamp(64px, 12vh, 140px)",
    maxWidth: "min(440px, 86vw)",
    pointerEvents: "auto",
  },
  eventInner: {
    background: "linear-gradient(180deg, rgba(244,241,234,0.85) 0%, rgba(244,241,234,0.6) 100%)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    border: "1px solid var(--os-rule)",
    padding: "18px 20px 20px",
  },
  eventMeta: {
    display: "flex",
    gap: 8,
    fontSize: 11,
    letterSpacing: "0.18em",
    color: "var(--os-ink-3)",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: "clamp(22px, 3.4vmin, 32px)",
    lineHeight: 1.08,
    margin: "4px 0 10px",
    color: "var(--os-ink)",
    textWrap: "balance",
  },
  eventBody: { fontSize: 14, lineHeight: 1.55, color: "var(--os-ink-2)", margin: "0 0 14px" },
  progressTrack: {
    position: "relative",
    height: 2,
    background: "var(--os-rule)",
    margin: "10px 0 14px",
    overflow: "hidden",
  },
  progressFill: { position: "absolute", inset: 0, background: "var(--os-ink)", transition: "width 80ms linear" },
  legend: { display: "flex", flexWrap: "wrap", gap: 6, fontSize: 10, letterSpacing: "0.14em" },
  chip: {
    border: "1px solid var(--os-rule)",
    padding: "3px 8px",
    borderRadius: 999,
    transition: "opacity 200ms ease, border-color 200ms ease",
  },
  bottombar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "0 clamp(16px, 4vw, 48px) clamp(20px, 4vh, 36px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    pointerEvents: "auto",
  },
  controls: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(244,241,234,0.85)",
    color: "var(--os-ink)",
    border: "1px solid var(--os-ink)",
    padding: "9px 14px",
    fontSize: 11,
    letterSpacing: "0.18em",
    cursor: "pointer",
    fontFamily: "inherit",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  },
  btnPrimary: { background: "var(--os-ink)", color: "var(--os-bg)" },
  timelineWrap: { position: "relative", paddingTop: 16 },
  timelineRule: { position: "absolute", left: 0, right: 0, top: 36, borderTop: "1px dashed var(--os-rule)" },
  timelineRow: { display: "flex", gap: 14, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 },
  tick: {
    minWidth: 200,
    textAlign: "left",
    background: "rgba(244,241,234,0.7)",
    border: "none",
    padding: "8px 12px 10px",
    cursor: "pointer",
    color: "var(--os-ink-2)",
    position: "relative",
    fontFamily: "inherit",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  },
  tickActive: { color: "var(--os-ink)" },
  tickDone: { color: "var(--os-ink-3)" },
  tickDot: {
    position: "absolute",
    top: 30,
    left: 12,
    width: 10,
    height: 10,
    border: "1.5px solid var(--os-ink)",
    borderRadius: 999,
  },
  tickYear: { display: "block", fontSize: 26, lineHeight: 1, paddingTop: 18 },
  tickLabel: {
    display: "block",
    marginTop: 6,
    fontSize: 10,
    letterSpacing: "0.08em",
    color: "var(--os-ink-3)",
    textTransform: "uppercase",
    maxWidth: 220,
    lineHeight: 1.45,
  },
  tickProgressTrack: { position: "absolute", left: 12, right: 12, bottom: 0, height: 2, background: "var(--os-rule)" },
  tickProgressFill: { display: "block", height: 2, background: "var(--os-ink)" },
  tickPlaceholder: {
    minWidth: 160,
    color: "var(--os-ink-3)",
    alignSelf: "center",
    fontSize: 11,
    letterSpacing: "0.18em",
    paddingLeft: 10,
    borderLeft: "1px dashed var(--os-rule)",
  },

  // ── Mobile layout ────────────────────────────────────────────────
  shellMobile: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "100dvh",
    overflow: "hidden",
    color: "var(--os-ink)",
    background: "var(--os-bg)",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
  },
  topbarMobile: {
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    letterSpacing: "0.22em",
    color: "var(--os-ink-3)",
    borderBottom: "1px solid var(--os-rule)",
    flexShrink: 0,
  },
  eventPanelMobile: {
    flexShrink: 0,
    borderBottom: "1px solid var(--os-rule)",
  },
  eventInnerCompact: {
    background: "var(--os-bg)",
    padding: "12px 16px 14px",
  },
  eventTitleCompact: {
    fontSize: 20,
    lineHeight: 1.1,
    margin: "2px 0 6px",
    color: "var(--os-ink)",
  },
  eventBodyCompact: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "var(--os-ink-2)",
    margin: "0 0 8px",
  },
  globeAreaMobile: {
    flex: 1,
    position: "relative",
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  globeInnerMobile: {
    position: "relative",
    width: "90vw",
    height: "90vw",
    maxWidth: 400,
    maxHeight: 400,
  },
  bottombarMobile: {
    flexShrink: 0,
    padding: "10px 16px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid var(--os-rule)",
  },
};
