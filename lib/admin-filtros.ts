/**
 * Filtros del listado de pedidos — funciones puras.
 *
 * Los filtros viajan en la URL (`?pago=pagado&origen=web&pagina=2`), no en
 * estado de React. Tres razones: el servidor puede filtrar en SQL en lugar de
 * traer todo y descartar en el navegador, el estado del panel se puede
 * compartir o recargar, y el botón atrás funciona.
 *
 * Como la URL la puede editar cualquiera, acá todo se valida: un valor
 * desconocido cae al valor por defecto en lugar de llegar a la consulta.
 */
import type { EstadoEntrega, EstadoPago } from "@/lib/admin-formato";

export type Tab = "pedidos" | "abandonados";
export type FiltroPago = "todos" | EstadoPago;
export type FiltroEntrega = "todas" | EstadoEntrega;
export type FiltroOrigen = "todos" | "web" | "manual";
export type FiltroArchivo = "activos" | "archivados" | "todos";
/** Solo aplica a la pestaña de abandonados. */
export type FiltroEstadoAbandono = "todos" | "abandoned" | "converted";

export type FiltrosPedidos = {
  tab: Tab;
  busqueda: string;
  pago: FiltroPago;
  entrega: FiltroEntrega;
  origen: FiltroOrigen;
  archivo: FiltroArchivo;
  estado: FiltroEstadoAbandono;
  pagina: number;
};

export const POR_PAGINA = 20;

/** Largo máximo de la búsqueda: lo suficiente para un número de pedido. */
const MAX_BUSQUEDA = 60;

export const OPCIONES_PAGO: { id: FiltroPago; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos los pagos" },
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "pagado", etiqueta: "Pagado" },
  { id: "cancelado", etiqueta: "Cancelado" },
];

export const OPCIONES_ENTREGA: { id: FiltroEntrega; etiqueta: string }[] = [
  { id: "todas", etiqueta: "Todas las entregas" },
  { id: "pendiente", etiqueta: "Pendiente" },
  { id: "preparado", etiqueta: "Preparado" },
  { id: "enviado", etiqueta: "Enviado" },
  { id: "entregado", etiqueta: "Entregado" },
  { id: "cancelado", etiqueta: "Cancelado" },
];

export const OPCIONES_ORIGEN: { id: FiltroOrigen; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos los orígenes" },
  { id: "web", etiqueta: "Web" },
  { id: "manual", etiqueta: "Manual" },
];

export const OPCIONES_ARCHIVO: { id: FiltroArchivo; etiqueta: string }[] = [
  { id: "activos", etiqueta: "Activos" },
  { id: "archivados", etiqueta: "Archivados" },
  { id: "todos", etiqueta: "Todos" },
];

export const OPCIONES_ESTADO_ABANDONO: { id: FiltroEstadoAbandono; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos los estados" },
  { id: "abandoned", etiqueta: "Abandonado" },
  { id: "converted", etiqueta: "Convertido" },
];

const unaDe = <T extends string>(v: unknown, validos: readonly T[], porDefecto: T): T =>
  validos.includes(v as T) ? (v as T) : porDefecto;

/**
 * Limpia el término de búsqueda antes de que llegue a PostgREST.
 *
 * El filtro `or=(a.ilike.*x*,b.ilike.*x*)` es una gramática con separadores
 * propios: una coma, un paréntesis o un punto en el término lo romperían o —
 * peor— lo convertirían en otra condición. Se quedan solo los caracteres que
 * tienen sentido en un nombre, un teléfono o un número de pedido.
 *
 * `*` y `%` también se descartan: son comodines de PostgREST y no deben poder
 * inyectarse desde el buscador.
 */
export const sanearBusqueda = (bruto: unknown): string => {
  if (typeof bruto !== "string") return "";

  return bruto
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s+@_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_BUSQUEDA);
};

/** Lee y valida los filtros de los query params de /admin. */
export function resolverFiltros(
  params: Record<string, string | undefined>,
): FiltrosPedidos {
  const paginaCruda = Number.parseInt(params.pagina ?? "1", 10);

  return {
    tab: unaDe(params.tab, ["pedidos", "abandonados"] as const, "pedidos"),
    busqueda: sanearBusqueda(params.q),
    pago: unaDe(params.pago, ["todos", "pendiente", "pagado", "cancelado"] as const, "todos"),
    entrega: unaDe(
      params.entrega,
      ["todas", "pendiente", "preparado", "enviado", "entregado", "cancelado"] as const,
      "todas",
    ),
    origen: unaDe(params.origen, ["todos", "web", "manual"] as const, "todos"),
    // Por defecto el panel muestra solo los pedidos activos: los archivados
    // están archivados justamente para no estorbar.
    archivo: unaDe(params.archivo, ["activos", "archivados", "todos"] as const, "activos"),
    estado: unaDe(params.estado, ["todos", "abandoned", "converted"] as const, "todos"),
    pagina: Number.isInteger(paginaCruda) && paginaCruda > 0 ? paginaCruda : 1,
  };
}

/** Cuántas páginas hacen falta para `total` filas. Nunca menos de una. */
export const totalPaginas = (total: number): number =>
  Math.max(1, Math.ceil(Math.max(0, total) / POR_PAGINA));
