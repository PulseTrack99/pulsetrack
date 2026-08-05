import {
  BarChart3,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Activity,
  MousePointerClick,
  TrendingUp,
  Code,
  Eye,
  Users,
} from "lucide-react";

/* ─────────────────────── NAVBAR ─────────────────────── */
function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">PulseTrack</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
            Comment ça marche
          </a>
          <a href="#pricing" className="text-sm text-muted hover:text-foreground transition-colors">
            Tarifs
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden text-sm font-medium text-muted hover:text-foreground transition-colors sm:block"
          >
            Connexion
          </a>
          <a
            href="/signup"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
          >
            Essai gratuit
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────── HERO ─────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl animate-glow" />
      </div>

      <div className="mx-auto max-w-6xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Zap className="h-3.5 w-3.5" />
          <span>Analytics nouvelle génération — conforme RGPD</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl lg:text-7xl">
          Comprenez votre trafic.{" "}
          <span className="bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent animate-gradient">
            Boostez vos revenus.
          </span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
          Installez un script léger, obtenez un dashboard clair et découvrez exactement
          d&apos;où viennent vos visiteurs et lesquels deviennent des clients payants.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/signup"
            className="group flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-full border border-border px-8 py-3.5 text-base font-medium transition-colors hover:bg-surface-hover"
          >
            Voir la démo
          </a>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-sm text-muted">
          Gratuit jusqu&apos;à 1 000 événements/mois · Pas de carte bancaire requise
        </p>

        {/* Dashboard preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="rounded-xl border border-border bg-surface p-2 shadow-2xl shadow-primary/5">
            <DashboardPreview />
          </div>
          {/* Decorative blur */}
          <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-40 w-3/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </section>
  );
}

