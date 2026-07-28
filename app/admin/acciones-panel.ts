"use server";

/**
 * Escrituras del panel que no pertenecen a un pedido concreto: alta de pedidos
 * manuales, costos del negocio, Ad Spend y archivo de abandonados.
 *
 * Igual que `app/admin/acciones.ts`, son Server Actions: corren siempre en el
 * servidor y todas empiezan por `autorizarAdmin()`, que revalida la sesión
 * contra Supabase Auth y exige una fila ACTIVA en `admin_users`. Haber abierto
 * /admin hace un rato no alcanza.
 *
 * DE LO QUE MANDA EL NAVEGADOR SE USA MUY POCO
 *   · Pedido manual: qué packs, cuántos, si hubo pulsera extra, la zona, el
 *     VIP, el envío cobrado, el descuento, el método, los estados, la fecha de
 *     venta y el contacto. Los importes se recalculan en
 *     `validarPedidoManual()`; el número de pedido, el costo de producto y el
 *     costo logístico los pone la base; `created_by` sale de la sesión.
 *   · Costos: únicamente los tres montos de `business_settings`.
 *   · Ad Spend: fecha, monto y nota.
 *   · Archivar: solo el id de la fila.
 *
 * Ninguna de estas acciones manda Telegram: ese aviso es exclusivamente para
 * pedidos nuevos del checkout web.
 */

import { revalidatePath } from "next/cache";
import { autorizarAdmin } from "@/lib/admin-guardia";
import { aEntero, MAX_MONTO } from "@/lib/admin-mutaciones";
import { validarPedidoManual } from "@/lib/admin-pedido-manual";
import { esFechaIso, hoyAsuncion, sumarDias } from "@/lib/admin-rango";
import { esUuid } from "@/lib/pedidos";

export type ResultadoPanel =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; campos?: Record<string, string> };

/** Mensajes genéricos: el detalle real queda en el log del servidor. */
const ERRORES: Record<string, string> = {
  no_autorizado: "Tu sesión ya no tiene permiso para editar.",
  datos_invalidos: "Revisá los datos del formulario.",
  monto_invalido: "Los montos tienen que ser números enteros en guaraníes.",
  fecha_invalida: "Esa fecha no es válida.",
  error_interno: "No pudimos guardar el cambio. Probá de nuevo.",
};

const falla = (codigo: string, campos?: Record<string, string>): ResultadoPanel => ({
  ok: false,
  error: ERRORES[codigo] ?? ERRORES.error_interno!,
  ...(campos ? { campos } : {}),
});

const fallaGuardia = (motivo: "sin_configuracion" | "no_autorizado") =>
  falla(motivo === "no_autorizado" ? "no_autorizado" : "error_interno");

/* ══════════════════════════════════════════════════════════════
   Pedido manual
   ══════════════════════════════════════════════════════════════ */

/** Mensaje por campo, para poder marcar el error donde ocurrió. */
const MENSAJES_CAMPO: Record<string, string> = {
  "cliente.nombre": "Escribí el nombre del cliente.",
  "cliente.whatsapp": "Escribí un número de contacto válido.",
  "cliente.ciudad": "Escribí la ciudad.",
  "cliente.direccion": "Escribí la dirección de entrega.",
  "cliente.ubicacion": "La ubicación tiene que ser un enlace que empiece con http.",
  zona: "Elegí la zona de entrega.",
  lineas: "Agregá al menos un producto.",
  envio: "El envío tiene que ser un número entero en guaraníes.",
  descuento: "El descuento tiene que ser un número entero en guaraníes.",
  metodoPago: "Elegí el método de pago.",
  pago: "Elegí el estado de pago.",
  entrega: "Elegí el estado de entrega.",
  saleDate: "Elegí una fecha de venta válida.",
  idempotencyKey: "No pudimos identificar el intento. Recargá y probá de nuevo.",
};

/**
 * Crea un pedido cargado a mano.
 *
 * El alta ocurre en `public.create_manual_order`, que arma pedido, ítems e
 * historial en una sola transacción y congela el snapshot de costos leyendo
 * `business_settings`. Es idempotente por `idempotencyKey`: un doble clic
 * devuelve el mismo pedido en lugar de crear dos.
 */
