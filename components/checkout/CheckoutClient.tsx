"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  CAMPOS_INICIALES,
  CAMPOS_ORDEN,
  PEDIDO_POR_DEFECTO,
  ZONA_POR_DEFECTO,
  construirPayload,
  pedidoDesdeParams,
  submitOrder,
  totalesCheckout,
  validarContacto,
  type CampoId,
  type CamposContacto,
  type Errores,
  type MetodoPago,
  type PedidoBase,
} from "@/lib/checkout";
import { CHECKOUT, type ZonaId } from "@/lib/content";
import CheckoutForm from "./CheckoutForm";
import ShippingOptions from "./ShippingOptions";
import PaymentMethods from "./PaymentMethods";
import OrderSummary from "./OrderSummary";

/**
 * Orquesta el checkout: de dónde sale el pedido, el estado del formulario y
 * el envío.
 *
 * Prioridad del pedido, en este orden:
 *   1. Query params válidos — es el camino de "Comprar ahora", que saltea el
 *      carrito a propósito.
 *   2. Carrito persistido — el camino de "Finalizar compra".
 *   3. Pack de 2 como fallback, para que el resumen nunca quede vacío.
 *
 * El carrito no se vacía al entrar: el cliente puede volver atrás.
 */
export default function CheckoutClient() {
  const params = useSearchParams();
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

  const refs: Record<CampoId, React.RefObject<HTMLInputElement | null>> = {
    nombre: useRef<HTMLInputElement>(null),
    telefono: useRef<HTMLInputElement>(null),
    ciudad: useRef<HTMLInputElement>(null),
    direccion: useRef<HTMLInputElement>(null),
    ubicacion: useRef<HTMLInputElement>(null),
  };

  const totales = totalesCheckout(pedido, zona, vip);

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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIntentado(true);

    const nuevos = validarContacto(campos);
    setErrores(nuevos);

    const primerError = CAMPOS_ORDEN.find((id) => nuevos[id]);
    if (primerError) {
      refs[primerError].current?.focus();
      return;
    }

    // Formulario válido. El payload queda armado y listo.
    const payload = construirPayload(campos, totales, zona, vip, metodo);

    // ⚠️ FASE 5: acá se registra el pedido y, si el método es tarjeta, se
    // redirige a la página de pago externa con la URL que devuelva el
    // servidor. Hoy `submitOrder` es un stub que no hace nada: no persiste,
    // no redirige y no muestra confirmación. Ver lib/checkout.ts.
    void submitOrder(payload);
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
            onZona={setZona}
            vip={vip}
            onVip={setVip}
            envioGratis={totales.envioGratis}
          />

          <PaymentMethods metodo={metodo} onMetodo={setMetodo} />
        </div>

        <OrderSummary
          totales={totales}
          zona={zona}
          vip={vip}
          onConfirmar={() => {}}
          className="mt-9 lg:sticky lg:top-5 lg:mt-0"
        />
      </div>

      <p className="m-0 mt-4 text-center text-[11.5px] text-gris-oscuro lg:hidden">
        {CHECKOUT.seguridad}
      </p>
    </form>
  );
}
