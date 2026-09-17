import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, X } from "lucide-react";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";
import { languageAlternates, localePath } from "@/i18n/paths";
import { getAssistantFaq } from "@/content/assistant-faq";
import { COMPARE_SLUGS, getComparison, type CellState, type CompareSlug } from "@/content/compare";
import { SiteNav } from "@/components/marketing/site-nav";
import { Assistant } from "@/components/marketing/assistant";
import { Reveal, RevealGroup } from "@/components/marketing/reveal";
import { Footer, FinalCta } from "@/components/marketing/sections";

/**
 * Une page de comparaison — contenu et règles d'honnêteté dans
 * src/content/compare.ts.
 */

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

function isSlug(v: string): v is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(v);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const locale = await getLocale();
  const c = getComparison(locale, slug);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: languageAlternates(locale, `/compare/${slug}`),
    openGraph: {
      title: `${c.metaTitle} · PulseTrack`,
      description: c.metaDescription,
      url: localePath(locale, `/compare/${slug}`),
      type: "article",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
  };
}

function Cell({ state, text }: { state: CellState; text: string }) {
  const icon =
    state === "yes" ? (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <Check className="h-3 w-3 text-emerald-600" aria-hidden />
      </span>
    ) : state === "partial" ? (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Minus className="h-3 w-3 text-amber-600" aria-hidden />
      </span>
    ) : state === "no" ? (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken">
        <X className="h-3 w-3 text-muted-light" aria-hidden />
      </span>
    ) : null;

  return (
    <div className="flex items-start gap-2.5">
      {icon}
      <span className={`text-[13.5px] leading-relaxed ${state === "info" ? "text-foreground" : "text-muted"}`}>{text}</span>
    </div>
  );
}

export default async function ComparePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  const locale = await getLocale();
  const t = dictionaries[locale];
  const c = getComparison(locale, slug);
  const fr = locale === "fr";

  const checked = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${c.checkedOn}T00:00:00Z`));

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <SiteNav t={t.nav} locale={locale} />

      <main>
        {/* ── Hero ── */}
        <section className="wash-hero pt-[132px] pb-16 md:pt-[152px]">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <span className="eyebrow animate-rise">{c.eyebrow}</span>
            <h1 className="mt-5 animate-rise text-[2.4rem] md:text-[3.1rem]" style={{ animationDelay: "60ms" }}>
              {c.title}
            </h1>
            <p
              className="mx-auto mt-5 max-w-2xl animate-rise text-[16px] leading-relaxed text-muted"
              style={{ animationDelay: "120ms" }}
            >
              {c.subtitle}
            </p>
            <div
              className="mt-8 flex animate-rise flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "180ms" }}
            >
              <Link href="/signup" className="btn btn-primary px-7 py-3.5">
                {t.hero.primary}
                <span className="chev" aria-hidden>
                  →
                </span>
              </Link>
              <Link href={localePath(locale, "/#pricing")} className="btn btn-ghost px-7 py-3.5">
                {t.finalCta.secondary}
              </Link>
            </div>
          </div>
        </section>

        {/* ── In short ── */}
        <section className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-6">
            <RevealGroup className="grid gap-10 sm:grid-cols-3 sm:gap-0">
              {c.summary.map((s, i) => (
                <div key={s.title} className={`reveal sm:px-8 ${i > 0 ? "sm:border-l sm:border-border" : "sm:pl-0"}`}>
                  <h2 className="text-[17px] font-medium tracking-[-0.015em]">{s.title}</h2>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Table ── */}
        <section className="border-t border-border bg-surface-sunken/50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">
                {fr ? "Critère par critère" : "Side by side"}
              </h2>
            </Reveal>

            <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-[28%] px-5 py-3.5 text-[12px] font-medium uppercase tracking-wide text-muted-light">
                      {fr ? "Critère" : "Criterion"}
                    </th>
                    <th className="w-[36%] bg-primary-pale/40 px-5 py-3.5 text-[13px] font-semibold text-primary">
                      PulseTrack
                    </th>
                    <th className="w-[36%] px-5 py-3.5 text-[13px] font-semibold">{c.competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.criterion} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-5 py-4 align-top text-[14px] font-medium">
                        {r.criterion}
                      </th>
                      <td className="bg-primary-pale/20 px-5 py-4 align-top">
                        <Cell {...r.us} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <Cell {...r.them} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Which one to choose ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto grid max-w-5xl gap-6 px-6 md:grid-cols-2">
            {[c.chooseUs, c.chooseThem].map((block, i) => (
              <Reveal key={block.title} className={`rounded-lg border p-7 ${i === 0 ? "border-primary/30 bg-primary-pale/20" : "border-border bg-surface"}`}>
                <h2 className="text-[20px] font-medium tracking-[-0.015em]">{block.title}</h2>
                <ul className="mt-5 space-y-3">
                  {block.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14.5px] leading-relaxed text-muted">
                      <Check className={`mt-1 h-3.5 w-3.5 shrink-0 ${i === 0 ? "text-primary" : "text-muted-light"}`} aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Details ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl space-y-10 px-6">
            {c.details.map((d) => (
              <Reveal key={d.title}>
                <h2 className="text-[1.5rem] md:text-[1.75rem]">{d.title}</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{d.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">{fr ? "Questions fréquentes" : "Frequently asked"}</h2>
            </Reveal>
            <RevealGroup className="mt-10">
              {c.faq.map((item) => (
                <details key={item.q} className="reveal group border-b border-border py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium marker:hidden">
                    {item.q}
                    <span className="shrink-0 text-muted-light transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Sources ── */}
        <section className="border-t border-border bg-surface py-12">
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-light">
              {fr ? `Sources, vérifiées le ${checked}` : `Sources, checked on ${checked}`}
            </p>
            <ul className="mt-4 space-y-2">
              {c.sources.map((s) => (
                <li key={s.url} className="text-[13px]">
                  <a href={s.url} rel="nofollow noopener" target="_blank" className="text-muted underline-offset-2 hover:text-foreground hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12.5px] leading-relaxed text-muted-light">
              {fr
                ? `Les produits évoluent : une information vous semble dépassée ? Elle était exacte à la date ci-dessus, et nous corrigeons dès qu'on nous le signale. ${c.competitor} est une marque de son propriétaire, sans lien avec PulseTrack.`
                : `Products change: something looks out of date? It was accurate on the date above, and we correct it as soon as it is reported. ${c.competitor} is a trademark of its owner, not affiliated with PulseTrack.`}
            </p>
          </div>
        </section>

        <FinalCta
          title={
            <>
              {t.finalCta.title} <span className="text-primary">{t.finalCta.titleAccent}</span>
            </>
          }
          primary={t.finalCta.primary}
          secondary={t.finalCta.secondary}
          notes={t.finalCta.notes}
          locale={locale}
        />
      </main>

      <Footer tagline={t.footer.tagline} legal={t.footer.legal} locale={locale} />

      <Assistant t={t.assistant} faq={getAssistantFaq(locale)} locale={locale} />

      <script
        type="application/ld+json"
        // Contenu statique de src/content/compare.ts, aucune saisie.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