export async function crearPedidoManual(entrada: unknown): Promise<ResultadoPanel> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) return fallaGuardia(guardia.motivo);

  const validacion = validarPedidoManual(entrada);
  if (!validacion.ok) {
    const campos: Record<string, string> = {};
    for (const e of validacion.errores) {
      campos[e.campo] = MENSAJES_CAMPO[e.campo] ?? "Revisá este dato.";
    }
    return falla("datos_invalidos", campos);
  }

  const p = validacion.pedido;

  const { data, error } = await guardia.supabase
    .rpc("create_manual_order", {
      p_idempotency_key: p.idempotencyKey,
      // De la sesión verificada, jamás del formulario.
      p_created_by: guardia.adminId,
      p_customer_name: p.cliente.nombre,
      p_customer_whatsapp: p.cliente.whatsapp,
      p_customer_city: p.cliente.ciudad,
      p_customer_address: p.cliente.direccion,
      p_customer_location_url: p.cliente.ubicacion,
      p_shipping_zone: p.zona,
      p_shipping_cost: p.envio,
      p_vip_shipping: p.vip,
      p_vip_shipping_cost: p.vipCosto,
      p_payment_method: p.metodoPago,
      p_payment_status: p.paymentStatus,
      p_order_status: p.orderStatus,
      p_subtotal: p.subtotal,
      p_discount_amount: p.descuento,
      p_total: p.total,
      p_units: p.unidades,
      p_sale_date: p.saleDate,
      p_items: p.items,
      p_internal_notes: p.notas,
      p_metadata: { origen: "panel_admin", unidades: p.unidades },
    })
    .single<{ id: string; order_number: string; is_duplicate: boolean }>();

  if (error || !data) {
    console.error("[admin] no se pudo crear el pedido manual", {
      codigo: error?.code ?? "sin_datos",
    });
    return falla("error_interno");
  }

  revalidatePath("/admin");
  return {
    ok: true,
    mensaje: data.is_duplicate
      ? `Ese pedido ya estaba cargado: ${data.order_number}.`
      : `Pedido ${data.order_number} creado.`,
  };
}

/* ══════════════════════════════════════════════════════════════
   Costos del negocio
   ══════════════════════════════════════════════════════════════ */

/**
 * Guarda los tres costos de `business_settings`.
 *
 * Son los ÚNICOS tres campos editables: costo por pulsera, costo logístico de
 * Asunción y costo logístico del interior. No hay tipo de cambio, ni dólares,
 * ni courier, ni Buzón Prime, ni costos de cerámica, silicona o relojes.
 *
 * Cambiarlos NO reescribe ningún pedido: cada pedido guardó su snapshot al
 * crearse. Aplican solamente a los pedidos nuevos.
 */
export async function guardarCostos(entrada: {
  producto: unknown;
  asuncion: unknown;
  interior: unknown;
}): Promise<ResultadoPanel> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) return fallaGuardia(guardia.motivo);

  const producto = aEntero(entrada.producto);
  const asuncion = aEntero(entrada.asuncion);
  const interior = aEntero(entrada.interior);

  const campos: Record<string, string> = {};
  const revisar = (nombre: string, v: number | null) => {
    if (v === null) campos[nombre] = "Escribí un número entero en guaraníes.";
    else if (v < 0) campos[nombre] = "No puede ser negativo.";
    else if (v > MAX_MONTO) campos[nombre] = "Ese monto es demasiado grande.";
  };
  revisar("producto", producto);
  revisar("asuncion", asuncion);
  revisar("interior", interior);

  if (Object.keys(campos).length > 0) return falla("monto_invalido", campos);

  const { error } = await guardia.supabase
    .from("business_settings")
    .update({
      product_cost_per_bracelet: producto,
      logistics_cost_asuncion: asuncion,
      logistics_cost_interior: interior,
      updated_by: guardia.adminId,
    })
    .eq("id", 1);

  if (error) {
    console.error("[admin] no se pudieron guardar los costos", { codigo: error.code });
    return falla("error_interno");
  }

  revalidatePath("/admin");
  return { ok: true, mensaje: "Costos actualizados. Aplican solo a pedidos nuevos." };
}

/* ══════════════════════════════════════════════════════════════
   Ad Spend
   ══════════════════════════════════════════════════════════════ */

