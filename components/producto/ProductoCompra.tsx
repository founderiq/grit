"use client";

import { useRef, useState } from "react";
import SectionLabel from "@/components/ui/SectionLabel";
import {
  IconStar,
  IconTruck,
  IconShield,
  IconGift,
  IconTap,
  type IconComponent,
} from "@/components/ui/ProductoIcons";
import {
  BUNDLE_POR_DEFECTO,
  PRODUCTO_BUNDLES,
  PRODUCTO_COMPRA,
  PRODUCTO_RATING,
  PRODUCTO_TRUST,
  PRODUCTO_URGENCIA,
  ENVIO_GRATIS_DESDE,
  fmtGs,
  type BundleId,
  type ProductoBundle,
} from "@/lib/content";
import { calcularTotales, getBundle } from "@/lib/cart";

const ICONOS_TRUST: Record<string, IconComponent> = {
  truck: IconTruck,
  shield: IconShield,
  gift: IconGift,
  tap: IconTap,
};

type ProductoCompraProps = {
  /**
   * Agrega el bundle seleccionado al carrito y abre el drawer.
   * Lo conecta la FASE 3 con `cart.addBundle(id)` — el reducer del carrito ya
   * abre el drawer, así que acá no se navega nunca.
   */
  onAgregarAlCarrito?: (bundleId: BundleId) => void;
  /**
   * Va directo al checkout con el bundle seleccionado, sin pasar por el
   * carrito. Lo conecta la FASE 4 con `router.push('/checkout?pack=' + id)`.
   */
  onComprarAhora?: (bundleId: BundleId) => void;
};

function Estrellas({
  cantidad = 5,
  size = 13,
  className = "text-tinta",
}: {
  cantidad?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: cantidad }).map((_, i) => (
        <IconStar key={i} width={size} />
      ))}
    </span>
  );
}

/** Tarjeta seleccionable de un bundle. Toda la tarjeta es el área de click. */
function BundleCard({
  bundle,
  seleccionado,
  onSelect,
  onKeyDown,
  refCb,
}: {
  bundle: ProductoBundle;
  seleccionado: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLButtonElement | null) => void;
}) {
  const conEnvioGratis = bundle.unidades >= ENVIO_GRATIS_DESDE;

  return (
    <button
      ref={refCb}
      type="button"
      role="radio"
      aria-checked={seleccionado}
      tabIndex={seleccionado ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`w-full rounded-card border-heavy text-left transition-[border-color,background-color] duration-control ease-grit ${
        seleccionado
          ? "border-tinta bg-superficie-clara"
          : "border-borde-claro bg-transparent hover:border-gris-claro"
      }`}
    >
      <span className="flex items-start gap-3 p-[14px] sm:items-center sm:gap-[14px] sm:px-[18px] sm:py-[15px]">
        {/* Radio: el borde interior de 6px hace de punto en el estado activo. */}
        <span
          aria-hidden="true"
          className={`box-border h-[19px] w-[19px] flex-shrink-0 rounded-pill bg-hueso sm:h-5 sm:w-5 ${
            seleccionado
              ? "border-[6px] border-tinta"
              : "border-[1.5px] border-gris-oscuro"
          }`}
        />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-archivo text-[14.5px] font-bold text-tinta sm:text-[15.5px]">
              {bundle.nombre}
            </span>
            {bundle.tag && (
              <span className="whitespace-nowrap rounded-pill bg-tinta px-[9px] py-[4px] font-mono text-[8.5px] uppercase tracking-[0.1em] text-hueso sm:text-[9px]">
                {bundle.tag}
              </span>
            )}
          </span>
          <span className="mt-[3px] block text-[12.5px] leading-[1.45] text-gris-oscuro sm:text-[13px]">
            {bundle.soporte}
          </span>
        </span>

        <span className="flex flex-shrink-0 flex-col items-end">
          <span className="font-archivo text-[14.5px] font-extrabold text-tinta sm:text-[16px]">
            {fmtGs(bundle.precio)}
          </span>
          {bundle.compare > 0 && (
            <span className="text-[11px] text-gris-oscuro line-through sm:text-[11.5px]">
              {fmtGs(bundle.compare)}
            </span>
          )}
        </span>
      </span>

      {/* Tira de envío gratis — solo el pack de 3. Sin cuenta regresiva. */}
      {conEnvioGratis && (
        <span className="mx-[14px] mb-[12px] flex items-center justify-between rounded-strip border-hairline border-[rgba(194,105,63,0.28)] bg-[rgba(194,105,63,0.10)] px-[14px] py-[10px] sm:mx-[18px] sm:mb-[14px]">
          <span className="flex items-center gap-2">
            <IconTruck width={16} className="text-tierra-oscura" />
            <span className="text-[12.5px] font-semibold text-tinta">
              {PRODUCTO_COMPRA.envioGratisStrip.titulo}
            </span>
          </span>
          <span className="rounded-pill bg-tierra px-[10px] py-[4px] font-mono text-[9px] uppercase tracking-[0.1em] text-hueso">
            {PRODUCTO_COMPRA.envioGratisStrip.pill}
          </span>
        </span>
      )}
    </button>
  );
}

