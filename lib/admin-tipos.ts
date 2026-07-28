/**
 * Formas de los datos del panel que cruzan la frontera servidor → navegador.
 *
 * Viven separadas de `lib/admin-datos.ts` porque ese módulo importa
 * `server-only` y lee con la service role: un componente de cliente no puede
 * importarlo ni para sacarle un tipo sin que el build falle. Acá no hay nada
 * ejecutable, solo la forma de lo que viaja.
 *
 * QUÉ NO ESTÁ ACÁ, a propósito: `confirmation_token`, `idempotency_key` y
 * cualquier otra columna que el panel no necesite. Lo que no está en el tipo no
 * lo serializa el endpoint, y lo que no viaja no se puede filtrar.
 */

export type ItemDetalle = {
  id: string;
  sku: string;
  productName: string;
  bundleId: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  promocional: boolean;
};

export type AjusteDetalle = {
  id: string;
  descripcion: string | null;
  revenue: number;
  cost: number;
  createdAt: string | null;
  /** Nombre del administrador que lo cargó, o `null` si ya no está. */
  responsable: string | null;
};

export type PedidoDetalle = {
  id: string;
  orderNumber: string;
  source: string;
  saleDate: string | null;
  createdAt: string | null;

  cliente: {
    nombre: string;
    whatsapp: string;
    ciudad: string;
    direccion: string;
    ubicacion: string | null;
  };

  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  shippingZone: string;
  shippingCost: number;
  clienteEnvioGratis: boolean;
  vip: boolean;
  vipCosto: number;

  subtotal: number;
  descuento: number;
  total: number;
  productCostTotal: number;
  logisticsCost: number;
  extraRevenueTotal: number;
  extraCostTotal: number;

  notasInternas: string | null;
  archivadoEn: string | null;

  items: ItemDetalle[];
  ajustes: AjusteDetalle[];
};

/* ------------------------------------------------------------
   Configuración del negocio e inversión publicitaria
   ------------------------------------------------------------ */

export type Costos = {
  producto: number;
  asuncion: number;
  interior: number;
  actualizado: string | null;
};

/** Valores por defecto del esquema, por si la fila todavía no existiera. */
export const COSTOS_POR_DEFECTO: Costos = {
  producto: 9500,
  asuncion: 20000,
  interior: 30000,
  actualizado: null,
};

export type AdSpendFila = {
  id: string;
  fecha: string;
  monto: number;
  nota: string | null;
};
