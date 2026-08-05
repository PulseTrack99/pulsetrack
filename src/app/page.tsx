import {
  ArrowRight,
  Check,
  Activity,
  MousePointerClick,
  TrendingUp,
  Code,
  Eye,
  Users,
  Zap,
  Shield,
  BarChart3,
  Globe as GlobeIcon,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { GlobeLoader } from "@/components/globe-loader";

/* ─────────────────────── NAVBAR ─────────────────────── */
function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">PulseTrack</span>
        </a>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-[13px] text-muted hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-[13px] text-muted hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-[13px] text-muted hover:text-foreground transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden text-[13px] font-medium text-muted-light hover:text-foreground transition-colors sm:block"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-background transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/20"
          >
            Start free
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────── HERO ─────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-4 md:pt-36 md:pb-8">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/[0.05] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-0">
          {/* Left — Copy */}
          <div className="relative z-10 max-w-xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now tracking 12M+ events
            </div>

            <h1 className="text-[2.75rem] font-bold leading-[1.1] tracking-tight md:text-[3.5rem] lg:text-[3.75rem]">
              Know where your{" "}
              <span className="text-primary">revenue</span>{" "}
              comes from.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-light md:text-lg">
              The analytics platform that connects traffic sources to actual payments.
              See which channels drive revenue, not just clicks.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/signup"
                className="group flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-primary-light hover:shadow-xl hover:shadow-primary/20"
              >
                Start for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-light transition-all hover:border-muted hover:text-foreground hover:bg-surface-hover"
              >
                <Code className="h-4 w-4" />
                View demo
              </a>
            </div>

            <div className="mt-6 flex items-center gap-5 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" />
                GDPR compliant
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" />
                1-min setup
              </span>
            </div>
          </div>

          {/* Right — 3D Globe */}
          <div className="relative h-[400px] md:h-[480px] lg:h-[520px]">
            <GlobeLoader className="h-full w-full" />
            {/* Floating stat cards */}
            <div className="absolute left-4 top-8 animate-float glass rounded-xl px-4 py-3 shadow-xl" style={{ animationDelay: "0s" }}>
              <p className="text-[10px] text-muted uppercase tracking-wider">Live visitors</p>
              <p className="text-xl font-bold text-primary">847</p>
            </div>
            <div className="absolute right-4 bottom-16 animate-float glass rounded-xl px-4 py-3 shadow-xl" style={{ animationDelay: "2s" }}>
              <p className="text-[10px] text-muted uppercase tracking-wider">Revenue today</p>
              <p className="text-xl font-bold text-success">€12,430</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── SOCIAL PROOF BAR ──────────────── */
function SocialProof() {
  const stats = [
    { value: "12M+", label: "Events tracked" },
    { value: "2,400+", label: "Websites" },
    { value: "38", label: "Countries" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <section className="border-y border-border/50 bg-surface/50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold tracking-tight md:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── FEATURES ─────────────────────── */
function Features() {
  const features = [
    {
      icon: TrendingUp,
      title: "Revenue Attribution",
      description: "Connect Stripe. See exactly which traffic sources drive actual paying customers — not just visits.",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      icon: Users,
      title: "Real-time Dashboard",
      description: "Live visitors on a 3D globe, active pages, sparkline metrics. Everything updates every 5 seconds.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: MousePointerClick,
      title: "Conversion Funnels",
      description: "Build multi-step funnels. See where visitors drop off and optimize your conversion flow.",
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      icon: Shield,
      title: "GDPR Native",
      description: "No cookies. No consent banner needed. Fully compliant with European privacy regulations by design.",
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      icon: Zap,
      title: "< 3KB Script",
      description: "Lighter than a favicon. Zero impact on your site speed. Your visitors won't notice a thing.",
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
    {
      icon: GlobeIcon,
      title: "Public Dashboards",
      description: "Share your analytics with stakeholders. One-click public dashboard with your branding.",
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
  ];

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need.
            <span className="text-muted"> Nothing you don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted leading-relaxed">
            PulseTrack replaces Google Analytics with a tool that&apos;s 10× simpler,
            privacy-first, and focused on what matters: your revenue.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-border/60 bg-surface/50 p-6 transition-all duration-300 hover:border-border hover:bg-surface-hover"
            >
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${f.bg}`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── REVENUE FEATURE HIGHLIGHT ──────────────── */
function RevenueFeature() {
  return (
    <section className="py-24 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — visual */}
          <div className="relative rounded-2xl border border-border/60 bg-surface p-6 glow-primary">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold">Revenue by Source</h4>
            </div>

            <div className="space-y-4">
              {[
                { source: "Google", rev: "€4,280", pct: 42, color: "bg-emerald-400" },
                { source: "Twitter / X", rev: "€2,150", pct: 21, color: "bg-primary" },
                { source: "Direct", rev: "€1,890", pct: 18, color: "bg-violet-400" },
                { source: "Product Hunt", rev: "€1,430", pct: 14, color: "bg-amber-400" },
                { source: "Reddit", rev: "€680", pct: 5, color: "bg-orange-400" },
              ].map((r) => (
                <div key={r.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-light">{r.source}</span>
                    <span className="font-semibold tabular-nums">{r.rev}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.color} transition-all duration-700`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted">Last 30 days</span>
              <span className="text-sm font-bold">€10,430 total</span>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Revenue Tracking</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Stop guessing.
              <br />
              <span className="text-emerald-400">Start measuring.</span>
            </h2>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Connect your Stripe account and instantly see which traffic sources
              generate real revenue. Not just pageviews. Not just clicks.
              Actual money in your bank account, attributed to every channel.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Revenue per traffic source",
                "Best-converting landing pages",
                "Customer attribution via email matching",
                "Daily/weekly/monthly revenue charts",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-muted-light">
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
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
      title: "Add the script",
      description: "One line of code. Works with any framework, CMS, or static site.",
      code: `<script src="https://pulsetrack.io/t.js"\n  data-site="YOUR_ID" defer></script>`,
      icon: Code,
    },
    {
      step: "02",
      title: "Data flows in",
      description: "Within minutes: live visitors, traffic sources, top pages, device breakdown.",
      icon: BarChart3,
    },
    {
      step: "03",
      title: "Connect Stripe",
      description: "Link your payment processor and see which channels actually make you money.",
      icon: DollarSign,
    },
  ];

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Setup</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Live in 60 seconds
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted">
            No developer needed. If you can copy-paste, you can install PulseTrack.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3 stagger-children">
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-xl border border-border/60 bg-surface/50 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-3xl font-black text-border">{s.step}</span>
              </div>
              <h3 className="text-sm font-semibold">{s.title}</h3>
              <p className="mt-2 text-[13px] text-muted leading-relaxed">
                {s.description}
              </p>
              {s.code && (
                <div className="mt-4 overflow-x-auto rounded-lg bg-background border border-border p-3">
                  <code className="text-[11px] text-primary-light whitespace-pre font-mono leading-relaxed">
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
      description: "For side projects",
      features: ["1 website", "5K events/mo", "1 funnel", "30-day retention", "Public dashboard"],
      cta: "Start free",
      highlighted: false,
    },
    {
      name: "Starter",
      price: "9",
      description: "For creators & freelancers",
      features: [
        "3 websites", "50K events/mo", "5 funnels", "90-day retention",
        "Public dashboard", "Email support",
      ],
      cta: "Start free trial",
      highlighted: false,
    },
    {
      name: "Growth",
      price: "29",
      description: "For growing businesses",
      features: [
        "10 websites", "200K events/mo", "20 funnels", "6-month retention",
        "Revenue tracking", "API access", "Priority support",
      ],
      cta: "Start free trial",
      highlighted: true,
    },
    {
      name: "Business",
      price: "79",
      description: "For agencies & e-commerce",
      features: [
        "50 websites", "1M events/mo", "Unlimited funnels", "12-month retention",
        "Revenue tracking", "API access", "Priority support", "CSV export",
      ],
      cta: "Contact us",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-surface/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted">
            Start free. Upgrade when you grow. Cancel anytime.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-6 transition-all duration-300 ${
                plan.highlighted
                  ? "border-primary/40 bg-surface glow-primary"
                  : "border-border/60 bg-surface/50 hover:border-border"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold text-background">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </div>
              )}

              <h3 className="text-sm font-semibold">{plan.name}</h3>
              <p className="mt-0.5 text-[11px] text-muted">{plan.description}</p>

              <div className="mt-4 flex items-baseline gap-0.5">
                <span className="text-3xl font-bold">€{plan.price}</span>
                {parseInt(plan.price) > 0 && (
                  <span className="text-xs text-muted">/mo</span>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-muted-light">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="/signup"
                className={`mt-6 block rounded-lg py-2.5 text-center text-xs font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-primary text-background hover:bg-primary-light hover:shadow-lg hover:shadow-primary/20"
                    : "border border-border text-muted-light hover:border-muted hover:text-foreground hover:bg-surface-hover"
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
    <section className="relative py-24 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Ready to see where your money comes from?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted leading-relaxed">
          Join thousands of businesses that replaced Google Analytics with a simpler,
          faster, privacy-first alternative. Setup in under 60 seconds.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/signup"
            className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-background transition-all hover:bg-primary-light hover:shadow-xl hover:shadow-primary/20"
          >
            Create free account
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-success" /> Free forever tier
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-success" /> No credit card
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-success" /> GDPR compliant
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── FOOTER ─────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">PulseTrack</span>
          </div>
          <div className="flex gap-8 text-xs text-muted">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted">© 2026 PulseTrack</p>
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
      <SocialProof />
      <Features />
      <RevenueFeature />
      <HowItWorks />
      <Pricing />
      <CtaSection />
      <Footer />
    </>
  );
}
