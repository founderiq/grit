import Link from "next/link";
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
 *
 * Debajo, la navegación entre las secciones del panel (pedidos y galería de
 * producto). Son enlaces comunes: cada sección es su propia ruta bajo /admin
 * y autoriza por su cuenta en el servidor.
 */
export default function HeaderAdmin({
  usuario,
  seccion = "pedidos",
}: {
  usuario: string;
  seccion?: "pedidos" | "galeria";
}) {
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

      <nav
        aria-label={ADMIN.secciones.etiqueta}
        className="mx-auto max-w-[1240px] px-5 pb-[12px] lg:px-8"
      >
        <ul className="m-0 flex list-none gap-1 p-0">
          {ADMIN.secciones.items.map((s) => {
            const activa = s.id === seccion;
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  aria-current={activa ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center rounded-pill px-[14px] py-[7px] font-inter text-[12.5px] font-semibold transition-[color,background-color] duration-control ease-grit ${
                    activa ? "bg-tinta text-hueso" : "text-gris-oscuro hover:bg-bone-300 hover:text-tinta"
                  }`}
                >
                  {s.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
