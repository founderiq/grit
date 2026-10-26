/**
 * Modelos (colores) de la pulsera — funciones puras, sin React.
 *
 * La elección viaja como un array de ids, una posición por pulsera del pack:
 * `["negro", "azul", "floral"]` es Pulsera 1 Negro, Pulsera 2 Azul, Pulsera 3
 * Floral. Producto, carrito, checkout y servidor usan estas mismas funciones,
 * así que el array no puede quedar más largo o más corto que el pack.
 *
 * Los modelos no tocan precios: el precio depende solo del pack.
 */
import {
  MODELO_POR_DEFECTO,
  PRODUCTO_MODELOS,
  type ModeloId,
  type ProductoModelo,
} from "@/lib/content";

export const esModeloId = (v: unknown): v is ModeloId =>
  typeof v === "string" && PRODUCTO_MODELOS.some((m) => m.id === v);

/** Busca un modelo por id. Cae a Negro si el id no existe. */
export function getModelo(id: string | null | undefined): ProductoModelo {
  return (
    PRODUCTO_MODELOS.find((m) => m.id === id) ??
    PRODUCTO_MODELOS.find((m) => m.id === MODELO_POR_DEFECTO)!
  );
}

/**
 * Nombre para mostrar de un id guardado. A diferencia de `getModelo`, no cae a
 * Negro: un id desconocido (un modelo que se retiró del catálogo) se muestra
 * tal cual, para no inventar un color que el cliente no pidió.
 */
export function nombreModelo(id: string): string {
  const modelo = PRODUCTO_MODELOS.find((m) => m.id === id);
  if (modelo) return modelo.nombre;
  const limpio = id.trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : "—";
}

/**
 * Pulseras que trae el pack, sin la extra promocional. Es el largo que debe
 * tener el array de modelos.
 */
export function unidadesDelPack(
  unidadesBundle: number,
  fijo: boolean,
  cantidad: number,
): number {
  return unidadesBundle * (fijo ? 1 : Math.max(1, cantidad));
}

/**
 * Ajusta la elección al largo del pack, conservando lo que sigue siendo
 * válido:
 *   - las posiciones que ya existían se mantienen (Azul sigue siendo Azul);
 *   - las nuevas nacen en Negro;
 *   - las que sobran se descartan;
 *   - un id inválido en una posición vuelve a Negro.
 *
 * Así, pasar de 2 a 3 conserva las dos primeras y agrega Negro, y volver de 3
 * a 2 solo quita la tercera.
 */
export function ajustarModelos(
  modelos: readonly unknown[] | null | undefined,
  largo: number,
): ModeloId[] {
  const n = Math.max(0, Math.floor(largo));
  const previos = Array.isArray(modelos) ? modelos : [];
  return Array.from({ length: n }, (_, i) => {
    const v = previos[i];
    return esModeloId(v) ? v : MODELO_POR_DEFECTO;
  });
}

/** "Negro · Azul · Floral" — la forma compacta que usan carrito y checkout. */
export const textoModelos = (modelos: readonly string[]): string =>
  modelos.map(nombreModelo).join(" · ");

/* ------------------------------------------------------------
   Lectura desde un pedido guardado
   ------------------------------------------------------------ */

export type ModelosGuardados = {
  /** Modelos del pack, en orden. Vacío en pedidos anteriores a los modelos. */
  pack: string[];
  /** Modelo de la pulsera extra promocional, si el pedido la tiene. */
  extra: string | null;
};

/**
 * Lee los modelos de `orders.metadata`. Tolera cualquier forma: los pedidos
 * anteriores a esta función, los manuales del panel y cualquier dato roto
 * devuelven `{ pack: [], extra: null }` en lugar de fallar.
 */
export function modelosDeMetadata(metadata: unknown): ModelosGuardados {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return { pack: [], extra: null };
  }
  const m = metadata as Record<string, unknown>;
  const pack = Array.isArray(m.modelos)
    ? m.modelos.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : [];
  const extra =
    typeof m.modelo_extra === "string" && m.modelo_extra.trim() !== ""
      ? m.modelo_extra
      : null;
  return { pack, extra };
}

/* ------------------------------------------------------------
   Query params de "Comprar ahora"
   ------------------------------------------------------------ */

/**
 * `negro,azul,floral` → `["negro", "azul", "floral"]`. Conserva las posiciones:
 * un valor desconocido queda en Negro. El largo final lo ajusta quien lo usa.
 */
export function modelosDesdeParam(v: string | null | undefined): ModeloId[] {
  const partes = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return ajustarModelos(partes, partes.length);
}

export const modelosAParam = (modelos: readonly ModeloId[]): string =>
  modelos.join(",");
