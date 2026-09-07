"use client";

import { useEffect, useState } from "react";

/**
 * Turns an event's stored name into the one people chose to read.
 *
 * An alias that only showed up on the Lexicon screen would be a note
 * nobody sees — the same mistake as a "hide" button that only greys out
 * its own row. So every screen that displays an event name resolves it
 * through this, while the name sent to the API stays the real one.
 */
export function useEventAliases(siteId: string | null) {
  const [aliases, setAliases] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lexicon/aliases?site_id=${siteId}`);
        const data = await res.json();
        if (!cancelled) setAliases(data.aliases ?? {});
      } catch {
        /* Raw names are a fine fallback; a failed lookup should never
           take a screen down with it. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  /** The name to show. Falls back to the stored one, always. */
  return (name: string | null | undefined): string =>
    (name && aliases[name]) || name || "";
}
