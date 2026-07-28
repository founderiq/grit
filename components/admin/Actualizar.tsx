"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconRotate } from "@/components/ui/ProductoIcons";
import { ADMIN } from "@/lib/admin-content";

/**
 * Vuelve a pedirle los datos al servidor.
 *
 * `/admin` es `force-dynamic`, así que `router.refresh()` reejecuta los Server
 * Components y trae pedidos y métricas frescos sin recargar la página entera ni
 * perder el scroll o los filtros.
 *
 * `useTransition` marca el botón como ocupado durante la ida y vuelta.
 */
export default function Actualizar() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciar(() => router.refresh())}
      disabled={pendiente}
      aria-busy={pendiente || undefined}
      className="inline-flex min-h-11 items-center gap-2 rounded-pill border-hairline border-borde-claro bg-superficie-input px-[15px] py-[9px] font-inter text-[12.5px] font-semibold text-tinta transition-[color,background-color,border-color] duration-control ease-grit hover:bg-bone-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <IconRotate width={14} className={pendiente ? "animate-spin" : undefined} />
      {pendiente ? ADMIN.panel.actualizando : ADMIN.panel.actualizar}
    </button>
  );
}
