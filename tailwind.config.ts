import type { Config } from "tailwindcss";

/**
 * Configuración Tailwind — Sistema visual Grit v2 + Grit Design System v1.0.
 *
 * ESTRATEGIA DE MERGE: aditiva. Las claves que ya usaba el repo se mantienen
 * intactas y con el mismo nombre, así ninguna clase existente cambia de valor.
 * Las claves nuevas del handoff se agregan al lado.
 *
 * ⚠️ NO se incorpora el bloque `spacing` numérico de
 * `tokens/tailwind.config.grit.ts`, que remapea 5→22px, 6→26px, 8→40px,
 * 10→56px, 12→74px, 14→80px. Tailwind usa esa escala también para width,
 * height, gap y margin, así que adoptarla desplazaría silenciosamente el
 * layout actual — entre otras, los 19 usos de `px-10` (40px → 56px) y los 4
 * de `*-12` (48px → 74px). Solo se agregan claves de espaciado con nombre.
 *
 * Por el mismo motivo se conservan `maxWidth.contenido` (19 usos),
 * `spacing.seccion` (14 usos) y las familias `archivo`/`inter` (38 usos),
 * agregando los nombres del handoff como alias del mismo valor.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ---------------------------------------------------------------
           Claves originales del repo — NO TOCAR, hay clases en uso.
           --------------------------------------------------------------- */
        // Fondos / copy
        tinta: "#14110F", // fondo oscuro principal
        "tinta-2": "#211D19", // fondo oscuro secundario (ritual, CTA)
        hueso: "#F2EEE6", // fondo claro / copy sobre oscuro
        // Acentos (tierra / arcilla)
        tierra: "#C2693F", // acento primario
        "tierra-oscura": "#7A3B2B", // acento secundario
        // Grises de soporte
        "gris-medio": "#8C857A",
        "gris-oscuro": "#5C564D",
        "gris-claro": "#A39C90",
        "gris-copy": "#C9C2B6", // texto sobre fondo oscuro
        "gris-tinta": "#3A342E", // texto sobre fondo claro
        // Bordes / superficies
        borde: "#2E2922", // borde sobre oscuro
        "borde-claro": "#D8D1C3", // borde sobre claro
        "superficie-clara": "#EDE9E0", // tarjetas sobre hueso

        /* ---------------------------------------------------------------
           Rampas primitivas del Design System (nomenclatura del handoff).
           Mismos valores que arriba, expuestos con los nombres semánticos
           para el trabajo nuevo.
           --------------------------------------------------------------- */
        ink: {
          900: "#14110F", // = tinta
          800: "#211D19", // = tinta-2
          700: "#2E2922", // = borde
          600: "#3A342E", // = gris-tinta
          500: "#4A443B", // anillo inactivo del RitualStep
        },
        bone: {
          100: "#F2EEE6", // = hueso
          200: "#EDE9E0", // = superficie-clara
          300: "#E2DCCF", // hover del botón hueso
          400: "#D8D1C3", // = borde-claro
        },
        clay: {
          300: "#FFB185", // relleno del icon badge
          400: "#FF8A53", // acento INTERACTIVO (controles)
          500: "#E8753F", // acento interactivo, hover
          600: "#C2693F", // = tierra — acento de MARCA (tipografía)
          700: "#91401F", // glifo del icon badge
          800: "#7A3B2B", // = tierra-oscura — acento de marca sobre claro
        },
        warmgrey: {
          100: "#C9C2B6", // = gris-copy
          200: "#A39C90", // = gris-claro
          300: "#8C857A", // = gris-medio
          400: "#5C564D", // = gris-oscuro
        },

        /* ---------------------------------------------------------------
           Estado — ⚠️ DERIVADO, no existía en el producto original.
           Pendiente de sign-off de diseño.
           --------------------------------------------------------------- */
        success: "#4F7A4A",
        // ⚠️ 2.80:1 sobre hueso — oscurecer a ~#8F6820 antes de usarlo como texto.
        warning: "#B8862F",
        danger: "#A33F2E",

        /* ---------------------------------------------------------------
           Ecommerce (Product Experience handoff).

           `naranja` y `naranja-oscura` son ALIAS de `clay-400` / `clay-500`,
           no colores nuevos: mismo hex, distinto nombre. El Design System los
           llama clay-*; los specs de ecommerce los llaman naranja-*. Si algún
           día cambia el acento interactivo, hay que cambiarlo en los cuatro
           lugares a la vez.
           --------------------------------------------------------------- */
        naranja: "#FF8A53", // ≡ clay-400 — CTA primario
        "naranja-oscura": "#E8753F", // ≡ clay-500 — hover del CTA primario
        verde: "#4A7C59", // estado de entrega / envío gratis alcanzado
        "verde-texto": "#2F5138", // texto sobre el tinte verde
        "superficie-input": "#FBF9F4", // fondo de inputs en checkout
        pista: "#DCD5C6", // fondo de barras de progreso
      },

      fontFamily: {
        // Claves originales — enlazadas a las variables de next/font.
        archivo: ["var(--font-archivo)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
        // Alias semánticos del handoff (mismas familias).
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      /* Pares [tamaño, {interlineado, tracking}] — el emparejamiento es parte
         del diseño. Claves nuevas: no pisan `text-sm`, `text-base`, etc. */
      fontSize: {
        "display-2xl": ["80px", { lineHeight: "0.90", letterSpacing: "-0.03em" }],
        "display-xl": ["74px", { lineHeight: "0.92", letterSpacing: "-0.03em" }],
        "display-lg": ["62px", { lineHeight: "0.92", letterSpacing: "-0.03em" }],
        "display-md": ["44px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-sm": ["34px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        statement: ["40px", { lineHeight: "1.16", letterSpacing: "-0.015em" }],
        title: ["21px", { lineHeight: "1.32", letterSpacing: "-0.01em" }],
        "title-sm": ["18px", { lineHeight: "1.20", letterSpacing: "-0.01em" }],
        "body-lg": ["17px", { lineHeight: "1.55" }],
        "body-grit": ["15.5px", { lineHeight: "1.60" }],
        "body-sm": ["14.5px", { lineHeight: "1.60" }],
        "body-xs": ["13.5px", { lineHeight: "1.55" }],
        label: ["11px", { lineHeight: "1.40", letterSpacing: "0.20em" }],
        "label-sm": ["10.5px", { lineHeight: "1.40", letterSpacing: "0.12em" }],
        "label-xs": ["9.5px", { lineHeight: "1.40", letterSpacing: "0.08em" }],
      },

      /* Claves con nombre. Verificado que el repo no usa ninguna clave de
         tracking por nombre (solo valores arbitrarios), así que estas no
         pisan nada. `grit-tight` evita chocar con `tracking-tight`. */
      letterSpacing: {
        display: "-0.03em",
        heading: "-0.02em",
        "grit-tight": "-0.015em",
        "grit-label": "0.20em",
        "label-md": "0.14em",
        "label-sm": "0.12em",
        "label-xs": "0.08em",
      },

      spacing: {
        // Clave original — 14 usos de `py-seccion`.
        seccion: "74px",
        // Alias y agregados del handoff. Ninguna clave numérica: ver cabecera.
        section: "74px",
        "section-lg": "80px",
        gutter: "26px",
        "gutter-md": "40px",
      },

      maxWidth: {
        contenido: "1120px", // clave original — 19 usos
        content: "1120px", // alias del handoff
      },

      borderRadius: {
        image: "6px", // fotos y miniaturas de producto
        card: "10px",
        summary: "12px", // tarjeta de resumen del pedido
        hero: "16px",
        mockup: "26px",
        pill: "9999px",
        field: "10px", // ⚠️ DERIVADO — textarea / select
        strip: "8px", // tiras internas, inputs de checkout
      },

      borderWidth: {
        hairline: "1px",
        strong: "1.5px",
        heavy: "2px",
      },

      backdropBlur: {
        header: "10px",
        "header-scrolled": "16px",
        overlay: "4px",
      },

      backgroundImage: {
        "hero-protect":
          "linear-gradient(#14110F, rgba(20,17,15,0) 22%, rgba(20,17,15,0) 80%, rgba(20,17,15,0.45))",
        "bleed-left":
          "linear-gradient(90deg, rgba(20,17,15,0.92) 0%, rgba(20,17,15,0.55) 42%, rgba(20,17,15,0) 72%)",
      },

      transitionDuration: {
        control: "180ms", // aprobado en revisión de diseño
        expand: "300ms", // acordeón
      },

      transitionTimingFunction: {
        grit: "ease",
      },

      zIndex: {
        header: "30",
        overlay: "50",
      },
    },
  },
  plugins: [],
};

export default config;
