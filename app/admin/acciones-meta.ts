"use server";

/**
 * Envío de una venta MANUAL a Meta (Conversions API, evento Purchase).
 *
 * Es una Server Action: corre siempre en el servidor, empieza por
 * `autorizarAdmin()` como todas las del panel, y del navegador solo acepta QUÉ
 * pedido. Todo lo demás —si es manual, si está pagado, el total, el cliente,
 * cuándo se pagó— se lee de la base en este mismo request.
 *
 * LO QUE ESTA ACCIÓN NUNCA HACE
 *   · Enviar un pedido con `source !== "manual"`. El ecommerce ya reporta sus
 *     compras con el Pixel y "Conversions API with Meta"; mandarlas también
 *     desde acá las duplicaría.
 *   · Enviar dos veces la misma venta. El estado vive en
 *     `orders.metadata.meta_capi.<modo>` y se RESERVA antes de llamar a Meta
 *     con un UPDATE condicionado a `updated_at` (control optimista): si dos
 *     clics o dos pestañas llegan juntos, solo uno gana la reserva. Como red de
 *     seguridad, el `event_id` es determinístico (`purchase-<order_number>`) y
 *     Meta descarta un segundo evento de servidor con el mismo `event_id`.
 *   · Mandar IP o user agent: serían los del servidor o los del
 *     administrador, no los del cliente.
 *
 * MODO PRUEBA
 *   Con META_CAPI_TEST_EVENT_CODE (solo en Preview) el evento sale como Test
 *   Event y se registra aparte (`meta_capi.test`): no marca la venta como
 *   enviada de verdad. Sin ese código, el envío real solo se permite en
 *   producción (ver `configuracionMeta()`).
 */

import { revalidatePath } from "next/cache";
import { autorizarAdmin } from "@/lib/admin-guardia";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { esUuid } from "@/lib/pedidos";
import { ADMIN } from "@/lib/admin-content";
import {
  armarEvento,
  conRegistro,
  evaluarEnvio,
  eventIdDePedido,
  leerRegistro,
  type ModoMeta,
  type RegistroMeta,
} from "@/lib/meta-capi";
import { configuracionMeta, enviarEventos } from "@/lib/meta-capi-envio";
import { leerPedidoParaMeta } from "@/lib/meta-capi-datos";

export type ResultadoMeta = { ok: true; mensaje: string } | { ok: false; error: string };

type Supabase = ReturnType<typeof getSupabaseAdmin>;

const T = ADMIN.detalle.meta;

const ERRORES = {
  no_autorizado: "Tu sesión ya no tiene permiso para editar.",
  pedido_invalido: "No encontramos ese pedido.",
  error_interno: "No pudimos completar el envío. Probá de nuevo.",
};

const fallo = (error: string): ResultadoMeta => ({ ok: false, error });

/**
 * Escribe el registro final del envío.
 *
 * Relee la metadata y fusiona solo `meta_capi.<modo>`: si mientras se esperaba
 * a Meta alguien guardó notas o estados (eso cambia `updated_at`), no se pisa
 * nada. Reintenta unas pocas veces ante esa carrera.
 */
