"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";

/**
 * One site selection, shared by the whole dashboard.
 *
 * Every panel used to own its own selector and its own state, so
 * switching site on Heatmaps left Funnels on the previous one and the
 * control appeared in eight different places. Mixpanel puts the
 * project switcher once, at the top of the rail, and every screen
 * follows it — this is that, and the selection survives navigation
 * and reloads.
 */

export interface Site {
  id: string;
  name: string;
  domain: string;
  public_share_id?: string | null;
  created_at?: string;
}

interface SiteContextValue {
  sites: Site[];
  site: Site | null;
  siteId: string | null;
  /** False until the stored choice has been read. See below. */
  ready: boolean;
  setSiteId: (id: string) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

const STORAGE_KEY = "pulsetrack:selected-site";

/* localStorage read as an external store, so the value arrives through
   the hydration-safe path instead of a setState in an effect. The
   subscription is to the `storage` event, which fires when the choice
   is changed in another tab — so two open tabs stay on the same site. */
function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage.
    return null;
  }
}

/** The server has no localStorage, so it reports "nothing stored". */
const noStoredValue = () => null;

/* Canonical hydration-safe "are we past the first client render?"
   signal: false on the server and during hydration, true after. */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function SiteProvider({
  sites,
  children,
}: {
  sites: Site[];
  children: React.ReactNode;
}) {
  // The server can't know which site was chosen last time, so the first
  // render deliberately selects nothing rather than guessing sites[0].
  //
  // Guessing was worse than it looked: the rail flashed the wrong site
  // name on every load, and — because panels fetch on siteId change —
  // each screen fired one request for the guess and one for the real
  // choice at the same time. Whichever landed last won, so /dashboard
  // could show one site's name above another site's numbers.
  //
  // Selecting nothing costs one frame (the switcher renders a
  // placeholder, panels skip their fetch), after which exactly one
  // request goes out, for the right site.
  const ready = useSyncExternalStore(neverChanges, onClient, onServer);
  const stored = useSyncExternalStore(
    subscribeToStorage,
    readStored,
    noStoredValue
  );

  // Set by the switcher. Takes precedence over the stored value, which
  // doesn't re-read on a same-tab write.
  const [picked, setPicked] = useState<string | null>(null);

  const remembered = stored && sites.some((s) => s.id === stored) ? stored : null;
  const resolved = picked ?? remembered ?? sites[0]?.id ?? null;
  const siteId = ready ? resolved : null;

  function setSiteId(id: string) {
    setPicked(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Not being able to remember the choice shouldn't break making it.
    }
  }

  const site = sites.find((s) => s.id === siteId) ?? null;

  return (
    <SiteContext.Provider value={{ sites, site, siteId, ready, setSiteId }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSites(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSites must be used inside <SiteProvider>");
  return ctx;
}
