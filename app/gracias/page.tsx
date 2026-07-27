import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import LimpiarCarrito from "@/components/gracias/LimpiarCarrito";
import { IconCheckCircle, IconShield } from "@/components/ui/ProductoIcons";
import { getSupabaseAdmin, hayConfiguracionSupabase } from "@/lib/supabase-admin";
import { esUuid } from "@/lib/pedidos";
import { CHECKOUT, ENVIOS, GRACIAS, LINKS, fmtGs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Pedido registrado",
  // Pantalla transaccional y personal: fuera de los buscadores.
  robots: { index: false, follow: false },
};

// Consulta la base en cada visita.
export const dynamic = "force-dynamic";

type Pedido = {
  order_number: string;
  customer_name: string;
  total: number;
  payment_method: string;
  payment_status: string;
  shipping_zone: string;
  shipping_cost: number;
  vip_shipping: boolean;
  items: {
    product_name: string;
    quantity: number;
    line_total: number;
    is_promotional: boolean;
  }[];
};

/**
 * Busca el pedido por `confirmation_token`, usando el cliente de servidor.
 * El navegador nunca consulta la base: `anon` no tiene acceso a `orders`.
 */
async function buscarPedido(token: string): Promise<Pedido | null> {
  if (!hayConfiguracionSupabase()) {
    console.error("[gracias] configuración de Supabase incompleta");
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number, customer_name, total, payment_method, payment_status, " +
        "shipping_zone, shipping_cost, vip_shipping, " +
        "order_items ( product_name, quantity, line_total, is_promotional )",
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error) {
    console.error("[gracias] no se pudo leer el pedido", { codigo: error.code });
    return null;
  }
  if (!data) return null;

  const d = data as unknown as Pedido & { order_items: Pedido["items"] };
  return { ...d, items: d.order_items ?? [] };
}

/* ------------------------------------------------------------------ */

function Cabecera() {
  return (
    <header className="grit-on-light border-b border-borde-claro bg-hueso">
      <div className="mx-auto flex max-w-contenido items-center justify-between px-5 py-4 lg:px-10">
        <Link href="/" aria-label="Grit — inicio" className="flex min-h-11 items-center">
          <Image
            src="/img/logo-dark.svg"
            alt="Grit"
            width={114}
            height={24}
            priority
            className="h-5 w-auto lg:h-6"
          />
        </Link>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro lg:text-[9.5px]">
          <IconShield width={13} aria-hidden="true" />
          {CHECKOUT.seguridad}
        </span>
      </div>
    </header>
  );
}

