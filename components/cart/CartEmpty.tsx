"use client";

import Button from "@/components/ui/Button";
import { CARRITO } from "@/lib/content";

/**
 * Estado vacío del drawer. El pie de totales no se renderiza en este estado.
 * "Ver los packs" cierra el carrito y lleva al selector de bundles.
 */
export default function CartEmpty({ onVerPacks }: { onVerPacks: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-12 text-center">
      <p className="m-0 font-mono text-[10px] uppercase tracking-[0.14em] text-gris-oscuro">
        {CARRITO.vacio.titulo}
      </p>
      <p className="m-0 mt-3 max-w-[240px] text-[13px] leading-[1.5] text-gris-oscuro">
        {CARRITO.vacio.sub}
      </p>
      <Button
        variant="dark"
        size="lg"
        fullWidth
        onClick={onVerPacks}
        className="mt-6"
      >
        {CARRITO.vacio.cta}
      </Button>
    </div>
  );
}
