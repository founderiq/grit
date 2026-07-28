/**
 * Consultas del panel administrativo. SOLO servidor.
 *
 * `import "server-only"` hace que el build falle si un componente de cliente
 * llega a importar este módulo: los pedidos se leen con la service role y esa
 * clave no puede terminar nunca en el navegador. El navegador tampoco podría
 * leerlos por su cuenta —RLS activo y cero políticas dejan a `anon` y
 * `authenticated` sin acceso a ninguna tabla—, así que este archivo es el único
 * camino hacia los datos del admin.
 *
 * QUIÉN PUEDE LLAMAR
 *   Estas funciones NO autorizan: asumen que el llamador ya verificó con
 *   `obtenerEstadoAdmin()` que hay un administrador activo. La regla vive en un
 *   solo lugar (`lib/admin-auth.ts`) y no se duplica acá.
 *
 * ERRORES
 *   Ninguna lanza. Devuelven `{ ok: false }` y dejan el detalle en el log del
 *   servidor: al navegador nunca viaja un mensaje de Supabase.
 */
import "server-only";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";
import {
  calcularMetricas,
  METRICAS_VACIAS,
  type FilaMetrica,
  type Metricas,
} from "@/lib/admin-metricas";
import {
  ENTREGAS_CRUDAS,
  PAGOS_CRUDOS,
  contarPulseras,
  nombresProductos,
  type ItemPedidoAdmin,
} from "@/lib/admin-formato";
import { POR_PAGINA, type FiltrosPedidos } from "@/lib/admin-filtros";
import type { Rango } from "@/lib/admin-rango";

export type Resultado<T> = { ok: true; datos: T } | { ok: false };

/** Tamaño de página al recorrer tablas grandes. Es el máximo de PostgREST. */
const LOTE = 1000;

/**
 * Tope de seguridad al paginar. Con 200 lotes son 200.000 pedidos: muy por
 * encima de cualquier escenario real, pero acota el peor caso si una consulta
 * mal filtrada intentara traer la tabla entera.
 */
const MAX_LOTES = 200;

const fallo = (donde: string, error: unknown): { ok: false } => {
  // Solo el código: sin datos de clientes, sin SQL, sin credenciales.
  const codigo =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "desconocido";
  console.error(`[admin] consulta fallida (${donde})`, { codigo });
  return { ok: false };
};

/* ------------------------------------------------------------
   Métricas
   ------------------------------------------------------------ */

/**
 * Las catorce métricas del período.
 *
 * Se traen solo las columnas numéricas de los pedidos NO archivados del rango
 * y se agrega en JavaScript. Se prefirió esto a una función SQL nueva para no
 * pedir otra migración: a esta escala son unos pocos kilobytes por consulta, y
 * la fórmula queda en `lib/admin-metricas.ts`, testeada y a la vista.
 *
 * El Ad Spend se filtra por su propia fecha (`spend_date`), no por la del
 * pedido.
 */
export async function obtenerMetricas(rango: Rango): Promise<Resultado<Metricas>> {
  if (!hayConfiguracionSupabase()) {
    console.error("[admin] configuración de Supabase incompleta");
    return { ok: false };
  }

  const supabase = getSupabaseAdmin();

  try {
    /* --- Pedidos del período, sin archivados ---------------------------- */
    const filas: FilaMetrica[] = [];

    for (let lote = 0; lote < MAX_LOTES; lote++) {
      let q = supabase
        .from("orders")
        .select(
          "total, product_cost_total, logistics_cost, extra_cost_total, " +
            "extra_revenue_total, source, payment_status, order_status",
        )
        // Los archivados nunca cuentan, ni siquiera como cancelados.
        .is("archived_at", null)
        .order("sale_date", { ascending: true })
        .range(lote * LOTE, lote * LOTE + LOTE - 1);

      if (rango.desde) q = q.gte("sale_date", rango.desde);
      if (rango.hasta) q = q.lte("sale_date", rango.hasta);

      const { data, error } = await q;
      if (error) return fallo("metricas.orders", error);

      filas.push(...((data ?? []) as unknown as FilaMetrica[]));
      if ((data?.length ?? 0) < LOTE) break;
    }

    /* --- Inversión publicitaria del período ------------------------------ */
    let inversion = 0;

    for (let lote = 0; lote < MAX_LOTES; lote++) {
      let q = supabase
        .from("ad_spend")
        .select("amount")
        .order("spend_date", { ascending: true })
        .range(lote * LOTE, lote * LOTE + LOTE - 1);

      if (rango.desde) q = q.gte("spend_date", rango.desde);
      if (rango.hasta) q = q.lte("spend_date", rango.hasta);

      const { data, error } = await q;
      if (error) return fallo("metricas.ad_spend", error);

      inversion += ((data ?? []) as unknown as { amount: number | null }[]).reduce(
        (acc, f) => acc + (f.amount ?? 0),
        0,
      );
      if ((data?.length ?? 0) < LOTE) break;
    }

    return { ok: true, datos: calcularMetricas(filas, inversion) };
  } catch (e) {
    return fallo("metricas", e);
  }
}

