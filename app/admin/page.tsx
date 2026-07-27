import AdminLogin from "@/components/admin/AdminLogin";
import CerrarSesion from "@/components/admin/CerrarSesion";
import { obtenerEstadoAdmin } from "@/lib/admin-auth";
import { ADMIN } from "@/lib/admin-content";

/**
 * /admin — shell mínimo del panel.
 *
 * Es un Server Component: la decisión de qué se muestra se toma en el servidor,
 * antes de enviar nada al navegador. No hay una versión "completa" de esta
 * página escondida detrás de un `if` del cliente, así que no hay nada que
 * revelar desactivando JavaScript o inspeccionando el bundle.
 *
 * Tres estados, resueltos por `obtenerEstadoAdmin()`:
 *   · sin sesión      → login dentro de /admin
 *   · sin permiso     → "Acceso no autorizado" (la cuenta existe, el permiso no)
 *   · autorizado      → header del panel
 *
 * `force-dynamic` porque la respuesta depende de la sesión del request: esta
 * ruta no se prerenderiza ni se cachea nunca.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const acceso = await obtenerEstadoAdmin();

  if (acceso.estado === "sin_configuracion") {
    return (
      <Aviso titulo={ADMIN.sinConfiguracion.titulo} detalle={ADMIN.sinConfiguracion.detalle} />
    );
  }

  if (acceso.estado === "sin_sesion") {
    return <AdminLogin />;
  }

  if (acceso.estado === "no_autorizado") {
    return (
      <Aviso
        titulo={ADMIN.noAutorizado.titulo}
        detalle={ADMIN.noAutorizado.detalle}
        pie={acceso.email}
        conSalida
      />
    );
  }

  return (
    <div className="grit-on-light flex min-h-screen flex-col bg-hueso text-tinta">
      <header className="border-b border-borde-claro">
        <div className="mx-auto flex max-w-contenido flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- ver nota
                en AdminLogin: next/image acá encarece el bundle de la landing. */}
            <img src="/img/logo-dark.svg" alt="Grit" width={90} height={18} className="h-4 w-auto" />
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-borde-claro sm:block"
            />
            <h1 className="m-0 font-archivo text-[14px] font-bold uppercase tracking-[-0.01em] lg:text-[15px]">
              {ADMIN.titulo}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[12.5px] text-gris-oscuro">
              {acceso.nombre ?? acceso.email}
            </span>
            <CerrarSesion />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-contenido flex-1 px-5 py-10 lg:px-10 lg:py-14">
        <p className="m-0 font-archivo text-[18px] font-bold leading-[1.3] lg:text-[20px]">
          {ADMIN.autorizado.mensaje}
        </p>
        <p className="m-0 mt-3 max-w-[560px] text-[13.5px] leading-[1.6] text-gris-oscuro lg:text-[14.5px]">
          {ADMIN.autorizado.detalle}
        </p>
      </main>
    </div>
  );
}

/**
 * Pantalla neutra para los estados que no muestran el panel. Deliberadamente
 * no explica por qué falta el permiso ni qué habría que cumplir.
 */
function Aviso({
  titulo,
  detalle,
  pie,
  conSalida = false,
}: {
  titulo: string;
  detalle: string;
  pie?: string | null;
  conSalida?: boolean;
}) {
  return (
    <div className="grit-on-light flex min-h-screen flex-col items-center justify-center bg-hueso px-5 py-12 text-tinta">
      <div className="w-full max-w-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- ídem. */}
        <img src="/img/logo-dark.svg" alt="Grit" width={90} height={18} className="h-[18px] w-auto" />

        <h1 className="m-0 mt-6 font-archivo text-[22px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] lg:text-[26px]">
          {titulo}
          <span className="text-tierra-oscura">.</span>
        </h1>
        <p className="m-0 mt-3 text-[13.5px] leading-[1.6] text-gris-oscuro">{detalle}</p>

        {pie && (
          <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-gris-oscuro">
            {pie}
          </p>
        )}

        {conSalida && (
          <div className="mt-6">
            <CerrarSesion />
          </div>
        )}
      </div>
    </div>
  );
}
