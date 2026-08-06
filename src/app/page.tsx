import Link from "next/link";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";

import { SiteNav } from "@/components/marketing/site-nav";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { AiConnect } from "@/components/marketing/ai-connect";
import { Assistant } from "@/components/marketing/assistant";
import { Reveal } from "@/components/marketing/reveal";
import {
  FeatureBlock,
  IllustrationRevenue,
  IllustrationHeatmap,
  IllustrationFunnel,
  IllustrationPrivacy,
} from "@/components/marketing/feature-blocks";
import {
  TrustStrip,
  Benefits,
  Testimonial,
  Pricing,
  Resources,
  FinalCta,
  Footer,
} from "@/components/marketing/sections";

export default async function Home() {
  const locale = await getLocale();
  const t = dictionaries[locale];

  return (
    <>
      <SiteNav t={t.nav} locale={locale} />

      <main>
        {/* ── Hero ── */}
        <section className="wash-hero relative overflow-hidden pt-[132px] pb-20 md:pt-[152px]">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <span className="eyebrow animate-rise">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                {t.hero.badge}
              </span>

              <h1
                className="mt-6 animate-rise"
                style={{ animationDelay: "60ms" }}
              >
                {t.hero.title}{" "}
                <span className="text-primary">{t.hero.titleAccent}</span>
              </h1>

              <p
                className="mx-auto mt-6 max-w-xl animate-rise text-[17px] leading-relaxed text-muted"
                style={{ animationDelay: "120ms" }}
              >
                {t.hero.subtitle}
              </p>

              <div
                className="mt-9 flex animate-rise flex-col items-center justify-center gap-3 sm:flex-row"
                style={{ animationDelay: "180ms" }}
              >
                <Link href="/signup" className="btn btn-primary px-7 py-3.5">
                  {t.hero.primary}
                  <span className="chev" aria-hidden>
                    →
                  </span>
                </Link>
                <Link href="#how" className="btn btn-ghost px-7 py-3.5">
                  {t.hero.secondary}
                </Link>
              </div>

              <div
                className="mt-6 flex animate-rise flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-muted-light"
                style={{ animationDelay: "240ms" }}
              >
                {t.hero.notes.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>

            {/* Product, front and centre */}
            <div
              className="mt-16 animate-rise"
              style={{ animationDelay: "300ms" }}
            >
              <ProductShowcase t={t.showcase} />
            </div>
          </div>
        </section>

        <TrustStrip
          rating={t.trust.rating}
          reviews={t.trust.reviews}
          worksWith={t.trust.worksWith}
        />

        {/* ── Features, revealed on scroll ── */}
        <FeatureBlock
          eyebrow={t.featureRevenue.eyebrow}
          title={
            <>
              {t.featureRevenue.title}{" "}
              <span className="text-primary">
                {t.featureRevenue.titleAccent}
              </span>
            </>
          }
          body={t.featureRevenue.body}
          bullets={t.featureRevenue.bullets}
          linkLabel={t.featureRevenue.link}
          href="/features/revenue"
          illustration={<IllustrationRevenue l={t.featureRevenue.art} />}
        />

        <FeatureBlock
          eyebrow={t.featureHeatmap.eyebrow}
          title={t.featureHeatmap.title}
          body={t.featureHeatmap.body}
          bullets={t.featureHeatmap.bullets}
          linkLabel={t.featureHeatmap.link}
          href="/features/heatmaps"
          illustration={<IllustrationHeatmap l={t.featureHeatmap.art} />}
          flip
          tone="sunken"
        />

        <FeatureBlock
          eyebrow={t.featureFunnel.eyebrow}
          title={t.featureFunnel.title}
          body={t.featureFunnel.body}
          bullets={t.featureFunnel.bullets}
          linkLabel={t.featureFunnel.link}
          href="/features/funnels"
          illustration={<IllustrationFunnel l={t.featureFunnel.art} />}
        />

        <FeatureBlock
          eyebrow={t.featurePrivacy.eyebrow}
          title={t.featurePrivacy.title}
          body={t.featurePrivacy.body}
          bullets={t.featurePrivacy.bullets}
          linkLabel={t.featurePrivacy.link}
          href="/features/privacy"
          illustration={<IllustrationPrivacy l={t.featurePrivacy.art} />}
          flip
          tone="sunken"
        />

        {/* ── Install ── */}
        <section id="how" className="border-t border-border py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Reveal>
              <span className="eyebrow">{t.hero.secondary}</span>
              <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">
                {locale === "fr" ? "Une ligne. C'est tout." : "One line. That's it."}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
                {locale === "fr"
                  ? "Collez ce script avant la balise </head>. Les données arrivent en quelques secondes."
                  : "Paste this before your closing </head> tag. Data starts flowing within seconds."}
              </p>

              <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface-inverse p-5 text-left">
                <code className="whitespace-pre font-mono text-[12.5px] leading-relaxed text-white/85">
                  {`<script src="https://pulsetrack.io/t.js"\n        data-site="YOUR_SITE_ID" defer></script>`}
                </code>
              </div>
            </Reveal>
          </div>
        </section>

        <AiConnect
          eyebrow={t.aiConnect.eyebrow}
          badge={t.aiConnect.badge}
          title={t.aiConnect.title}
          body={t.aiConnect.body}
          cta={t.aiConnect.cta}
          ctaHref="/signup"
        />

        <Benefits
          title={t.benefits.title}
          ctaLabel={t.benefits.cta}
          items={t.benefits.items}
        />

        <Testimonial
          quote={t.testimonial.quote}
          author={t.testimonial.author}
          role={t.testimonial.role}
          sampleLabel={t.testimonial.sampleLabel}
        />

        <Pricing
          eyebrow={t.pricing.eyebrow}
          title={t.pricing.title}
          subtitle={t.pricing.subtitle}
          plans={t.pricing.plans}
          popular={t.pricing.popular}
          perMonth={t.pricing.perMonth}
        />

        <Resources items={t.resources.items} />

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

      <Assistant t={t.assistant} />
    </>
  );
}
