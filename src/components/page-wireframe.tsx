export interface SnapshotElement {
  x: number;
  y: number;
  w: number;
  h: number;
  /** t text · b button/link · i image · f form field · c container */
  k: string;
  /** Font size in px at capture time, for text elements. */
  s: number;
  /** Label, present for controls and headings only. */
  l?: string;
}

/**
 * Redraws the page's layout from the geometry the tracker captured, so the
 * heat sits over something recognisable.
 *
 * This replaces framing the live page, which fails whenever the site sends
 * X-Frame-Options, sits behind a login, lives on a host the dashboard
 * cannot reach, or has been redesigned since the clicks were recorded.
 *
 * Headings and controls carry their own labels — without them the result
 * is a grid of grey rectangles that nobody recognises as their own page.
 * Body copy renders as bars and form fields as empty outlines, because
 * their contents never left the visitor's browser.
 */
export function PageWireframe({
  elements,
  className = "",
}: {
  elements: SnapshotElement[];
  className?: string;
}) {
  // Painted back to front: containers, media, body text, then controls,
  // so small interactive elements stay on top.
  const order: Record<string, number> = { c: 0, i: 1, t: 2, f: 3, b: 4 };
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
    overflow: "hidden",
  };

  const label = el.l?.trim();

  switch (el.k) {
    case "b":
      return (
        <div
          style={{
            ...style,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(31,32,35,0.82)",
            color: "#fff",
            borderRadius: 4,
            fontSize: "clamp(7px, 0.75em, 12px)",
            fontWeight: 500,
            padding: "0 4px",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      );

    case "i":
      return (
        <div
          style={{
            ...style,
            background:
              "repeating-linear-gradient(135deg, rgba(31,32,35,0.10) 0 7px, rgba(31,32,35,0.17) 7px 14px)",
            borderRadius: 3,
          }}
        />
      );

    case "f":
      return (
        <div
          style={{
            ...style,
            border: "1.5px solid rgba(31,32,35,0.35)",
            borderRadius: 3,
            background: "#fff",
          }}
        />
      );

    case "t": {
      // Headings keep their words. Body copy becomes stacked bars, which
      // conveys "there is a paragraph here" without shipping the prose.
      const isHeading = el.s >= 20;

      if (isHeading && label) {
        return (
          <div
            style={{
              ...style,
              display: "flex",
              alignItems: "center",
              color: "rgba(31,32,35,0.88)",
              fontWeight: 600,
              fontSize: "clamp(8px, 1.05em, 22px)",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        );
      }

      return (
        <div style={{ ...style, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
          {Array.from({ length: Math.max(1, Math.round(el.h * 34)) }).map(
            (_, i, arr) => (
              <span
                key={i}
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(31,32,35,0.20)",
                  // A ragged last line reads as prose rather than a block.
                  width: i === arr.length - 1 && arr.length > 1 ? "62%" : "100%",
                }}
              />
            )
          )}
        </div>
      );
    }

    default:
      return (
        <div
          style={{
            ...style,
            background: "rgba(31,32,35,0.035)",
            border: "1px solid rgba(31,32,35,0.10)",
            borderRadius: 4,
          }}
        />
      );
  }
}
