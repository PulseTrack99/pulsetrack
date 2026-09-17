import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getLocale } from "@/i18n/get-locale";
import { dictionaries } from "@/i18n/dictionaries";
import { languageAlternates, localePath } from "@/i18n/paths";
import { getAssistantFaq } from "@/content/assistant-faq";
import { USE_CASE_SLUGS, getUseCase, type UseCaseSlug } from "@/content/use-cases";
import { SiteNav } from "@/components/marketing/site-nav";
import { Assistant } from "@/components/marketing/assistant";
import { Reveal, RevealGroup } from "@/components/marketing/reveal";
import { Footer, FinalCta } from "@/components/marketing/sections";

/** Une page par cas d'usage — contenu dans src/content/use-cases.ts. */

export function generateStaticParams() {
  return USE_CASE_SLUGS.map((slug) => ({ slug }));
}

function isSlug(v: string): v is UseCaseSlug {
  return (USE_CASE_SLUGS as readonly string[]).includes(v);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const locale = await getLocale();
  const u = getUseCase(locale, slug);
  return {
    title: u.metaTitle,
    description: u.metaDescription,
    alternates: languageAlternates(locale, `/use-cases/${slug}`),
    openGraph: {
      title: `${u.metaTitle} · PulseTrack`,
      description: u.metaDescription,
      url: localePath(locale, `/use-cases/${slug}`),
      type: "article",
      locale: locale === "fr" ? "fr_FR" : "en_US",
    },
  };
}

export default async function UseCasePageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  const locale = await getLocale();
  const t = dictionaries[locale];
  const u = getUseCase(locale, slug);
  const fr = locale === "fr";

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: u.faq.map((item) => ({
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
            <span className="eyebrow animate-rise">{u.eyebrow}</span>
            <h1 className="mt-5 animate-rise text-[2.5rem] md:text-[3.25rem]" style={{ animationDelay: "60ms" }}>
              {u.title} <span className="text-primary">{u.titleAccent}</span>
            </h1>
            <p
              className="mx-auto mt-5 max-w-2xl animate-rise text-[16px] leading-relaxed text-muted"
              style={{ animationDelay: "120ms" }}
            >
              {u.subtitle}
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

        {/* ── Problems ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">{u.problemsTitle}</h2>
            </Reveal>
            <RevealGroup className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-0">
              {u.problems.map((p, i) => (
                <div key={p.title} className={`reveal sm:px-8 ${i > 0 ? "sm:border-l sm:border-border" : "sm:pl-0"}`}>
                  <h3 className="text-[17px] font-medium tracking-[-0.015em]">{p.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{p.body}</p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Capabilities ── */}
        <section className="border-t border-border bg-surface-sunken/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">{u.capabilitiesTitle}</h2>
            </Reveal>
            <RevealGroup className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {u.capabilities.map((cap) => (
                <div key={cap.title} className="reveal flex flex-col rounded-lg border border-border bg-surface p-6">
                  <h3 className="text-[16px]">{cap.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">{cap.body}</p>
                  {cap.href && (
                    <Link
                      href={localePath(locale, cap.href)}
                      className="group mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
                    >
                      {fr ? "En savoir plus" : "Learn more"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">{fr ? "Comment démarrer" : "How to start"}</h2>
            </Reveal>
            <RevealGroup className="mt-10 grid gap-4 md:grid-cols-3">
              {u.steps.map((s, i) => (
                <div key={s.title} className="reveal rounded-lg border border-border bg-surface p-6">
                  <span className="text-[13px] font-medium tabular text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-[16px]">{s.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <h2 className="text-[2rem] md:text-[2.25rem]">{fr ? "Questions fréquentes" : "Frequently asked"}</h2>
            </Reveal>
            <RevealGroup className="mt-10">
              {u.faq.map((item) => (
                <details key={item.q} className="reveal group border-b border-border py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium marker:hidden">
                    {item.q}
                    <span className="shrink-0 text-muted-light transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </RevealGroup>

            {u.compare && (
              <p className="mt-10 text-[14.5px]">
                <Link href={localePath(locale, u.compare.href)} className="font-medium text-primary hover:underline">
                  {u.compare.label} →
                </Link>
              </p>
            )}
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
        // Contenu statique de src/content/use-cases.ts, aucune saisie.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
    </>
  );
}
