"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { MARCA_LIMPIEZA } from "@/components/gracias/LimpiarCarrito";
import {
  CAMPOS_INICIALES,
  CAMPOS_ORDEN,
  PEDIDO_POR_DEFECTO,
  ZONA_POR_DEFECTO,
  pedidoDesdeParams,
  submitOrder,
  telefonoNormalizado,
  totalesCheckout,
  validarContacto,
  type CampoId,
  type CamposContacto,
  type Errores,
  type MetodoPago,
  type PedidoBase,
} from "@/lib/checkout";
import { CHECKOUT, type ZonaId } from "@/lib/content";
import { trackAddPaymentInfo, trackInitiateCheckout } from "@/lib/meta-pixel";
import {
  claveSesionCheckout,
  olvidarSesionCheckout,
  useAbandono,
} from "@/components/checkout/useAbandono";
import type { Paso } from "@/lib/checkout-abandonado";
import CheckoutForm from "./CheckoutForm";
import ShippingOptions from "./ShippingOptions";
import PaymentMethods from "./PaymentMethods";
import OrderSummary from "./OrderSummary";

/** Mensajes de error por código devuelto por el endpoint. */
const MENSAJES_ERROR: Record<string, string> = {
  sin_conexion:
    "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.",
  tiempo_agotado:
    "Está tardando más de lo normal. Probá de nuevo: si tu pedido ya se registró, no se va a duplicar.",
  payload_invalido:
    "Revisá los datos del formulario: hay algo que no pudimos validar.",
  configuracion_incompleta:
    "No pudimos registrar tu pedido en este momento. Escribinos por WhatsApp al 0994320994.",
  error_interno:
    "No pudimos registrar tu pedido. Revisá tus datos o escribinos por WhatsApp al 0994320994.",
};

/**
 * Orquesta el checkout: de dónde sale el pedido, el estado del formulario y
 * el envío al servidor.
 *
 * Prioridad del pedido, en este orden:
 *   1. Query params válidos — es el camino de "Comprar ahora", que saltea el
 *      carrito a propósito.
 *   2. Carrito persistido — el camino de "Finalizar compra".
 *   3. Pack de 2 como fallback, para que el resumen nunca quede vacío.
 *
 * El carrito no se vacía al entrar ni al enviar: recién se marca para limpieza
 * cuando el servidor confirma que el pedido quedó creado.
 */
