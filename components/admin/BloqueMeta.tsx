"use client";

import { useState, useTransition } from "react";
import { enviarVentaAMeta } from "@/app/admin/acciones-meta";
import { ADMIN } from "@/lib/admin-content";
import { fmtFechaHora } from "@/lib/admin-formato";
import type { EstadoMetaVista } from "@/lib/admin-tipos";
import Aviso from "@/components/admin/Aviso";

/**
 * Bloque "Meta" del detalle de un pedido MANUAL.
 *
 *   No enviado → [ Enviar venta a Meta ] (con confirmación en un segundo clic)
 *   Enviado    → ✓ Venta enviada, fecha y event_id. Sin botón: no se reenvía.
 *   Error      → ⚠ Error al enviar, el motivo y [ Reintentar ]
 *
 * El botón solo decide qué mostrar. Quien decide si el envío corresponde es la
 * Server Action, que vuelve a leer el pedido en la base: si este bloque quedó
 * viejo (otra pestaña ya lo envió), el servidor responde "ya enviado" y no
 * manda nada.
 */
export default function BloqueMeta({
  pedidoId,
  meta,
  onEnviado,
}: {
  pedidoId: string;
  meta: EstadoMetaVista;
  /** Vuelve a pedir el detalle para mostrar el estado nuevo. */
  onEnviado: () => void;
}) {
  const T = ADMIN.detalle.meta;
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const enviar = () => {
    if (pendiente) return;
    setAviso(null);

    iniciar(async () => {
      const r = await enviarVentaAMeta({ pedidoId });
      setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      setConfirmando(false);
      // También ante un error: el estado guardado cambió (error + reintento).
      onEnviado();
    });
  };

  const base =
    "min-h-11 rounded-pill px-[22px] py-[11px] font-inter text-[13px] font-semibold transition-[background-color,color] duration-control ease-grit disabled:cursor-not-allowed disabled:opacity-50";

  const habilitado = meta.bloqueo === null && !pendiente;
  const puedeEnviar = meta.estado === "no_enviado" || meta.estado === "error";

  return (
    <div className="flex flex-col gap-3">
      {meta.modo === "test" && (
        <p className="m-0 rounded-strip border-hairline border-estado-violeta-borde bg-estado-violeta-fondo px-[12px] py-[9px] text-[12px] leading-[1.45] text-estado-violeta-texto">
          {T.modoPrueba}
        </p>
      )}

      {meta.estado === "enviado" && (
        <div className="flex flex-col gap-[6px]">
          <p className="m-0 font-archivo text-[14px] font-bold text-estado-verde-texto">
            {meta.modo === "test" ? T.enviadaPrueba : T.enviada}
          </p>
          {meta.enviadoEn && (
            <p className="m-0 text-[12px] text-gris-oscuro">
              {T.enviadaEl} {fmtFechaHora(meta.enviadoEn)}
            </p>
          )}
          {meta.eventId && (
            <p className="m-0 break-all font-mono text-[11px] text-gris-oscuro">
              {T.eventId}: {meta.eventId}
            </p>
          )}
        </div>
      )}

      {meta.estado === "enviando" && (
        <p className="m-0 text-[13px] font-semibold text-tinta">{T.enCurso}</p>
      )}

      {meta.estado === "error" && (
        <div className="flex flex-col gap-[6px]">
          <p className="m-0 font-archivo text-[14px] font-bold text-estado-rojo-texto">{T.error}</p>
          {meta.error && (
            <p className="m-0 text-[12px] leading-[1.45] text-gris-oscuro">{meta.error}</p>
          )}
        </div>
      )}

      {meta.enviadoEnVivo && (
        <p className="m-0 text-[12px] leading-[1.45] text-gris-oscuro">{T.enviadaEnVivo}</p>
      )}

      {puedeEnviar &&
        (confirmando ? (
          <>
            <p className="m-0 text-[12.5px] leading-[1.5] text-tinta">{T.confirmar}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={enviar}
                disabled={!habilitado}
                aria-busy={pendiente || undefined}
                className={`${base} bg-tinta text-hueso hover:bg-tinta-2`}
              >
                {pendiente ? T.enviando : T.confirmarSi}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={pendiente}
                className={`${base} border-hairline border-borde-claro bg-superficie-input text-tinta hover:bg-bone-300`}
              >
                {T.cancelar}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={!habilitado}
            className={`${base} bg-tinta text-hueso hover:bg-tinta-2`}
          >
            {meta.estado === "error" ? T.reintentar : T.enviar}
          </button>
        ))}

      {puedeEnviar && meta.bloqueo && (
        <p className="m-0 text-[12px] leading-[1.45] text-gris-oscuro">{meta.bloqueo}</p>
      )}

      <p className="m-0 text-[11.5px] leading-[1.5] text-gris-oscuro">{T.nota}</p>

      {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
    </div>
  );
}