function PieDePagina() {
  return (
    <footer className="grit-on-light border-t border-borde-claro bg-hueso">
      <div className="mx-auto flex max-w-contenido flex-wrap items-center justify-between gap-4 px-5 py-7 lg:px-10">
        <p className="m-0 font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro lg:text-[9.5px]">
          {CHECKOUT.footerLegal}
        </p>
        <a
          href={LINKS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center font-mono text-[9px] uppercase tracking-[0.1em] text-gris-oscuro transition-colors duration-control hover:text-tinta lg:text-[9.5px]"
        >
          WhatsApp · {LINKS.whatsappVisible}
        </a>
      </div>
    </footer>
  );
}

/** Estado seguro cuando el token falta, es inválido o no existe. */
function PedidoNoEncontrado() {
  const n = GRACIAS.noEncontrado;
  return (
    <>
      <Cabecera />
      <main className="grit-on-light bg-hueso text-tinta">
        <div className="mx-auto max-w-[560px] px-5 py-16 text-center lg:py-24">
          <p className="grit-label m-0 justify-center text-gris-oscuro">
            {n.eyebrow}
          </p>
          <h1 className="m-0 mt-4 font-archivo text-[26px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[34px]">
            {n.titulo}
          </h1>
          <p className="m-0 mt-4 text-[14px] leading-[1.6] text-gris-oscuro lg:text-[15px]">
            {n.mensaje}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-naranja max-w-[320px]"
            >
              {n.cta}
            </a>
            <Link
              href="/"
              className="min-h-11 text-[13.5px] font-semibold text-tierra-oscura underline underline-offset-2"
            >
              {GRACIAS.ctaInicio}
            </Link>
          </div>
        </div>
      </main>
      <PieDePagina />
    </>
  );
}

/* ------------------------------------------------------------------ */

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-card border-hairline border-borde-claro bg-superficie-clara px-4 py-[14px]">
      <dt className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-gris-oscuro lg:text-[9px]">
        {etiqueta}
      </dt>
      <dd className="m-0 mt-[6px] text-[14px] font-semibold text-tinta lg:text-[14.5px]">
        {valor}
      </dd>
    </div>
  );
}

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Se valida el formato antes de consultar: un token mal formado ni siquiera
  // llega a la base.
  if (!token || !esUuid(token)) return <PedidoNoEncontrado />;

  const pedido = await buscarPedido(token);
  if (!pedido) return <PedidoNoEncontrado />;

  const esTransferencia = pedido.payment_method === "transferencia";
  const zona = ENVIOS[pedido.shipping_zone as keyof typeof ENVIOS];

  const envioTexto = [
    zona?.corto ?? pedido.shipping_zone,
    pedido.shipping_cost === 0
      ? CHECKOUT.resumen.gratis
      : fmtGs(pedido.shipping_cost),
    pedido.vip_shipping ? "· VIP" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const mensajeWhatsapp = encodeURIComponent(
    `Hola Grit, acabo de hacer el pedido ${pedido.order_number} ` +
      `a nombre de ${pedido.customer_name}, por un total de ${fmtGs(pedido.total)}. ` +
      "Les adjunto el comprobante de la transferencia.",
  );

  return (
    <>
      {/* Limpia el carrito recién ahora, con el pedido ya confirmado. */}
      <LimpiarCarrito token={token} />

      <Cabecera />

      <main className="grit-on-light bg-hueso text-tinta">
        <div className="mx-auto max-w-[720px] px-5 pb-14 pt-8 lg:pb-seccion lg:pt-14">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-pill border-hairline border-[rgba(74,124,89,0.35)] bg-[rgba(74,124,89,0.10)] text-verde-texto"
            aria-hidden="true"
          >
            <IconCheckCircle width={24} />
          </span>

          <p className="grit-label m-0 mt-6 text-gris-oscuro">{GRACIAS.eyebrow}</p>

          <h1 className="m-0 mt-3 font-archivo text-[28px] font-extrabold uppercase leading-[1.02] tracking-[-0.02em] lg:text-[38px]">
            {GRACIAS.titulo}
          </h1>

          <p className="m-0 mt-4 max-w-[560px] text-[14px] leading-[1.6] text-gris-oscuro lg:text-[15px]">
            {esTransferencia
              ? GRACIAS.mensajeTransferencia
              : GRACIAS.mensajeTarjeta}
          </p>

          <dl className="m-0 mt-8 grid gap-3 sm:grid-cols-2">
            <Dato
              etiqueta={GRACIAS.etiquetas.numero}
              valor={
                <span className="font-mono text-[13px] tracking-[0.04em]">
                  {pedido.order_number}
                </span>
              }
            />
            <Dato
              etiqueta={GRACIAS.etiquetas.total}
              valor={
                <span className="font-archivo text-[18px] font-extrabold">
                  {fmtGs(pedido.total)}
                </span>
              }
            />
            <Dato
              etiqueta={GRACIAS.etiquetas.metodo}
              valor={
                GRACIAS.metodos[pedido.payment_method] ?? pedido.payment_method
              }
            />
            <Dato etiqueta={GRACIAS.etiquetas.envio} valor={envioTexto} />
            <Dato
              etiqueta={GRACIAS.etiquetas.estadoPago}
              valor={
                GRACIAS.estadosPago[pedido.payment_status] ??
                pedido.payment_status
              }
            />
          </dl>

          <section className="mt-8">
            <h2 className="m-0 mb-3 font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] lg:text-[16px]">
              {GRACIAS.etiquetas.productos}
            </h2>
            <ul className="m-0 list-none rounded-card border-hairline border-borde-claro bg-superficie-clara p-0">
              {pedido.items.map((item, i) => (
                <li
                  key={`${item.product_name}-${i}`}
                  className="flex items-center justify-between gap-3 border-b border-borde-claro px-4 py-[14px] last:border-b-0"
                >
                  <span className="min-w-0 text-[13.5px] text-tinta lg:text-[14px]">
                    {item.product_name}
                    {item.quantity > 1 && (
                      <span className="text-gris-oscuro"> × {item.quantity}</span>
                    )}
                    {item.is_promotional && (
                      <span className="ml-2 inline-flex rounded-pill bg-tierra-oscura px-2 py-[3px] font-mono text-[8px] uppercase tracking-[0.08em] text-hueso">
                        35% OFF
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 font-archivo text-[13.5px] font-extrabold text-tinta lg:text-[14px]">
                    {fmtGs(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-9 flex flex-col items-start gap-4">
            {esTransferencia && (
              <a
                href={`https://wa.me/${LINKS.whatsappNumero}?text=${mensajeWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-naranja sm:max-w-[380px]"
              >
                {GRACIAS.ctaComprobante}
              </a>
            )}

            <Link href="/" className="w-full sm:w-auto">
              <Button variant="dark" size="md" className="w-full sm:w-auto">
                {GRACIAS.ctaInicio}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}
