# Sistema de diseño actual — Grit

> **Documento de auditoría.** Describe el estado **tal cual está hoy** en el
> código, sin proponer cambios ni aplicarlos. Sirve como línea de base para la
> redefinición del design system con Claude Design.
>
> - Fecha del relevamiento: 2026-07-24
> - Rama analizada: `claude/grit-design-system-analysis-i4qbbz`
> - Stack: Next.js 15 (App Router) · React 19 · TypeScript strict · TailwindCSS 3.4.17
> - Alcance: 2 páginas, 25 componentes, 1 archivo de configuración de tema.

---

## 1. Dónde vive el estilo hoy

| Capa | Archivo | Qué define |
| --- | --- | --- |
| Tokens de tema | `tailwind.config.ts` | 13 colores, 3 familias tipográficas, 1 espaciado (`seccion`), 1 ancho (`contenido`) |
| Base + componentes CSS | `app/globals.css` | Reset de `body`, scroll suave, `prefers-reduced-motion`, 3 clases de componente (`.grit-label`, `.btn-tierra`, `.btn-hueso`) |
| Fuentes | `app/layout.tsx` | Carga con `next/font/google`, expuestas como variables CSS |
| Todo lo demás | Clases Tailwind **inline en cada componente** | ~95 % de los valores visuales |

**Observación estructural:** el sistema está tokenizado a nivel de **color**, pero
no a nivel de **tipografía, espaciado, radios ni motion**. Esos valores viven como
utilidades arbitrarias (`text-[15.5px]`, `px-[26px]`, `rounded-[10px]`) repartidas
en 25 archivos, lo que hace que cualquier cambio global requiera un
buscar-y-reemplazar manual.

---

## 2. Paleta de colores

### 2.1 Tokens definidos (`tailwind.config.ts:15-33`)

| Token Tailwind | HEX | RGB | Rol documentado en el código |
| --- | --- | --- | --- |
| `tinta` | `#14110F` | `20, 17, 15` | Fondo oscuro principal |
| `tinta-2` | `#211D19` | `33, 29, 25` | Fondo oscuro secundario (ritual, CTA) |
| `hueso` | `#F2EEE6` | `242, 238, 230` | Fondo claro / copy sobre oscuro |
| `tierra` | `#C2693F` | `194, 105, 63` | Acento primario |
| `tierra-oscura` | `#7A3B2B` | `122, 59, 43` | Acento secundario |
| `gris-medio` | `#8C857A` | `140, 133, 122` | Gris de soporte |
| `gris-oscuro` | `#5C564D` | `92, 86, 77` | Gris de soporte |
| `gris-claro` | `#A39C90` | `163, 156, 144` | Gris de soporte |
| `gris-copy` | `#C9C2B6` | `201, 194, 182` | Texto sobre fondo oscuro |
| `gris-tinta` | `#3A342E` | `58, 52, 46` | Texto sobre fondo claro |
| `borde` | `#2E2922` | `46, 41, 34` | Borde sobre oscuro |
| `borde-claro` | `#D8D1C3` | `216, 209, 195` | Borde sobre claro |
| `superficie-clara` | `#EDE9E0` | `237, 233, 224` | Tarjetas sobre hueso |

### 2.2 Colores fuera de los tokens (hardcodeados)

| HEX | Dónde | Comentario |
| --- | --- | --- |
| `#e2dccf` | `app/globals.css:51`, `components/CTAFinal.tsx:29` | Hover del botón claro. Repetido en 2 lugares, sin token. |
| `#4A443B` | `components/ui/RitualStep.tsx:32` | Borde del círculo de paso inactivo. Sin token. |
| `#3A352D` | `components/ui/RitualStep.tsx:42-43` | Línea conectora. **Casi idéntico a `gris-tinta` (`#3A342E`)** — difiere en 1 unidad de R/B. |
| `#C2693F` | `components/ui/CrossIcon.tsx:5`, `RitualStep.tsx:42` | Duplica el token `tierra`. |
| `#211D19` | `components/producto/ProductoCompra.tsx:43` | Hover del botón oscuro. Duplica el token `tinta-2` (existe `hover:bg-tinta-2`). |
| `#14110F` | `components/Hero.tsx:61`, `app/layout.tsx:34` | Duplica `tinta` en el degradado del hero y en `themeColor`. |
| `rgba(20,17,15, …)` | `components/Hero.tsx:61` | `tinta` expresado en RGBA con alfa `0` / `.45`. No hay tokens de opacidad. |
| `#F2EEE6` / `#14110F` / `#C2693F` | `public/img/logo-light.svg`, `logo-dark.svg`, `app/icon.svg` | Marca quemada en los SVG (esperable en assets, pero acopla el logo a la paleta). |

### 2.3 Mapa de uso por rol

**Fondos de página**

- `tinta` — Hero, Contenido, FePrimero, Footer, ProductoRecordatorio, ProductoCTAFinal
- `tinta-2` — Ritual, CTAFinal, ProductoPasos, ProductoRegalo
- `hueso` — Manifiesto, Producto, FAQ, ProductoPrincipal, ProductoBeneficios, ProductoIncluye

**Superficies / cards**

| Superficie | Color | Sobre qué fondo |
| --- | --- | --- |
| Card mockup (Contenido) | `bg-tinta-2` | `tinta` |
| Card de paso (ProductoPasos) | `bg-tinta` | `tinta-2` |
| Card de beneficio | `bg-superficie-clara` | `hueso` |
| Card de regalo | *sin fondo* (solo borde) | `tinta-2` |
| Placeholder de galería | `bg-superficie-clara` | `hueso` |
| Header | `bg-tinta/70` → `bg-tinta/90` con blur | — |

> `tinta` y `tinta-2` cumplen **doble rol**: son fondo de página en unas secciones
> y superficie elevada en otras. No hay un token dedicado de superficie (`surface`,
> `surface-raised`), lo que hace que el "nivel" de una superficie dependa del
> contexto y no del token.

**Textos**

