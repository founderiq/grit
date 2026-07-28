"use client";

import { ADMIN } from "@/lib/admin-content";
import { totalPaginas } from "@/lib/admin-filtros";
import { useNavegar } from "@/components/admin/useNavegar";

/**
 * Paginación del listado. Solo aparece cuando hay más de una página.
 *
 * La página viaja en la URL como cualquier otro filtro, así que recargar o
 * compartir el enlace lleva al mismo lugar.
 */
export default function Paginacion({
  pagina,
  total,
  params,
}: {
  pagina: number;
  total: number;
  params: Record<string, string>;
}) {
  const paginas = totalPaginas(total);
  if (paginas <= 1) return null;

  return <Controles pagina={pagina} paginas={paginas} params={params} />;
}

function Controles({
  pagina,
  paginas,
  params,
}: {
  pagina: number;
  paginas: number;
  params: Record<string, string>;
}) {
  const { ir, pendiente } = useNavegar(params);

  const clases =
    "min-h-11 rounded-pill border-hairline border-borde-claro bg-superficie-input px-[16px] py-[9px] font-inter text-[12.5px] font-semibold text-tinta transition-[color,background-color] duration-control ease-grit hover:bg-bone-300 disabled:cursor-not-allowed disabled:opacity-40";

  // Se acota por las dudas: la página puede venir de una URL editada a mano.
  const actual = Math.min(Math.max(1, pagina), paginas);

  return (
    <nav
      aria-label="Paginación de pedidos"
      className="flex items-center justify-between gap-4 border-t border-borde-claro px-5 py-4"
      aria-busy={pendiente || undefined}
    >
      <p className="m-0 text-[12.5px] text-gris-oscuro">
        {ADMIN.panel.paginacion.de(actual, paginas)}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          className={clases}
          disabled={pendiente || actual <= 1}
          onClick={() => ir({ pagina: actual - 1 <= 1 ? null : String(actual - 1) })}
        >
          {ADMIN.panel.paginacion.anterior}
        </button>
        <button
          type="button"
          className={clases}
          disabled={pendiente || actual >= paginas}
          onClick={() => ir({ pagina: String(actual + 1) })}
        >
          {ADMIN.panel.paginacion.siguiente}
        </button>
      </div>
    </nav>
  );
}
