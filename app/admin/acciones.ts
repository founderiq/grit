"use server";

/**
 * Escrituras del panel administrativo.
 *
 * Son Server Actions: corren SIEMPRE en el servidor y no existen como endpoint
 * público. El navegador no puede escribir por su cuenta —con RLS activo y cero
 * políticas, `authenticated` no tiene privilegios sobre ninguna tabla— así que
 * este archivo es el único camino de escritura del panel.
 *
 * CADA acción, sin excepción, hace lo mismo antes de tocar nada:
 *
 *   1. `autorizarAdmin()` — valida la sesión contra Supabase Auth y exige una
 *      fila ACTIVA en `admin_users`. Un usuario dado de baja entre que abrió el
 *      panel y apretó guardar deja de poder escribir en ese mismo request.
 *   2. Valida que el id del pedido sea un UUID.
 *   3. LEE el estado real del pedido en la base.
 *   4. Valida el valor pedido contra la lista de valores permitidos.
 *
 * De lo que manda el navegador se usan únicamente: qué pedido, qué estado
 * quiere dejar, el texto de la nota y los montos del ajuste. Nunca el estado
 * anterior, nunca el usuario, nunca un total, nunca un costo del pedido. El
 * `changed_by` sale de la sesión verificada, no del formulario.
 *
 * Ninguna de estas acciones manda Telegram: ese aviso es solo para pedidos
 * nuevos del checkout.
 */

import { revalidatePath } from "next/cache";
import { autorizarAdmin } from "@/lib/admin-guardia";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { esUuid } from "@/lib/pedidos";
import {
  esEntregaVisible,
  esPagoVisible,
  limpiarNotas,
  notaCambioEntrega,
  notaCambioPago,
  resolverEntrega,
  resolverPago,
  validarAjuste,
} from "@/lib/admin-mutaciones";

export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; error: string };

/** Mensajes de error. Genéricos a propósito: el detalle queda en el log. */
const ERRORES: Record<string, string> = {
  no_autorizado: "Tu sesión ya no tiene permiso para editar.",
  pedido_invalido: "No encontramos ese pedido.",
  valor_invalido: "Ese valor no es válido.",
  descripcion_requerida: "Escribí un detalle para el ajuste.",
  monto_invalido: "Los montos tienen que ser números enteros en guaraníes.",
  monto_negativo: "Los montos no pueden ser negativos.",
  monto_fuera_de_rango: "Ese monto es demasiado grande.",
  sin_monto: "Cargá al menos un monto mayor a cero.",
  error_interno: "No pudimos guardar el cambio. Probá de nuevo.",
};

const error = (codigo: string): ResultadoAccion => ({
  ok: false,
  error: ERRORES[codigo] ?? ERRORES.error_interno!,
});

/** Fila del pedido tal como está HOY. Es la base de toda decisión. */
type PedidoActual = {
  id: string;
  payment_status: string;
  order_status: string;
  payment_method: string;
  internal_notes: string | null;
  archived_at: string | null;
};

/**
 * Puerta común: autoriza, valida el id y lee el pedido real.
 *
 * Devuelve el id del administrador, el cliente y el pedido REAL, o un error ya
 * formateado. Que esté en un solo lugar es justamente el punto: ninguna acción
 * puede olvidarse de un paso.
 */
type Preparado =
  | { ok: false; fallo: ResultadoAccion }
  | {
      ok: true;
      adminId: string;
      supabase: ReturnType<typeof getSupabaseAdmin>;
      pedido: PedidoActual;
    };

async function preparar(pedidoId: unknown): Promise<Preparado> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) {
    return {
      ok: false,
      fallo: error(guardia.motivo === "no_autorizado" ? "no_autorizado" : "error_interno"),
    };
  }

  if (!esUuid(pedidoId)) {
    return { ok: false, fallo: error("pedido_invalido") };
  }

  const { adminId, supabase } = guardia;
  const { data, error: fallaLectura } = await supabase
    .from("orders")
    .select("id, payment_status, order_status, payment_method, internal_notes, archived_at")
    .eq("id", pedidoId)
    .maybeSingle();

  if (fallaLectura) {
    console.error("[admin] no se pudo leer el pedido", { codigo: fallaLectura.code });
    return { ok: false, fallo: error("error_interno") };
  }
  if (!data) return { ok: false, fallo: error("pedido_invalido") };

  return { ok: true, adminId, supabase, pedido: data as unknown as PedidoActual };
}

