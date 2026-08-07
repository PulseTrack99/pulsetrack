import Link from "next/link";
import { Check, ArrowRight, Cookie, Ban, Gauge, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";

/* ══════════════════════════════════════════════════════════════
   Layout
   ══════════════════════════════════════════════════════════════ */

export function FeatureBlock({
  eyebrow,
  title,
  body,
  bullets,
  linkLabel,
  href,
  illustration,
  flip = false,
  tone = "default",
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  bullets: string[];
  linkLabel: string;
  href: string;
  illustration: React.ReactNode;
  flip?: boolean;
  tone?: "default" | "sunken";
}) {
  return (
    <section
      className={`border-t border-border py-20 md:py-28 ${
        tone === "sunken" ? "bg-surface-sunken/50" : ""
      }`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className={flip ? "lg:order-2" : ""}>
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">{title}</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
              {body}
            </p>

            <ul className="mt-6 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14px]">
                  <Check className="mt-[3px] h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary"
            >
              {linkLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

          <Reveal className={flip ? "lg:order-1" : ""}>{illustration}</Reveal>
        </div>
      </div>
    </section>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-surface"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Revenue attribution — a single visitor traced to a payment
   ══════════════════════════════════════════════════════════════ */

export function IllustrationRevenue({
  l,
}: {
  l: {
    journey: string;
    clicked: string;
    landed: string;
    identified: string;
    paid: string;
    attributed: string;
    source: string;
  };
}) {
  const steps = [
    { label: l.clicked, meta: "twitter.com", tint: "var(--sky)" },
    { label: l.landed, meta: "/pricing", tint: "var(--primary)" },
    { label: l.identified, meta: "ana@studio.co", tint: "var(--amber)" },
    { label: l.paid, meta: "€49.00", tint: "var(--emerald)" },
  ];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-medium text-muted">{l.journey}</p>
      </div>

      <div className="relative p-5">
        {/* Spine */}
        <span className="absolute left-[26px] top-9 bottom-16 w-px bg-border" />

        <div className="space-y-3.5">
          {steps.map((s, i) => (
            <div key={s.label} className="relative flex items-center gap-3.5">
              <span
                className="relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-surface"
                style={{ background: s.tint }}
              >
                {i === steps.length - 1 && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: s.tint,
                      animation: "pulse-dot 2s ease-in-out infinite",
                      opacity: 0.4,
                    }}
                  />
                )}
              </span>

              <div className="flex flex-1 items-center justify-between rounded-sm border border-border bg-surface px-3 py-2.5">
                <span className="text-[12.5px] font-medium">{s.label}</span>
                <span
                  className="tabular rounded-xs px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    color: s.tint,
                    background: `color-mix(in srgb, ${s.tint} 12%, transparent)`,
                  }}
                >
                  {s.meta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Attribution result */}
        <div className="mt-4 flex items-center justify-between rounded-sm border border-emerald/30 bg-emerald-pale px-3.5 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-emerald">
              {l.attributed}
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-foreground">
              {l.source} · Twitter / X
            </p>
          </div>
          <span className="tabular text-xl font-medium text-emerald">
            +€49
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* ══════════════════════════════════════════════════════════════
   Heatmap
   ══════════════════════════════════════════════════════════════ */

const BLOBS = [
  { x: 26, y: 20, s: 96, i: 0.85 },
  { x: 66, y: 34, s: 72, i: 0.6 },
  { x: 38, y: 56, s: 84, i: 0.95 },
  { x: 72, y: 70, s: 64, i: 0.55 },
  { x: 20, y: 76, s: 58, i: 0.45 },
];

export function IllustrationHeatmap({
  l,
}: {
  l: { title: string; hot: string; cold: string; cta: string };
}) {
  return (
    <Frame>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-medium text-muted">{l.title}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-light">
          <span>{l.cold}</span>
          <span
            className="h-1.5 w-16 rounded-full"
            style={{
              background:
                "linear-gradient(90deg,#3ec88a,#f5d423,#ff9d2e,#ff3c00)",
            }}
          />
          <span>{l.hot}</span>
        </div>
      </div>

      <div className="relative overflow-hidden bg-surface-sunken p-6">
        <div className="space-y-4">
          <div className="mx-auto h-5 w-2/5 rounded-xs bg-black/14" />
          <div className="mx-auto h-2 w-1/2 rounded-xs bg-black/8" />
          <div className="flex justify-center gap-2.5 pt-2">
            <div className="h-8 w-28 rounded-sm bg-black/20" />
            <div className="h-8 w-28 rounded-sm bg-black/8" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xs border border-black/8 bg-white/60 p-3">
                <div className="h-1.5 w-8 rounded-xs bg-black/10" />
                <div className="mt-2 h-4 w-12 rounded-xs bg-black/14" />
                <div className="mt-3 space-y-1">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="h-1 w-full rounded-xs bg-black/6" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0">
          {BLOBS.map((b, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-multiply"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.s,
                height: b.s,
                background: `radial-gradient(circle, rgba(255,60,0,${
                  0.6 * b.i
                }) 0%, rgba(255,157,46,${0.42 * b.i}) 34%, rgba(245,212,35,${
                  0.3 * b.i
                }) 54%, rgba(62,200,138,${0.2 * b.i}) 72%, transparent 82%)`,
                filter: "blur(8px)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-[11px] text-muted">{l.cta}</span>
        <span className="tabular text-[11px] font-medium text-coral">
          126 rage clicks
        </span>
      </div>
    </Frame>
  );
}

/* ══════════════════════════════════════════════════════════════
   Funnel
   ══════════════════════════════════════════════════════════════ */

export function IllustrationFunnel({
  l,
}: {
  l: { title: string; steps: string[]; lost: string; converted: string };
}) {
  const pcts = [100, 62, 38, 19];

  return (
    <Frame>
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-medium text-muted">{l.title}</p>
      </div>

      <div className="p-5">
        <svg viewBox="0 0 340 210" className="w-full">
          {pcts.map((p, i) => {
            const next = pcts[i + 1] ?? p * 0.62;
            const y = i * 50;
            const topW = (p / 100) * 300;
            const botW = (next / 100) * 300;
            const x1 = 170 - topW / 2;
            const x2 = 170 + topW / 2;
            const x3 = 170 + botW / 2;
            const x4 = 170 - botW / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y} L ${x2} ${y} L ${x3} ${y + 42} L ${x4} ${y + 42} Z`}
                  fill="var(--primary)"
                  opacity={0.92 - i * 0.19}
                />
                <text
                  x="170"
                  y={y + 26}
                  textAnchor="middle"
                  className="fill-white"
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  {p}%
                </text>
                <text
                  x="12"
                  y={y + 26}
                  className="fill-current text-muted"
                  style={{ fontSize: 10.5 }}
                >
                  {l.steps[i]}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-light">
              {l.lost}
            </p>
            <p className="tabular mt-0.5 text-lg font-medium text-coral">81%</p>
          </div>
          <div className="rounded-sm border border-emerald/30 bg-emerald-pale px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald">
              {l.converted}
            </p>
            <p className="tabular mt-0.5 text-lg font-medium text-emerald">19%</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ══════════════════════════════════════════════════════════════
   Privacy — the side-by-side that sells the differentiator
   ══════════════════════════════════════════════════════════════ */

export function IllustrationPrivacy({
  l,
}: {
  l: {
    them: string;
    us: string;
    weight: string;
    cookies: string;
    banner: string;
    yes: string;
    no: string;
    required: string;
    notRequired: string;
  };
}) {
  const rows = [
    { icon: Gauge, label: l.weight, them: "144 KB", us: "2 KB" },
    { icon: Cookie, label: l.cookies, them: l.yes, us: l.no },
    { icon: Ban, label: l.banner, them: l.required, us: l.notRequired },
  ];

  return (
    <Frame>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border px-4 py-3 text-[11px]">
        <span className="text-muted-light" />
        <span className="w-[76px] text-center font-medium text-muted-light">
          {l.them}
        </span>
        <span className="flex w-[76px] items-center justify-center gap-1 font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {l.us}
        </span>
      </div>

      {rows.map(({ icon: Icon, label, them, us }) => (
        <div
          key={label}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border px-4 py-3.5 last:border-0"
        >
          <span className="flex items-center gap-2.5 text-[13px]">
            <Icon className="h-4 w-4 text-muted-light" />
            {label}
          </span>
          <span className="tabular w-[76px] text-center text-[12.5px] text-muted line-through decoration-coral/50">
            {them}
          </span>
          <span className="tabular w-[76px] rounded-sm bg-primary-pale py-1 text-center text-[12.5px] font-medium text-primary">
            {us}
          </span>
        </div>
      ))}

      <div className="bg-surface-sunken/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
            <div className="h-full w-[1.1%] rounded-full bg-primary" />
          </div>
          <span className="tabular text-[11px] font-medium text-primary">
            −99%
          </span>
        </div>
      </div>
    </Frame>
  );
}