async function guardarRegistro(
  supabase: Supabase,
  id: string,
  modo: ModoMeta,
  registro: RegistroMeta,
): Promise<boolean> {
  for (let intento = 0; intento < 3; intento++) {
    const { data, error } = await supabase
      .from("orders")
      .select("metadata, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return false;

    const fila = data as unknown as { metadata: unknown; updated_at: string };
    const { data: escrito, error: fallaEscritura } = await supabase
      .from("orders")
      .update({ metadata: conRegistro(fila.metadata, modo, registro) })
      .eq("id", id)
      .eq("updated_at", fila.updated_at)
      .select("id");

    if (fallaEscritura) return false;
    if ((escrito ?? []).length > 0) return true;
  }
  return false;
}

/** Línea en la bitácora del pedido. Nunca hace fallar el envío. */
async function anotar(supabase: Supabase, orderId: string, note: string, adminId: string) {
  const { error } = await supabase
    .from("order_status_history")
    .insert({ order_id: orderId, note, changed_by: adminId });
  if (error) {
    console.error("[meta-capi] no se pudo anotar en el historial", { codigo: error.code });
  }
}

export async function enviarVentaAMeta(entrada: { pedidoId: string }): Promise<ResultadoMeta> {
  /* 1 · Autorización y entrada ------------------------------------------- */
  const guardia = await autorizarAdmin();
  if (!guardia.ok) {
    return fallo(guardia.motivo === "no_autorizado" ? ERRORES.no_autorizado : ERRORES.error_interno);
  }

  const pedidoId = entrada?.pedidoId;
  if (!esUuid(pedidoId)) return fallo(ERRORES.pedido_invalido);

  /* 2 · Configuración ----------------------------------------------------- */
  const cfg = configuracionMeta();
  if (!cfg.ok) {
    // Solo NOMBRES de variables, nunca valores: no se intenta ningún envío.
    if (cfg.motivo === "sin_configuracion") {
      return fallo(`${T.sinConfiguracion} ${T.faltan} ${cfg.faltan.join(", ")}.`);
    }
    return fallo(T.liveFueraDeProduccion);
  }

  const { supabase, adminId } = guardia;

  /* 3 · Pedido real ------------------------------------------------------- */
  const leido = await leerPedidoParaMeta(supabase, pedidoId);
  if (!leido.ok) return fallo(ERRORES.error_interno);
  if (!leido.pedido) return fallo(ERRORES.pedido_invalido);
  const p = leido.pedido;

  /* 4 · ¿Corresponde? — la misma regla que pinta el botón ------------------ */
  const ahora = new Date();
  const previo = leerRegistro(p.metadata, cfg.modo);
  const evaluacion = evaluarEnvio({
    source: p.source,
    paymentStatus: p.paymentStatus,
    archivado: p.archivado,
    telefono: p.cliente.whatsapp,
    pagadoEn: p.pagadoEn,
    registro: previo,
    ahora,
  });

  if (!evaluacion.ok) {
    // Ya enviado no es un error: el resultado que se buscaba ya existe.
    if (evaluacion.motivo === "ya_enviado") return { ok: true, mensaje: T.motivos.ya_enviado };
    return fallo(T.motivos[evaluacion.motivo]);
  }

  /* 5 · Reserva optimista ---------------------------------------------------
     El UPDATE solo aplica si la fila sigue en la versión que se leyó. Dos
     envíos simultáneos leen la misma versión: el primero la cambia y el
     segundo no encuentra fila para actualizar.                              */
  const enviando: RegistroMeta = {
    status: "sending",
    event_id: eventIdDePedido(p.orderNumber),
    event_time: evaluacion.eventTime,
    attempts: (previo?.attempts ?? 0) + 1,
    started_at: ahora.toISOString(),
    sent_at: null,
    error: null,
    fbtrace_id: null,
    events_received: null,
  };

  const { data: reservado, error: fallaReserva } = await supabase
    .from("orders")
    .update({ metadata: conRegistro(p.metadata, cfg.modo, enviando) })
    .eq("id", p.id)
    .eq("updated_at", p.updatedAt)
    .select("id");

  if (fallaReserva) {
    console.error("[meta-capi] no se pudo reservar el envío", { codigo: fallaReserva.code });
    return fallo(ERRORES.error_interno);
  }
  if ((reservado ?? []).length === 0) return fallo(T.conflicto);

  /* 6 · Envío a Meta -------------------------------------------------------- */
  const evento = armarEvento(
    { orderNumber: p.orderNumber, total: p.total, items: p.items, cliente: p.cliente },
    evaluacion.eventTime,
  );
  const r = await enviarEventos([evento], cfg);

  /* 7 · Resultado ----------------------------------------------------------- */
  const final: RegistroMeta = r.ok
    ? {
        ...enviando,
        status: "sent",
        sent_at: new Date().toISOString(),
        events_received: r.eventsReceived,
        fbtrace_id: r.fbtraceId,
      }
    : { ...enviando, status: "error", error: r.error, fbtrace_id: r.fbtraceId };

  const guardado = await guardarRegistro(supabase, p.id, cfg.modo, final);
  if (!guardado) {
    // El registro queda en "enviando" y vence solo: el reintento usa el mismo
    // event_id, así que Meta descarta el duplicado si este sí llegó.
    console.error("[meta-capi] no se pudo guardar el resultado del envío", {
      pedido: p.orderNumber,
    });
  }

  const sufijo = cfg.modo === "test" ? " (prueba · Test Events)" : "";
  await anotar(
    supabase,
    p.id,
    r.ok ? `Venta enviada a Meta${sufijo}` : `Error al enviar la venta a Meta${sufijo}`,
    adminId,
  );

  // Sin datos del cliente y sin token: número de pedido, modo y resultado.
  console.info("[meta-capi] envío", {
    pedido: p.orderNumber,
    modo: cfg.modo,
    ok: r.ok,
    fbtrace_id: r.fbtraceId,
  });

  revalidatePath("/admin");

  if (!r.ok) return fallo(`${T.errorEnvio} ${r.error}`);
  return { ok: true, mensaje: cfg.modo === "test" ? T.okPrueba : T.okLive };
}
