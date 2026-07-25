"use client";

import { useState } from "react";
import {
  LINKS,
  PRODUCTO_BUNDLES,
  PRODUCTO_RATING,
  type ProductoBundle,
} from "@/lib/content";
import {
  IconStar,
  IconTruck,
  IconShield,
  IconCheckCircle,
} from "@/components/ui/ProductoIcons";

const formatGs = (n: number) => `${n.toLocaleString("es-PY")} Gs`;

function Estrellas({ promedio }: { promedio: number }) {
  return (
    <div className="flex items-center gap-[3px] text-tierra">
      {Array.from({ length: 5 }).map((_, i) => (
        <IconStar
          key={i}
          width={14}
          className={i < Math.round(promedio) ? "text-tierra" : "text-borde-claro"}
        />
      ))}
    </div>
  );
}

/**
 * Título, rating, descripción y selector de bundles de la Pulsera Grit.
 * La compra se coordina por WhatsApp con el bundle elegido ya en el mensaje.
 */
export default function ProductoCompra() {
  const [bundleId, setBundleId] = useState<ProductoBundle["id"]>("3");

  const bundle = PRODUCTO_BUNDLES.find((b) => b.id === bundleId)!;

  const mensaje = `Hola Grit, quiero comprar ${bundle.nombre} (${formatGs(
    bundle.precio,
  )})`;
  const whatsappHref = `https://wa.me/${LINKS.whatsappNumero}?text=${encodeURIComponent(
    mensaje,
  )}`;

  return (
    <div id="comprar">
      <div className="grit-label mb-3">Pulsera Grit · Colección Fe</div>

      <h1 className="m-0 font-archivo text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[36px]">
        Pulsera Grit
      </h1>

      <div className="mt-2 flex items-center gap-2">
        <Estrellas promedio={PRODUCTO_RATING.promedio} />
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-gris-medio">
          {PRODUCTO_RATING.promedio} · {PRODUCTO_RATING.total} opiniones
        </span>
      </div>

      <p className="m-0 mb-7 mt-5 max-w-[440px] text-[15.5px] leading-[1.6] text-gris-tinta">
        Acercás el celular a la cruz y ahí está tu versículo del día. Tejido
        elástico premium, cruz bordada y chip NFC — sin app, sin batería.
      </p>

      {/* Selector de bundles */}
      <div className="flex flex-col gap-[10px]">
        {PRODUCTO_BUNDLES.map((b) => {
          const seleccionado = b.id === bundleId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBundleId(b.id)}
              aria-pressed={seleccionado}
              className={`flex items-center gap-4 rounded-[10px] border px-[18px] py-[14px] text-left transition-colors ${
                seleccionado
                  ? "border-tierra bg-superficie-clara"
                  : "border-borde-claro hover:border-gris-claro"
              }`}
            >
              <span
                className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                  seleccionado ? "border-tierra" : "border-gris-claro"
                }`}
              >
                {seleccionado && (
                  <span className="h-[9px] w-[9px] rounded-full bg-tierra" />
                )}
              </span>

              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-archivo text-[14.5px] font-bold text-tinta">
                    {b.nombre}
                  </span>
                  {b.badge && (
                    <span className="rounded-full bg-tierra px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-hueso">
                      {b.badge}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-gris-oscuro">
                  {b.etiqueta}
                </span>
              </span>

              <span className="flex-shrink-0 font-archivo text-[15px] font-bold text-tinta">
                {formatGs(b.precio)}
              </span>
            </button>
          );
        })}
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block w-full rounded-full bg-tinta px-[26px] py-[16px] text-center font-archivo text-[15px] font-bold text-hueso transition-colors hover:bg-[#211D19]"
      >
        Comprar por WhatsApp · {formatGs(bundle.precio)}
      </a>

      <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-gris-medio">
        Coordinamos el envío apenas confirmás tu pedido
      </p>

      {/* Confianza */}
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-borde-claro pt-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <IconTruck width={20} className="text-gris-oscuro" />
          <span className="font-mono text-[9.5px] uppercase leading-[1.4] tracking-[0.06em] text-gris-medio">
            Envíos a todo el país
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <IconShield width={20} className="text-gris-oscuro" />
          <span className="font-mono text-[9.5px] uppercase leading-[1.4] tracking-[0.06em] text-gris-medio">
            Compra segura
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <IconCheckCircle width={20} className="text-gris-oscuro" />
          <span className="font-mono text-[9.5px] uppercase leading-[1.4] tracking-[0.06em] text-gris-medio">
            Sin app ni batería
          </span>
        </div>
      </div>
    </div>
  );
}