/** Valida fecha y monto de una inversión publicitaria. */
function validarAdSpend(entrada: { fecha: unknown; monto: unknown; nota: unknown }) {
  const campos: Record<string, string> = {};

  const fecha = typeof entrada.fecha === "string" ? entrada.fecha : "";
  // Se admite hasta mañana en Asunción: quien carga de madrugada no debería
  // pelearse con el huso horario.
  if (!esFechaIso(fecha) || fecha < "2020-01-01" || fecha > sumarDias(hoyAsuncion(), 1)) {
    campos.fecha = "Elegí una fecha válida.";
  }

  const monto = aEntero(entrada.monto);
  if (monto === null) campos.monto = "Escribí un número entero en guaraníes.";
  else if (monto <= 0) campos.monto = "El monto tiene que ser mayor a cero.";
  else if (monto > MAX_MONTO) campos.monto = "Ese monto es demasiado grande.";

  const nota =
    typeof entrada.nota === "string" ? entrada.nota.trim().slice(0, 300) : "";

  return { campos, fecha, monto, nota: nota.length > 0 ? nota : null };
}

/**
 * Crea o edita una inversión publicitaria.
 *
 * Con `id` edita esa fila; sin `id`, crea una nueva. El `created_by` de un alta
 * sale de la sesión. Editar no cambia quién la creó.
 */
export async function guardarAdSpend(entrada: {
  id?: unknown;
  fecha: unknown;
  monto: unknown;
  nota: unknown;
}): Promise<ResultadoPanel> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) return fallaGuardia(guardia.motivo);

  const { campos, fecha, monto, nota } = validarAdSpend(entrada);
  if (Object.keys(campos).length > 0) return falla("datos_invalidos", campos);

  const editar = entrada.id !== undefined && entrada.id !== null && entrada.id !== "";
  if (editar && !esUuid(entrada.id)) return falla("datos_invalidos");

  const { error } = editar
    ? await guardia.supabase
        .from("ad_spend")
        .update({ spend_date: fecha, amount: monto, note: nota })
        .eq("id", entrada.id as string)
        .is("archived_at", null)
    : await guardia.supabase
        .from("ad_spend")
        .insert({
          spend_date: fecha,
          amount: monto,
          note: nota,
          created_by: guardia.adminId,
        });

  if (error) {
    console.error("[admin] no se pudo guardar el ad spend", { codigo: error.code });
    return falla("error_interno");
  }

  revalidatePath("/admin");
  return { ok: true, mensaje: editar ? "Inversión actualizada." : "Inversión registrada." };
}

/**
 * Archiva una inversión publicitaria.
 *
 * Es un borrado lógico, igual que el de los pedidos: la fila queda en la base y
 * deja de contar en el CPA, el ROAS y la ganancia neta. No hay ningún camino en
 * el código que borre una fila de `ad_spend` físicamente.
 */
export async function archivarAdSpend(entrada: { id: unknown }): Promise<ResultadoPanel> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) return fallaGuardia(guardia.motivo);

  if (!esUuid(entrada.id)) return falla("datos_invalidos");

  const { error } = await guardia.supabase
    .from("ad_spend")
    .update({ archived_at: new Date().toISOString(), archived_by: guardia.adminId })
    .eq("id", entrada.id)
    .is("archived_at", null);

  if (error) {
    console.error("[admin] no se pudo archivar el ad spend", { codigo: error.code });
    return falla("error_interno");
  }

  revalidatePath("/admin");
  return { ok: true, mensaje: "Inversión eliminada." };
}

/* ══════════════════════════════════════════════════════════════
   Checkouts abandonados
   ══════════════════════════════════════════════════════════════ */

/**
 * Archiva o restaura un checkout abandonado.
 *
 * Mismo criterio que en pedidos: la fila no se borra nunca, solo sale del
 * listado activo. Un abandonado archivado tampoco vuelve a aparecer si el
 * visitante sigue escribiendo: el endpoint público no toca `archived_at`.
 */
export async function archivarAbandonado(entrada: {
  id: unknown;
  archivar: unknown;
}): Promise<ResultadoPanel> {
  const guardia = await autorizarAdmin();
  if (!guardia.ok) return fallaGuardia(guardia.motivo);

  if (!esUuid(entrada.id)) return falla("datos_invalidos");
  const archivar = entrada.archivar === true;

  const { error } = await guardia.supabase
    .from("abandoned_checkouts")
    .update(
      archivar
        ? { archived_at: new Date().toISOString(), archived_by: guardia.adminId }
        : { archived_at: null, archived_by: null },
    )
    .eq("id", entrada.id);

  if (error) {
    console.error("[admin] no se pudo archivar el abandonado", { codigo: error.code });
    return falla("error_interno");
  }

  revalidatePath("/admin");
  return { ok: true, mensaje: archivar ? "Checkout archivado." : "Checkout restaurado." };
}