/* ------------------------------------------------------------
   Listado de pedidos
   ------------------------------------------------------------ */

export type PedidoFila = {
  id: string;
  orderNumber: string;
  cliente: string;
  whatsapp: string;
  pulseras: number;
  productos: string[];
  total: number;
  paymentStatus: string;
  orderStatus: string;
  saleDate: string | null;
  source: string;
  archivado: boolean;
};

export type ListadoPedidos = {
  filas: PedidoFila[];
  total: number;
  pagina: number;
};

type FilaCruda = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  total: number | null;
  extra_revenue_total: number | null;
  payment_status: string;
  order_status: string;
  sale_date: string | null;
  source: string;
  archived_at: string | null;
  order_items: ItemPedidoAdmin[] | null;
};

/**
 * Una página del listado, con los filtros ya aplicados en SQL.
 *
 * El filtrado ocurre en la base y no en el navegador: así el panel no descarga
 * pedidos que el usuario no va a ver, y la paginación cuenta sobre el conjunto
 * filtrado de verdad.
 */
export async function obtenerPedidos(
  rango: Rango,
  filtros: FiltrosPedidos,
): Promise<Resultado<ListadoPedidos>> {
  if (!hayConfiguracionSupabase()) {
    console.error("[admin] configuración de Supabase incompleta");
    return { ok: false };
  }

  const supabase = getSupabaseAdmin();
  const desde = (filtros.pagina - 1) * POR_PAGINA;

  try {
    let q = supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_whatsapp, total, " +
          "extra_revenue_total, payment_status, order_status, sale_date, source, " +
          "archived_at, order_items ( product_name, quantity, bundle_id )",
        { count: "exact" },
      )
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(desde, desde + POR_PAGINA - 1);

    if (rango.desde) q = q.gte("sale_date", rango.desde);
    if (rango.hasta) q = q.lte("sale_date", rango.hasta);

    if (filtros.pago !== "todos") q = q.in("payment_status", PAGOS_CRUDOS[filtros.pago]);
    if (filtros.entrega !== "todas") q = q.in("order_status", ENTREGAS_CRUDAS[filtros.entrega]);
    if (filtros.origen !== "todos") q = q.eq("source", filtros.origen);

    if (filtros.archivo === "activos") q = q.is("archived_at", null);
    if (filtros.archivo === "archivados") q = q.not("archived_at", "is", null);

    if (filtros.busqueda.length > 0) {
      // `filtros.busqueda` ya viene saneado por `sanearBusqueda()`: sin comas,
      // paréntesis, puntos ni comodines, que son la gramática de este filtro.
      const t = filtros.busqueda;
      q = q.or(
        `customer_name.ilike.*${t}*,customer_whatsapp.ilike.*${t}*,order_number.ilike.*${t}*`,
      );
    }

    const { data, error, count } = await q;
    if (error) return fallo("pedidos", error);

    const filas: PedidoFila[] = ((data ?? []) as unknown as FilaCruda[]).map((f) => ({
      id: f.id,
      orderNumber: f.order_number,
      cliente: f.customer_name,
      whatsapp: f.customer_whatsapp,
      pulseras: contarPulseras(f.order_items),
      productos: nombresProductos(f.order_items),
      // Mismo criterio que el ingreso de las métricas: lo facturado más los
      // ajustes que suman.
      total: (f.total ?? 0) + (f.extra_revenue_total ?? 0),
      paymentStatus: f.payment_status,
      orderStatus: f.order_status,
      saleDate: f.sale_date,
      source: f.source,
      archivado: f.archived_at !== null,
    }));

    return { ok: true, datos: { filas, total: count ?? filas.length, pagina: filtros.pagina } };
  } catch (e) {
    return fallo("pedidos", e);
  }
}

/* ------------------------------------------------------------
   Checkouts abandonados
   ------------------------------------------------------------ */

