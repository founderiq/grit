"use client";

import Image from "next/image";
import { CARRITO, CHECKOUT, ENVIOS, EXTRA, fmtGs, type ZonaId } from "@/lib/content";
import type { TotalesCheckout } from "@/lib/checkout";

/**
 * Resumen del pedido. Se recalcula en vivo al cambiar la zona o el VIP.
 *
 * `compacto` es la versión que se muestra arriba de todo en mobile; la
 * completa, con el CTA, va al final de la columna.
 */
type OrderSummaryProps = {
  totales: TotalesCheckout;
  zona: ZonaId;
  vip: boolean;
  compacto?: boolean;
  /** Muestra el CTA. La versión compacta de mobile no lo lleva. */
  enviando?: boolean;
  /** Mensaje de error del envío, encima del CTA. */
  error?: string | null;
  className?: string;
};

export default function OrderSummary({
  totales,
  zona,
  vip,
  compacto = false,
  enviando = false,
  error = null,
  className = "",
}: OrderSummaryProps) {
  const nombre =
    totales.bundle.nombreLargo + (totales.qty > 1 ? ` × ${totales.qty}` : "");

  if (compacto) {
    return (
      <div
        className={`flex items-center gap-3 rounded-summary border-hairline border-borde-claro bg-superficie-clara p-3 ${className}`}
      >
        <Image
          src={CARRITO.thumb}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          className="h-12 w-12 flex-shrink-0 rounded-image object-cover"
        />
        <span className="min-w-0 flex-1 text-[13px] font-semibold text-tinta">
          {nombre}
        </span>
        <span className="flex-shrink-0 font-archivo text-[16px] font-extrabold text-tinta">
          {fmtGs(totales.total)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-summary border-hairline border-borde-claro bg-superficie-clara px-5 py-5 lg:px-[26px] lg:py-6 ${className}`}
    >
      <h2 className="m-0 mb-4 font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[16px]">
        {CHECKOUT.seccionResumen}
      </h2>

      <div className="flex gap-3 border-b border-borde-claro pb-4 lg:pb-[18px]">
        <Image
          src={CARRITO.thumb}
          alt=""
          width={64}
          height={64}
          sizes="64px"
          className="h-16 w-16 flex-shrink-0 rounded-image object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14px] font-semibold leading-[1.3] text-tinta">
            {nombre}
          </p>
          <p className="m-0 mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-gris-oscuro">
            {CHECKOUT.resumen.itemMeta}
          </p>
        </div>
        <span className="flex-shrink-0 font-archivo text-[14.5px] font-extrabold text-tinta">
          {fmtGs(totales.bundle.precio * totales.qty)}
        </span>
      </div>

      <dl className="m-0 flex flex-col gap-[10px] border-b border-borde-claro py-4 text-[13px] lg:text-[13.5px]">
        <div className="flex items-baseline justify-between">
          <dt className="text-gris-oscuro">{CHECKOUT.resumen.subtotal}</dt>
          <dd className="m-0 font-semibold text-tinta">
            {fmtGs(totales.subtotal)}
          </dd>
        </div>

        {totales.extra && (
          <div className="flex items-baseline justify-between">
            <dt className="text-gris-oscuro">{EXTRA.nombre}</dt>
            <dd className="m-0 font-semibold text-tinta">
              {fmtGs(EXTRA.precio)}
            </dd>
          </div>
        )}

        {totales.ahorro > 0 && (
          <div className="flex items-baseline justify-between">
            <dt className="text-gris-oscuro">{CHECKOUT.resumen.ahorro}</dt>
            <dd className="m-0 font-semibold text-tierra-oscura">
              − {fmtGs(totales.ahorro)}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <dt className="text-gris-oscuro">
            {CHECKOUT.resumen.envio} · {ENVIOS[zona].corto}
          </dt>
          <dd className="m-0 font-semibold text-tinta">
            {totales.envioGratis ? (
              <span className="text-verde-texto">{CHECKOUT.resumen.gratis}</span>
            ) : (
              fmtGs(totales.envio)
            )}
          </dd>
        </div>

        {vip && (
          <div className="flex items-baseline justify-between">
            <dt className="text-gris-oscuro">{CHECKOUT.resumen.vip}</dt>
            <dd className="m-0 font-semibold text-tinta">
              {fmtGs(totales.vipCosto)}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex items-baseline justify-between pt-4">
        <span className="font-archivo text-[14px] font-extrabold uppercase tracking-[-0.01em] text-tinta lg:text-[15px]">
          {CHECKOUT.resumen.total}
        </span>
        <span
          className="font-archivo text-[21px] font-black leading-none text-tinta lg:text-[24px]"
          aria-live="polite"
        >
          {fmtGs(totales.total)}
        </span>
      </div>

      {!compacto && (
        <>
          {error && (
            <p
              role="alert"
              className="m-0 mt-5 text-[12.5px] leading-[1.5] text-tierra-oscura"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            aria-busy={enviando || undefined}
            className="btn-naranja mt-5 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {enviando ? CHECKOUT.resumen.ctaEnviando : CHECKOUT.resumen.cta}
          </button>

          {/* Aparece en el mismo frame del clic, antes de que el servidor
              conteste: sin esto, en una conexión lenta parece que no pasó
              nada. `role="status"` lo anuncia sin interrumpir. */}
          {enviando && (
            <div role="status" className="mt-3">
              <p className="m-0 text-[12.5px] font-semibold leading-[1.5] text-tinta">
                {CHECKOUT.resumen.confirmando}
              </p>
              <p className="m-0 mt-[3px] text-[11.5px] leading-[1.45] text-gris-oscuro">
                {CHECKOUT.resumen.confirmandoDetalle}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