/**
 * Columna de compra de la Pulsera NFC GRIT.
 * Selector de bundles, totales, doble CTA, badge de entrega, disponibilidad
 * y fila de confianza. No hay selector de cantidad: la cantidad es un
 * concepto exclusivo del carrito.
 */
export default function ProductoCompra({
  onAgregarAlCarrito,
  onComprarAhora,
}: ProductoCompraProps) {
  const [bundleId, setBundleId] = useState<BundleId>(BUNDLE_POR_DEFECTO);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const bundle = getBundle(bundleId);
  const totales = calcularTotales(bundle);

  /** Flechas mueven la selección dentro del radiogroup (patrón WAI-ARIA). */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!teclas.includes(e.key)) return;
    e.preventDefault();
    const i = PRODUCTO_BUNDLES.findIndex((b) => b.id === bundleId);
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    const siguiente =
      PRODUCTO_BUNDLES[(i + delta + PRODUCTO_BUNDLES.length) % PRODUCTO_BUNDLES.length]!;
    setBundleId(siguiente.id);
    refs.current[siguiente.id]?.focus();
  };

  return (
    <div id="comprar">
      <SectionLabel dot="tierra-oscura">{PRODUCTO_COMPRA.eyebrow}</SectionLabel>

      <h1 className="m-0 mt-3 font-archivo text-[30px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] text-tinta lg:text-[42px]">
        {PRODUCTO_COMPRA.titulo}
      </h1>

      <div className="mt-3 flex items-center gap-2">
        <Estrellas size={12} className="text-tinta sm:hidden" />
        <Estrellas size={13} className="hidden text-tinta sm:flex" />
        <span className="text-[13px] font-semibold text-tinta">
          {PRODUCTO_RATING.promedio}
        </span>
        <span className="text-[13px] text-gris-oscuro">
          · {PRODUCTO_RATING.etiquetaCorta}
        </span>
      </div>

      <p className="m-0 mt-4 max-w-[460px] text-[14px] leading-[1.6] text-gris-tinta lg:text-[15px]">
        {PRODUCTO_COMPRA.descripcion}
      </p>

      {/* Selector de bundles — sin selector de cantidad, por diseño. */}
      <div
        role="radiogroup"
        aria-label="Elegí tu pack"
        className="mt-[18px] flex flex-col gap-[10px] lg:mt-[22px]"
      >
        {PRODUCTO_BUNDLES.map((b) => (
          <BundleCard
            key={b.id}
            bundle={b}
            seleccionado={b.id === bundleId}
            onSelect={() => setBundleId(b.id)}
            onKeyDown={onKeyDown}
            refCb={(el) => {
              refs.current[b.id] = el;
            }}
          />
        ))}
      </div>

      {/* Totales — siguen al bundle elegido, sin multiplicador de cantidad. */}
      <div className="mt-[18px] flex items-end justify-between border-t border-borde-claro pt-[14px] lg:mt-5 lg:pt-5">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gris-oscuro">
            Total
          </div>
          {totales.ahorro > 0 && (
            <div className="mt-2 inline-flex rounded-pill bg-tinta px-[11px] py-[5px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-hueso">
              Ahorrás {fmtGs(totales.ahorro)}
            </div>
          )}
        </div>
        <div className="text-right">
          {totales.ahorro > 0 && (
            <div className="text-[12.5px] text-gris-oscuro line-through">
              {fmtGs(totales.compare)}
            </div>
          )}
          <div
            className="font-archivo text-[26px] font-black leading-none text-tinta lg:text-[30px]"
            aria-live="polite"
          >
            {fmtGs(totales.subtotal)}
          </div>
        </div>
      </div>

      {/* CTAs. Ambos son w-full con border-box: nunca exceden la columna. */}
      <div className="mt-4 flex w-full flex-col gap-[9px] lg:mt-[18px] lg:gap-[10px]">
        <button
          type="button"
          className="btn-naranja-outline"
          onClick={() => onAgregarAlCarrito?.(bundleId)}
        >
          {PRODUCTO_COMPRA.ctaAgregar}
        </button>
        <button
          type="button"
          className="btn-naranja"
          onClick={() => onComprarAhora?.(bundleId)}
        >
          {PRODUCTO_COMPRA.ctaComprar} – {fmtGs(bundle.precio)}
        </button>
      </div>

      {/* Badge de entrega */}
      <div className="mt-[14px] flex w-full items-center gap-2 rounded-pill border-hairline border-[rgba(74,124,89,0.3)] bg-[rgba(74,124,89,0.10)] px-[14px] py-[9px] lg:mt-4 lg:inline-flex lg:w-auto lg:py-2">
        <span
          aria-hidden="true"
          className="grit-pulso h-2 w-2 flex-shrink-0 rounded-pill bg-verde"
        />
        <span className="text-[12.5px] font-semibold text-verde-texto">
          {PRODUCTO_COMPRA.entrega}
        </span>
      </div>

      {/* Disponibilidad. Sin cuenta regresiva. */}
      <div className="mt-3 rounded-card border-hairline border-borde-claro bg-superficie-clara px-4 py-[14px] lg:mt-[14px] lg:px-[18px] lg:py-4">
        <div className="font-archivo text-[14.5px] font-bold text-tinta">
          {PRODUCTO_URGENCIA.titulo}
        </div>
        <div className="mt-1 text-[12.5px] text-gris-oscuro">
          {PRODUCTO_URGENCIA.sub}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={PRODUCTO_URGENCIA.porcentaje}
          aria-label={PRODUCTO_URGENCIA.vendido}
          className="mt-3 h-[6px] w-full overflow-hidden rounded-pill bg-pista"
        >
          <div
            className="h-full rounded-pill bg-tierra"
            style={{ width: `${PRODUCTO_URGENCIA.porcentaje}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em]">
          <span className="text-tierra-oscura">{PRODUCTO_URGENCIA.vendido}</span>
          <span className="text-gris-oscuro sm:hidden">
            {PRODUCTO_URGENCIA.restanteCorto}
          </span>
          <span className="hidden text-gris-oscuro sm:inline">
            {PRODUCTO_URGENCIA.restante}
          </span>
        </div>
      </div>

      {/* Fila de confianza */}
      <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-3 border-t border-borde-claro p-0 pt-5 lg:grid-cols-4">
        {PRODUCTO_TRUST.map((item) => {
          const Icono = ICONOS_TRUST[item.icono]!;
          return (
            <li
              key={item.label}
              className="flex items-center gap-3 lg:flex-col lg:gap-2 lg:text-center"
            >
              <Icono width={18} className="flex-shrink-0 text-gris-oscuro lg:hidden" />
              <Icono
                width={20}
                className="hidden flex-shrink-0 text-gris-oscuro lg:block"
              />
              <span className="font-mono text-[9.5px] uppercase leading-[1.4] tracking-[0.08em] text-gris-oscuro">
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