| Contexto | Token | Uso |
| --- | --- | --- |
| Sobre oscuro — titular | `hueso` | H1, H2, H3 |
| Sobre oscuro — cuerpo | `gris-copy` | Párrafos principales |
| Sobre oscuro — cuerpo secundario | `gris-claro` | Leads, descripciones de paso |
| Sobre oscuro — etiquetas | `gris-medio` | `.grit-label`, etiquetas mono |
| Sobre claro — titular | `tinta` | H1, H2, H3 |
| Sobre claro — cuerpo | `gris-tinta` | Párrafos, respuestas de FAQ |
| Sobre claro — cuerpo secundario | `gris-oscuro` | Manifiesto, descripciones de beneficio |
| Acento en copy | `tierra` (oscuro) / `tierra-oscura` (claro) | Punto final de titulares, palabras destacadas |

**Bordes**

- `borde` (`#2E2922`) — separadores sobre fondos oscuros, bordes de cards oscuras, borde del header al hacer scroll
- `borde-claro` (`#D8D1C3`) — separadores sobre hueso (FAQ, ProductSpec, ProductoCompra, cards de beneficio)
- `border-tinta` — línea superior de 2 px en la tabla de specs (`components/Producto.tsx:54`)
- `border-transparent` — header en estado no-scrolleado
- `border-tierra` / `border-[#4A443B]` — círculo de paso del ritual

**Iconos**

- `text-tierra` — íconos dentro de contenedores (Pasos, Beneficios, Incluye) y checks de Recordatorio
- `text-gris-oscuro` — íconos de confianza en ProductoCompra
- `fill="#C2693F"` — `CrossIcon` (color por prop, con default hardcodeado)
- Todos los íconos de `ProductoIcons.tsx` usan `stroke="currentColor"`, así que heredan color por clase

---

## 3. Tipografía

### 3.1 Familias (`app/layout.tsx:12-31`)

| Familia | Variable CSS | Clase Tailwind | Pesos cargados | Uso |
| --- | --- | --- | --- | --- |
| Archivo | `--font-archivo` | `font-archivo` | 700, 800, 900 | Titulares, botones, números, títulos de card |
| Inter | `--font-inter` | `font-inter` | 400, 500, 600 | Cuerpo (default del `body`), enlaces, nav |
| IBM Plex Mono | `--font-plex-mono` | `font-mono` | 400, 500, 600 | Etiquetas, specs, tagline, fechas, badges |

`body` usa Inter por defecto (`app/globals.css:19`), con `antialiased` y
`text-rendering: optimizeLegibility`.

### 3.2 Pesos en uso

| Clase | Valor | Apariciones | Familia habitual |
| --- | --- | --- | --- |
| `font-black` | 900 | 4 | Archivo — display (Hero, CTAs, precio) |
| `font-extrabold` | 800 | 12 | Archivo — H2 de sección, números de ritual |
| `font-bold` | 700 | 10 | Archivo — H3 de card, botones, statements |
| `font-semibold` | 600 | 4 | Inter — enlaces de texto, pregunta de FAQ |
| `font-medium` | 500 | 1 | Inter — nav del header |
| `font-normal` | 400 | 1 | Archivo — signo `+` del acordeón |

### 3.3 Escala de tamaños (29 valores distintos, todos arbitrarios)

**No se usa ni una sola clase de la escala de Tailwind** (`text-sm`, `text-base`, …).
Todo es `text-[Npx]`.

**Display / H1**

| Componente | Mobile | Desktop (`md:`) | Peso | `leading` | `tracking` |
| --- | --- | --- | --- | --- | --- |
| `Hero` h1 | 60 px | 74 px | 900 | 0.92 | −0.03em |
| `CTAFinal` h2 | 62 px | 80 px | 900 | 0.9 | −0.03em |
| `ProductoCTAFinal` h2 | 42 px | 58 px | 900 | 1.02 | −0.02em |
| `ProductoCompra` h1 | 30 px | 36 px | 800 | 1.05 | −0.02em |

**H2 de sección** — mismo rol semántico, **tres escalas distintas**:

| Componentes | Mobile | Desktop | `leading` |
| --- | --- | --- | --- |
| Ritual, Contenido | 36 px | 44 px | 1.0 |
| Producto, FAQ, ProductoPasos | 34 px | 44 px | 1.02 |
| ProductoRecordatorio, ProductoBeneficios, ProductoIncluye | 32 px | 40 px | 1.05 |
| ProductoRegalo | 32 px | 42 px | 1.05 |

**Statements (párrafos grandes)**

| Componente | Mobile | Desktop | Peso | `leading` | `tracking` |
| --- | --- | --- | --- | --- | --- |
| `Manifiesto` | 31 px | 40 px | 700 | 1.14 | −0.015em |
| `FePrimero` | 27 px | 32 px | 700 | 1.16 | −0.015em |
| `Contenido` (versículo) | 21 px | — | 700 | 1.32 | −0.01em |
| `RitualStep` (título) | 21 px | — | 800 | — | −0.01em |

**H3 de card** — cuatro tamaños para el mismo rol:

| Componente | Tamaño | `tracking` |
| --- | --- | --- |
| `ProductoPasos` | 17 px | −0.01em |
| `ProductoBeneficios` | 15 px | −0.005em |
| `Contenido` (tipos) | 14 px | 0.01em |
| `ProductoRegalo` | 14 px | 0.01em |

**Cuerpo** — 9 tamaños entre 13.5 px y 17 px:

| Tamaño | `leading` | Dónde |
| --- | --- | --- |
| 17 px | 1.55 | Lead del Hero |
| 16.5 px | 1.6 | Copy de Producto |
| 16.5 px | 1.25 | Pregunta de FAQ (Archivo, semibold) |
| 16 px | 1.6 / 1.65 | Manifiesto, FePrimero, CTAFinal, ProductoCTAFinal |
| 15.5 px | 1.6 | Leads de sección (6 componentes) |
| 15 px | — | Ítems de ProductoIncluye |
| 14.5 px | 1.5 / 1.6 / 1.65 | Descripción de paso, respuesta de FAQ, valor de spec, bullets |
| 14 px | 1.6 | Párrafo de card de paso |
| 13.5 px | 1.55 / 1.6 | Párrafos de card (Contenido, Beneficios, Regalo) |

**Enlaces de texto:** 14.5 px semibold (Hero), 14 px semibold (CTAFinal), 13.5 px
medium (nav del header).

**Monoespaciada / etiquetas** — 6 tamaños y 9 valores de `tracking`:

| Tamaño | `tracking` | Dónde |
| --- | --- | --- |
| 12 px | 0.18em | Tagline de CTAFinal |
| 11 px | 0.2em | `.grit-label` |
| 11 px | 0.16em | Tagline del footer (`leading-[2]`) |
| 11 px | 0.12em | Etiqueta de RitualStep, label de ProductSpec |
| 11 px | 0.14em | Nota al pie de Contenido |
| 11 px | 0.1em | Referencia bíblica, enlaces del footer, "Precio único" |
| 10.5 px | 0.18em | Caption sobre la foto del Hero |
| 10.5 px | 0.1em | Nota de envío en ProductoCompra |
| 10.5 px | 0.08em | Copyright del footer |
| 10 px | 0.14em / 0.1em | Etiqueta y fecha del mockup |
| 9.5 px | 0.06em | Badges de confianza (`leading-[1.4]`) |

### 3.4 Line heights

15 valores distintos, ninguno tokenizado: `0.9`, `0.92`, `1.0`, `1.02`, `1.05`,
`1.14`, `1.16`, `1.25`, `1.32`, `1.4`, `1.5`, `1.55`, `1.6`, `1.65`, `2`.

`1.6` es el valor dominante (14 usos) y funciona de facto como "line-height de cuerpo".

### 3.5 Letter spacing

14 valores: `-0.03em`, `-0.02em`, `-0.015em`, `-0.01em`, `-0.005em`, `0.01em`,
`0.06em`, `0.08em`, `0.1em`, `0.12em`, `0.14em`, `0.16em`, `0.18em`, `0.2em`.

Patrón implícito (no formalizado): **negativo** para Archivo en tamaños grandes,
**positivo alto** para IBM Plex Mono en mayúsculas.

---

## 4. Escala de espaciado

### 4.1 Token definido

Solo uno: `seccion: 74px` (`tailwind.config.ts:42`), usado como `py-seccion` en
12 de 14 secciones.

### 4.2 Valores en uso

**Arbitrarios (px):** 1, 5, 6, 9, 10, 13, 14, 15, 16, 17, 18, 22, 26, 30, 34, 38, 46

**De la escala Tailwind (rem):** 1.5 (6px), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24),
7 (28), 8 (32), 9 (36), 10 (40), 11 (44), 12 (48), 14 (56), 16 (64), 20 (80)

Conviven las dos escalas sin criterio: `mb-[26px]` y `mb-7` (28px) aparecen en
componentes hermanos para el mismo tipo de separación.

### 4.3 Padding horizontal (gutter)

| Valor | Apariciones | Dónde |
| --- | --- | --- |
| `px-[26px]` | 19 | Todas las secciones |
| `px-[22px]` | 1 | **Header** (`components/Header.tsx:36`) |
| `md:px-10` (40 px) | 18 | Todas las secciones + header |

El header desalinea 4 px respecto de todas las secciones en mobile — el logo no
queda a plomo con el contenido de abajo.

### 4.4 Padding vertical de sección

| Patrón | Componentes |
| --- | --- |
| `py-seccion` (74 px) | Manifiesto, Ritual, Contenido, Producto, FePrimero, FAQ, ProductoPasos, ProductoRecordatorio, ProductoBeneficios, ProductoIncluye, ProductoRegalo |
| `py-20` (80 px) | CTAFinal, ProductoCTAFinal |
| `pb-seccion` + `pt-[26px]` / `md:pt-12` | ProductoPrincipal |
| `pt-[34px]` / `md:pt-16` / `lg:pt-20` | Hero |

### 4.5 Padding interno de cards

| Card | Padding |
| --- | --- |
| Mockup de Contenido | `p-7` (28 px) |
| Card de paso | `p-6` (24 px) |
| Card de beneficio | `p-6` (24 px) |
| Card de regalo | `p-6` (24 px) |

### 4.6 Anchos máximos

| Valor | Apariciones | Rol |
| --- | --- | --- |
| `max-w-contenido` (1120 px) | 17 | Contenedor de página (**único token de ancho**) |
| `760px` | 3 | Columna de lectura (FAQ, FePrimero, grilla de regalo) |
| `420px` | 3 | Leads de sección |
| `440px` | 2 | Leads / descripción de producto |
| `380px` | 2 | Leads |
| `330px` | 2 | Copy de CTA |
| `820px`, `560px`, `360px`, `340px`, `320px` | 1 c/u | Medidas puntuales |

10 anchos de medida distintos sin escala común.

---

## 5. Border radius

| Valor | Apariciones | Dónde |
| --- | --- | --- |
| `rounded-full` | 9 | Botones, dot de sección, círculo de paso, contenedores de ícono |
| `rounded-[10px]` | 6 | Cards de paso/beneficio/regalo, imágenes de producto, galería principal |
| `rounded-[6px]` | 3 | Fotos de producto en la landing, miniaturas de galería |
| `rounded-2xl` (16 px) | 1 | Foto del Hero en desktop (`components/Hero.tsx:46`) |
| `rounded-[26px]` | 1 | Card mockup de Contenido |

Cinco radios sin token. El `rounded-2xl` del Hero es el único que usa la escala de
Tailwind; los demás son arbitrarios. `6px` y `10px` se aplican al mismo tipo de
elemento (foto de producto) en páginas distintas.

---

## 6. Sombras

**No hay ninguna sombra en todo el proyecto.** Cero usos de `shadow-*`,
`box-shadow`, `drop-shadow` o `filter`.

La jerarquía visual se construye exclusivamente con:

1. **Contraste de fondo** entre superficie y página (`tinta` sobre `tinta-2`, etc.)
2. **Bordes de 1 px** (`borde` / `borde-claro`)
3. **Backdrop blur** en el header (`backdrop-blur-md` → `backdrop-blur-lg`)

Esta ausencia parece deliberada (estética plana / editorial) y conviene registrarla
como decisión de sistema, no como omisión.

---

## 7. Botones y sus estados

### 7.1 Variantes existentes

**1. `.btn-tierra`** — `app/globals.css:45-47` · primario de acento

```
bg-tierra · text-tinta · rounded-full
px-[17px] py-[9px] · Inter 12px/600
hover:bg-tierra-oscura · duration-200
```

Uso: CTA "Comprar" del header.

**2. `.btn-hueso`** — `app/globals.css:50-52` · primario claro sobre oscuro

```
bg-hueso · text-tinta · rounded-full
px-[26px] py-[15px] · Archivo 15px/700
hover:bg-[#e2dccf] · duration-200
```

Uso: Hero ("Quiero la mía"), ProductoRegalo, ProductoCTAFinal.