export type AbandonadoFila = {
  id: string;
  cliente: string | null;
  whatsapp: string | null;
  ciudad: string | null;
  packId: string | null;
  packQty: number | null;
  hasExtra: boolean;
  paso: string | null;
  estado: string;
  actualizado: string | null;
};

export type ListadoAbandonados = {
  filas: AbandonadoFila[];
  total: number;
  pagina: number;
};

/**
 * Checkouts abandonados, solo lectura.
 *
 * La tabla existe desde la fase 6A pero todavía no se escribe: la captura desde
 * el checkout llega más adelante. Hasta entonces el listado muestra su estado
 * vacío, y el día que empiece a llenarse no hay que tocar nada acá.
 */
export async function obtenerAbandonados(
  filtros: FiltrosPedidos,
): Promise<Resultado<ListadoAbandonados>> {
  if (!hayConfiguracionSupabase()) {
    console.error("[admin] configuración de Supabase incompleta");
    return { ok: false };
  }

  const supabase = getSupabaseAdmin();
  const desde = (filtros.pagina - 1) * POR_PAGINA;

  try {
    const { data, error, count } = await supabase
      .from("abandoned_checkouts")
      .select(
        "id, customer_name, customer_whatsapp, customer_city, pack_id, pack_qty, " +
          "has_extra, current_step, status, updated_at, last_seen_at",
        { count: "exact" },
      )
      // Los archivados quedan fuera, igual que en pedidos.
      .is("archived_at", null)
      .order("last_seen_at", { ascending: false })
      .range(desde, desde + POR_PAGINA - 1);

    if (error) return fallo("abandonados", error);

    type Cruda = {
      id: string;
      customer_name: string | null;
      customer_whatsapp: string | null;
      customer_city: string | null;
      pack_id: string | null;
      pack_qty: number | null;
      has_extra: boolean | null;
      current_step: string | null;
      status: string;
      updated_at: string | null;
      last_seen_at: string | null;
    };

    const filas: AbandonadoFila[] = ((data ?? []) as unknown as Cruda[]).map((f) => ({
      id: f.id,
      cliente: f.customer_name,
      whatsapp: f.customer_whatsapp,
      ciudad: f.customer_city,
      packId: f.pack_id,
      packQty: f.pack_qty,
      hasExtra: f.has_extra === true,
      paso: f.current_step,
      estado: f.status,
      // `last_seen_at` es la última señal del visitante; `updated_at` solo
      // cambia cuando el servidor reescribe la fila.
      actualizado: f.last_seen_at ?? f.updated_at,
    }));

    return { ok: true, datos: { filas, total: count ?? filas.length, pagina: filtros.pagina } };
  } catch (e) {
    return fallo("abandonados", e);
  }
}

export { METRICAS_VACIAS };

/* ------------------------------------------------------------
   Detalle de un pedido
   ------------------------------------------------------------ */

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

/**
 * Todo lo que necesita el sidebar de detalle, en una sola llamada.
 *
 * NO devuelve `confirmation_token` ni `idempotency_key`: son las llaves que
 * abren la página de gracias y la idempotencia del checkout, y el panel no las
 * necesita para nada. Lo que no viaja no se puede filtrar.
 */
