"use client";

import { RevenuePanel } from "@/components/revenue-panel";
import { useSites } from "@/components/site-context";
import { useT } from "@/components/locale-context";
import { DollarSign } from "lucide-react";

/**
 * Thin client wrapper so Revenue follows the rail's site selection.
 * The page used to load sites itself with .limit(1) and always show
 * the oldest one — anyone with more than one site was looking at the
 * wrong revenue and had no way to tell.
 */
export function RevenueScreen() {
  const { siteId, ready } = useSites();
  const { t } = useT();

  // Don't accuse the account of having no site before the stored
  // selection has even been read.
  if (!ready) return null;

  if (!siteId) {
    return (
      <div className="app-card flex flex-col items-center justify-center py-16 text-center">
        <DollarSign className="h-7 w-7 text-muted-light" />
        <h2 className="mt-3 text-[15px] font-semibold">{t.screens.common.noSiteTitle}</h2>
        <p className="mt-1 max-w-sm text-[13px] text-muted">
          {t.screens.revenueScreen.emptyBody}
        </p>
        <a
          href="/dashboard/sites/new"
          className="mt-4 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {t.screens.common.addSite}
        </a>
      </div>
    );
  }

  // key={siteId} so switching site gives a fresh panel instead of one
  // still holding the previous site's revenue.
  return <RevenuePanel key={siteId} siteId={siteId} />;
}
