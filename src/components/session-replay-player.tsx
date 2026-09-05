"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Gauge, FastForward } from "lucide-react";
// Static, not dynamic: a CSS side-effect import has to be resolved by the
// bundler's CSS pipeline, which a runtime import() does not reliably do.
// It only costs anything once this component's own chunk is loaded, which
// is already gated by the dynamic import of the component itself.
import "rrweb/dist/style.css";

/**
 * Plays back one recording with rrweb's Replayer.
 *
 * rrweb is imported dynamically: the dashboard's initial bundle should
 * not carry an 80 KB player that only renders once a replay is actually
 * opened.
 */

const SPEEDS = [1, 2, 4, 8];

/**
 * rrweb renders the recording at the viewport size it was captured at —
 * often 1280×900 — and the stage had no height of its own, so the player
 * grew to whatever the recorded page was. The play button ended up
 * around 1300px down the page: you had to scroll past the entire
 * recording to start it, and once there you could no longer see which
 * session you were watching.
 *
 * The stage now has a fixed height and the recording is scaled to fit
 * inside it, the way every replay tool does it. Scaling is applied
 * straight to the DOM rather than through React state: it is pure
 * layout, it has to react to container resizes, and routing it through
 * a render would buy nothing but re-renders.
 */
function fitToStage(stage: HTMLElement, recorded: { width: number; height: number }) {
  const wrapper = stage.querySelector<HTMLElement>(".replayer-wrapper");
  if (!wrapper || !recorded.width || !recorded.height) return;

  const scale = Math.min(
    stage.clientWidth / recorded.width,
    stage.clientHeight / recorded.height,
    1 // never blow a small recording up past its real size
  );

  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.transformOrigin = "top left";
  // Centre what's left over, so a narrow recording isn't glued to the edge.
  wrapper.style.left = `${Math.max(0, (stage.clientWidth - recorded.width * scale) / 2)}px`;
  wrapper.style.top = `${Math.max(0, (stage.clientHeight - recorded.height * scale) / 2)}px`;
  wrapper.style.position = "absolute";
}

