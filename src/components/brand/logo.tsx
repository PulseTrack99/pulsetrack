/**
 * PulseTrack mark.
 *
 * The letter P doing double duty: its stem and bowl form the letterform,
 * the bowl reads as a magnifying lens, and a diagonal handle completes the
 * glass. Inside the lens sits a pulse trace — the "Pulse" in PulseTrack, and
 * the thing the glass is examining.
 */

export function LogoMark({
  size = 32,
  className = "",
  color = "currentColor",
  pulseColor,
}: {
  size?: number;
  className?: string;
  color?: string;
  /** Defaults to the brand violet so the trace reads inside the lens. */
  pulseColor?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      {/* Handle — drawn first so the lens rim overlaps it cleanly */}
      <path
        d="M23.4 19.4 L28.2 24.4"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* Lens / bowl of the P */}
      <circle cx="17" cy="13" r="7.8" stroke={color} strokeWidth="3.4" />

      {/* Stem of the P */}
      <path
        d="M7.6 4.2 V 27.8"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* Pulse trace inside the lens */}
      <path
        d="M12.4 13 H 14.6 L 16 9.9 L 18.1 16.4 L 19.4 13 H 21.6"
        stroke={pulseColor ?? "var(--primary)"}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  markSize = 28,
  showWord = true,
}: {
  className?: string;
  markSize?: number;
  showWord?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={markSize} />
      {showWord && (
        <span className="text-[1.0625rem] font-medium tracking-[-0.03em]">
          PulseTrack
        </span>
      )}
      <span className="sr-only">PulseTrack</span>
    </span>
  );
}
