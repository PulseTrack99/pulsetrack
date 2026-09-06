"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/locale-context";

/**
 * Rebuilds the captured page inside rrweb's own sandboxed iframe.
 *
 * The snapshot is an rrweb serialisation of the real document, so what
 * appears here is the actual page — markup, inlined stylesheets, layout —
 * rather than an approximation. That is the difference between a heat
 * cloud you can act on and a set of coloured blobs.
 *
 * Sandboxing is left to `rebuildIntoSandboxedIframe`. rrweb refuses to
 * rebuild into a document it has not protected itself, which is the right
 * call: a captured page is untrusted markup, and hand-rolling the frame
 * is how you end up executing it by accident.
 *
 * The frame keeps the pixel width the capture was taken at and is scaled
 * to fit rather than reflowed. Reflowing would move every element away
 * from the coordinates the clicks were recorded against, and the heat
 * would stop lining up.
 */
export function PageReplay({
  dom,
  viewportW,
  docH,
  className = "",
}: {
  // rrweb's serialised node tree. Its shape is rrweb's concern.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dom: any;
  viewportW: number;
  docH: number;
  className?: string;
}) {
  const { t } = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [scale, setScale] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !viewportW) return;
    setScale(wrap.getBoundingClientRect().width / viewportW);
  }, [viewportW]);

  useEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    let cancelled = false;
    const wrap = wrapRef.current;
    if (!wrap || !dom) return;

    setState("loading");

    (async () => {
      try {
        const { rebuildIntoSandboxedIframe, createCache, createMirror } =
          await import("rrweb-snapshot");
        if (cancelled || !wrapRef.current) return;

        // Clear any frame from a previous path or breakpoint.
        wrapRef.current.replaceChildren();

        const { iframe } = rebuildIntoSandboxedIframe(dom, {
          root: wrapRef.current,
          cache: createCache(),
          mirror: createMirror(),
        });

        if (cancelled) {
          iframe.remove();
          return;
        }

        frameRef.current = iframe;
        applyFrameStyle(iframe, viewportW, docH);
        setState("ready");
      } catch {
        if (!cancelled) setState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dom, viewportW, docH]);

  // Re-apply on resize: the frame is created once, but the scale that
  // fits it into the panel changes with the viewport.
  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) return;
    iframe.style.transform = `scale(${scale || 0.0001})`;
    iframe.style.opacity = state === "ready" && scale > 0 ? "1" : "0";
  }, [scale, state]);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div ref={wrapRef} className="absolute inset-0" />

      {state === "failed" && (
        <div className="absolute inset-x-0 top-0 bg-amber/15 px-3 py-2 text-[11px] text-muted">
          {t.screens.replays.replayFailed}
        </div>
      )}
    </div>
  );
}

function applyFrameStyle(
  iframe: HTMLIFrameElement,
  viewportW: number,
  docH: number
) {
  iframe.setAttribute("title", "Capture de la page");
  iframe.setAttribute("scrolling", "no");
  iframe.style.cssText = [
    `width:${viewportW || 1280}px`,
    `height:${docH || 2000}px`,
    "border:0",
    "position:absolute",
    "top:0",
    "left:0",
    "transform-origin:top left",
    "pointer-events:none",
    "opacity:0",
    "transition:opacity .25s ease",
  ].join(";");
}
