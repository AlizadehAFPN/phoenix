import type { MetadataRoute } from "next";

import { THEME } from "@/theme";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: THEME.indexable
      ? { userAgent: "*", allow: "/", disallow: ["/api/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: THEME.indexable ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