**3. CTA de CTAFinal** — `components/CTAFinal.tsx:29` · **inline, duplica `.btn-hueso`**

```
bg-hueso · text-tinta · rounded-full
px-[26px] py-[17px] · Archivo 16px/700
hover:bg-[#e2dccf] · transition-colors (150 ms, default)
```

Es `.btn-hueso` con +2 px de padding vertical, +1 px de fuente y otra duración de
transición. No reutiliza la clase.

**4. CTA de compra** — `components/producto/ProductoCompra.tsx:43` · inline, oscuro sobre claro

```
bg-tinta · text-hueso · rounded-full · w-full
px-[26px] py-[16px] · Archivo 15px/700
hover:bg-[#211D19] · transition-colors
```

Único botón full-width y única variante oscura. No está en `globals.css`.

**5. Enlaces de acción (ghost)** — sin clase compartida

| Componente | Estilo |
| --- | --- |
| Hero "Cómo funciona →" | Inter 14.5px/600, `text-gris-copy` → `hover:text-hueso` |
| CTAFinal "Escribinos por WhatsApp →" | Inter 14px/600, `text-gris-copy` → `hover:text-hueso`, `p-1.5` |
| Nav del header | Inter 13.5px/500, `text-gris-copy` → `hover:text-hueso` |
| Enlaces del footer | Mono 11px, `text-gris-copy` → `hover:text-hueso` |

**6. Trigger de acordeón** — `components/ui/FAQItem.tsx:20-38`: botón sin estilo de
botón, `w-full`, `py-[18px]`, con `+` que rota 45° al abrir.

**7. Miniatura de galería** — `components/producto/ProductoGaleria.tsx:36-38`:
`aspect-square`, `rounded-[6px]`, `ring-2 ring-tierra` cuando está activa,
`opacity-70` → `hover:opacity-100` cuando no.

### 7.2 Cobertura de estados

| Estado | Cobertura |
| --- | --- |
| `default` | ✅ Todas las variantes |
| `hover` | ✅ Todas las variantes |
| `focus` / `focus-visible` | ❌ **Ninguna variante define estilo de foco** |
| `active` / `:pressed` | ❌ Ninguna |
| `disabled` | ❌ Ninguna |
| `loading` | ❌ Ninguna |
| Seleccionado | ⚠️ Solo la miniatura de galería (`ring-2`, ligado a `aria-pressed`, no a foco) |

**Riesgo de accesibilidad:** `ProductoGaleria.tsx:36` aplica `outline-none` sin
sustituir el indicador de foco, y el `ring-2` está atado al estado *activo*, no al
foco. La navegación por teclado en la galería queda sin indicación visible. El
resto de los interactivos dependen del outline por defecto del navegador.

### 7.3 Duraciones de transición

`duration-200` (2 usos, en las clases de `globals.css`), `duration-300` (3 usos:
header, acordeón, rotación del `+`), y sin duración explícita → 150 ms por defecto
(11 usos de `transition-colors`). Tres velocidades sin token.

---

## 8. Cards

| # | Card | Archivo | Fondo | Borde | Radio | Padding |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Mockup del mensaje diario | `Contenido.tsx:48` | `bg-tinta-2` | `border-borde` | 26 px | `p-7` |
| 2 | Paso ("Tres pasos") | `ProductoPasos.tsx:38` | `bg-tinta` | `border-borde` | 10 px | `p-6` |
| 3 | Beneficio | `ProductoBeneficios.tsx:43` | `bg-superficie-clara` | `border-borde-claro` | 10 px | `p-6` |
| 4 | Regalo | `ProductoRegalo.tsx:31` | **ninguno** | `border-borde` | 10 px | `p-6` |

Patrones "tipo card" sin contenedor:

- **Fila de spec** (`ProductSpec.tsx`) — `border-b border-borde-claro`, `py-[15px]`, flex baseline
- **Ítem de FAQ** (`FAQItem.tsx`) — `border-b border-borde-claro`, trigger `py-[18px]`
- **Paso del ritual** (`RitualStep.tsx`) — timeline con círculo + línea conectora, sin caja
- **Tipo de contenido** (`Contenido.tsx:34`) — bloque de texto suelto sobre `border-t`

Las cards 2 y 4 comparten fondo de sección (`tinta-2`) pero una tiene relleno y la
otra no: dos tratamientos para la misma elevación.

Ninguna card tiene estado `hover`, `focus` ni interacción.

---

## 9. Contenedores de icono

| Contexto | Contenedor | Tamaño del ícono | Ratio |
| --- | --- | --- | --- |
| `ProductoPasos` | `h-11 w-11` (44 px), `rounded-full`, `bg-tinta-2`, `text-tierra` | 22 px | 0.50 |
| `ProductoBeneficios` | `h-10 w-10` (40 px), `rounded-full`, `bg-tinta`, `text-tierra` | 19 px | 0.48 |
| `ProductoIncluye` | `h-6 w-6` (24 px), `rounded-full`, `bg-tinta`, `text-tierra` | 13 px | 0.54 |
| `ProductoRecordatorio` | *sin contenedor* | 19 px, `text-tierra` | — |
| `ProductoCompra` (confianza) | *sin contenedor* | 20 px, `text-gris-oscuro` | — |
| `RitualStep` (número) | `h-[46px] w-[46px]`, `rounded-full`, `border-[1.5px]`, sin fondo | — (texto 16 px) | — |
| `SectionLabel` (dot) | `h-[7px] w-[7px]`, `rounded-full` | — | — |

Tres tamaños de contenedor (24 / 40 / 44 px), dos rellenos (`tinta` / `tinta-2`) y
cuatro tamaños de ícono (13 / 19 / 20 / 22 px). El ratio ícono:contenedor ronda
0.5 pero nunca es exactamente el mismo.

### Set de íconos

`components/ui/ProductoIcons.tsx` — 15 íconos SVG dibujados a mano, sin librería.
Base compartida: `viewBox 0 0 24 24`, `fill="none"`, `stroke="currentColor"`,
`strokeWidth 1.6`, `linecap/linejoin: round`.

Excepciones al patrón: `IconStar` usa `fill="currentColor"` sin trazo; `IconWifi`
mezcla trazo con un `circle` relleno; `CrossIcon` (archivo aparte) usa `fill` con
color por prop y **default hardcodeado** `#C2693F`.

