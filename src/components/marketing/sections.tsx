import Link from "next/link";
import {
  Check,
  Zap,
  Brain,
  Blocks,
  TrendingUp,
  LifeBuoy,
  BookOpen,
  Users,
  Sparkles,
} from "lucide-react";
import { Reveal, RevealGroup } from "./reveal";
import { LogoMark } from "@/components/brand/logo";
import { INTEGRATIONS } from "@/components/brand/integration-logos";

/* ══════════════════════════════════════════════════════════════
   Trust strip — every claim here is verifiable today
   ══════════════════════════════════════════════════════════════ */

export function TrustStrip({
  rating,
  reviews,
  worksWith,
}: {
  rating: string;
  reviews: string;
  worksWith: string;
}) {
  // Rendered twice so the -50% translate lands on an identical frame.
  const lane = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-3.5 border-b border-border px-6 py-6 md:border-b-0 md:border-r md:py-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary-pale">
            <Sparkles className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <p className="text-[15px] font-medium tracking-[-0.02em]">{rating}</p>
            <p className="text-[12px] text-muted-light">{reviews}</p>
          </div>
        </div>

        <div className="min-w-0 py-6 md:py-7">
          <p className="px-6 text-[12px] text-muted-light">{worksWith}</p>

          <div
            className="marquee mt-3.5"
            style={{ "--marquee-duration": "46s" } as React.CSSProperties}
          >
            <div className="marquee-track">
              {lane.map(({ name, hex, path }, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex shrink-0 items-center gap-2.5 px-6"
                  // The second pass exists only to make the loop seamless.
                  aria-hidden={i >= INTEGRATIONS.length}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[22px] w-[22px] shrink-0"
                    aria-hidden="true"
                  >
                    <path d={path} fill={hex} />
                  </svg>
                  <span className="whitespace-nowrap text-[16px] font-semibold tracking-[-0.025em] text-foreground/80">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Drop real customer logos in here once you have signed, referenceable
 * customers — swap the strings for <Image> marks and render it under
 * <TrustStrip>. Keeping it empty until then is deliberate.
 */
export function CustomerLogos({
  label,
  logos,
}: {
  label: string;
  logos: { name: string; src?: string }[];
}) {
  if (logos.length === 0) return null;
  return (
    <section className="border-b border-border bg-surface py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-[12px] text-muted-light">{label}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((l) => (
            <span
              key={l.name}
              className="text-[17px] font-medium tracking-[-0.02em] text-muted-light"
            >
              {l.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Benefits — hairline grid
   ══════════════════════════════════════════════════════════════ */

export function Benefits({
  title,
  ctaLabel,
  items,
}: {
  title: string;
  ctaLabel: string;
  items: { icon: string; title: string; body: string }[];
}) {
  const ICONS: Record<string, typeof Zap> = {
    speed: Zap,
    ai: Brain,
    flexible: Blocks,
    scale: TrendingUp,
  };

  return (
    <section className="border-t border-border py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-col items-start justify-between gap-6 pb-12 md:flex-row md:items-end">
          <h2 className="max-w-lg text-[2rem] md:text-[2.5rem]">{title}</h2>
          <Link href="/signup" className="btn btn-primary shrink-0">
            {ctaLabel}
            <span className="chev" aria-hidden>
              →
            </span>
          </Link>
        </Reveal>

        <RevealGroup className="grid gap-px border-t border-border sm:grid-cols-2">
          {items.map((it) => {
            const Icon = ICONS[it.icon] ?? Zap;
            return (
              <div key={it.title} className="reveal border-b border-border py-8 sm:odd:pr-10 sm:even:border-l sm:even:pl-10">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3.5 text-[17px]">{it.title}</h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">
                  {it.body}
                </p>
              </div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Testimonial
   ══════════════════════════════════════════════════════════════ */

export function Testimonial({
  quote,
  author,
  role,
  sampleLabel,
}: {
  quote: string;
  author: string;
  role: string;
  /** Rendered while the quote is illustrative rather than a real customer. */
  sampleLabel?: string;
}) {
  return (
    <section className="border-t border-border bg-surface py-20 md:py-28">
      <Reveal className="mx-auto max-w-3xl px-6 text-center">
        <LogoMark size={30} className="mx-auto text-primary" />
        <blockquote className="mt-8">
          <p
            className="text-[1.5rem] leading-[1.35] tracking-[-0.02em] md:text-[2rem]"
            style={{ fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic" }}
          >
            &ldquo;{quote}&rdquo;
          </p>
        </blockquote>
        <figcaption className="mt-7 text-[13.5px]">
          <span className="font-medium">{author}</span>
          <span className="text-muted"> · {role}</span>
        </figcaption>
        {sampleLabel && (
          <p className="mt-4 inline-block rounded-sm bg-surface-sunken px-2.5 py-1 text-[11px] text-muted-light">
            {sampleLabel}
          </p>
        )}
      </Reveal>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Pricing
   ══════════════════════════════════════════════════════════════ */

export interface Plan {
  name: string;
  price: string;
  description: string;
  cta: string;
  features: string[];
}

export function Pricing({
  eyebrow,
  title,
  subtitle,
  plans,
  popular,
  perMonth,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  plans: Plan[];
  popular: string;
  perMonth: string;
}) {
  return (
    <section id="pricing" className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">{title}</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
            {subtitle}
          </p>
        </Reveal>

        <RevealGroup className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => {
            const featured = i === 2;
            return (
              <div
                key={plan.name}
                className={`reveal relative flex flex-col rounded-lg border bg-surface p-6 ${
                  featured
                    ? "border-primary/40"
                    : "border-border"
                }`}
                style={featured ? { boxShadow: "var(--shadow-lg)" } : undefined}
              >
                {featured && (
                  <span className="absolute -top-2.5 left-6 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    {popular}
                  </span>
                )}

                <h3 className="text-[15px] font-medium">{plan.name}</h3>
                <p className="mt-1 text-[12px] text-muted-light">
                  {plan.description}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[2rem] font-medium tracking-[-0.03em]">
                    €{plan.price}
                  </span>
                  {plan.price !== "0" && (
                    <span className="text-[13px] text-muted-light">
                      {perMonth}
                    </span>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-muted">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`btn mt-7 w-full ${
                    featured ? "btn-brand" : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Resources
   ══════════════════════════════════════════════════════════════ */

export function Resources({
  items,
}: {
  items: { icon: string; title: string; body: string; cta: string; href: string }[];
}) {
  const ICONS: Record<string, typeof LifeBuoy> = {
    support: LifeBuoy,
    docs: BookOpen,
    community: Users,
  };

  return (
    <section className="border-t border-border py-4">
      <div className="mx-auto max-w-6xl px-6">
        {items.map((it) => {
          const Icon = ICONS[it.icon] ?? BookOpen;
          return (
            <div
              key={it.title}
              className="flex flex-col gap-4 border-b border-border py-7 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3.5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-[16px]">{it.title}</h3>
                  <p className="mt-1 text-[13.5px] text-muted">{it.body}</p>
                </div>
              </div>
              <Link href={it.href} className="btn btn-secondary shrink-0 self-start sm:self-auto">
                {it.cta}
                <span className="chev" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Final CTA
   ══════════════════════════════════════════════════════════════ */

export function FinalCta({
  title,
  primary,
  secondary,
  notes,
}: {
  title: React.ReactNode;
  primary: string;
  secondary: string;
  notes: string[];
}) {
  return (
    <section className="wash-brand relative overflow-hidden border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-[2.25rem] md:text-[3rem]">{title}</h2>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn btn-primary px-7 py-3.5">
            {primary}
            <span className="chev" aria-hidden>
              →
            </span>
          </Link>
          <Link href="/#pricing" className="btn btn-ghost px-7 py-3.5">
            {secondary}
          </Link>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] text-muted">
          {notes.map((n) => (
            <span key={n} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   Footer
   ══════════════════════════════════════════════════════════════ */

export function Footer({
  tagline,
  columns,
  legal,
}: {
  tagline: string;
  columns: { title: string; links: { label: string; href: string }[] }[];
  legal: string;
}) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <LogoMark size={30} />
            <p className="mt-4 max-w-[15rem] text-[13px] leading-relaxed text-muted">
              {tagline}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted-light">
                {col.title}
              </p>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <p className="text-[12.5px] text-muted-light">{legal}</p>
        </div>
      </div>
    </footer>
  );
}
