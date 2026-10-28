import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import AdminLogin from "@/components/admin/AdminLogin";
import GestorGaleria from "@/components/admin/GestorGaleria";
import HeaderAdmin from "@/components/admin/HeaderAdmin";
import { EncabezadoPanel, Panel, PanelError } from "@/components/admin/Piezas";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { ADMIN } from "@/lib/admin-content";
import { obtenerGaleriaAdmin } from "@/lib/galeria-datos";

export const metadata: Metadata = { title: ADMIN.galeria.titulo };

/**
 * /admin/galeria — galería general de /producto.
 *
 * Misma puerta que /admin: Server Component, `obtenerEstadoAdmin()` decide en
 * el servidor y no hay nada que revelar desde el navegador. Sin sesión se
 * muestra el login acá mismo; sin permiso (o sin configuración) se vuelve a
 * /admin, que muestra el aviso correspondiente.
 *
 * `force-dynamic`: depende de la sesión y tiene que mostrar siempre el estado
 * real de la galería.
 */
export const dynamic = "force-dynamic";

export default async function GaleriaAdminPage() {
  const acceso = await obtenerEstadoAdmin();

  if (acceso.estado === "sin_sesion") {
    return <AdminLogin logo={<Logo variante="auth" sobre="claro" />} />;
  }
  if (acceso.estado !== "autorizado") redirect("/admin");

  const galeria = await obtenerGaleriaAdmin();
  const g = ADMIN.galeria;

  return (
    <div className="grit-on-light flex min-h-screen flex-col bg-hueso text-tinta">
      <HeaderAdmin usuario={acceso.nombre ?? acceso.email ?? ""} seccion="galeria" />

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-8 lg:px-8 lg:py-10">
        <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-gris-oscuro">
          {g.eyebrow}
        </p>
        <h1 className="m-0 mt-[6px] font-archivo text-[24px] font-extrabold leading-[1.05] tracking-[-0.02em] lg:text-[28px]">
          {g.titulo}
          <span className="text-tierra-oscura">.</span>
        </h1>

        <Panel className="mt-7">
          {galeria.ok ? (
            <GestorGaleria imagenes={galeria.datos} />
          ) : (
            <>
              <EncabezadoPanel eyebrow={g.eyebrow} titulo={g.titulo} detalle={g.detalle} />
              <PanelError />
            </>
          )}
        </Panel>
      </main>
    </div>
  );
}
