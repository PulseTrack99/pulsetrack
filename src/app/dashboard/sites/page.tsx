import { SitesManager } from "@/components/sites-manager";

export const metadata = {
  title: "Mes sites",
};

/** Sites come from the layout's SiteProvider — the same list the rail's
 *  switcher shows, so this page can never disagree with it.
 *
 *  The origin is resolved here rather than from `window` in the client,
 *  so the tracking snippet is byte-identical on the server and after
 *  hydration — the same source every other part of the app uses to
 *  build absolute URLs. */
export default function SitesPage() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";
  return <SitesManager origin={origin} />;
}