/** The capture's viewport, from rrweb's Meta event (type 4). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function recordedViewport(events: any[]): { width: number; height: number } {
  const meta = events.find((e) => e?.type === 4 && e?.data?.width);
  return {
    width: Number(meta?.data?.width ?? 0),
    height: Number(meta?.data?.height ?? 0),
  };
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function SessionReplayPlayer({
  events,
  className = "",
}: {
  // rrweb's own event shape — this component only passes it through.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: any[];
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const replayerRef = useRef<any>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const skipInactiveRef = useRef(true);
  const observerRef = useRef<ResizeObserver | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [playing, setPlaying] = useState(false);
  const [totalMs, setTotalMs] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [skipInactive, setSkipInactive] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);

  // Kept in a ref too so the rAF loop (started once) always reads the
  // latest value without needing to be torn down and restarted on every
  // state change.
  skipInactiveRef.current = skipInactive;

  const tick = useCallback(() => {
    const r = replayerRef.current;
    if (r && !scrubbing) {
      // rrweb's own timer has no defined reading before the first play/
      // seek call establishes a baseline — clamped rather than trusted
      // outright, since this loop starts polling from mount, before the
      // visitor has necessarily pressed play yet.
      const t = Math.max(0, Math.min(totalMs || Infinity, r.getCurrentTime()));
      setCurrentMs(t);
      if (progressRef.current && totalMs > 0) {
        progressRef.current.style.width = `${Math.min(100, (t / totalMs) * 100)}%`;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [scrubbing, totalMs]);

  useEffect(() => {
    let cancelled = false;
    const wrap = wrapRef.current;
    if (!wrap || !events || events.length === 0) return;

    setState("loading");
    wrap.replaceChildren();

    (async () => {
      try {
        const { Replayer } = await import("rrweb");
        if (cancelled) return;

        const replayer = new Replayer(events, {
          root: wrap,
          skipInactive: skipInactiveRef.current,
          mouseTail: true,
          showWarning: false,
          showDebug: false,
          UNSAFE_replayCanvas: false,
          blockClass: "pt-block",
        });

        // Scale the freshly-mounted recording into the stage, and keep
        // it fitted when the window (or the rail) changes the width.
        const recorded = recordedViewport(events);
        fitToStage(wrap, recorded);
        const observer = new ResizeObserver(() => fitToStage(wrap, recorded));
        observer.observe(wrap);
        observerRef.current = observer;

        replayer.on("finish", () => setPlaying(false));
        replayer.on("pause", () => setPlaying(false));
        replayer.on("resume", () => setPlaying(true));
        replayer.on("start", () => setPlaying(true));

        replayerRef.current = replayer;
        setTotalMs(replayer.getMetaData().totalTime);
        setCurrentMs(0);
        setPlaying(false);
        setState("ready");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (replayerRef.current) {
        try {
          replayerRef.current.pause();
        } catch {
          /* already torn down */
        }
      }
      replayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  useEffect(() => {
    replayerRef.current?.setConfig({ speed });
  }, [speed]);

  useEffect(() => {
    replayerRef.current?.setConfig({ skipInactive });
  }, [skipInactive]);

  function togglePlay() {
    const r = replayerRef.current;
    if (!r) return;
    if (playing) r.pause();
    else if (currentMs >= totalMs && totalMs > 0) r.play(0);
    else r.play();
  }

  function onScrub(ratio: number) {
    const r = replayerRef.current;
    if (!r || totalMs <= 0) return;
    const offset = ratio * totalMs;
    setCurrentMs(offset);
    if (progressRef.current) {
      progressRef.current.style.width = `${ratio * 100}%`;
    }
    r.pause(offset);
  }

  function onScrubEnd(ratio: number, wasPlaying: boolean) {
    setScrubbing(false);
    const r = replayerRef.current;
    if (!r || totalMs <= 0) return;
    const offset = ratio * totalMs;
    if (wasPlaying) r.play(offset);
    else r.pause(offset);
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${className}`}>
      {/* A fixed stage, not a container that grows to the recorded page.
          The clamp keeps the controls on screen on a laptop while still
          using the room a big display has.

          The rrweb mount node carries no React children of its own: the
          effect calls replaceChildren() on it, which would delete an
          element React still believes it owns — React then throws
          NotFoundError on the next removal. Hence the overlay being a
          sibling rather than a child. */}
      <div
        className="relative overflow-hidden bg-surface-sunken"
        style={{ height: "clamp(320px, 52vh, 620px)" }}
      >
        <div ref={wrapRef} className="absolute inset-0 [&_iframe]:border-0" />
        {state !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center">
            {state === "loading" ? (
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            ) : (
              <p className="text-[13px] text-muted">
                Impossible de charger cet enregistrement.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border p-3">
        <div
          className="relative h-2 cursor-pointer overflow-hidden rounded-full bg-surface-sunken"
          onMouseDown={(e) => {
            setScrubbing(true);
            const wasPlaying = playing;
            const bar = e.currentTarget;
            const update = (clientX: number) => {
              const rect = bar.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
              onScrub(ratio);
              return ratio;
            };
            const startRatio = update(e.clientX);
            let lastRatio = startRatio;

            function onMove(ev: MouseEvent) {
              lastRatio = update(ev.clientX);
            }
            function onUp() {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
              onScrubEnd(lastRatio, wasPlaying);
            }
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        >
          <div
            ref={progressRef}
            className="h-full rounded-full bg-primary"
            style={{ width: totalMs ? `${(currentMs / totalMs) * 100}%` : "0%" }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              disabled={state !== "ready"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
            </button>
            <span className="tabular text-[12px] text-muted">
              {formatTime(currentMs)} / {formatTime(totalMs)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSkipInactive((v) => !v)}
              title="Accélérer automatiquement les temps morts"
              className={`flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] transition-colors ${
                skipInactive
                  ? "bg-primary-pale text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <FastForward className="h-3 w-3" />
              Passer les temps morts
            </button>

            <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
              <Gauge className="ml-1.5 h-3 w-3 text-muted-light" />
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded-xs px-1.5 py-0.5 text-[11px] transition-colors ${
                    speed === s
                      ? "bg-primary-pale text-primary"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