Anchos por defecto inconsistentes: 24 px (los 9 primeros), 20 px (Truck, Shield,
Rotate), 16 px (Star), 14 px (Minus, Plus).

**Íconos definidos pero nunca usados:** `IconStar`, `IconRotate`, `IconMinus`,
`IconPlus`.

---

## 10. Variantes light y dark

**No existe un tema light/dark.** Concretamente:

- `tailwind.config.ts` **no tiene la clave `darkMode`**.
- No hay ni un solo modificador `dark:` en el proyecto.
- No hay `prefers-color-scheme`, ni toggle, ni `data-theme`, ni `localStorage` de tema.
- `app/layout.tsx:34` fija `themeColor: "#14110F"` (chrome del navegador siempre oscuro).
- `app/globals.css:16-22` fija `body` en `bg-tinta` / `text-hueso`: **el default del sitio es oscuro**.

Lo que sí existe es una **alternancia de superficie por sección**: cada `<section>`
declara su par fondo/texto y las clases de color se eligen a mano en cada hijo.

| "Modo" | Fondo | Texto principal | Texto secundario | Borde | Card | Acento |
| --- | --- | --- | --- | --- | --- | --- |
| Oscuro | `tinta` / `tinta-2` | `hueso` | `gris-copy`, `gris-claro` | `borde` | `tinta-2` / `tinta` | `tierra` |
| Claro | `hueso` | `tinta` | `gris-tinta`, `gris-oscuro` | `borde-claro` | `superficie-clara` | `tierra-oscura` |

