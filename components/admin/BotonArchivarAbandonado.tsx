"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refrescarPanel } from "@/components/admin/refrescar";
import { archivarAbandonado } from "@/app/admin/acciones-panel";
import { ADMIN } from "@/lib/admin-content";

/**
 * Archiva o restaura un checkout abandonado desde la fila del listado.
 *
 * Es la misma idea que en pedidos: archivar es un borrado lógico y reversible,
 * así que no hace falta confirmar para archivar —se puede deshacer con el mismo
 * botón— y no existe ningún camino que borre la fila de verdad.
 *
 * Si falla, el botón lo dice con todas las letras en lugar de abrir un cartel
 * dentro de una celda de tabla, que sería ilegible. El detalle del error queda
 * en el log del servidor.
 */
export default function BotonArchivarAbandonado({
  id,
  archivado,
}: {
  id: string;
  archivado: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [fallo, setFallo] = useState(false);

  const ejecutar = () => {
    if (pendiente) return;
    setFallo(false);

    iniciar(async () => {
      const r = await archivarAbandonado({ id, archivar: !archivado });
      if (r.ok) refrescarPanel(router);
      else setFallo(true);
    });
  };

  const c = ADMIN.abandonados;

  return (
    <button
      type="button"
      onClick={ejecutar}
      disabled={pendiente}
      aria-busy={pendiente || undefined}
      className="min-h-11 whitespace-nowrap rounded-strip text-left font-inter text-[12px] font-semibold text-gris-oscuro underline-offset-2 transition-colors duration-control ease-grit hover:text-tinta hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {fallo
        ? c.fallo
        : pendiente
          ? archivado
            ? c.restaurando
            : c.archivando
          : archivado
            ? c.restaurar
            : c.archivar}
    </button>
  );
}