export default function CheckoutClient() {
  const params = useSearchParams();
  const router = useRouter();
  const cart = useCart();

  const desdeParams = useMemo(
    () => pedidoDesdeParams(new URLSearchParams(params.toString())),
    [params],
  );

  const pedido: PedidoBase = useMemo(() => {
    if (desdeParams) return desdeParams;

    const estado = cart?.estado;
    if (cart?.hidratado && estado?.packId) {
      return {
        packId: estado.packId,
        qty: estado.packQty,
        extra: estado.hasExtra,
      };
    }
    return PEDIDO_POR_DEFECTO;
  }, [desdeParams, cart?.hidratado, cart?.estado]);

  const [campos, setCampos] = useState<CamposContacto>(CAMPOS_INICIALES);
  const [errores, setErrores] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const [zona, setZona] = useState<ZonaId>(ZONA_POR_DEFECTO);
  const [vip, setVip] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago>("transferencia");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  // Se toca al elegir método de pago y al apretar confirmar, para saber hasta
  // dónde llegó alguien que después se fue.
  const [paso, setPaso] = useState<Paso>("contacto");

  const refs: Record<CampoId, React.RefObject<HTMLInputElement | null>> = {
    nombre: useRef<HTMLInputElement>(null),
    telefono: useRef<HTMLInputElement>(null),
    ciudad: useRef<HTMLInputElement>(null),
    direccion: useRef<HTMLInputElement>(null),
    ubicacion: useRef<HTMLInputElement>(null),
  };

  const totales = totalesCheckout(pedido, zona, vip);

  /* --------------------------------------------------------------------
     Meta Pixel — InitiateCheckout

     Se dispara por entrar de verdad al checkout, no por el click del botón
     que trajo hasta acá. Espera a que el pedido sea el definitivo: si viene
     del carrito, recién después de hidratar localStorage, para no reportar
     el pack por defecto y corregirlo después. Un solo evento por visita,
     garantizado por el ref: los re-renders no lo repiten.
     -------------------------------------------------------------------- */
  const checkoutReportado = useRef(false);

  useEffect(() => {
    const listo = desdeParams !== null || !cart || cart.hidratado;
    if (!listo || checkoutReportado.current) return;

    checkoutReportado.current = true;
    trackInitiateCheckout(pedido, totales.total, totales.unidades);
  }, [desdeParams, cart, pedido, totales.total, totales.unidades]);

  /* --------------------------------------------------------------------
     Meta Pixel — AddPaymentInfo

     Un evento por método elegido. Elegir el mismo método dos veces, o
     confirmar el pedido con el método que ya venía seleccionado, no vuelve a
     reportar.
     -------------------------------------------------------------------- */
  const pagosReportados = useRef<Set<MetodoPago>>(new Set());

  const reportarPago = (m: MetodoPago) => {
    if (pagosReportados.current.has(m)) return;
    pagosReportados.current.add(m);
    trackAddPaymentInfo({ ...pedido }, totales.total, totales.unidades);
  };

  /* --------------------------------------------------------------------
     Checkout abandonado

     Se registra a quien dejó su nombre y su WhatsApp y todavía no confirmó.
     No manda nada antes de eso, y el pedido no depende en absoluto de que
     esta captura funcione. Ver components/checkout/useAbandono.ts.
     -------------------------------------------------------------------- */
  useAbandono({
    nombre: campos.nombre,
    whatsapp: campos.telefono,
    ciudad: campos.ciudad,
    packId: pedido.packId,
    packQty: pedido.qty,
    extra: pedido.extra,
    zona,
    paso,
  });

  /* --------------------------------------------------------------------
     Clave de idempotencia

     Identifica el INTENTO LÓGICO de pedido, no el click. Se mantiene igual
     mientras el cliente reintenta el mismo pedido — así, si el primer POST
     llegó al servidor pero la respuesta se perdió, el reintento devuelve el
     pedido ya creado en vez de duplicarlo.

     Se genera una clave nueva solo cuando cambia el contenido del pedido
     (pack, cantidad, extra, zona, VIP o método de pago), porque entonces es
     otro pedido. Corregir un dato de contacto NO la renueva: es el mismo
     pedido con el domicilio bien escrito.
     -------------------------------------------------------------------- */
  const firmaPedido = `${pedido.packId}|${pedido.qty}|${pedido.extra}|${zona}|${vip}|${metodo}`;
  const claveRef = useRef<{ firma: string; clave: string } | null>(null);

  const obtenerClave = () => {
    if (claveRef.current?.firma !== firmaPedido) {
      claveRef.current = { firma: firmaPedido, clave: crypto.randomUUID() };
    }
    return claveRef.current.clave;
  };

  /** El paso solo avanza: volver a tocar un campo anterior no lo retrocede. */
  const avanzarPaso = (siguiente: Paso) => {
    const orden: Paso[] = ["contacto", "seleccion", "entrega", "pago", "review"];
    setPaso((actual) =>
      orden.indexOf(siguiente) > orden.indexOf(actual) ? siguiente : actual,
    );
  };

  const onCampo = (id: CampoId, valor: string) => {
    const siguientes = { ...campos, [id]: valor };
    setCampos(siguientes);
    // Después del primer intento se revalida en vivo, para que el error
    // desaparezca en cuanto el dato queda bien.
    if (intentado) setErrores(validarContacto(siguientes));
  };

  // Revalida al salir del campo, pero solo una vez que se intentó enviar.
  const onBlur = () => {
    if (intentado) setErrores(validarContacto(campos));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return; // corta el doble submit
    setIntentado(true);
    setErrorEnvio(null);
    avanzarPaso("review");

    const nuevos = validarContacto(campos);
    setErrores(nuevos);

    const primerError = CAMPOS_ORDEN.find((id) => nuevos[id]);
    if (primerError) {
      refs[primerError].current?.focus();
      return;
    }

    // Confirmar el pedido también confirma el método de pago. Si ya se
    // reportó al elegirlo, esto no hace nada.
    reportarPago(metodo);

    setEnviando(true);

    const resultado = await submitOrder({
      idempotencyKey: obtenerClave(),
      // Para que el servidor pueda marcar el checkout abandonado como
      // convertido. Si no existe, el pedido se crea igual.
      sessionKey: claveSesionCheckout(),
      packId: pedido.packId,
      qty: pedido.qty,
      extra: pedido.extra,
      zona,
      vip,
      metodoPago: metodo,
      // Sin importes: el servidor recalcula todo desde el catálogo.
      contacto: {
        ...campos,
        telefono: telefonoNormalizado(campos.telefono),
      },
    });

    if (!resultado.ok) {
      // El carrito queda intacto y la clave se conserva para reintentar.
      setEnviando(false);
      setErrorEnvio(MENSAJES_ERROR[resultado.codigo] ?? MENSAJES_ERROR.error_interno!);
      return;
    }

    // El pedido existe. Esta sesión de checkout terminó: la clave se olvida
    // para que la próxima visita no reescriba una fila ya convertida.
    olvidarSesionCheckout();

    // Recién ahora se marca el carrito para limpieza; lo borra /gracias al
    // cargar. Ver components/gracias/LimpiarCarrito.tsx.
    try {
      window.localStorage.setItem(
        MARCA_LIMPIEZA,
        resultado.pedido.confirmationToken,
      );
    } catch {
      // localStorage bloqueado: el pedido igual se creó.
    }

    // FASE 5B.2: cuando existan los links de pago, el método `tarjeta` va a
    // redirigir acá a la URL externa que devuelva el servidor. Por ahora las
    // dos ramas van a /gracias, que muestra el pago online como pendiente.
    router.push(resultado.pedido.redirectUrl);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Resumen condensado, arriba de todo, solo en mobile. */}
      <OrderSummary
        totales={totales}
        zona={zona}
        vip={vip}
        compacto
        className="mb-7 lg:hidden"
      />

      <div className="lg:grid lg:grid-cols-[1.35fr_1fr] lg:items-start lg:gap-12">
        <div>
          <CheckoutForm
            campos={campos}
            errores={errores}
            onCampo={onCampo}
            onBlur={onBlur}
            refs={refs}
          />

          <ShippingOptions
            zona={zona}
            onZona={(z) => {
              avanzarPaso("entrega");
              setZona(z);
            }}
            vip={vip}
            onVip={(v) => {
              avanzarPaso("entrega");
              setVip(v);
            }}
            envioGratis={totales.envioGratis}
          />

          <PaymentMethods
            metodo={metodo}
            onMetodo={(m) => {
              avanzarPaso("pago");
              setMetodo(m);
              reportarPago(m);
            }}
          />
        </div>

        <OrderSummary
          totales={totales}
          zona={zona}
          vip={vip}
          enviando={enviando}
          error={errorEnvio}
          className="mt-9 lg:sticky lg:top-5 lg:mt-0"
        />
      </div>

      <p className="m-0 mt-4 text-center text-[11.5px] text-gris-oscuro lg:hidden">
        {CHECKOUT.seguridad}
      </p>
    </form>
  );
}