export async function obtenerPedido(
  id: string,
): Promise<Resultado<PedidoDetalle | null>> {
  if (!hayConfiguracionSupabase()) {
    console.error("[admin] configuración de Supabase incompleta");
    return { ok: false };
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, source, sale_date, created_at, " +
          "customer_name, customer_whatsapp, customer_city, customer_address, customer_location_url, " +
          "payment_method, payment_status, order_status, " +
          "shipping_zone, shipping_cost, customer_free_shipping, vip_shipping, vip_shipping_cost, " +
          "subtotal, discount_amount, total, " +
          "product_cost_total, logistics_cost, extra_revenue_total, extra_cost_total, " +
          "internal_notes, archived_at, " +
          "order_items ( id, sku, product_name, bundle_id, quantity, unit_price, line_total, is_promotional ), " +
          "order_adjustments ( id, description, revenue_amount, cost_amount, created_at, created_by )",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return fallo("pedido", error);
    // Un id que no existe NO es un fallo de la consulta: la interfaz lo muestra
    // como "no encontramos ese pedido" y no como un error de carga.
    if (!data) return { ok: true, datos: null };

    type ItemCrudo = {
      id: string;
      sku: string;
      product_name: string;
      bundle_id: string | null;
      quantity: number | null;
      unit_price: number | null;
      line_total: number | null;
      is_promotional: boolean | null;
    };
    type AjusteCrudo = {
      id: string;
      description: string | null;
      revenue_amount: number | null;
      cost_amount: number | null;
      created_at: string | null;
      created_by: string | null;
    };
    type Crudo = Record<string, unknown> & {
      order_items: ItemCrudo[] | null;
      order_adjustments: AjusteCrudo[] | null;
    };

    const o = data as unknown as Crudo;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    const txt = (v: unknown) => (typeof v === "string" ? v : "");

    const ajustesCrudos = [...(o.order_adjustments ?? [])].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    );

    // Nombre de quien cargó cada ajuste. Se resuelve en una sola consulta a
    // `admin_users`, sobre la que el servidor solo tiene SELECT.
    const responsables = await nombresDeAdmins(
      ajustesCrudos.map((a) => a.created_by).filter((v): v is string => Boolean(v)),
    );

    return {
      ok: true,
      datos: {
        id: txt(o.id),
        orderNumber: txt(o.order_number),
        source: txt(o.source),
        saleDate: (o.sale_date as string | null) ?? null,
        createdAt: (o.created_at as string | null) ?? null,

        cliente: {
          nombre: txt(o.customer_name),
          whatsapp: txt(o.customer_whatsapp),
          ciudad: txt(o.customer_city),
          direccion: txt(o.customer_address),
          ubicacion: (o.customer_location_url as string | null) ?? null,
        },

        paymentMethod: txt(o.payment_method),
        paymentStatus: txt(o.payment_status),
        orderStatus: txt(o.order_status),
        shippingZone: txt(o.shipping_zone),
        shippingCost: num(o.shipping_cost),
        clienteEnvioGratis: o.customer_free_shipping === true,
        vip: o.vip_shipping === true,
        vipCosto: num(o.vip_shipping_cost),

        subtotal: num(o.subtotal),
        descuento: num(o.discount_amount),
        total: num(o.total),
        productCostTotal: num(o.product_cost_total),
        logisticsCost: num(o.logistics_cost),
        extraRevenueTotal: num(o.extra_revenue_total),
        extraCostTotal: num(o.extra_cost_total),

        notasInternas: (o.internal_notes as string | null) ?? null,
        archivadoEn: (o.archived_at as string | null) ?? null,

        items: (o.order_items ?? []).map((i) => ({
          id: i.id,
          sku: i.sku,
          productName: i.product_name,
          bundleId: i.bundle_id,
          quantity: num(i.quantity),
          unitPrice: num(i.unit_price),
          lineTotal: num(i.line_total),
          promocional: i.is_promotional === true,
        })),

        ajustes: ajustesCrudos.map((a) => ({
          id: a.id,
          descripcion: a.description,
          revenue: num(a.revenue_amount),
          cost: num(a.cost_amount),
          createdAt: a.created_at,
          responsable: a.created_by ? (responsables.get(a.created_by) ?? null) : null,
        })),
      },
    };
  } catch (e) {
    return fallo("pedido", e);
  }
}

/**
 * `user_id` → nombre para mostrar. Los que no estén en `admin_users` —porque
 * se dio de baja la cuenta— quedan fuera del mapa y la interfaz muestra un
 * guion, en lugar de un UUID que no le dice nada a nadie.
 */
async function nombresDeAdmins(ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;

  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("user_id, display_name")
    .in("user_id", unicos);

  if (error) {
    console.error("[admin] no se pudieron leer los nombres de administradores", {
      codigo: error.code,
    });
    return mapa;
  }

  for (const fila of (data ?? []) as unknown as {
    user_id: string;
    display_name: string | null;
  }[]) {
    const nombre = fila.display_name?.trim();
    if (nombre) mapa.set(fila.user_id, nombre);
  }

  return mapa;
}

/**
 * Solo el número de pedido, por id.
 *
 * Lo usa el encabezado del sidebar para poder titularse antes de que llegue el
 * detalle completo. Devuelve cadena vacía si el pedido no existe: el panel se
 * abre igual y el contenido muestra su estado de "no encontrado".
 */
export async function obtenerNumeroPedido(id: string): Promise<string> {
  if (!hayConfiguracionSupabase()) return "";

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("orders")
      .select("order_number")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return "";
    return String((data as unknown as { order_number?: unknown }).order_number ?? "");
  } catch {
    return "";
  }
}
