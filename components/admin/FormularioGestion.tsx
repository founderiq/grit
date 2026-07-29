"use client";

import { useId, useState, useTransition } from "react";
import { guardarGestion } from "@/app/admin/acciones";
import { ETIQUETA_ENTREGA, ETIQUETA_PAGO, type EstadoEntrega, type EstadoPago } from "@/lib/admin-formato";
import { ENTREGAS_VISIBLES, PAGOS_VISIBLES } from "@/lib/admin-mutaciones";
import { ADMIN } from "@/lib/admin-content";
import Aviso from "@/components/admin/Aviso";

/**
 * Estado de pago, estado de entrega y notas internas, con un solo botón.
 *
 * El formulario manda QUÉ se quiere dejar, nunca qué había antes: el servidor
 * lee el estado real de la base y decide. Si el pedido cambió en otra pestaña
 * mientras este formulario estaba abierto, gana lo que está guardado.
 *
 * Al guardar no se cierra el sidebar: casi siempre lo que sigue es cargar un
 * extra o revisar el resultado.
 */
export default function FormularioGestion({
  pedidoId,
  pagoInicial,
  entregaInicial,
  notasIniciales,
  onGuardado,
}: {
  pedidoId: string;
  pagoInicial: EstadoPago;
  entregaInicial: EstadoEntrega;
  notasIniciales: string;
  /** Vuelve a pedir el detalle y refresca métricas y listado. */
  onGuardado: () => void;
}) {
  const id = useId();
  const [pendiente, iniciar] = useTransition();

  const [pago, setPago] = useState<EstadoPago>(pagoInicial);
  const [entrega, setEntrega] = useState<EstadoEntrega>(entregaInicial);
  const [notas, setNotas] = useState(notasIniciales);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const guardar = () => {
    // `pendiente` bloquea el botón, pero la guarda también está acá: un Enter
    // repetido no debería encolar dos guardados.
    if (pendiente) return;
    setAviso(null);

    iniciar(async () => {
      const r = await guardarGestion({ pedidoId, pago, entrega, notas });
      setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      // Refresca detalle, métricas y tabla sin recargar la página.
      if (r.ok) onGuardado();
    });
  };

  const clasesCampo =
    "min-h-11 w-full rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[9px] font-inter text-[13px] text-tinta disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-pago`} className="block text-[12px] font-semibold text-tinta">
          {ADMIN.detalle.gestion.pago}
        </label>
        <select
          id={`${id}-pago`}
          value={pago}
          disabled={pendiente}
          onChange={(e) => setPago(e.target.value as EstadoPago)}
          className={`mt-[6px] ${clasesCampo}`}
        >
          {PAGOS_VISIBLES.map((v) => (
            <option key={v} value={v}>
              {ETIQUETA_PAGO[v]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-entrega`} className="block text-[12px] font-semibold text-tinta">
          {ADMIN.detalle.gestion.entrega}
        </label>
        <select
          id={`${id}-entrega`}
          value={entrega}
          disabled={pendiente}
          onChange={(e) => setEntrega(e.target.value as EstadoEntrega)}
          className={`mt-[6px] ${clasesCampo}`}
        >
          {ENTREGAS_VISIBLES.map((v) => (
            <option key={v} value={v}>
              {ETIQUETA_ENTREGA[v]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-notas`} className="block text-[12px] font-semibold text-tinta">
          {ADMIN.detalle.gestion.notas}
        </label>
        <textarea
          id={`${id}-notas`}
          rows={4}
          value={notas}
          disabled={pendiente}
          placeholder={ADMIN.detalle.gestion.notasPlaceholder}
          onChange={(e) => setNotas(e.target.value)}
          className={`mt-[6px] block w-full resize-y rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[10px] font-inter text-[13px] leading-[1.5] text-tinta placeholder:text-gris-oscuro disabled:cursor-not-allowed disabled:opacity-50`}
        />
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={pendiente}
        aria-busy={pendiente || undefined}
        className="min-h-11 rounded-pill bg-tinta px-[24px] py-[12px] font-inter text-[13px] font-semibold text-hueso transition-[background-color] duration-control ease-grit hover:bg-tinta-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendiente ? ADMIN.detalle.gestion.guardando : ADMIN.detalle.gestion.guardar}
      </button>

      {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
    </div>
  );
}
