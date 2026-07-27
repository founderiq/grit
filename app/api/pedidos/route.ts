import { NextResponse } from "next/server";
import {
  ConfiguracionFaltanteError,
  getSupabaseAdmin,
} from "@/lib/supabase-admin";
import { validarYCalcular } from "@/lib/pedidos";
import { notificarPedidoNuevo } from "@/lib/telegram";

/**
 * POST /api/pedidos — registra un pedido.
 *
 * SEGURIDAD
 *   Del cuerpo del request solo se toma qué quiere comprar el cliente y sus
 *   datos de contacto. Todos los importes se recalculan en el servidor con
 *   `validarYCalcular`; si el payload trae `total`, `subtotal` o precios de
 *   ítems, se ignoran por completo. Manipular el precio en el navegador no
 *   cambia lo que se guarda ni lo que se cobra.
 *
 *   El alta ocurre en `public.create_order`, que crea pedido, ítems e
 *   historial en una sola transacción y es idempotente por `idempotencyKey`.
 *
 *   Nunca se devuelven al navegador: el UUID interno del pedido, mensajes de
 *   error de Supabase, ni nada de la configuración del servidor.
 */

// Toca la base en cada request: no se cachea ni se prerenderiza.
export const dynamic = "force-dynamic";

type FilaCreateOrder = {
  id: string;
  order_number: string;
  confirmation_token: string;
  total: number;
  payment_method: string;
  payment_status: string;
  is_duplicate: boolean;
};

const json = (cuerpo: unknown, status: number) =>
  NextResponse.json(cuerpo, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  /* 1 · Cuerpo JSON --------------------------------------------------------- */
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return json({ error: "payload_invalido" }, 400);
  }

  /* 2 · Validación y recálculo server-side ---------------------------------- */
  const resultado = validarYCalcular(bruto);
  if (!resultado.ok) {
    return json({ error: "payload_invalido", detalles: resultado.errores }, 400);
  }
  const p = resultado.pedido;

  /* 3 · Cliente de Supabase ------------------------------------------------- */
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    if (e instanceof ConfiguracionFaltanteError) {
      // El detalle queda en el log del servidor; al cliente solo un código.
      console.error("[pedidos] configuración incompleta:", e.message);
      return json({ error: "configuracion_incompleta" }, 500);
    }
    throw e;
  }

  /* 4 · Alta transaccional -------------------------------------------------- */
  const { data, error } = await supabase
    .rpc("create_order", {
      p_idempotency_key: p.idempotencyKey,
      p_customer_name: p.contacto.nombre,
      p_customer_whatsapp: p.contacto.telefono,
      p_customer_city: p.contacto.ciudad,
      p_customer_address: p.contacto.direccion,
      p_customer_location_url: p.contacto.ubicacion || null,
      p_shipping_zone: p.zona,
      p_shipping_cost: p.envio,
      p_vip_shipping: p.vip,
      p_vip_shipping_cost: p.vipCosto,
      p_payment_method: p.metodoPago,
      p_payment_status: p.paymentStatus,
      p_subtotal: p.subtotal,
      p_discount_amount: p.descuento,
      p_total: p.total,
      p_items: p.items,
      p_metadata: {
        origen: "checkout_web",
        unidades: p.unidades,
        envio_gratis: p.envioGratis,
      },
    })
    .single<FilaCreateOrder>();

  if (error || !data) {
    // Se registra solo lo mínimo: sin dirección, sin teléfono, sin payload.
    console.error("[pedidos] fallo al crear el pedido", {
      codigo: error?.code ?? "sin_datos",
    });
    return json({ error: "error_interno" }, 500);
  }

  /* 5 · Aviso por Telegram --------------------------------------------------
     Solo cuando el pedido es NUEVO. Si `is_duplicate` viene en true, el
     pedido ya existía —doble clic, reintento o corte de red— y el grupo ya
     recibió su aviso: no se vuelve a notificar.

     Va fuera de la transacción de base de datos y a propósito no afecta el
     resultado: si Telegram está caído, el pedido igual está guardado y el
     comprador igual recibe su confirmación. El fallo queda en el log del
     servidor y nada más. Se espera la respuesta (con timeout corto) porque en
     serverless el trabajo posterior a la respuesta no está garantizado.      */
  if (!data.is_duplicate) {
    await notificarPedidoNuevo({
      orderNumber: data.order_number,
      cliente: {
        nombre: p.contacto.nombre,
        whatsapp: p.contacto.telefono,
        ciudad: p.contacto.ciudad,
        direccion: p.contacto.direccion,
        ubicacion: p.contacto.ubicacion || null,
      },
      items: p.items.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        line_total: i.line_total,
      })),
      subtotal: p.subtotal,
      envio: p.envio,
      envioGratis: p.envioGratis,
      vip: p.vip,
      vipCosto: p.vipCosto,
      total: p.total,
      zona: p.zona,
      metodoPago: p.metodoPago,
      paymentStatus: p.paymentStatus,
    });
  }

  /* 6 · Respuesta ----------------------------------------------------------
     No se expone `data.id`: el UUID interno del pedido se queda en el
     servidor. Hacia afuera viaja `confirmation_token`, que es el que abre
     /gracias. El resultado de Telegram no cambia nada de esta respuesta.   */
  return json(
    {
      orderNumber: data.order_number,
      confirmationToken: data.confirmation_token,
      total: data.total,
      paymentMethod: data.payment_method,
      paymentStatus: data.payment_status,
      redirectUrl: `/gracias?token=${data.confirmation_token}`,
    },
    // Una clave repetida devuelve el pedido existente: es el mismo recurso,
    // así que 200 en lugar de 201.
    data.is_duplicate ? 200 : 201,
  );
}
