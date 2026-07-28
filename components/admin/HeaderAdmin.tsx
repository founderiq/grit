import Logo from "@/components/Logo";
import Actualizar from "@/components/admin/Actualizar";
import CerrarSesion from "@/components/admin/CerrarSesion";
import { ADMIN } from "@/lib/admin-content";

/**
 * Barra superior del panel.
 *
 * Marca a la izquierda, quién está adentro y las dos acciones de sesión a la
 * derecha. Se mantiene fina a propósito: el panel es una herramienta de
 * trabajo y el espacio vertical es para los datos.
 *
 * El logo sale de `components/Logo.tsx`, que centraliza el tamaño de todas
 * las superficies.
 */
export default function HeaderAdmin({ usuario }: { usuario: string }) {
  return (
    <header
      aria-label={ADMIN.titulo}
      className="border-b border-borde-claro bg-superficie-input"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-[14px] lg:px-8">
        <div className="flex items-center gap-3">
          <Logo variante="admin" sobre="claro" />
          <span aria-hidden="true" className="h-4 w-px bg-borde-claro" />
          <p className="m-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gris-oscuro">
            Administración
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[12.5px] text-gris-oscuro sm:inline">{usuario}</span>
          <Actualizar />
          <CerrarSesion />
        </div>
      </div>
    </header>
  );
}
