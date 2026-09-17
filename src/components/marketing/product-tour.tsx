"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Check, Cookie, MapPin, Feather } from "lucide-react";
import type { Locale } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/paths";
import { tourContent, tourSeconds, type SceneKey } from "@/content/tour";
import {
  AiRail,
  AnalyticsPanel,
  FunnelsPanel,
  HeatmapPanel,
  LivePanel,
  RevenuePanelMock,
  type Labels as ShowcaseLabels,
} from "./product-showcase";
import { Reveal } from "./reveal";

/**
 * La démo animée : deux minutes pour montrer tout le produit, sans
 * inscription et sans vidéo à héberger.
 *
 * Elle réutilise les panneaux de l'aperçu produit (src/components/
 * marketing/product-showcase.tsx) plutôt que d'inventer un second
 * langage visuel : ce que le visiteur voit ressemble à l'application,
 * et rien ne peut vieillir d'un côté sans vieillir de l'autre.
 *
 * Elle démarre quand elle arrive à l'écran, se met en pause quand on la
 * quitte, et se pilote entièrement : lecture, pause, chapitre précédent
 * ou suivant, et clic direct sur un chapitre. Quand le système demande
 * moins d'animations, elle devient une liste qu'on lit à son rythme.
 *
 * Le texte vit dans src/content/tour.ts, en français et en anglais.
 */

/* ── Les scènes qui n'existent pas dans l'aperçu ─────────────────── */