/* ─────────── FAKE DASHBOARD PREVIEW ─────────── */
function DashboardPreview() {
  const bars = [35, 52, 44, 68, 85, 74, 92, 78, 65, 88, 95, 80];
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  return (
    <div className="rounded-lg bg-background p-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Visiteurs", value: "12 847", change: "+22%", icon: Users },
          { label: "Pages vues", value: "48 392", change: "+18%", icon: Eye },
          { label: "Taux de conversion", value: "3.2%", change: "+0.8%", icon: MousePointerClick },
          { label: "Revenu attribué", value: "8 420 €", change: "+34%", icon: TrendingUp },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted" />
            </div>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            <span className="text-xs font-medium text-emerald-500">
              {stat.change}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Visiteurs — 12 derniers mois</h3>
          <div className="flex gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">Mensuel</span>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary to-primary-light transition-all hover:from-primary-dark hover:to-primary"
                style={{ height: `${h}%` }}
              />
              <span className="text-[10px] text-muted hidden md:block">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── FEATURES ─────────────────────── */
function Features() {
  const features = [
    {
      icon: BarChart3,
      title: "Dashboard en temps réel",
      description:
        "Visiteurs, pages vues, sources de trafic, pays, appareils — tout en un coup d'œil, mis à jour en temps réel.",
    },
    {
      icon: MousePointerClick,
      title: "Funnels & Conversions",
      description:
        "Suivez le parcours de vos visiteurs étape par étape. Identifiez précisément où ils décrochent avant d'acheter.",
    },
    {
      icon: TrendingUp,
      title: "Attribution de revenus",
      description:
        "Connectez Stripe ou Shopify. Découvrez quels canaux marketing génèrent réellement du chiffre d'affaires.",
    },
    {
      icon: Zap,
      title: "Installation en 1 minute",
      description:
        "Copiez-collez une ligne de code sur votre site. C'est tout. Aucune configuration complexe.",
    },
    {
      icon: Shield,
      title: "RGPD natif & Cookieless",
      description:
        "Pas de cookies, pas de bannière de consentement nécessaire. 100 % conforme avec la réglementation européenne.",
    },
    {
      icon: Globe,
      title: "Léger & Rapide",
      description:
        "Script de moins de 3 KB. Aucun impact sur la vitesse de chargement de votre site. Vos visiteurs ne remarquent rien.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-surface">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Tout ce dont vous avez besoin.{" "}
            <span className="text-muted">Rien de superflu.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            PulseTrack remplace Google Analytics par un outil 10× plus simple,
            respectueux de la vie privée, et focalisé sur ce qui compte : vos revenus.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── HOW IT WORKS ──────────────── */
function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Collez le script",
      description: "Ajoutez une seule ligne de code dans votre site. Compatible avec tous les frameworks et CMS.",
      code: `<script src="https://pulsetrack.io/t.js" data-site="VOTRE_ID"></script>`,
    },
    {
      step: "02",
      title: "Les données arrivent",
      description:
        "En quelques minutes, votre dashboard se remplit : visiteurs en temps réel, sources de trafic, pages populaires.",
      code: null,
    },
    {
      step: "03",
      title: "Optimisez & Croissez",
      description:
        "Identifiez vos meilleurs canaux d'acquisition, éliminez les points de blocage, et augmentez vos conversions.",
      code: null,
    },
  ];

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Opérationnel en 60 secondes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Pas besoin d&apos;être développeur. Si vous savez copier-coller, vous savez installer PulseTrack.
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <span className="text-5xl font-black text-primary/10">{s.step}</span>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{s.description}</p>
              {s.code && (
                <div className="mt-4 overflow-x-auto rounded-lg bg-surface border border-border p-3">
                  <code className="text-xs text-primary whitespace-nowrap font-mono">
                    {s.code}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── PRICING ─────────────────────── */
function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "0",
      description: "Pour tester et les petits projets",
      features: [
        "1 000 événements / mois",
        "1 site web",
        "Dashboard en temps réel",
        "6 mois de rétention",
      ],
      cta: "Commencer gratuitement",
      highlighted: false,
    },
    {
      name: "Starter",
      price: "9",
      description: "Pour les créateurs et freelances",
      features: [
        "10 000 événements / mois",
        "3 sites web",
        "Funnels & goals",
        "1 an de rétention",
        "Export CSV",
        "Support email",
      ],
      cta: "Commencer l'essai gratuit",
      highlighted: false,
    },
    {
      name: "Growth",
      price: "29",
      description: "Pour les entreprises en croissance",
      features: [
        "100 000 événements / mois",
        "Sites illimités",
        "Attribution de revenus",
        "Intégration Stripe & Shopify",
        "3 ans de rétention",
        "API complète",
        "Support prioritaire",
      ],
      cta: "Commencer l'essai gratuit",
      highlighted: true,
    },
    {
      name: "Business",
      price: "79",
      description: "Pour les équipes et les agences",
      features: [
        "1 000 000 événements / mois",
        "Tout dans Growth",
        "Membres d'équipe illimités",
        "Webhooks",
        "Custom domain",
        "5+ ans de rétention",
        "SLA & support dédié",
      ],
      cta: "Contacter l'équipe",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Des tarifs simples et transparents
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Commencez gratuitement. Passez à un plan payant quand votre trafic grandit.
            Annulable à tout moment.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.highlighted
                  ? "border-primary bg-background shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border-border bg-background hover:border-primary/30 hover:shadow-lg"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Populaire
                </div>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}€</span>
                <span className="text-sm text-muted">/mois</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/signup"
                className={`mt-6 block rounded-full py-2.5 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark"
                    : "border border-border hover:border-primary/30 hover:bg-surface-hover"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── CTA FINAL ─────────────────────── */
function CtaSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Prêt à comprendre votre trafic ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Rejoignez les entreprises qui ont remplacé Google Analytics par un outil simple,
          rapide et conforme RGPD. Configuration en 60 secondes.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/signup"
            className="group flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-2xl hover:shadow-primary/30"
          >
            Créer mon compte gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" /> Gratuit pour toujours
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" /> Sans carte bancaire
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" /> RGPD compliant
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── FOOTER ─────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-bold">PulseTrack</span>
          </div>
          <div className="flex gap-8 text-sm text-muted">
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-foreground transition-colors">CGU</a>
            <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted">© 2026 PulseTrack. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── PAGE ─────────────────────── */
export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaSection />
      <Footer />
    </>
  );
}
