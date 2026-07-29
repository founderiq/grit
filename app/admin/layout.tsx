import type { Metadata } from "next";

/**
 * Layout de /admin.
 *
 * Existe sobre todo por el `robots`: puesto acá, cubre también las secciones
 * que se agreguen más adelante bajo /admin, sin depender de que cada página
 * se acuerde de declararlo. El panel tampoco figura en `app/sitemap.ts` y
 * `app/robots.ts` lo bloquea explícitamente.
 *
 * Ocultarlo de los buscadores no es una medida de seguridad y no se usa como
 * tal: quien entra lo decide el servidor contra `admin_users`.
 */
export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
