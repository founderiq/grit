import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

export default function robots(): MetadataRoute.Robots {
  return {
    // Pantallas transaccionales: fuera de los buscadores.
    rules: { userAgent: "*", allow: "/", disallow: ["/checkout", "/gracias", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
