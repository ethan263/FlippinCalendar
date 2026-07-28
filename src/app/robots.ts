import type { MetadataRoute } from "next";

import { getAppOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/p/"],
        disallow: ["/app/", "/api/", "/sign-in", "/sign-up", "/session-tasks"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
