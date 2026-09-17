import Link from "next/link";
import {
  BarChart3,
  MousePointerClick,
  Filter,
  DollarSign,
  Radio,
  Share2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Play,
  LineChart,
  Repeat,
  GitBranch,
  Building2,
  FlaskConical,
  ToggleRight,
  Bell,
  Braces,
} from "lucide-react";
import type { Locale } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/paths";
import { PLATFORM, type NavIcon } from "@/content/site-map";
import { Reveal, RevealGroup } from "./reveal";

/**
 * Tout le produit d'un coup d'œil, juste sous l'aperçu — comme la
 * rangée d'ancres de Mixpanel.
 *
 * Les entrées viennent du plan du site (src/content/site-map.ts), dont
 * celles marquées « featured » : rien ne peut pointer ici vers une page
 * qui n'existe pas.
 */
const ICONS: Record<NavIcon, typeof BarChart3> = {
  replay: Play,
  insights: LineChart,
  retention: Repeat,
  flows: GitBranch,
  accounts: Building2,
  experiments: FlaskConical,
  flags: ToggleRight,
  alerts: Bell,
  api: Braces,
  analytics: BarChart3,
  realtime: Radio,
  funnels: Filter,
  dashboards: Share2,
  heatmaps: MousePointerClick,
  revenue: DollarSign,
  ai: Sparkles,
  privacy: ShieldCheck,
  compare: BarChart3,
  saas: BarChart3,
  docs: Sparkles,
  install: BarChart3,
};

export function ProductRow({
  eyebrow,
  title,
  locale,
}: {
  eyebrow: string;
  title: string;
  locale: Locale;
}) {
  // Seize entrées sur l'accueil seraient illisibles : la rangée montre
  // celles marquées « featured » dans le plan du site.
  const links = PLATFORM.flatMap((g) => g.links).filter((l) => l.featured);

  return (
    <section className="border-t border-border bg-surface-sunken/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="mt-5 text-[2rem] md:text-[2.5rem]">{title}</h2>
        </Reveal>

        <RevealGroup className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((l) => {
            const Icon = ICONS[l.icon];
            return (
              <Link
                key={l.href}
                href={localePath(locale, l.href)}
                className="reveal group rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary/40 hover:bg-primary-pale/20"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary-pale">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <p className="mt-3.5 flex items-center gap-1.5 text-[15px] font-medium tracking-[-0.015em]">
                  {l.title[locale]}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-light transition-transform group-hover:translate-x-0.5" />
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{l.blurb[locale]}</p>
              </Link>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
