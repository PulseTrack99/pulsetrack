export interface SnapshotElement {
  x: number;
  y: number;
  w: number;
  h: number;
  /** t text · b button/link · i image · f form field · c container */
  k: string;
  /** Font size in px at capture time, for text elements. */
  s: number;
}

/**
 * Redraws the page's layout from the geometry the tracker captured, so the
 * heat sits over something recognisable.
 *
 * This replaces framing the live page, which fails whenever the site sends
 * X-Frame-Options, sits behind a login, lives on a host the dashboard
 * cannot reach, or has been redesigned since the clicks were recorded.
 * Only boxes were captured — never text — so the result reads like a
 * wireframe rather than a screenshot.
 */
export function PageWireframe({
  elements,
  className = "",
}: {
  elements: SnapshotElement[];
  className?: string;
}) {
  // Painted back to front: containers, then media, then text, then the
  // controls, so small interactive elements stay visible.
  const order: Record<string, number> = { c: 0, i: 1, f: 2, t: 3, b: 4 };
  const sorted = [...elements].sort(
    (a, b) => (order[a.k] ?? 0) - (order[b.k] ?? 0)
  );

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {sorted.map((el, i) => (
        <Box key={i} el={el} />
      ))}
    </div>
  );
}

function Box({ el }: { el: SnapshotElement }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${el.x * 100}%`,
    top: `${el.y * 100}%`,
    width: `${el.w * 100}%`,
    height: `${el.h * 100}%`,
  };

  switch (el.k) {
    case "b":
      return (
        <div
          style={{
            ...style,
            background: "rgba(31,32,35,0.16)",
            borderRadius: 4,
          }}
        />
      );

    case "i":
      return (
        <div
          style={{
            ...style,
            background:
              "repeating-linear-gradient(135deg, rgba(31,32,35,0.07) 0 6px, rgba(31,32,35,0.11) 6px 12px)",
            borderRadius: 3,
          }}
        />
      );

    case "f":
      return (
        <div
          style={{
            ...style,
            border: "1px solid rgba(31,32,35,0.22)",
            borderRadius: 3,
            background: "rgba(255,255,255,0.6)",
          }}
        />
      );

    case "t":
      // Headings get a heavier bar than body copy, which is enough to
      // make the page's hierarchy legible at a glance.
      return (
        <div
          style={{
            ...style,
            background:
              el.s >= 24
                ? "rgba(31,32,35,0.24)"
                : el.s >= 17
                  ? "rgba(31,32,35,0.15)"
                  : "rgba(31,32,35,0.10)",
            borderRadius: 2,
          }}
        />
      );

    default:
      return (
        <div
          style={{
            ...style,
            border: "1px solid rgba(31,32,35,0.06)",
            borderRadius: 3,
          }}
        />
      );
  }
}
