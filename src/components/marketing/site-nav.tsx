"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Globe,
  BarChart3,
  MousePointerClick,
  Filter,
  DollarSign,
  Radio,
  Share2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/dictionaries";

export interface NavLabels {
  product: string;
  pricing: string;
  docs: string;
  login: string;
  cta: string;
  productMenu: { href: string; title: string; blurb: string; icon: string }[];
}

const ICONS: Record<string, typeof BarChart3> = {
  analytics: BarChart3,
  heatmaps: MousePointerClick,
  funnels: Filter,
  revenue: DollarSign,
  realtime: Radio,
  dashboards: Share2,
};

export function SiteNav({
  t,
  locale,
}: {
  t: NavLabels;
  locale: Locale;
}) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

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

  function switchLocale() {
    const next = locale === "fr" ? "en" : "fr";
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="shrink-0" aria-label="PulseTrack">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          <div
            className="relative"
            onMouseEnter={() => setMenu(true)}
            onMouseLeave={() => setMenu(false)}
          >
            <button className="rounded-sm px-3 py-2 text-[14px] text-muted transition-colors hover:text-foreground">
              {t.product}
            </button>

            {menu && (
              <div className="absolute left-1/2 top-full w-[520px] -translate-x-1/2 pt-2">
                <div
                  className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-2"
                  style={{ boxShadow: "var(--shadow-lg)" }}
                >
                  {t.productMenu.map((item) => {
                    const Icon = ICONS[item.icon] ?? BarChart3;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex gap-2.5 rounded-sm p-2.5 transition-colors hover:bg-surface-sunken"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary-pale">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </span>
                        <span>
                          <span className="block text-[13px] font-medium">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-light">
                            {item.blurb}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/#pricing"
            className="rounded-sm px-3 py-2 text-[14px] text-muted transition-colors hover:text-foreground"
          >
            {t.pricing}
          </Link>
          <Link
            href="/#how"
            className="rounded-sm px-3 py-2 text-[14px] text-muted transition-colors hover:text-foreground"
          >
            {t.docs}
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

          <Link href="/signup" className="btn btn-primary hidden sm:inline-flex">
            {t.cta}
            <span className="chev" aria-hidden>
              →
            </span>
          </Link>

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
        <div className="border-t border-border bg-background px-6 py-5 md:hidden">
          <div className="space-y-1">
            {t.productMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-sm px-2 py-2.5 text-[15px] transition-colors hover:bg-surface-sunken"
              >
                {item.title}
              </Link>
            ))}
            <Link
              href="/#pricing"
              onClick={() => setOpen(false)}
              className="block rounded-sm px-2 py-2.5 text-[15px]"
            >
              {t.pricing}
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-5">
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
