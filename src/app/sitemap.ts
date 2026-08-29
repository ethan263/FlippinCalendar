import type { MetadataRoute } from "next";

import { getAppOrigin } from "@/lib/site";

/** Marketing routes only — tenant public pages are indexed via their own URLs when crawled. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getAppOrigin();
  const lastModified = new Date();
  return [
    { url: `${origin}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${origin}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${origin}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
