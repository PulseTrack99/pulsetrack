"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Globe,
  ChevronDown,
  BarChart3,
  MousePointerClick,
  Filter,
  DollarSign,
  Radio,
  Share2,
  Sparkles,
  ShieldCheck,
  Scale,
  Building2,
  BookOpen,
  Code2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/dictionaries";
import { isLocalizedPath, localePath, stripLocale } from "@/i18n/paths";
import {
  COMPARE,
  NAV_LABELS,
  PLATFORM,
  RESOURCES,
  SOLUTIONS,
  type NavIcon,
  type NavLink,
} from "@/content/site-map";

export interface NavLabels {
  pricing: string;
  docs: string;
  login: string;
  cta: string;
}

const ICONS: Record<NavIcon, typeof BarChart3> = {
  analytics: BarChart3,
  realtime: Radio,
  funnels: Filter,
  dashboards: Share2,
  heatmaps: MousePointerClick,
  revenue: DollarSign,
  ai: Sparkles,
  privacy: ShieldCheck,
  compare: Scale,
  saas: Building2,
  docs: BookOpen,
  install: Code2,
};

type MenuKey = "platform" | "solutions" | "resources";

/**
 * Le menu du site public, construit sur le modèle de Mixpanel :
 * Plateforme, Solutions, Ressources, Tarifs.
 *
 * Les liens viennent de src/content/site-map.ts, vérifiés au build ; un
 * menu sans lien ne s'affiche pas. Au clavier : Entrée ouvre, Échap
 * ferme ; un clic en dehors ferme aussi.
 */
