import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";
import { FEATURE_SLUGS, getFeature, type FeatureSlug } from "@/content/features";
import { getAssistantFaq } from "@/content/assistant-faq";

import { SiteNav } from "@/components/marketing/site-nav";
import { Assistant } from "@/components/marketing/assistant";
import { Reveal, RevealGroup } from "@/components/marketing/reveal";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { Footer, FinalCta } from "@/components/marketing/sections";
import {
  IllustrationRevenue,
  IllustrationHeatmap,
  IllustrationFunnel,
  IllustrationPrivacy,
} from "@/components/marketing/feature-blocks";

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }));
}

function isSlug(v: string): v is FeatureSlug {
  return (FEATURE_SLUGS as readonly string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};

  const locale = await getLocale();
  const f = getFeature(locale, slug);

  return {
    title: f.metaTitle,
    description: f.metaDescription,
    alternates: { canonical: `/features/${slug}` },
    openGraph: {
      title: `${f.metaTitle} · PulseTrack`,
      description: f.metaDescription,
      url: `/features/${slug}`,
      type: "article",
    },
  };
}

export default async function FeaturePageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  const locale = await getLocale();
  const t = dictionaries[locale];
  const f = getFeature(locale, slug);

  const art = {
    revenue: <IllustrationRevenue l={t.featureRevenue.art} />,
    heatmap: <IllustrationHeatmap l={t.featureHeatmap.art} />,
    funnel: <IllustrationFunnel l={t.featureFunnel.art} />,
    privacy: <IllustrationPrivacy l={t.featurePrivacy.art} />,
    showcase: <ProductShowcase t={t.showcase} />,
  }[f.art];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: f.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const isWide = f.art === "showcase";

  return (
    <>
      <SiteNav t={t.nav} locale={locale} />

      <main>
        {/* ── Hero ── */}
        <section className="wash-hero pt-[132px] pb-16 md:pt-[152px]">
          <div className="mx-auto max-w-6xl px-6">
            <div
              className={
                isWide
                  ? "mx-auto max-w-3xl text-center"
                  : "grid items-center gap-12 lg:grid-cols-2 lg:gap-16"
              }
            >
              <div className="animate-rise">
                <span className="eyebrow">{f.eyebrow}</span>
                <h1 className="mt-5 text-[2.5rem] md:text-[3.25rem]">
                  {f.title} <span className="text-primary">{f.titleAccent}</span>
                </h1>
                <p
                  className={`mt-5 text-[16px] leading-relaxed text-muted ${
                    isWide ? "mx-auto max-w-xl" : "max-w-lg"
                  }`}
                >
                  {f.subtitle}
                </p>
                <div
                  className={`mt-8 flex flex-col gap-3 sm:flex-row ${
                    isWide ? "justify-center" : ""
                  }`}
                >
                  <Link href="/signup" className="btn btn-primary px-7 py-3.5">
                    {t.hero.primary}
                    <span className="chev" aria-hidden>
                      →
                    </span>
                  </Link>
                  <Link href="/#pricing" className="btn btn-ghost px-7 py-3.5">
                    {t.finalCta.secondary}
                  </Link>
                </div>
              </div>

              {!isWide && (
                <div className="animate-rise" style={{ animationDelay: "120ms" }}>
                  {art}
                </div>
              )}
            </div>

            {isWide && (
              <div className="mt-14 animate-rise" style={{ animationDelay: "120ms" }}>
                {art}
              </div>
            )}
          </div>
        </section>

        {/* ── Highlights ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <RevealGroup className="grid gap-10 sm:grid-cols-3 sm:gap-0">
              {f.highlights.map((h, i) => (
                <div
                  key={h.title}
                  className={`reveal sm:px-8 ${
                    i > 0 ? "sm:border-l sm:border-border" : "sm:pl-0"
                  }`}
                >
                  <h2 className="text-[17px] font-medium tracking-[-0.015em]">
                    {h.title}
                  </h2>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
                    {h.body}
                  </p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="border-t border-border bg-surface-sunken/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">
                {locale === "fr" ? "Comment ça marche" : "How it works"}
              </h2>
            </Reveal>

            <RevealGroup className="mt-10 grid gap-4 md:grid-cols-3">
              {f.steps.map((s, i) => (
                <div
                  key={s.title}
                  className="reveal rounded-lg border border-border bg-surface p-6"
                >
                  <span className="text-[13px] font-medium tabular text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-[16px]">{s.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                    {s.body}
                  </p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">
                {locale === "fr" ? "Questions fréquentes" : "Frequently asked"}
              </h2>
            </Reveal>

            <RevealGroup className="mt-10">
              {f.faq.map((item) => (
                <details
                  key={item.q}
                  className="reveal group border-b border-border py-5"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium marker:hidden">
                    {item.q}
                    <span className="shrink-0 text-muted-light transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Related ── */}
        <section className="border-t border-border bg-surface py-16">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-light">
              {locale === "fr" ? "À découvrir aussi" : "Explore next"}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {f.related.map((rel) => {
                const r = getFeature(locale, rel);
                return (
                  <Link
                    key={rel}
                    href={`/features/${rel}`}
                    className="group rounded-lg border border-border p-5 transition-colors hover:border-primary/40 hover:bg-primary-pale/25"
                  >
                    <p className="text-[12px] text-primary">{r.eyebrow}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-medium tracking-[-0.015em]">
                      {r.title}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <FinalCta
          title={
            <>
              {t.finalCta.title}{" "}
              <span className="text-primary">{t.finalCta.titleAccent}</span>
            </>
          }
          primary={t.finalCta.primary}
          secondary={t.finalCta.secondary}
          notes={t.finalCta.notes}
        />
      </main>

      <Footer
        tagline={t.footer.tagline}
        columns={t.footer.columns}
        legal={t.footer.legal}
      />

      <Assistant t={t.assistant} faq={getAssistantFaq(locale)} />

      <script
        type="application/ld+json"
        // Built from our own content catalog — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
