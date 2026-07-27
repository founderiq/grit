import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

export default function robots(): MetadataRoute.Robots {
  return {
    // El checkout no se indexa: es una pantalla transaccional.
    rules: { userAgent: "*", allow: "/", disallow: "/checkout" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
