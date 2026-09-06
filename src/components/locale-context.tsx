"use client";

import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dictionaries";
import { APP_STRINGS, type AppStrings } from "@/i18n/app-strings";

/**
 * The dashboard's language.
 *
 * The marketing site was already bilingual; the dashboard was hardcoded
 * French, down to every toLocaleString("fr-FR"). Same mechanism as the
 * marketing nav — a `locale` cookie read server-side by getLocale() —
 * so a visitor who switched language on the landing page arrives in the
 * app already in that language, and one choice governs both.
 *
 * Strings come through `t`, which is the dictionary for the active
 * locale rather than a lookup by key: a missing entry is then a type
 * error at build time instead of a raw key shown to a customer.
 */

interface LocaleContextValue {
  locale: Locale;
  t: AppStrings;
  /** BCP-47 tag for Intl — number and date formatting follow the UI. */
  intl: string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: APP_STRINGS[locale],
      intl: locale === "fr" ? "fr-FR" : "en-GB",
      setLocale: (next: Locale) => {
        document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
        router.refresh();
      },
    }),
    [locale, router]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useT(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used inside <LocaleProvider>");
  return ctx;
}
