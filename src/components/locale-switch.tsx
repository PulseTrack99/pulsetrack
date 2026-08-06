"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dictionaries";

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();

  function toggle() {
    const next = locale === "fr" ? "en" : "fr";
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-light transition-colors hover:border-muted hover:text-foreground hover:bg-surface-hover"
      title={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      <span className="text-sm leading-none">{locale === "fr" ? "🇫🇷" : "🇬🇧"}</span>
      {locale === "fr" ? "FR" : "EN"}
    </button>
  );
}
