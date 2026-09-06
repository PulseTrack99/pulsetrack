/**
 * "3 minutes ago" / "il y a 3 minutes", in whatever language the
 * dashboard is in.
 *
 * Two components had each written their own French-only version
 * ("il y a 3 min", "à l'instant"). Intl.RelativeTimeFormat already
 * knows how to say this in every locale, including the plural rules
 * and the "just now" case, so there is nothing here worth hand-writing.
 */
export function relativeTime(iso: string, intl: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });

  // Under a minute reads better as "just now" than "in 0 seconds", and
  // numeric:"auto" gives exactly that for a 0 value.
  if (seconds < 60) return rtf.format(0, "second");
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
  return rtf.format(-Math.round(seconds / 86400), "day");
}
