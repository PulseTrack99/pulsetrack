import { LogoMark } from "@/components/brand/logo";

/* Simplified glyphs — recognizable silhouettes, drawn to a common grid so the
   row reads as one set rather than a pile of mismatched brand assets. */

function GlyphClaude() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * 3.2}
              y1={12 + Math.sin(a) * 3.2}
              x2={12 + Math.cos(a) * 8.4}
              y2={12 + Math.sin(a) * 8.4}
            />
          );
        })}
      </g>
    </svg>
  );
}

function GlyphOpenAi() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 3.4 L18.6 7.2 V 16.8 L12 20.6 L5.4 16.8 V 7.2 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.4 V 12 L5.4 16.8 M12 12 L18.6 16.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlyphGemini() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 2.6 C 12.6 8.2 15.8 11.4 21.4 12 C 15.8 12.6 12.6 15.8 12 21.4 C 11.4 15.8 8.2 12.6 2.6 12 C 8.2 11.4 11.4 8.2 12 2.6 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlyphNotion() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect
        x="4.2"
        y="3.4"
        width="15.6"
        height="17.2"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 16.6 V 8 L 15 16.6 V 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlyphCursor() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 2.8 L20.4 7.6 V 16.4 L12 21.2 L3.6 16.4 V 7.6 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 7.6 L12 12 L20.4 7.6 M12 12 V 21.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TOOLS = [
  { name: "Claude", Icon: GlyphClaude, x: 90 },
  { name: "ChatGPT", Icon: GlyphOpenAi, x: 230 },
  { name: "Gemini", Icon: GlyphGemini, x: 370 },
  { name: "Notion", Icon: GlyphNotion, x: 510 },
  { name: "Cursor", Icon: GlyphCursor, x: 650 },
];

export function AiConnect({
  eyebrow,
  title,
  body,
  cta,
  ctaHref,
  badge,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  badge: string;
}) {
  return (
    <section className="wash-dark inverse relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-2.5 py-1 text-[13px] font-medium text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            {eyebrow}
            <span className="ml-1 rounded-xs bg-white/10 px-1.5 py-px text-[10px] uppercase tracking-wide text-white/60">
              {badge}
            </span>
          </span>

          <h2 className="mt-6">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60">
            {body}
          </p>

          <a
            href={ctaHref}
            className="btn mt-8 bg-white text-[#17171b] hover:bg-white/90"
          >
            {cta}
            <span className="chev" aria-hidden>
              →
            </span>
          </a>
        </div>

        {/* Connection diagram */}
        <div className="relative mt-16 overflow-hidden">
          <svg
            viewBox="0 0 740 300"
            className="mx-auto w-full max-w-3xl"
            role="img"
            aria-label="AI assistants connecting to PulseTrack"
          >
            <defs>
              <linearGradient id="wire" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0.34" />
              </linearGradient>
              <radialGradient id="core-glow">
                <stop offset="0%" stopColor="var(--primary-light)" stopOpacity="0.55" />
                <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.12" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Wires — each curves from its tile down into the core */}
            {TOOLS.map((tool, i) => {
              const d = `M ${tool.x} 76 C ${tool.x} 150, 370 150, 370 214`;
              return (
                <g key={tool.name}>
                  <path d={d} stroke="url(#wire)" strokeWidth="1.25" fill="none" />
                  <circle r="2.75" fill="var(--primary-light)">
                    <animateMotion
                      dur={`${2.8 + i * 0.35}s`}
                      repeatCount="indefinite"
                      path={d}
                      begin={`${i * 0.5}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur={`${2.8 + i * 0.35}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.5}s`}
                    />
                  </circle>
                </g>
              );
            })}

            {/* Tool tiles */}
            {TOOLS.map(({ name, Icon, x }) => (
              <g key={name}>
                <rect
                  x={x - 27}
                  y={22}
                  width="54"
                  height="54"
                  rx="12"
                  fill="rgba(255,255,255,0.07)"
                  stroke="rgba(255,255,255,0.16)"
                />
                <foreignObject x={x - 10} y={39} width="20" height="20">
                  <div className="flex h-5 w-5 items-center justify-center text-white/85">
                    <Icon />
                  </div>
                </foreignObject>
                <text
                  x={x}
                  y={94}
                  textAnchor="middle"
                  className="fill-white/45"
                  style={{ fontSize: 11, letterSpacing: "-0.01em" }}
                >
                  {name}
                </text>
              </g>
            ))}

            {/* Core */}
            <circle cx="370" cy="248" r="80" fill="url(#core-glow)" />
            <circle
              cx="370"
              cy="248"
              r="34"
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.22)"
            />
            <foreignObject x="352" y="230" width="36" height="36">
              <div className="flex h-9 w-9 items-center justify-center">
                <LogoMark size={30} color="#ffffff" pulseColor="#a794ff" />
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>
    </section>
  );
}
