import type { MetadataRoute } from "next";
import { FEATURE_SLUGS } from "@/content/features";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pulsetrack.eu";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...FEATURE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/features/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
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