/** Una entrada en la bitácora. Nunca hace fallar la operación principal. */
async function anotar(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fila: {
    order_id: string;
    order_status?: string | null;
    payment_status?: string | null;
    note: string;
    changed_by: string;
  },
) {
  const { error: falla } = await supabase.from("order_status_history").insert(fila);
  if (falla) {
    // El cambio ya se guardó; perder la anotación no debe deshacerlo. Queda
    // registrado en el log del servidor para poder revisarlo.
    console.error("[admin] no se pudo anotar en el historial", { codigo: falla.code });
  }
}

/* ══════════════════════════════════════════════════════════════
   Estados y notas
   ══════════════════════════════════════════════════════════════ */

/**
 * Guarda estado de pago, estado de entrega y notas internas de una sola vez.
 *
 * Solo escribe lo que efectivamente cambió respecto de lo que hay en la base, y
 * anota en el historial una línea por cada cambio real. Apretar "Guardar" sin
 * tocar nada no ensucia la bitácora.
 */
export async function guardarGestion(entrada: {
  pedidoId: string;
  pago: string;
  entrega: string;
  notas: string;
}): Promise<ResultadoAccion> {
  const p = await preparar(entrada.pedidoId);
  if (!p.ok) return p.fallo;

  const { adminId, supabase, pedido } = p;

  if (!esPagoVisible(entrada.pago) || !esEntregaVisible(entrada.entrega)) {
    return error("valor_invalido");
  }

  // El estado anterior se lee de la base, no se acepta del navegador.
  const pagoNuevo = resolverPago(entrada.pago, pedido.payment_status, pedido.payment_method);
  const entregaNueva = resolverEntrega(entrada.entrega);
  const notasNuevas = limpiarNotas(entrada.notas);

  const cambios: Record<string, unknown> = {};
  if (pagoNuevo !== pedido.payment_status) cambios.payment_status = pagoNuevo;
  if (entregaNueva !== pedido.order_status) cambios.order_status = entregaNueva;
  if (notasNuevas !== pedido.internal_notes) cambios.internal_notes = notasNuevas;

  if (Object.keys(cambios).length === 0) {
    return { ok: true, mensaje: "No había cambios para guardar." };
  }

  // `updated_at` lo refresca el trigger `orders_set_updated_at`.
  const { error: falla } = await supabase.from("orders").update(cambios).eq("id", pedido.id);

  if (falla) {
    console.error("[admin] no se pudo guardar la gestión", { codigo: falla.code });
    return error("error_interno");
  }

  if (cambios.payment_status) {
    await anotar(supabase, {
      order_id: pedido.id,
      payment_status: pagoNuevo,
      note: notaCambioPago(pedido.payment_status, pagoNuevo),
      changed_by: adminId,
    });
  }

  if (cambios.order_status) {
    await anotar(supabase, {
      order_id: pedido.id,
      order_status: entregaNueva,
      note: notaCambioEntrega(pedido.order_status, entregaNueva),
      changed_by: adminId,
    });
  }

  if ("internal_notes" in cambios) {
    // Se registra QUE se editaron, no su contenido: la bitácora la puede leer
    // cualquier administrador y la nota ya vive en el pedido.
    await anotar(supabase, {
      order_id: pedido.id,
      note: notasNuevas ? "Notas internas actualizadas" : "Notas internas borradas",
      changed_by: adminId,
    });
  }

  revalidatePath("/admin");
  return { ok: true, mensaje: "Cambios guardados." };
}

/* ══════════════════════════════════════════════════════════════
   Ajustes
   ══════════════════════════════════════════════════════════════ */

/** Ventana para considerar dos altas idénticas como un doble envío. */
const VENTANA_DUPLICADO_MS = 15_000;