function InstallScene({ scriptOrigin, fr }: { scriptOrigin: string; fr: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center gap-5 p-6 md:p-10">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-inverse p-5">
        <code className="whitespace-pre font-mono text-[12px] leading-relaxed text-white/85 md:text-[13px]">
          {`<script src="${scriptOrigin}/t.js"\n        data-site="YOUR_SITE_ID" defer></script>`}
        </code>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { k: "1", label: fr ? "Collé dans <head>" : "Pasted in <head>" },
          { k: "2", label: fr ? "Premier visiteur vu" : "First visitor seen" },
          { k: "3", label: fr ? "Tableau de bord rempli" : "Dashboard filling up" },
        ].map((step, i) => (
          <div
            key={step.k}
            className="animate-rise rounded-lg border border-border bg-surface p-4"
            style={{ animationDelay: `${i * 900}ms` }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-pale text-[11px] font-medium text-primary">
              {step.k}
            </span>
            <p className="mt-2.5 text-[13px] leading-snug">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExperimentsScene({ fr }: { fr: boolean }) {
  const arms = [
    { name: fr ? "Version A (référence)" : "Variant A (control)", rate: 3.1, width: 46 },
    { name: fr ? "Version B" : "Variant B", rate: 4.6, width: 68 },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-6 p-6 md:p-10">
      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-wide text-muted-light">
          {fr ? "Test A/B — page de prix" : "A/B test — pricing page"}
        </p>
        <div className="mt-4 space-y-4">
          {arms.map((arm, i) => (
            <div key={arm.name}>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span>{arm.name}</span>
                <span className="tabular font-medium">{fr ? `${arm.rate} %` : `${arm.rate}%`}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${arm.width}%`,
                    animation: "grow-bar 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
                    animationDelay: `${i * 260}ms`,
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 px-2 py-1 text-[11.5px] font-medium text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-400">
          <Check className="h-3 w-3" />
          {fr ? "Écart significatif à 95 %" : "Significant at 95%"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-5">
        <span className="text-[12.5px] font-medium">{fr ? "Feature flag" : "Feature flag"}</span>
        <code className="rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-[11.5px]">new-checkout</code>
        <span className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-primary">
            <span className="absolute right-0.5 h-3 w-3 rounded-full bg-white" />
          </span>
          {fr ? "activé pour 25 % des visiteurs" : "on for 25% of visitors"}
        </span>
      </div>
    </div>
  );
}

function PrivacyScene({ fr }: { fr: boolean }) {
  const cards = [
    {
      icon: Cookie,
      title: fr ? "0 cookie" : "0 cookies",
      body: fr ? "Rien n'est écrit sur l'appareil" : "Nothing written to the device",
    },
    {
      icon: MapPin,
      title: fr ? "Irlande et Dublin" : "Ireland and Dublin",
      body: fr ? "Données et serveurs dans l'UE" : "Data and servers in the EU",
    },
    {
      icon: Feather,
      title: fr ? "3,7 Ko" : "3.7 KB",
      body: fr ? "Le script, compressé" : "The script, gzipped",
    },
  ];

  return (
    <div className="flex h-full flex-col justify-center gap-4 p-6 md:p-10">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, title, body }, i) => (
          <div
            key={title}
            className="animate-rise rounded-lg border border-border bg-surface p-5"
            style={{ animationDelay: `${i * 220}ms` }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary-pale">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <p className="mt-3 text-[17px] font-medium tracking-[-0.015em]">{title}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-muted">{body}</p>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        {fr
          ? "L'identifiant d'un visiteur est un calcul côté serveur, renouvelé chaque jour : personne n'est suivi d'un jour à l'autre."
          : "A visitor's identifier is computed on the server and renewed every day: nobody is followed from one day to the next."}
      </p>
    </div>
  );
}

function CtaScene({ locale, fr, dashboardLink }: { locale: Locale; fr: boolean; dashboardLink: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
      <p className="text-[1.75rem] leading-tight tracking-[-0.02em] md:text-[2.25rem]">
        {fr ? (
          <>
            L&apos;analytics qui suit <span className="text-primary">l&apos;argent</span>
          </>
        ) : (
          <>
            Analytics that follows <span className="text-primary">the money</span>
          </>
        )}
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/signup" className="btn btn-primary px-7 py-3.5">
          {fr ? "Commencer gratuitement" : "Start for free"}
          <span className="chev" aria-hidden>
            →
          </span>
        </Link>
        <Link href={localePath(locale, "/#pricing")} className="btn btn-ghost px-7 py-3.5">
          {fr ? "Voir les tarifs" : "See pricing"}
        </Link>
      </div>
      <Link href="/public/demo" className="text-[13px] font-medium text-primary hover:underline">
        {dashboardLink}
      </Link>
    </div>
  );
}

/* ── La démo ─────────────────────────────────────────────────────── */

export function ProductTour({
  locale,
  labels,
  scriptOrigin,
}: {
  locale: Locale;
  /** Les mêmes libellés que l'aperçu produit : les panneaux sont partagés. */
  labels: ShowcaseLabels;
  scriptOrigin: string;
}) {
  const content = useMemo(() => tourContent(locale), [locale]);
  const total = useMemo(() => tourSeconds(locale), [locale]);
  const fr = locale === "fr";

  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0); // secondes écoulées dans la scène
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const scene = content.scenes[index];

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // Démarre quand la section arrive à l'écran, se met en pause quand on
  // la quitte : une animation qui tourne hors champ ne sert personne.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPlaying(entry.isIntersecting);
        if (entry.isIntersecting) setStarted(true);
      },
      // Seuil zéro, et non une fraction de la section : elle est plus
      // haute que l écran sur un portable, où un seuil élevé ne serait
      // jamais atteint — la démo ne démarrait alors jamais.
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!playing || reduced) return;
    /* Le temps vient de l horloge, pas du nombre de tics : un onglet en
       arrière-plan voit ses minuteries ralenties à une par seconde, et
       compter les tics figeait la démo pendant des minutes. */
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setElapsed((e) => {
        const next = e + delta;
        if (next < scene.seconds) return next;
        setIndex((i) => (i + 1) % content.scenes.length);
        // Le temps en trop passe à la scène suivante plutôt que d être
        // perdu : sinon un tic tardif raccourcit la scène d après.
        return Math.min(next - scene.seconds, 1);
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, reduced, scene.seconds, content.scenes.length]);

  const goTo = useCallback((i: number) => {
    setIndex(i);
    setElapsed(0);
    setStarted(true);
  }, []);

  const visuals: Record<SceneKey, React.ReactNode> = {
    install: <InstallScene scriptOrigin={scriptOrigin} fr={fr} />,
    analytics: <AnalyticsPanel t={labels} />,
    live: <LivePanel t={labels} />,
    funnels: <FunnelsPanel t={labels} />,
    revenue: <RevenuePanelMock t={labels} />,
    heatmap: <HeatmapPanel t={labels} />,
    experiments: <ExperimentsScene fr={fr} />,
    ai: <AiRail prompt={labels.ai.revenue[0]} answer={labels.ai.revenue[1]} follow={labels.ai.revenue[2]} />,
    privacy: <PrivacyScene fr={fr} />,
    cta: <CtaScene locale={locale} fr={fr} dashboardLink={content.dashboardLink} />,
  };

  return (
    <section id="tour" ref={ref} className="border-t border-border bg-surface-sunken/40 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{content.eyebrow}</span>
          <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">{content.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{content.subtitle}</p>
        </Reveal>

        {reduced ? (
          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-[13px] text-muted-light">{content.reducedMotion}</p>
            <ol className="mt-6 space-y-5">
              {content.scenes.map((s, i) => (
                <li key={s.key} className="border-l-2 border-border pl-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-light">
                    {String(i + 1).padStart(2, "0")} · {s.chapter}
                  </p>
                  <p className="mt-1 text-[16px] font-medium">{s.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Chapitres et commandes */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
                  aria-label={playing ? content.pause : content.play}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => goTo((index - 1 + content.scenes.length) % content.scenes.length)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                  aria-label={content.previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo((index + 1) % content.scenes.length)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                  aria-label={content.next}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goTo(0);
                    setPlaying(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
                  aria-label={content.replay}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <span className="ml-auto rounded-sm bg-surface px-2 py-1 text-[11.5px] text-muted-light">
                  {content.duration}
                </span>
              </div>

              <ol className="space-y-0.5">
                {content.scenes.map((s, i) => {
                  const active = i === index;
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={active}
                        className={`w-full rounded-sm px-3 py-2 text-left text-[13px] transition-colors ${
                          active ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="tabular text-muted-light">{String(i + 1).padStart(2, "0")}</span>
                          <span className="flex-1">{s.chapter}</span>
                          <span className="tabular text-[11px] text-muted-light">{s.seconds}s</span>
                        </span>
                        {active && (
                          <span className="mt-1.5 block h-0.5 w-full overflow-hidden rounded-full bg-border">
                            <span
                              className="block h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                              style={{ width: `${Math.min(100, (elapsed / s.seconds) * 100)}%` }}
                            />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <p className="text-[11.5px] text-muted-light">
                {fr
                  ? `Chapitre ${index + 1} sur ${content.scenes.length} · ${Math.round(total)} s au total`
                  : `Chapter ${index + 1} of ${content.scenes.length} · ${Math.round(total)}s in total`}
              </p>
            </div>

            {/* Scène */}
            <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface" style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="border-b border-border px-6 py-5">
                <p className="text-[11px] uppercase tracking-wide text-primary">{scene.eyebrow}</p>
                <h3 className="mt-1.5 text-[19px] font-medium tracking-[-0.015em] md:text-[22px]">{scene.title}</h3>
                <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{scene.body}</p>
              </div>
              <div key={`${scene.key}-${started}`} className="min-h-[360px] flex-1 animate-fade md:min-h-[430px]">
                {visuals[scene.key]}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
