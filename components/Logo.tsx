/**
 * Logo de Grit — única fuente de verdad de su tamaño.
 *
 * Antes el logo se pegaba a mano en siete archivos, cada uno con su propia
 * altura (15px, 18px, 19px, 20px, 26px…). El resultado era un logo que se veía
 * distinto en cada pantalla y siempre demasiado chico. Acá viven las cinco
 * variantes que existen de verdad y nada más: si hace falta otro tamaño, se
 * agrega a esta tabla, no en el archivo que lo usa.
 *
 * TAMAÑOS
 *   Las alturas son ~70% más grandes que las anteriores, manteniendo la misma
 *   proporción entre variantes: el header sigue siendo más grande que la barra
 *   del panel, y el pie más grande que el header.
 *
 * PROPORCIÓN
 *   El SVG mide 1804 × 872. Se declaran `width` y `height` con esa proporción
 *   para que el navegador reserve la caja antes de cargarlo y no haya salto de
 *   layout; el alto real lo fija la clase CSS y `w-auto` acompaña.
 *
 * POR QUÉ `<img>` Y NO `next/image`
 *   Es un SVG estático servido desde /public: el optimizador no puede hacer
 *   nada con él. Además, importar `next/image` desde el panel hace que webpack
 *   parta el chunk que /admin comparte con la landing y le sume peso al First
 *   Load JS de "/", que es la página que más importa cuidar.
 */

/** Proporción real del archivo: 1804 × 872. */
const RATIO = 1804 / 872;

export type VarianteLogo = "header" | "footer" | "checkout" | "admin" | "auth";

/**
 * Altura en píxeles por variante. El `lg:` solo existe donde antes también
 * existía: agrandar en escritorio es una decisión de cada superficie, no una
 * regla general.
 */
const TAMANOS: Record<VarianteLogo, { alto: number; clase: string }> = {
  /** Header público: landing, producto y gracias. */
  header: { alto: 34, clase: "h-[34px] lg:h-[40px]" },
  /** Pie de página oscuro de la landing y del ecommerce. */
  footer: { alto: 44, clase: "h-[44px]" },
  /** Pie del checkout, deliberadamente más discreto que el header. */
  checkout: { alto: 27, clase: "h-[27px] lg:h-[31px]" },
  /** Barra superior del panel administrativo. */
  admin: { alto: 26, clase: "h-[26px]" },
  /** Login del panel y pantallas de aviso de /admin. */
  auth: { alto: 31, clase: "h-[31px]" },
};

export default function Logo({
  variante,
  sobre = "claro",
  prioridad = false,
  className = "",
}: {
  variante: VarianteLogo;
  /**
   * Color del FONDO sobre el que se apoya, no del logo. Sobre fondo claro va
   * el logo en tinta; sobre fondo oscuro, el de hueso.
   */
  sobre?: "claro" | "oscuro";
  /** Solo para el logo visible al cargar la página. */
  prioridad?: boolean;
  className?: string;
}) {
  const { alto, clase } = TAMANOS[variante];

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver nota del módulo.
    <img
      src={sobre === "claro" ? "/img/logo-dark.svg" : "/img/logo-light.svg"}
      alt="Grit"
      width={Math.round(alto * RATIO)}
      height={alto}
      fetchPriority={prioridad ? "high" : undefined}
      className={`${clase} w-auto ${className}`.trim()}
    />
  );
}