/**
 * Agrega un extra al pedido.
 *
 * Los totales `extra_revenue_total` y `extra_cost_total` del pedido los
 * recalcula el trigger `order_adjustments_sync` en la base: acá no se tocan, y
 * el snapshot de producto y logística queda intacto.
 *
 * DOBLE ENVÍO — el botón se deshabilita mientras guarda, pero eso vive en el
 * navegador. Del lado del servidor, un ajuste idéntico (mismo pedido, mismos
 * montos, misma descripción) creado hace menos de quince segundos se considera
 * el mismo y se responde OK sin insertar otra fila. Dos gastos realmente
 * distintos no comparten monto y texto al segundo.
 */
export async function agregarAjuste(entrada: {
  pedidoId: string;
  revenue: string;
  cost: string;
  descripcion: string;
}): Promise<ResultadoAccion> {
  const p = await preparar(entrada.pedidoId);
  if (!p.ok) return p.fallo;

  const { adminId, supabase, pedido } = p;

  const validacion = validarAjuste(entrada);
  if (!validacion.ok) return error(validacion.error);

  const { descripcion, revenue, cost } = validacion.ajuste;

  const desde = new Date(Date.now() - VENTANA_DUPLICADO_MS).toISOString();
  const { data: repetido } = await supabase
    .from("order_adjustments")
    .select("id")
    .eq("order_id", pedido.id)
    .eq("description", descripcion)
    .eq("revenue_amount", revenue)
    .eq("cost_amount", cost)
    .gte("created_at", desde)
    .limit(1);

  if ((repetido?.length ?? 0) > 0) {
    revalidatePath("/admin");
    return { ok: true, mensaje: "Extra agregado." };
  }

  const { error: falla } = await supabase.from("order_adjustments").insert({
    order_id: pedido.id,
    description: descripcion,
    revenue_amount: revenue,
    cost_amount: cost,
    created_by: adminId,
  });

  if (falla) {
    console.error("[admin] no se pudo agregar el ajuste", { codigo: falla.code });
    return error("error_interno");
  }

  await anotar(supabase, {
    order_id: pedido.id,
    note: `Extra agregado: ${descripcion}`,
    changed_by: adminId,
  });

  revalidatePath("/admin");
  return { ok: true, mensaje: "Extra agregado." };
}

/* ══════════════════════════════════════════════════════════════
   Archivar y restaurar
   ══════════════════════════════════════════════════════════════ */

/**
 * Archiva o restaura un pedido.
 *
 * Archivar es un borrado lógico y es el ÚNICO "borrado" del panel: la fila
 * sigue en la base, con sus ítems y sus ajustes, y se puede restaurar. No hay
 * ningún camino en el código que borre un pedido físicamente.
 */
export async function archivarPedido(entrada: {
  pedidoId: string;
  archivar: boolean;
}): Promise<ResultadoAccion> {
  const p = await preparar(entrada.pedidoId);
  if (!p.ok) return p.fallo;

  const { adminId, supabase, pedido } = p;
  const archivar = entrada.archivar === true;

  // Se compara contra el estado real: archivar algo ya archivado no hace nada.
  if (archivar === (pedido.archived_at !== null)) {
    return {
      ok: true,
      mensaje: archivar ? "El pedido ya estaba archivado." : "El pedido ya estaba activo.",
    };
  }

  const { error: falla } = await supabase
    .from("orders")
    .update(
      archivar
        ? { archived_at: new Date().toISOString(), archived_by: adminId }
        : { archived_at: null, archived_by: null },
    )
    .eq("id", pedido.id);

  if (falla) {
    console.error("[admin] no se pudo archivar/restaurar", { codigo: falla.code });
    return error("error_interno");
  }

  await anotar(supabase, {
    order_id: pedido.id,
    note: archivar ? "Pedido archivado" : "Pedido restaurado",
    changed_by: adminId,
  });

  revalidatePath("/admin");
  return {
    ok: true,
    mensaje: archivar ? "Pedido archivado." : "Pedido restaurado.",
  };
}
