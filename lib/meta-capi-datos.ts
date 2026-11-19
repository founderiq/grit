/**
 * Meta Conversions API — lecturas de la base. SOLO servidor.
 *
 * Lo comparten la Server Action que envía (`app/admin/acciones-meta.ts`) y el
 * detalle del pedido (`lib/admin-datos.ts`), para que el botón que se ve y la
 * decisión que toma el servidor salgan exactamente de los mismos datos.
 */
import "server-only";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN } from "@/lib/admin-content";
import type { EstadoMetaVista } from "@/lib/admin-tipos";
import {
  estadoDeRegistro,
  evaluarEnvio,
  leerRegistro,
} from "@/lib/meta-capi";
import { modoActual } from "@/lib/meta-capi-envio";

type Supabase = ReturnType<typeof getSupabaseAdmin>;

/**
 * Momento en que el pedido quedó Pagado: la última fila de la bitácora con
 * `payment_status = 'pagado'`. `create_manual_order` la escribe al crear un
 * pedido ya pagado, y `guardarGestion` cada vez que el estado cambia a Pagado.
 *
 * Devuelve `undefined` si la consulta falla (distinto de "no hay fila").
 */
export async function fechaDePago(
  supabase: Supabase,
  orderId: string,
): Promise<string | null | undefined> {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("created_at")
    .eq("order_id", orderId)
    .eq("payment_status", "pagado")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[meta-capi] no se pudo leer la fecha de pago", { codigo: error.code });
    return undefined;
  }
  const fila = (data ?? [])[0] as { created_at?: unknown } | undefined;
  return typeof fila?.created_at === "string" ? fila.created_at : null;
}

export type PedidoMetaLeido = {
  id: string;
  orderNumber: string;
  source: string;
  paymentStatus: string;
  archivado: boolean;
  total: number;
  cliente: { nombre: string; whatsapp: string; ciudad: string };
  items: { sku: string; quantity: number; bundle_id: string | null; product_name: string | null }[];
  metadata: unknown;
  /** Versión de la fila, para la reserva optimista del envío. */
  updatedAt: string;
  pagadoEn: string | null;
};

/** Lee el pedido REAL, con todo lo que necesita la decisión y el payload. */
export async function leerPedidoParaMeta(
  supabase: Supabase,
  id: string,
): Promise<{ ok: true; pedido: PedidoMetaLeido | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, source, payment_status, archived_at, total, " +
        "customer_name, customer_whatsapp, customer_city, metadata, updated_at, " +
        "order_items ( sku, quantity, bundle_id, product_name )",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[meta-capi] no se pudo leer el pedido", { codigo: error.code });
    return { ok: false };
  }
  if (!data) return { ok: true, pedido: null };

  const o = data as unknown as Record<string, unknown> & {
    order_items: PedidoMetaLeido["items"] | null;
  };
  const txt = (v: unknown) => (typeof v === "string" ? v : "");

  const pagadoEn = await fechaDePago(supabase, txt(o.id));
  if (pagadoEn === undefined) return { ok: false };

  return {
    ok: true,
    pedido: {
      id: txt(o.id),
      orderNumber: txt(o.order_number),
      source: txt(o.source),
      paymentStatus: txt(o.payment_status),
      archivado: o.archived_at !== null && o.archived_at !== undefined,
      total: typeof o.total === "number" ? o.total : 0,
      cliente: {
        nombre: txt(o.customer_name),
        whatsapp: txt(o.customer_whatsapp),
        ciudad: txt(o.customer_city),
      },
      items: (o.order_items ?? []).map((i) => ({
        sku: i.sku,
        quantity: typeof i.quantity === "number" ? i.quantity : 0,
        bundle_id: i.bundle_id ?? null,
        product_name: i.product_name ?? null,
      })),
      metadata: o.metadata,
      updatedAt: txt(o.updated_at),
      pagadoEn,
    },
  };
}

/**
 * Lo que ve el panel en el bloque "Meta" de un pedido manual.
 *
 * Usa `evaluarEnvio()`, la MISMA función que decide en la Server Action: el
 * botón habilitado y el permiso del servidor no pueden diferir.
 */
export function vistaMeta(entrada: {
  source: string;
  paymentStatus: string;
  archivado: boolean;
  telefono: string;
  pagadoEn: string | null;
  metadata: unknown;
  ahora?: Date;
  env?: NodeJS.ProcessEnv;
}): EstadoMetaVista | null {
  if (entrada.source !== "manual") return null;

  const ahora = entrada.ahora ?? new Date();
  const { configurado, modo } = modoActual(entrada.env);
  const registro = leerRegistro(entrada.metadata, modo);
  const estado = estadoDeRegistro(registro, ahora);
  const textos = ADMIN.detalle.meta;

  let bloqueo: string | null = null;
  if (estado === "no_enviado" || estado === "error") {
    if (!configurado) {
      bloqueo = textos.sinConfiguracion;
    } else {
      const ev = evaluarEnvio({
        source: entrada.source,
        paymentStatus: entrada.paymentStatus,
        archivado: entrada.archivado,
        telefono: entrada.telefono,
        pagadoEn: entrada.pagadoEn,
        registro,
        ahora,
      });
      if (!ev.ok) bloqueo = textos.motivos[ev.motivo];
    }
  }

  return {
    modo,
    estado,
    eventId: registro?.event_id || null,
    enviadoEn: registro?.sent_at ?? null,
    error: estado === "error" ? (registro?.error ?? textos.interrumpido) : null,
    bloqueo,
    enviadoEnVivo: modo === "test" && leerRegistro(entrada.metadata, "live")?.status === "sent",
  };
}
