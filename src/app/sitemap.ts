import type { MetadataRoute } from "next";
import { FEATURE_SLUGS } from "@/content/features";
import { localePath } from "@/i18n/paths";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

type Entry = MetadataRoute.Sitemap[number];

/**
 * Chaque page publique existe en anglais (/…) et en français (/fr/…) :
 * les deux adresses sont listées, et chacune déclare l'autre, pour que
 * Google indexe les deux langues au lieu d'une seule.
 */
function bilingual(
  path: string,
  changeFrequency: Entry["changeFrequency"],
  priority: number,
  lastModified: Date
): Entry[] {
  const languages = {
    en: `${SITE_URL}${path === "/" ? "" : path}`,
    fr: `${SITE_URL}${localePath("fr", path)}`,
  };
  return [languages.en, languages.fr].map((url) => ({
    url,
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...bilingual("/", "weekly", 1, now),
    ...FEATURE_SLUGS.flatMap((slug) => bilingual(`/features/${slug}`, "monthly", 0.8, now)),
    ...bilingual("/docs/mcp", "monthly", 0.7, now),
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