Los nombres de los tokens están **acoplados al modo** (`gris-copy` = "texto sobre
fondo oscuro", `borde-claro` = "borde sobre claro"), por lo que un cambio de tema
real no es posible hoy sin renombrar la capa de tokens.

El componente `SectionLabel` es el único que modela la dualidad explícitamente, vía
prop `dot: "tierra" | "tierra-oscura"` — y la elección queda a cargo de quien lo usa,
sin que el sistema la infiera del fondo.

### Alternancia de fondos por página

**Landing (`/`):** tinta → hueso → tinta-2 → tinta → hueso → tinta → tinta-2 → hueso → tinta

**Producto (`/producto`):** hueso → tinta-2 → tinta → **hueso → hueso** → tinta-2 → hueso → tinta

En `/producto`, `ProductoBeneficios` e `ProductoIncluye` son dos secciones claras
consecutivas: se rompe el ritmo de alternancia que el README declara como regla del
sistema, y el límite entre ambas secciones desaparece visualmente.

---

## 11. Breakpoints y comportamiento responsive

### 11.1 Breakpoints

Se usan los defaults de Tailwind, sin personalizar:

| Prefijo | min-width | Usos |
| --- | --- | --- |
| `sm` | 640 px | 3 |
| `md` | 768 px | 37 |
| `lg` | 1024 px | 42 |
| `xl` | 1280 px | **0** |
| `2xl` | 1536 px | **0** |

El contenido tope en `max-w-contenido` (1120 px), así que por encima de 1120 px la
página solo centra: no hay adaptaciones para pantallas grandes.

### 11.2 Qué cambia en cada breakpoint

**`md` (768 px)** — dos cosas, siempre:

1. Gutter: `px-[26px]` → `px-10` (40 px)
2. Tamaño de titular: cada H1/H2 sube a su variante desktop

**`lg` (1024 px)** — activa los layouts de dos columnas:

| Componente | Grid |
| --- | --- |
| `Hero` | `lg:grid-cols-2` + `lg:h-[520px]` en la foto |
| `Ritual` | `lg:grid-cols-[0.9fr_1.1fr]` |
| `Contenido` | `lg:grid-cols-[1.05fr_0.95fr]` |
| `Producto` | `lg:grid-cols-2` |
| `ProductoPrincipal` | `lg:grid-cols-2` |
| `ProductoRecordatorio` | `lg:grid-cols-2` |
| `ProductoIncluye` | `lg:grid-cols-2` |

**`sm` (640 px)** — solo 3 usos: `sm:grid-cols-3` (tipos de contenido),
`sm:grid-cols-2` (beneficios, regalo).

### 11.3 Grillas de cards

| Componente | Mobile | `sm` | `md` | `lg` |
| --- | --- | --- | --- | --- |
| `Contenido` (tipos) | 1 col | 3 col | — | **vuelve a 1 col** |
| `ProductoPasos` | 1 col | — | 3 col | — |
| `ProductoBeneficios` | 1 col | 2 col | — | 3 col |
| `ProductoRegalo` | 1 col | 2 col | — | — |
| `ProductoGaleria` (thumbs) | 5 col fijas | — | — | — |
| `ProductoCompra` (confianza) | 3 col fijas | — | — | — |

`Contenido` es el único que *reduce* columnas al crecer el viewport (3 → 1), porque
a `lg` pasa a ser la columna izquierda de un layout de dos. Es correcto, pero es un
patrón que rompe la expectativa general.

### 11.4 Otros comportamientos

- **Hero:** la foto sangra a los bordes en mobile (`-mx-[26px]`) y se recorta a `rounded-2xl` en `lg`. Altura `360px` → `lg:h-full` dentro de un contenedor de `520px`.
- **Header:** los enlaces de nav están ocultos hasta `md` (`hidden md:flex`); en mobile solo queda logo + botón Comprar. **No hay menú hamburguesa ni nav mobile.**
- **Aspect ratios de imagen:** `aspect-[3/4]` (fotos de la landing, columnas desktop), `aspect-[4/5]` (mobile en producto), `aspect-square` (galería). Cambian por breakpoint en Recordatorio e Incluye (`aspect-[4/5] lg:aspect-[3/4]`).
- **Scroll:** `scroll-behavior: smooth` y `scroll-padding-top: 72px` para compensar el header sticky (`app/globals.css:10-12`). Los 72 px son un valor fijo que no está atado a la altura real del header.
- **Movimiento reducido:** `prefers-reduced-motion` anula animaciones y transiciones globalmente (`app/globals.css:25-35`). ✅

---

## 12. Componentes reutilizables

Detalle completo en [`component-inventory.md`](./component-inventory.md). Resumen:

| Categoría | Cantidad | Componentes |
| --- | --- | --- |
| Primitivas de UI (`components/ui/`) | 7 | `SectionLabel`, `RitualStep`, `FAQItem`, `ProductSpec`, `FechaHoy`, `CrossIcon`, `ProductoIcons` (15 íconos) |
| Secciones de landing (`components/`) | 10 | `Header`, `Hero`, `Manifiesto`, `Ritual`, `Contenido`, `Producto`, `FePrimero`, `CTAFinal`, `FAQ`, `Footer` |
| Secciones de producto (`components/producto/`) | 9 | `ProductoPrincipal`, `ProductoGaleria`, `ProductoCompra`, `ProductoPasos`, `ProductoRecordatorio`, `ProductoBeneficios`, `ProductoIncluye`, `ProductoRegalo`, `ProductoCTAFinal` |
| Clases CSS de componente | 3 | `.grit-label`, `.btn-tierra`, `.btn-hueso` |

**Componentes verdaderamente reutilizados en más de un lugar:** `SectionLabel` (11
usos), `Header` / `Footer` / `FAQ` (en ambas páginas), `FAQItem`, `RitualStep`,
`ProductSpec`, los íconos.

**Componentes "de sección" (un solo uso):** todo el resto. Son composiciones de
contenido, no piezas del sistema.

**Patrón repetido sin componente:** la *card* aparece 4 veces con markup casi
idéntico (`rounded-[10px] border border-* p-6`) sin abstraerse; el *contenedor de
ícono circular* aparece 3 veces; el *botón* aparece 2 veces inline duplicando
`.btn-hueso`.

---

## 13. Valores hardcodeados e inconsistencias

### 13.1 Color

| # | Hallazgo | Ubicación |
| --- | --- | --- |
| C1 | `#e2dccf` (hover del botón claro) repetido y sin token | `globals.css:51`, `CTAFinal.tsx:29` |
| C2 | `#4A443B` sin token | `RitualStep.tsx:32` |
| C3 | `#3A352D` es un casi-duplicado de `gris-tinta` `#3A342E` | `RitualStep.tsx:42-43` |
| C4 | `tierra` reescrito como `#C2693F` en 2 lugares | `CrossIcon.tsx:5`, `RitualStep.tsx:42` |
| C5 | `tinta-2` reescrito como `#211D19` pudiendo usar `hover:bg-tinta-2` | `ProductoCompra.tsx:43` |
| C6 | `tinta` reescrito en HEX y RGBA en el degradado del hero | `Hero.tsx:61` |
| C7 | `themeColor` duplica `#14110F` en vez de importarlo | `layout.tsx:34` |
| C8 | No hay tokens de estado (hover/active) ni de opacidad; el header usa `/70` y `/90` sueltos | `Header.tsx:32-33` |

### 13.2 Contraste (WCAG 2.1)

Ratios calculados sobre los tokens actuales:

| Combinación | Ratio | AA texto normal |
| --- | --- | --- |
| `gris-medio` sobre `hueso` | **3.16:1** | ❌ **Falla** |
| `gris-medio` sobre `superficie-clara` | **3.01:1** | ❌ **Falla** |
| `gris-claro` sobre `hueso` | **2.35:1** | ❌ Falla |
| `gris-oscuro` sobre `tinta` | **2.59:1** | ❌ Falla |
| `tierra` sobre `tinta-2` | **4.29:1** | ⚠️ Solo texto grande |
| `tierra` sobre `hueso` | 3.37:1 | ⚠️ Solo texto grande |
| `tierra` sobre `tinta` | 4.82:1 | ✅ |
| `gris-medio` sobre `tinta` | 5.15:1 | ✅ |
| `gris-copy` sobre `tinta` | 10.63:1 | ✅ |
| `gris-tinta` sobre `hueso` | 10.61:1 | ✅ |
| `gris-oscuro` sobre `hueso` | 6.27:1 | ✅ |

**Problema real en producción:** `gris-medio` (3.16:1) se usa sobre fondos claros en
texto de 9.5–11 px:

- `.grit-label` lleva `text-gris-medio` fijo, y `SectionLabel` se usa sobre `hueso`
  en 5 secciones (Manifiesto, Producto, FAQ, ProductoBeneficios, ProductoIncluye).
- `ProductSpec.tsx:12` — labels de spec, 11 px sobre `hueso`.
- `ProductoCompra.tsx:34,48,56-68` — "Precio único", nota de envío y los 3 badges de
  confianza (9.5 px).

`.grit-label` fue diseñada para fondo oscuro (donde da 5.15:1) pero se reutiliza sin
variante sobre fondo claro.

`tierra` sobre `tinta-2` (4.29:1) afecta la etiqueta de `RitualStep` a 11 px.

### 13.3 Tipografía

| # | Hallazgo |
| --- | --- |
| T1 | 29 tamaños de fuente arbitrarios; **cero** usos de la escala de Tailwind |
| T2 | Medios píxeles en 8 tamaños (9.5, 10.5, 13.5, 14.5, 15.5, 16.5) — no redondean a grilla |
| T3 | El H2 de sección tiene 3 escalas distintas (32/34/36 → 40/42/44) para el mismo rol |
| T4 | 3 line-heights casi idénticos para el mismo rol de H2: `1.0`, `1.02`, `1.05` |
| T5 | El H3 de card tiene 4 tamaños (14/15/17) y 3 trackings |
| T6 | 15 line-heights y 14 letter-spacings sin tokenizar |
| T7 | El lead de sección usa 15.5 px en 6 componentes y 17 px / 16 px en otros, sin criterio |

### 13.4 Espaciado y layout

| # | Hallazgo |
| --- | --- |
| E1 | **El header usa `px-[22px]` y todas las secciones `px-[26px]`** — desalineación de 4 px en mobile |
| E2 | Conviven la escala Tailwind (rem) y valores arbitrarios en px para el mismo propósito (`mb-[26px]` vs `mb-7`) |
| E3 | 17 valores de espaciado arbitrarios, ninguno tokenizado salvo `seccion` |
| E4 | Las secciones de CTA usan `py-20` (80 px) y el resto `py-seccion` (74 px) — diferencia de 6 px sin justificación |
| E5 | 10 anchos de medida distintos (320–820 px) sin escala |
| E6 | `scroll-padding-top: 72px` es un valor mágico no vinculado a la altura real del header |

### 13.5 Forma y superficie

| # | Hallazgo |
| --- | --- |
| F1 | 5 radios sin token (6, 10, 16, 26 px, full); solo uno usa la escala Tailwind |
| F2 | Las fotos de producto usan `rounded-[6px]` en la landing y `rounded-[10px]` en `/producto` |
| F3 | Cards sobre el mismo fondo (`tinta-2`) con y sin relleno (Pasos vs Regalo) |
| F4 | `tinta` y `tinta-2` cumplen doble rol (fondo de página / superficie elevada) sin token de superficie |
| F5 | Contenedores de ícono en 3 tamaños y 2 rellenos, con ratio ícono:caja variable |

### 13.6 Estados e interacción

| # | Hallazgo |
| --- | --- |
| S1 | **Ningún componente define `focus-visible`** |
| S2 | `outline-none` en las miniaturas de galería sin indicador de foco sustituto (`ProductoGaleria.tsx:36`) |
| S3 | Sin estados `active`, `disabled` ni `loading` en ninguna variante |
| S4 | 3 duraciones de transición (150 / 200 / 300 ms) sin token |
| S5 | Cards y filas de spec no tienen ningún estado interactivo |

### 13.7 Duplicación de componentes

| # | Hallazgo |
| --- | --- |
| D1 | `CTAFinal.tsx:29` reimplementa `.btn-hueso` con otro tamaño y otra duración |
| D2 | `ProductoCompra.tsx:43` define un botón oscuro inline que no existe como clase |
| D3 | El markup de card (`rounded-[10px] border p-6`) se repite 4 veces sin componente |
| D4 | `ProductoCompra.tsx:18` usa `.grit-label` en un `<div>` crudo en vez de `<SectionLabel>` — queda sin el punto de color |
| D5 | El contenedor circular de ícono se repite 3 veces sin componente |

### 13.8 Assets y documentación

| # | Hallazgo |
| --- | --- |
| A1 | `public/img/logo-dark.svg` no se usa en ningún lado (Header y Footer usan `logo-light.svg`) |
| A2 | `IconStar`, `IconRotate`, `IconMinus`, `IconPlus` definidos y nunca usados |
| A3 | **El README documenta componentes que no existen**: `ProximasCategorias`, `Comunidad`, `CategoryCard`, `TestimonialCard`, `ImageSlot` (con una sección entera dedicada a este último) |
| A4 | El README omite toda la carpeta `components/producto/` (9 componentes) y la página `/producto` |
| A5 | El header no tiene navegación en mobile: los enlaces quedan ocultos sin menú alternativo |

---

## 14. Inventario de secciones

### Landing — `/` (`app/page.tsx`)

| # | Sección | Componente | Fondo | Layout desktop | Contenido |
| --- | --- | --- | --- | --- | --- |
| 0 | Header | `Header.tsx` | `tinta/70` + blur | Logo · nav · CTA | Sticky, `z-30` |
| 1 | Hero | `Hero.tsx` | `tinta` | 2 columnas | H1 60/74, lead, 2 CTAs, foto con degradado y caption |
| 2 | Manifiesto | `Manifiesto.tsx` | `hueso` | 1 columna | Statement 31/40 + párrafo de apoyo |
| 3 | El ritual | `Ritual.tsx` | `tinta-2` | `0.9fr / 1.1fr` | H2 + 3 `RitualStep` en timeline |
| 4 | El contenido | `Contenido.tsx` | `tinta` | `1.05fr / 0.95fr` | H2 + 3 tipos de contenido + card mockup con fecha real |
| 5 | El producto | `Producto.tsx` | `hueso` | 2 columnas | 2 fotos (`1.3fr/1fr`) + copy + 5 `ProductSpec` |
| 6 | Por qué fe primero | `FePrimero.tsx` | `tinta` | 1 columna | `CrossIcon` + statement 27/32 + 2 párrafos |
| 7 | CTA final | `CTAFinal.tsx` | `tinta-2` | Centrado | H2 62/80, tagline mono, CTA + enlace WhatsApp |
| 8 | FAQ | `FAQ.tsx` | `hueso` | Centrado, 760 px | H2 + 12 `FAQItem` en acordeón |
| 9 | Footer | `Footer.tsx` | `tinta` | 1 columna | Logo, tagline, 3 enlaces, copyright |

### Producto — `/producto` (`app/producto/page.tsx`)

| # | Sección | Componente | Fondo | Layout desktop | Contenido |
| --- | --- | --- | --- | --- | --- |
| 0 | Header | `Header.tsx` | `tinta/70` + blur | — | Compartido |
| 1 | Principal | `ProductoPrincipal.tsx` | `hueso` | 2 columnas | `ProductoGaleria` + `ProductoCompra` |
| 1a | · Galería | `ProductoGaleria.tsx` | — | — | Foto `aspect-square` + 5 miniaturas |
| 1b | · Compra | `ProductoCompra.tsx` | — | — | H1, precio 85.000 Gs, CTA WhatsApp, 3 badges |
| 2 | Cómo funciona | `ProductoPasos.tsx` | `tinta-2` | 3 columnas (`md`) | H2 + 3 cards con ícono |
| 3 | Por qué Grit | `ProductoRecordatorio.tsx` | `tinta` | 2 columnas | Foto + H2 + 3 bullets con check |
| 4 | Beneficios | `ProductoBeneficios.tsx` | `hueso` | 3 columnas (`lg`) | H2 + 6 cards con ícono |
| 5 | Qué recibís | `ProductoIncluye.tsx` | `hueso` ⚠️ | 2 columnas | Foto + lista de 5 ítems con check |
| 6 | Ideal para regalar | `ProductoRegalo.tsx` | `tinta-2` | 2 columnas (`sm`) | Centrado, H2 + 4 cards + CTA |
| 7 | FAQ | `FAQ.tsx` | `hueso` | Centrado | Compartido con la landing |
| 8 | CTA final | `ProductoCTAFinal.tsx` | `tinta` | Centrado | H2 42/58 + CTA a `#comprar` |
| 9 | Footer | `Footer.tsx` | `tinta` | — | Compartido |

⚠️ Secciones 4 y 5 comparten fondo `hueso` de forma consecutiva.

---

## 15. Recomendaciones de tokenización

Prioridad para la redefinición con Claude Design. Nada de esto está aplicado.

### Prioridad alta — bloquean un tema coherente

**1. Renombrar los tokens de color a roles semánticos**

Los nombres actuales están atados al modo oscuro (`gris-copy` = "sobre oscuro"),
lo que impide un tema real. Sugerido: separar en dos capas.

- *Capa primitiva* (valores de marca, sin rol): `grit-tinta-900`, `grit-tinta-800`, `grit-hueso-50`, `grit-tierra-500`, `grit-tierra-700`, escala de grises `grit-warm-*`.
- *Capa semántica* (roles, resueltos por tema): `bg-page`, `bg-surface`, `bg-surface-raised`, `text-primary`, `text-secondary`, `text-muted`, `border-default`, `border-subtle`, `accent`, `accent-hover`, `on-accent`.

**2. Tokens de estado de color**

Hoy no existen. Necesarios como mínimo: `accent-hover` (reemplaza
`hover:bg-tierra-oscura`), `surface-inverse-hover` (reemplaza `#e2dccf`),
`surface-dark-hover` (reemplaza `#211D19`), `focus-ring`.

**3. Escala tipográfica**

Colapsar los 29 tamaños arbitrarios en ~9 pasos con line-height y tracking incluidos:

| Token sugerido | Reemplaza a |
| --- | --- |
| `display-xl` | Hero 60/74, CTAFinal 62/80 |
| `display-lg` | ProductoCTAFinal 42/58 |
| `heading-xl` | H2 de sección — unifica 32/34/36 → 40/42/44 |
| `heading-lg` | Statements — unifica 27/31 → 32/40 |
| `heading-md` | ProductoCompra 30/36, Contenido 21 |
| `heading-sm` | H3 de card — unifica 14/15/17 |
| `body-lg` | 16.5/17 px |
| `body-md` | 15.5/16 px |
| `body-sm` | 13.5/14/14.5 px |
| `label-mono` | 9.5–12 px mono, con variantes `sm`/`md` |

Cada token debe fijar `fontSize`, `lineHeight`, `letterSpacing`, `fontWeight` y
`fontFamily` juntos — hoy los cuatro se eligen por separado en cada uso.

**4. Escala de espaciado en base 4**

Reemplazar los 17 valores arbitrarios por múltiplos de 4 y usar la escala nativa de
Tailwind. Los medios píxeles y valores impares (9, 13, 15, 17, 22, 26, 30, 34, 38,
46) no aportan diferencia perceptible frente al paso de 4 más cercano.

Tokens de layout a nombrar: `gutter` (mobile/desktop, **un solo valor** — resuelve
la desalineación del header), `section-y`, `card-padding`, `stack-*`.

### Prioridad media — consistencia visual

**5. Escala de radios:** `radius-sm` (6), `radius-md` (10), `radius-lg` (16),
`radius-xl` (26), `radius-full`. Decidir un único radio para "foto de producto".

**6. Escala de anchos de medida:** colapsar los 10 valores en 3–4
(`measure-narrow` ~340, `measure-md` ~440, `measure-lg` ~560, `measure-prose` ~760).

**7. Tokens de motion:** `duration-fast` (150), `duration-base` (200),
`duration-slow` (300) + una curva de easing estándar. Hoy hay tres velocidades sin nombre.

**8. Tokens de elevación:** aunque no haya sombras, conviene nombrar los tres
niveles que sí existen (`elevation-flat`, `elevation-bordered`, `elevation-blur`)
para que la ausencia de sombra sea una decisión explícita del sistema.

**9. Tokens de contenedor de ícono:** `icon-box-sm` (24/13), `icon-box-md` (40/19),
`icon-box-lg` (44/22), con ratio ícono:caja fijo.

### Prioridad — accesibilidad (independiente de la tokenización)

**10.** Definir un `focus-visible` global y quitar el `outline-none` sin reemplazo de
`ProductoGaleria`.

**11.** Revisar `gris-medio` sobre fondos claros (3.16:1). O se oscurece el token, o
`.grit-label` gana una variante clara con un gris más oscuro (`gris-oscuro` da 6.27:1).

**12.** Revisar `tierra` sobre `tinta-2` (4.29:1) para texto pequeño.

### Componentes a extraer

| Componente sugerido | Consolida |
| --- | --- |
| `<Button variant tone size>` | `.btn-tierra`, `.btn-hueso`, los 2 botones inline, los enlaces ghost |
| `<Card tone>` | Los 4 patrones de card |
| `<IconBox size tone>` | Los 3 contenedores circulares de ícono |
| `<Section background>` | El envoltorio `mx-auto max-w-contenido px-… py-seccion` repetido 17 veces |
| `<Heading level>` | Los H2 de sección con sus 3 escalas divergentes |
| `<Prose size tone>` | Los párrafos de cuerpo con sus 9 tamaños |

---

## 16. Archivos analizados

**Configuración (7):** `tailwind.config.ts`, `postcss.config.mjs`, `next.config.mjs`,
`tsconfig.json`, `package.json`, `.eslintrc.json`, `README.md`

**App (7):** `app/layout.tsx`, `app/globals.css`, `app/page.tsx`,
`app/producto/page.tsx`, `app/icon.svg`, `app/robots.ts`, `app/sitemap.ts`

**Componentes de sección (10):** `Header.tsx`, `Hero.tsx`, `Manifiesto.tsx`,
`Ritual.tsx`, `Contenido.tsx`, `Producto.tsx`, `FePrimero.tsx`, `CTAFinal.tsx`,
`FAQ.tsx`, `Footer.tsx`

**Componentes de producto (9):** `ProductoPrincipal.tsx`, `ProductoGaleria.tsx`,
`ProductoCompra.tsx`, `ProductoPasos.tsx`, `ProductoRecordatorio.tsx`,
`ProductoBeneficios.tsx`, `ProductoIncluye.tsx`, `ProductoRegalo.tsx`,
`ProductoCTAFinal.tsx`

**Primitivas de UI (7):** `SectionLabel.tsx`, `RitualStep.tsx`, `FAQItem.tsx`,
`ProductSpec.tsx`, `FechaHoy.tsx`, `CrossIcon.tsx`, `ProductoIcons.tsx`

**Librería (2):** `lib/content.ts`, `lib/structured-data.ts`

**Assets de marca (5):** `public/img/logo-light.svg`, `public/img/logo-dark.svg`,
`public/brand/Grit_Contexto.txt`, `public/brand/image-slot-reference.js`,
`public/brand/Brand_Kit_v1.jpg` (binario, no inspeccionado)

**Total: 47 archivos.**
