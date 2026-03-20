import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = SITE_URL;
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/collections`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/checkout/result`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
