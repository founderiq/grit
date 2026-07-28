"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivarPedido } from "@/app/admin/acciones";
import { ADMIN } from "@/lib/admin-content";
import Aviso from "@/components/admin/Aviso";

/**
 * Archivar o restaurar.
 *
 * Archivar es el único "borrado" del panel y es reversible, así que la
 * confirmación es un segundo clic explícito y no un `window.confirm`: el diálogo
 * del navegador se sale del sistema visual y en móvil es incómodo. Restaurar no
 * pide confirmación —no se pierde nada— y el paso de confirmación siempre se
 * puede cancelar.
 */
export default function BotonArchivar({
  pedidoId,
  archivado,
}: {
  pedidoId: string;
  archivado: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const ejecutar = (archivar: boolean) => {
    if (pendiente) return;
    setAviso(null);

    iniciar(async () => {
      const r = await archivarPedido({ pedidoId, archivar });
      setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
      setConfirmando(false);
      if (r.ok) router.refresh();
    });
  };

  const base =
    "min-h-11 rounded-pill px-[22px] py-[11px] font-inter text-[13px] font-semibold transition-[background-color,color] duration-control ease-grit disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      {archivado ? (
        <button
          type="button"
          onClick={() => ejecutar(false)}
          disabled={pendiente}
          aria-busy={pendiente || undefined}
          className={`${base} bg-tinta text-hueso hover:bg-tinta-2`}
        >
          {pendiente ? ADMIN.detalle.archivo.restaurando : ADMIN.detalle.archivo.restaurar}
        </button>
      ) : confirmando ? (
        <>
          <p className="m-0 text-[12.5px] leading-[1.5] text-tinta">
            {ADMIN.detalle.archivo.confirmar}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => ejecutar(true)}
              disabled={pendiente}
              aria-busy={pendiente || undefined}
              className={`${base} border-hairline border-estado-rojo-borde bg-estado-rojo-fondo text-estado-rojo-texto hover:bg-estado-rojo-borde`}
            >
              {pendiente ? ADMIN.detalle.archivo.archivando : "Sí, archivar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={pendiente}
              className={`${base} border-hairline border-borde-claro bg-superficie-input text-tinta hover:bg-bone-300`}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={pendiente}
          className={`${base} border-hairline border-borde-claro bg-superficie-input text-tinta hover:bg-bone-300`}
        >
          {ADMIN.detalle.archivo.archivar}
        </button>
      )}

      <p className="m-0 text-[11.5px] leading-[1.5] text-gris-oscuro">
        {ADMIN.detalle.archivo.nota}
      </p>

      {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
    </div>
  );
}
