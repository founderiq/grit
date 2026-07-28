"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarAjuste } from "@/app/admin/acciones";
import { ADMIN } from "@/lib/admin-content";
import Aviso from "@/components/admin/Aviso";

/**
 * Alta de un extra del pedido.
 *
 * Los montos van en guaraníes enteros. La validación real está en el servidor
 * —al menos uno mayor a cero, ninguno negativo, detalle obligatorio—; lo de acá
 * es solo para no hacer viajar un formulario que ya se sabe incompleto.
 *
 * Contra el doble envío: el botón se deshabilita mientras guarda y el servidor,
 * además, descarta un alta idéntica repetida dentro de los quince segundos.
 */
export default function FormularioAjuste({ pedidoId }: { pedidoId: string }) {
  const id = useId();
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const agregar = () => {
    if (pendiente) return;
    setAviso(null);

    iniciar(async () => {
      const r = await agregarAjuste({ pedidoId, revenue, cost, descripcion });
      setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });

      if (r.ok) {
        // El formulario se vacía solo cuando el extra quedó guardado: si falló,
        // lo escrito sigue ahí para corregirlo.
        setRevenue("");
        setCost("");
        setDescripcion("");
        router.refresh();
      }
    });
  };

  const clasesCampo =
    "min-h-11 w-full rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[9px] font-inter text-[13px] tabular-nums text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-venta`} className="block text-[12px] font-semibold text-tinta">
            {ADMIN.detalle.ajustes.revenue}
          </label>
          <input
            id={`${id}-venta`}
            type="text"
            inputMode="numeric"
            value={revenue}
            disabled={pendiente}
            placeholder="0"
            onChange={(e) => setRevenue(e.target.value)}
            className={`mt-[6px] ${clasesCampo}`}
          />
        </div>

        <div>
          <label htmlFor={`${id}-costo`} className="block text-[12px] font-semibold text-tinta">
            {ADMIN.detalle.ajustes.cost}
          </label>
          <input
            id={`${id}-costo`}
            type="text"
            inputMode="numeric"
            value={cost}
            disabled={pendiente}
            placeholder="0"
            onChange={(e) => setCost(e.target.value)}
            className={`mt-[6px] ${clasesCampo}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-detalle`} className="block text-[12px] font-semibold text-tinta">
          {ADMIN.detalle.ajustes.descripcion}
        </label>
        <textarea
          id={`${id}-detalle`}
          rows={3}
          value={descripcion}
          disabled={pendiente}
          placeholder={ADMIN.detalle.ajustes.descripcionPlaceholder}
          onChange={(e) => setDescripcion(e.target.value)}
          className="mt-[6px] block w-full resize-y rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[10px] font-inter text-[13px] leading-[1.5] text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <p className="m-0 text-[11.5px] leading-[1.5] text-gris-oscuro">
        {ADMIN.detalle.ajustes.ayuda}
      </p>

      <button
        type="button"
        onClick={agregar}
        disabled={pendiente}
        aria-busy={pendiente || undefined}
        className="min-h-11 rounded-pill border-hairline border-borde-claro bg-superficie-input px-[24px] py-[11px] font-inter text-[13px] font-semibold text-tinta transition-[background-color] duration-control ease-grit hover:bg-bone-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? ADMIN.detalle.ajustes.agregando : ADMIN.detalle.ajustes.agregar}
      </button>

      {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
    </div>
  );
}
