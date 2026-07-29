import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

export default function robots(): MetadataRoute.Robots {
  return {
    // Pantallas transaccionales y panel interno: fuera de los buscadores.
    // /admin además va con noindex propio; esto es solo una capa más, no la
    // protección: quién entra lo decide el servidor contra `admin_users`.
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/gracias", "/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
