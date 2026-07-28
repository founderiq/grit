import { NextResponse, after } from "next/server";
import {
  ConfiguracionFaltanteError,
  getSupabaseAdmin,
} from "@/lib/supabase-admin";
import { esUuid, validarYCalcular } from "@/lib/pedidos";
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
 *
 * QUÉ ESPERA LA RESPUESTA, Y QUÉ NO
 *   Espera UNA sola cosa: que Supabase confirme el pedido. Nunca se redirige a
 *   /gracias antes de eso.
 *
 *   El aviso por Telegram y la conversión del checkout abandonado se ejecutan
 *   con `after()`, o sea DESPUÉS de que la respuesta salió. Los dos son efectos
 *   secundarios: si Telegram tarda cinco segundos o se cae, el comprador no
 *   tiene por qué esperarlo ni enterarse. Antes se esperaban dentro del
 *   request, y eso ponía hasta cinco segundos de Telegram en el camino crítico
 *   entre "Confirmar pedido" y /gracias.
 *
 * MEDICIÓN
 *   Cada tramo se cronometra y se registra en una sola línea de log. No es
 *   decorativo: es la única forma de saber, sobre tráfico real, cuál de los
 *   tramos se degrada. No incluye ningún dato del cliente.
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

/** Cronómetro por tramos. Devuelve milisegundos redondeados. */
function cronometro() {
  const inicio = performance.now();
  let previo = inicio;
  const tramos: Record<string, number> = {};

  return {
    marcar(nombre: string) {
      const ahora = performance.now();
      tramos[nombre] = Math.round(ahora - previo);
      previo = ahora;
    },
    resumen(extra: Record<string, unknown> = {}) {
      return { ...tramos, total_ms: Math.round(performance.now() - inicio), ...extra };
    },
  };
}

export async function POST(request: Request) {
  const reloj = cronometro();

  /* 1 · Cuerpo JSON --------------------------------------------------------- */
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return json({ error: "payload_invalido" }, 400);
  }
  reloj.marcar("cuerpo_ms");

  /* 2 · Validación y recálculo server-side ---------------------------------- */
  const resultado = validarYCalcular(bruto);
  if (!resultado.ok) {
    return json({ error: "payload_invalido", detalles: resultado.errores }, 400);
  }
  const p = resultado.pedido;

  // Clave del checkout abandonado. Es opcional y no participa de la validación
  // del pedido: si no viene o no es un UUID, simplemente no se convierte nada.
  const sessionKey =
    typeof bruto === "object" && bruto !== null && "sessionKey" in bruto
      ? (bruto as { sessionKey?: unknown }).sessionKey
      : null;
  const claveAbandono = esUuid(sessionKey) ? sessionKey : null;

  reloj.marcar("validacion_ms");

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
  reloj.marcar("cliente_ms");

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
      // Cantidad de pulseras, contando la extra promocional. La base la usa
      // para congelar el costo de producto del pedido. Sale del recálculo del
      // servidor, no del navegador.
      p_units: p.unidades,
      p_items: p.items,
      p_metadata: {
        origen: "checkout_web",
        unidades: p.unidades,
        envio_gratis: p.envioGratis,
      },
    })
    .single<FilaCreateOrder>();

  reloj.marcar("create_order_ms");

  if (error || !data) {
    // Se registra solo lo mínimo: sin dirección, sin teléfono, sin payload.
    console.error("[pedidos] fallo al crear el pedido", {
      codigo: error?.code ?? "sin_datos",
      ...reloj.resumen(),
    });
    return json({ error: "error_interno" }, 500);
  }

  /* 5 · Efectos posteriores, fuera del camino crítico -----------------------
     `after()` corre el callback cuando la respuesta ya salió. El comprador
     llega a /gracias sin esperar ni el aviso de Telegram ni la conversión del
     checkout abandonado, y ninguno de los dos puede hacer fallar el pedido:
     el pedido ya está confirmado en la base cuando esto empieza.            */
  after(async () => {
    const posterior = cronometro();

    /* 5a · Checkout abandonado → convertido.
       Es idempotente por partida doble: `status <> 'converted'` hace que un
       reintento no vuelva a escribir, y como corre después de la respuesta,
       la lentitud de /gracias no lo afecta. Un fallo acá no toca al pedido. */
    if (claveAbandono) {
      try {
        const { error: falla } = await supabase
          .from("abandoned_checkouts")
          .update({
            status: "converted",
            converted_order_id: data.id,
            converted_at: new Date().toISOString(),
          })
          .eq("session_key", claveAbandono)
          .neq("status", "converted");

        if (falla) {
          console.error("[pedidos] no se pudo convertir el abandonado", {
            codigo: falla.code,
          });
        }
      } catch (e) {
        console.error("[pedidos] error al convertir el abandonado", {
          tipo: e instanceof Error ? e.name : "desconocido",
        });
      }
    }
    posterior.marcar("abandonado_ms");

    /* 5b · Aviso por Telegram.
       Solo cuando el pedido es NUEVO: si `is_duplicate` viene en true, el
       pedido ya existía —doble clic, reintento o corte de red— y el grupo ya
       recibió su aviso. Es el ÚNICO Telegram del sistema: los pedidos
       manuales y los cambios de estado del panel no notifican nada.        */
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
    posterior.marcar("telegram_ms");

    console.info("[pedidos] posterior", posterior.resumen({ pedido: data.order_number }));
  });

  /* 6 · Respuesta ----------------------------------------------------------
     No se expone `data.id`: el UUID interno del pedido se queda en el
     servidor. Hacia afuera viaja `confirmation_token`, que es el que abre
     /gracias.                                                              */
  const cuerpo = json(
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

  reloj.marcar("respuesta_ms");
  console.info("[pedidos] alta", reloj.resumen({ duplicado: data.is_duplicate }));

  return cuerpo;
}
