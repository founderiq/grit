"use client";

import { useId } from "react";
import { OPCIONES_RANGO, type Rango } from "@/lib/admin-rango";
import { ADMIN } from "@/lib/admin-content";
import { useNavegar } from "@/components/admin/useNavegar";

/**
 * Rango de fechas de todo el panel.
 *
 * Cambiarlo reescribe la URL, y con ella se recalculan las métricas y se vuelve
 * a filtrar el listado: hay un solo rango y no puede haber dos partes de la
 * pantalla mirando períodos distintos.
 *
 * El rango personalizado muestra dos campos de fecha. Se aplica recién cuando
 * los dos están completos —lo resuelve `resolverRango()` en el servidor— para
 * no filtrar con medio dato mientras se está escribiendo.
 */
export default function SelectorRango({
  rango,
  params,
}: {
  rango: Rango;
  params: Record<string, string>;
}) {
  const id = useId();
  const { ir, pendiente } = useNavegar(params);

  const clasesCampo =
    "min-h-11 rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[9px] font-inter text-[13px] text-tinta transition-[border-color] duration-control ease-grit disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-end gap-3" aria-busy={pendiente || undefined}>
      <div>
        <label
          htmlFor={`${id}-rango`}
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-oscuro"
        >
          {ADMIN.panel.metricas.rango}
        </label>
        <select
          id={`${id}-rango`}
          value={rango.id}
          disabled={pendiente}
          // Cambiar el rango vuelve a la primera página: la que estabas viendo
          // puede no existir en el período nuevo.
          onChange={(e) => ir({ rango: e.target.value, pagina: null })}
          className={`mt-[6px] ${clasesCampo}`}
        >
          {OPCIONES_RANGO.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {rango.id === "personalizado" && (
        <>
          <div>
            <label
              htmlFor={`${id}-desde`}
              className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-oscuro"
            >
              {ADMIN.panel.metricas.desde}
            </label>
            <input
              id={`${id}-desde`}
              type="date"
              value={rango.desde ?? ""}
              disabled={pendiente}
              onChange={(e) => ir({ desde: e.target.value, pagina: null })}
              className={`mt-[6px] ${clasesCampo}`}
            />
          </div>

          <div>
            <label
              htmlFor={`${id}-hasta`}
              className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-oscuro"
            >
              {ADMIN.panel.metricas.hasta}
            </label>
            <input
              id={`${id}-hasta`}
              type="date"
              value={rango.hasta ?? ""}
              disabled={pendiente}
              onChange={(e) => ir({ hasta: e.target.value, pagina: null })}
              className={`mt-[6px] ${clasesCampo}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