export function SiteNav({ t, locale }: { t: NavLabels; locale: Locale }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [section, setSection] = useState<MenuKey | null>("platform");
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const onPointer = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menu]);

  function switchLocale() {
    const next = locale === "fr" ? "en" : "fr";
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    // Page publique : chaque langue a son adresse, on y va. Ailleurs
    // (connexion, inscription), la langue suit le cookie.
    const { path } = stripLocale(window.location.pathname);
    if (isLocalizedPath(path)) {
      window.location.assign(localePath(next, path) + window.location.hash);
      return;
    }
    router.refresh();
  }

  const platformGroups = PLATFORM.filter((g) => g.links.length > 0);
  const menus: { key: MenuKey; label: string }[] = [
    ...(platformGroups.length > 0 ? [{ key: "platform" as const, label: NAV_LABELS.platform[locale] }] : []),
    ...(SOLUTIONS.length > 0 ? [{ key: "solutions" as const, label: NAV_LABELS.solutions[locale] }] : []),
    ...(RESOURCES.length > 0 ? [{ key: "resources" as const, label: NAV_LABELS.resources[locale] }] : []),
  ];

  const linkItem = (l: NavLink, onNavigate: () => void) => {
    const Icon = ICONS[l.icon];
    return (
      <Link
        key={l.href}
        href={localePath(locale, l.href)}
        onClick={onNavigate}
        className="flex gap-2.5 rounded-sm p-2.5 transition-colors hover:bg-surface-sunken"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary-pale">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </span>
        <span>
          <span className="block text-[13px] font-medium">{l.title[locale]}</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-light">{l.blurb[locale]}</span>
        </span>
      </Link>
    );
  };

  const close = () => setMenu(null);

  return (
    <header
      ref={navRef}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled || menu
          ? "border-b border-border bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
        <Link href={localePath(locale, "/")} className="shrink-0" aria-label="PulseTrack">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {menus.map((m) => (
            <div
              key={m.key}
              className="relative"
              onMouseEnter={() => setMenu(m.key)}
              onMouseLeave={() => setMenu((cur) => (cur === m.key ? null : cur))}
            >
              <button
                type="button"
                aria-expanded={menu === m.key}
                aria-haspopup="true"
                onClick={() => setMenu((cur) => (cur === m.key ? null : m.key))}
                className={`flex items-center gap-1 rounded-sm px-3 py-2 text-[14px] transition-colors hover:text-foreground ${
                  menu === m.key ? "text-foreground" : "text-muted"
                }`}
              >
                {m.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${menu === m.key ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {menu === m.key && (
                <div
                  className={`absolute left-1/2 top-full -translate-x-1/2 pt-2 ${
                    m.key === "platform" ? "w-[760px]" : "w-[340px]"
                  }`}
                >
                  <div
                    className="rounded-lg border border-border bg-surface p-3"
                    style={{ boxShadow: "var(--shadow-lg)" }}
                  >
                    {m.key === "platform" ? (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          {platformGroups.map((g) => (
                            <div key={g.title.en}>
                              <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-light">
                                {g.title[locale]}
                              </p>
                              {g.links.map((l) => linkItem(l, close))}
                            </div>
                          ))}
                        </div>
                        {COMPARE.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-2.5 pt-3 text-[12.5px]">
                            <span className="text-muted-light">{NAV_LABELS.compare[locale]}</span>
                            {COMPARE.map((c) => (
                              <Link
                                key={c.href}
                                href={localePath(locale, c.href)}
                                onClick={close}
                                className="text-muted transition-colors hover:text-foreground"
                              >
                                {c.title[locale]} →
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-0.5">
                        {(m.key === "solutions" ? SOLUTIONS : RESOURCES).map((l) => linkItem(l, close))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Link
            href={localePath(locale, "/#pricing")}
            className="rounded-sm px-3 py-2 text-[14px] text-muted transition-colors hover:text-foreground"
          >
            {t.pricing}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={switchLocale}
            className="hidden items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] text-muted transition-colors hover:text-foreground sm:flex"
            title={locale === "fr" ? "Switch to English" : "Passer en français"}
          >
            <Globe className="h-3.5 w-3.5" />
            {locale.toUpperCase()}
          </button>

          <Link
            href="/login"
            className="hidden px-3 py-2 text-[14px] text-muted transition-colors hover:text-foreground sm:block"
          >
            {t.login}
          </Link>

          <span className="hidden sm:block">
            <Link href="/signup" className="btn btn-primary">
              {t.cta}
              <span className="chev" aria-hidden>
                →
              </span>
            </Link>
          </span>

          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-sm p-2 md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {open && (
        <div className="max-h-[calc(100vh-68px)] overflow-y-auto border-t border-border bg-background px-6 py-4 md:hidden">
          {menus.map((m) => {
            const links =
              m.key === "platform"
                ? [...platformGroups.flatMap((g) => g.links), ...COMPARE]
                : m.key === "solutions"
                  ? SOLUTIONS
                  : RESOURCES;
            return (
              <div key={m.key} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => setSection((s) => (s === m.key ? null : m.key))}
                  aria-expanded={section === m.key}
                  className="flex w-full items-center justify-between px-2 py-3 text-[15px] font-medium"
                >
                  {m.label}
                  <ChevronDown
                    className={`h-4 w-4 text-muted transition-transform ${section === m.key ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {section === m.key && (
                  <div className="pb-2">
                    {links.map((l) => (
                      <Link
                        key={`${m.key}-${l.href}`}
                        href={localePath(locale, l.href)}
                        onClick={() => setOpen(false)}
                        className="block rounded-sm px-2 py-2 text-[14px] text-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
                      >
                        {l.title[locale]}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link
            href={localePath(locale, "/#pricing")}
            onClick={() => setOpen(false)}
            className="block border-b border-border px-2 py-3 text-[15px] font-medium"
          >
            {t.pricing}
          </Link>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/login" className="btn btn-secondary w-full">
              {t.login}
            </Link>
            <Link href="/signup" className="btn btn-primary w-full">
              {t.cta}
            </Link>
            <button
              onClick={switchLocale}
              className="mt-1 flex items-center justify-center gap-1.5 text-[13px] text-muted"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === "fr" ? "Switch to English" : "Passer en français"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
