import { LINKS } from "@/lib/content";
import {
  IconTruck,
  IconShield,
  IconCheckCircle,
} from "@/components/ui/ProductoIcons";

/** Precio único de la pulsera. */
const PRECIO = "85.000 Gs";

/**
 * Título, precio y CTA de compra de la Pulsera Grit.
 * Precio único; la compra se coordina por WhatsApp.
 */
export default function ProductoCompra() {
  return (
    <div id="comprar">
      <div className="grit-label mb-3">Pulsera Grit · Colección Fe</div>

      <h1 className="m-0 font-archivo text-[30px] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] md:text-[36px]">
        Pulsera Grit
      </h1>

      <p className="m-0 mb-7 mt-5 max-w-[440px] text-[15.5px] leading-[1.6] text-gris-tinta">
        Acercás el celular a la cruz y ahí está tu versículo del día. Tejido
        elástico premium, cruz bordada y chip NFC — sin app, sin batería.
      </p>

      {/* Precio */}
      <div className="flex items-baseline gap-3 border-t border-borde-claro pt-6">
        <span className="font-archivo text-[34px] font-black text-tinta">
          {PRECIO}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-gris-medio">
          Precio único
        </span>
      </div>

      <a
        href={LINKS.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block w-full rounded-full bg-tinta px-[26px] py-[16px] text-center font-archivo text-[15px] font-bold text-hueso transition-colors hover:bg-[#211D19]"
      >
        Comprar por WhatsApp
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
