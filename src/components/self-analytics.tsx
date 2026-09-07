"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * PulseTrack measuring PulseTrack.
 *
 * Every screen in this product had only ever been seen against seeded
 * rows, which exercise the reading and never the writing: the tracker,
 * /api/track, the visitor hash, session resolution. This is the one
 * source of traffic nobody fabricated, and it runs that path
 * continuously, for free, on real browsers with real bots in the mix.
 *
 * The site id is not a secret. It sits in the script tag of every page
 * that is tracked, on this site and on every customer's, so hardcoding
 * it here gives away nothing that viewing source would not.
 */
const SITE_ID = "9f76deb2-c500-41d0-9f34-aa57719eced7";

/** Where the tracker is served from — the same origin in production. */
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

/**
 * Kept off the product itself.
 *
 * /dashboard is where customers work; folding their sessions into the
 * marketing numbers would answer "how is the landing page converting"
 * with a mixture of visitors and paying users, and the two need
 * different questions. /public pages belong to customers and are viewed
 * by *their* audience — measuring those visitors here would be
 * collecting on someone else's behalf without them asking.
 */
const EXCLUDED = ["/dashboard", "/public"];

export function SelfAnalytics() {
  const pathname = usePathname();

  // /api/track verifies the site exists but not where the hit came
  // from, so a valid id on localhost would be recorded like any other
  // visit. Development has to be excluded here or not at all.
  if (process.env.NODE_ENV !== "production") return null;
  if (EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <Script
      src={`${ORIGIN}/t.js`}
      data-site={SITE_ID}
      strategy="afterInteractive"
    />
  );
}
