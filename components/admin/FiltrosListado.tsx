"use client";

import { useEffect, useId, useState } from "react";
import {
  OPCIONES_ARCHIVO,
  OPCIONES_ENTREGA,
  OPCIONES_ORIGEN,
  OPCIONES_PAGO,
  type FiltrosPedidos,
} from "@/lib/admin-filtros";
import { ADMIN } from "@/lib/admin-content";
import { useNavegar } from "@/components/admin/useNavegar";

/**
 * Pestañas y filtros del listado.
 *
 * Todo cambio reescribe la URL y el filtrado ocurre en SQL: el navegador no
 * recibe pedidos que no va a mostrar. Cualquier filtro vuelve a la página 1,
 * porque la página que estabas viendo puede no existir en el conjunto nuevo.
 *
 * La búsqueda se escribe en estado local y se envía al soltar el Enter o al
 * salir del campo, en lugar de disparar una consulta por tecla.
 */
export default function FiltrosListado({
  filtros,
  params,
}: {
  filtros: FiltrosPedidos;
  params: Record<string, string>;
}) {
  const id = useId();
  const { ir, pendiente } = useNavegar(params);
  const [texto, setTexto] = useState(filtros.busqueda);

  // Si el rango o la pestaña cambian desde otro control, el campo se mantiene
  // en sincronía con lo que el servidor realmente aplicó.
  useEffect(() => setTexto(filtros.busqueda), [filtros.busqueda]);

  const enPedidos = filtros.tab === "pedidos";

  const clasesSelect =
    "min-h-11 w-full rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[9px] font-inter text-[13px] text-tinta disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  const buscar = () => ir({ q: texto.trim(), pagina: null });

  return (
    <div className="flex flex-col gap-4" aria-busy={pendiente || undefined}>
      {/* --- Pestañas ------------------------------------------------------ */}
      <div
        role="tablist"
        aria-label="Secciones del listado"
        className="inline-flex w-fit gap-1 rounded-pill border-hairline border-borde-claro bg-hueso p-1"
      >
        {ADMIN.panel.listado.tabs.map((t) => {
          const activa = filtros.tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activa}
              disabled={pendiente}
              onClick={() => ir({ tab: t.id === "pedidos" ? null : t.id, pagina: null })}
              className={`min-h-9 rounded-pill px-[16px] py-[7px] font-inter text-[12.5px] font-semibold transition-[color,background-color] duration-control ease-grit disabled:cursor-not-allowed ${
                activa
                  ? "bg-tinta text-hueso"
                  : "bg-transparent text-gris-oscuro hover:text-tinta"
              }`}
            >
              {t.etiqueta}
            </button>
          );
        })}
      </div>

      {/* --- Filtros de pedidos -------------------------------------------
          El tab de abandonados todavía no tiene filtros propios: mostrar los
          de pedidos ahí sugeriría que hacen algo.                          */}
      {enPedidos && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:min-w-[240px] sm:flex-1">
            <label htmlFor={`${id}-q`} className="sr-only">
              {ADMIN.panel.listado.buscar}
            </label>
            <input
              id={`${id}-q`}
              type="search"
              value={texto}
              disabled={pendiente}
              placeholder={ADMIN.panel.listado.buscar}
              onChange={(e) => setTexto(e.target.value)}
              onBlur={buscar}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscar();
                }
              }}
              className="min-h-11 w-full rounded-strip border-hairline border-borde-claro bg-superficie-input px-[14px] py-[9px] font-inter text-[13px] text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Select
            id={`${id}-pago`}
            etiqueta="Filtrar por pago"
            valor={filtros.pago}
            opciones={OPCIONES_PAGO}
            onChange={(v) => ir({ pago: v === "todos" ? null : v, pagina: null })}
            disabled={pendiente}
            className={clasesSelect}
          />

          <Select
            id={`${id}-entrega`}
            etiqueta="Filtrar por entrega"
            valor={filtros.entrega}
            opciones={OPCIONES_ENTREGA}
            onChange={(v) => ir({ entrega: v === "todas" ? null : v, pagina: null })}
            disabled={pendiente}
            className={clasesSelect}
          />

          <Select
            id={`${id}-origen`}
            etiqueta="Filtrar por origen"
            valor={filtros.origen}
            opciones={OPCIONES_ORIGEN}
            onChange={(v) => ir({ origen: v === "todos" ? null : v, pagina: null })}
            disabled={pendiente}
            className={clasesSelect}
          />

          <Select
            id={`${id}-archivo`}
            etiqueta="Mostrar archivados"
            valor={filtros.archivo}
            opciones={OPCIONES_ARCHIVO}
            onChange={(v) => ir({ archivo: v === "activos" ? null : v, pagina: null })}
            disabled={pendiente}
            className={clasesSelect}
          />
        </div>
      )}
    </div>
  );
}

/** Select con etiqueta accesible pero sin título visible: la opción se explica sola. */
function Select({
  id,
  etiqueta,
  valor,
  opciones,
  onChange,
  disabled,
  className,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: readonly { id: string; etiqueta: string }[];
  onChange: (v: string) => void;
  disabled: boolean;
  className: string;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      >
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </>
  );
}
