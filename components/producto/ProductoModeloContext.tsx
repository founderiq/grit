"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ModeloId } from "@/lib/content";

/**
 * Último modelo con el que interactuó el usuario en la columna de compra.
 *
 * Es el puente entre <ProductoCompra /> (donde se eligen los modelos) y
 * <ProductoGaleria /> (que lo muestra como foto principal), que son hermanos
 * dentro de <ProductoPrincipal />.
 *
 * `vez` sube en cada elección, aunque el modelo sea el mismo que ya estaba
 * destacado: si el usuario miró una foto de la galería y después vuelve a
 * elegir Azul, la galería tiene que volver a Azul.
 */
export type ModeloDestacado = { id: ModeloId; vez: number };

type Api = {
  destacado: ModeloDestacado | null;
  destacar: (id: ModeloId) => void;
};

const ProductoModeloContext = createContext<Api | null>(null);

/** `null` fuera del provider: galería y compra siguen funcionando solas. */
export function useModeloDestacado(): Api | null {
  return useContext(ProductoModeloContext);
}

export function ProductoModeloProvider({ children }: { children: React.ReactNode }) {
  const [destacado, setDestacado] = useState<ModeloDestacado | null>(null);

  const destacar = useCallback((id: ModeloId) => {
    setDestacado((previo) => ({ id, vez: (previo?.vez ?? 0) + 1 }));
  }, []);

  const api = useMemo(() => ({ destacado, destacar }), [destacado, destacar]);

  return (
    <ProductoModeloContext.Provider value={api}>{children}</ProductoModeloContext.Provider>
  );
}
