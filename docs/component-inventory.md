# Inventario de componentes — Grit

> Relevamiento del **estado actual** del código, sin cambios aplicados.
> Complemento de [`design-system-current.md`](./design-system-current.md).
>
> - Fecha: 2026-07-24
> - Total: **26 componentes React** + 15 íconos + 3 clases CSS de componente

**Leyenda de "Variantes"**

- **Prop** — variante controlada por una propiedad tipada del componente
- **Estado** — variante controlada por estado interno de React
- **Uso** — variante que se logra pasando clases distintas desde quien lo consume (no está modelada en el componente)
- **Responsive** — variante que cambia por breakpoint
- **Ninguna** — el componente se renderiza siempre igual

---

## 1. Primitivas de UI — `components/ui/`

Son las piezas de las que el resto se compone. Las únicas realmente reutilizadas.

### `SectionLabel`

| | |
| --- | --- |
| **Archivo** | `components/ui/SectionLabel.tsx` |
| **Tipo** | Server component |
| **Usos** | 11 (Hero, Manifiesto, Ritual, Contenido, Producto, FePrimero, FAQ, ProductoPasos, ProductoRecordatorio, ProductoBeneficios, ProductoIncluye, ProductoRegalo) |
| **Estructura** | `div.grit-label` > `span` (dot 7×7 `rounded-full`) + `children` |
| **Estilo** | Vía `.grit-label` (`globals.css:40-42`): mono 11 px, uppercase, `tracking-[0.2em]`, `text-gris-medio`, `gap-[9px]` |

**Variantes**

| Tipo | Variante | Valores | Notas |
| --- | --- | --- | --- |
| Prop | `dot` | `"tierra"` (default) · `"tierra-oscura"` | Se elige a mano según el fondo de la sección; el componente no lo infiere |
| Prop | `className` | Libre | Usada casi siempre para el margen inferior: `mb-[22px]` (7×), `mb-[26px]` (3×), `mb-3` (1×) |
| Uso | Alineación | Por defecto izquierda; `ProductoRegalo` pasa `mx-auto w-fit justify-center` para centrar |

**Observaciones**

- El color de texto (`gris-medio`) está fijo en `.grit-label` y **no cambia entre fondo claro y oscuro** → contraste 3.16:1 sobre `hueso` (falla AA).
- `ProductoCompra.tsx:18` **no usa este componente**: escribe `<div className="grit-label">` directo y por eso no tiene el punto de color.

---

### `RitualStep`

| | |
| --- | --- |
| **Archivo** | `components/ui/RitualStep.tsx` |
| **Tipo** | Server component |
| **Usos** | 1 consumidor (`Ritual.tsx`), 3 instancias |
| **Estructura** | Fila flex: columna [círculo numerado + línea conectora] · columna [título, etiqueta, descripción] |
| **Estilo** | Círculo `h-[46px] w-[46px] rounded-full border-[1.5px]`; título Archivo 21 px/800; etiqueta mono 11 px `tracking-[0.12em]`; descripción 14.5 px/`1.6` `text-gris-claro` |

**Variantes**

| Tipo | Variante | Efecto |
| --- | --- | --- |
| Prop | `activo` (bool) | `true` → borde y número `tierra`, etiqueta `tierra`, línea con degradado `#C2693F → #3A352D`. `false` → borde `#4A443B`, número `gris-copy`, etiqueta `gris-medio`, línea plana `#3A352D` |
| Prop | `ultimo` (bool) | Oculta la línea conectora y quita el `pb-[26px]` del contenido |
| Prop | `numero`, `titulo`, `etiqueta`, `descripcion` | Contenido |

**Observaciones**

- En `lib/content.ts` los 3 pasos tienen `activo: true`, así que **la variante inactiva nunca se renderiza hoy** (código vivo pero sin uso visible).
- Los 3 colores de la variante están hardcodeados en HEX (`#4A443B`, `#3A352D`, `#C2693F`).
- `#3A352D` es un casi-duplicado del token `gris-tinta` (`#3A342E`).

---

### `FAQItem`

| | |
| --- | --- |
| **Archivo** | `components/ui/FAQItem.tsx` |
| **Tipo** | **Client component** (`"use client"`) |
| **Usos** | 1 consumidor (`FAQ.tsx`), 12 instancias, en ambas páginas |
| **Estructura** | `div.border-b` > `button` (pregunta + `+`) + `div[role=region]` animado |
| **Estilo** | Pregunta Archivo 16.5 px/600 `text-tinta`; respuesta 14.5 px/`1.65` `text-gris-tinta`; `+` Archivo 24 px `text-tierra-oscura` |
| **Animación** | `grid-template-rows: 0fr → 1fr`, `duration-300 ease-out`, sin librería |

**Variantes**

| Tipo | Variante | Efecto |
| --- | --- | --- |
| Estado | `abierto` | Panel expandido; el `+` rota 45° (`rotate-45`) convirtiéndose en `×` |

**Observaciones**

- Accesibilidad correcta: `aria-expanded`, `aria-controls`, `role="region"`, `useId()`.
- **Sin estilo de `focus-visible`** — solo el outline por defecto del navegador.
- Los colores están fijados para fondo claro; no hay variante para fondo oscuro.

---

### `ProductSpec`

| | |
| --- | --- |
| **Archivo** | `components/ui/ProductSpec.tsx` |
| **Tipo** | Server component |
| **Usos** | 1 consumidor (`Producto.tsx`), 5 instancias |
| **Estructura** | Fila flex `items-baseline justify-between` con `border-b border-borde-claro`, `py-[15px]` |
| **Estilo** | Label mono 11 px uppercase `tracking-[0.12em]` `text-gris-medio`; valor 14.5 px `text-gris-tinta` alineado a la derecha |

**Variantes:** Ninguna. Solo props de contenido (`label`, `valor`).

**Observaciones**

- El label usa `gris-medio` sobre `hueso` → 3.16:1, falla AA a 11 px.
- Diseñado únicamente para fondo claro (borde `borde-claro`, texto `gris-tinta`).

---

### `FechaHoy`

| | |
| --- | --- |
| **Archivo** | `components/ui/FechaHoy.tsx` |
| **Tipo** | **Client component** (`"use client"`) |
| **Usos** | 1 (`Contenido.tsx:54`) |
| **Estructura** | Fragment con texto plano — sin markup ni estilo propio |
| **Comportamiento** | Renderiza vacío en SSR y se completa en `useEffect` con `toLocaleDateString("es-ES")` para evitar desajuste de hidratación |

**Variantes:** Ninguna. Hereda todo el estilo del contenedor.

---

### `CrossIcon`

| | |
| --- | --- |
| **Archivo** | `components/ui/CrossIcon.tsx` |
| **Tipo** | Server component |
| **Usos** | 1 (`FePrimero.tsx:16`, con `width={34}`) |
| **Estructura** | SVG `viewBox 0 0 24 24`, un `path` con `fill` |

**Variantes**

| Tipo | Variante | Valores |
| --- | --- | --- |
| Prop | `width` | Default `24`; el único uso pasa `34` |
| Prop | `fill` | Default **`"#C2693F"` hardcodeado** (duplica el token `tierra`) |
| Prop | `className` | Libre; el único uso pasa `mb-[22px]` |

**Observaciones**

- Es el único ícono que usa `fill` con color por prop en lugar de `stroke="currentColor"`. Rompe el patrón del set `ProductoIcons` y no hereda color por clase.

---

### `ProductoIcons` (set de 15 íconos)

| | |
| --- | --- |
| **Archivo** | `components/ui/ProductoIcons.tsx` |
| **Tipo** | Server components |
| **Base compartida** | `viewBox 0 0 24 24`, `fill="none"`, `stroke="currentColor"`, `strokeWidth 1.6`, `strokeLinecap/Linejoin: "round"` |
| **Tipos exportados** | `IconProps` (`className?`, `width?`), `IconComponent` |

| Ícono | Width default | Usado en | Tamaño en uso |
| --- | --- | --- | --- |
| `IconWrist` | 24 | `ProductoPasos`, `ProductoBeneficios` | 22 / 19 |
| `IconTap` | 24 | `ProductoPasos`, `ProductoBeneficios` | 22 / 19 |
| `IconBook` | 24 | `ProductoPasos` | 22 |
| `IconBattery0` | 24 | `ProductoBeneficios` | 19 |
| `IconGift` | 24 | `ProductoBeneficios` | 19 |
| `IconLayout` | 24 | `ProductoBeneficios` | 19 |
| `IconWifi` | 24 | `ProductoBeneficios` | 19 |
| `IconCheckCircle` | 24 | `ProductoCompra`, `ProductoRecordatorio` | 20 / 19 |
| `IconCheck` | 24 | `ProductoIncluye` | 13 |
| `IconTruck` | 20 | `ProductoCompra` | 20 |
| `IconShield` | 20 | `ProductoCompra` | 20 |
| `IconStar` | 16 | — | **sin usar** |
| `IconRotate` | 20 | — | **sin usar** |
| `IconMinus` | 14 | — | **sin usar** |
| `IconPlus` | 14 | — | **sin usar** |

**Variantes**

| Tipo | Variante | Notas |
| --- | --- | --- |
| Prop | `width` | 4 defaults distintos (14 / 16 / 20 / 24) y 4 tamaños en uso (13 / 19 / 20 / 22) |
| Prop | `className` | Único vector de color: `text-tierra` (5×), `text-gris-oscuro` (3×) |

**Observaciones**

- `IconStar` rompe el patrón: usa `fill="currentColor"` sin `stroke`.
- `IconWifi` mezcla trazo con un `<circle>` relleno.
- No hay un token de tamaño de ícono: cada consumidor pasa un `width` distinto.
- 4 de 15 íconos son código muerto.

---

## 2. Componentes de sección — `components/`

Cada uno se renderiza una sola vez por página. Son composiciones de contenido, no piezas del sistema — salvo `Header`, `Footer` y `FAQ`, que se comparten entre las dos páginas.

### `Header`

| | |
| --- | --- |
| **Archivo** | `components/Header.tsx` |
| **Tipo** | **Client component** (`"use client"`) |
| **Usos** | 2 (`/` y `/producto`) |
| **Estructura** | `header.sticky` > contenedor > [logo `Link`] + [`nav` con `ul` de 4 enlaces + botón] |
| **Estilo base** | `sticky top-0 z-30 border-b`, `max-w-contenido`, `px-[22px] py-4 md:px-10` |

**Variantes**

| Tipo | Variante | Efecto |
| --- | --- | --- |
| Estado | `scrolled` (`scrollY > 12`) | `true` → `border-borde bg-tinta/90 backdrop-blur-lg`; `false` → `border-transparent bg-tinta/70 backdrop-blur-md`. Transición `duration-300` |
| Responsive | `md:` | Los 4 enlaces de nav pasan de `hidden` a `flex` |

**Datos:** `NAV_LINKS` — array local de 4 entradas, apuntan a anclas absolutas (`/#ritual`, `/#contenido`, `/#producto`, `/#faq`).

**Observaciones**

- **Único componente con `px-[22px]`** — todos los demás usan `px-[26px]`. Desalineación de 4 px en mobile.
- **No hay navegación mobile**: por debajo de `md` los enlaces simplemente desaparecen, sin menú hamburguesa.
- Usa `logo-light.svg` en `90×19`; el `Footer` usa el mismo archivo en `124×26`.
- En `/producto`, los enlaces de nav apuntan a secciones de la landing (navegación cruzada entre páginas).

---

### `Hero`

| | |
| --- | --- |
| **Archivo** | `components/Hero.tsx` |
| **Tipo** | Server component |
| **Usos** | 1 (`/`) |
| **Fondo** | `bg-tinta` |
| **Estructura** | Columna de texto [`SectionLabel`, h1, lead, CTAs] + columna de foto [`Image` + degradado + caption] + enlace `sr-only` a WhatsApp |

**Variantes**

| Tipo | Variante | Efecto |
| --- | --- | --- |
| Responsive | `md:` | h1 60 → 74 px; gutter 26 → 40 px; `pt-[34px]` → `pt-16`; la foto deja de sangrar (`-mx-[26px]` → `mx-0`) |
| Responsive | `lg:` | `grid-cols-2`; foto a `h-[520px]` con `rounded-2xl`; `pt-20` |

**Elementos únicos en el proyecto**

- Degradado inline sobre la foto con `tinta` en HEX y RGBA (`Hero.tsx:61`)
- `objectPosition: "center 60%"` vía `style`
- `rounded-2xl` (único uso de la escala de radios de Tailwind)
- Caption mono sobre la imagen, posicionada en absoluto
- Sangrado a bordes (`-mx-[26px]`)

**Botones:** `.btn-hueso` ("Quiero la mía") + enlace ghost 14.5 px ("Cómo funciona →").

---

### `Manifiesto`

| | |
| --- | --- |
| **Archivo** | `components/Manifiesto.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-hueso text-tinta` |
| **Estructura** | `SectionLabel` (dot `tierra-oscura`) + statement 31/40 px + párrafo de apoyo |
| **Variantes** | Responsive `md:` — statement 31 → 40 px |

Destaca una frase con `<span className="text-tierra-oscura">` dentro del párrafo (patrón de énfasis compartido con `Producto`).

---

### `Ritual`

| | |
| --- | --- |
| **Archivo** | `components/Ritual.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-tinta-2 text-hueso` |
| **Estructura** | Encabezado [`SectionLabel`, h2, lead] + columna de 3 `RitualStep` |
| **Variantes** | Responsive `lg:grid-cols-[0.9fr_1.1fr]`; `md:` h2 36 → 44 px |

Usa el patrón de punto final acentuado: `Todos los días<span className="text-tierra">.</span>`.

---

### `Contenido`

| | |
| --- | --- |
| **Archivo** | `components/Contenido.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-tinta text-hueso` |
| **Estructura** | Encabezado + 3 tipos de contenido · card mockup con `FechaHoy` + nota al pie |
| **Variantes** | Responsive: tipos en `1 col → sm:3 col → lg:1 col`; `lg:grid-cols-[1.05fr_0.95fr]` |

**Card única del proyecto:** `max-w-[340px] rounded-[26px] border border-borde bg-tinta-2 p-7` — el radio de 26 px y el padding `p-7` no se repiten en ninguna otra card.

Es el único componente que **reduce** columnas al crecer el viewport (3 → 1 en `lg`), porque a ese tamaño pasa a ser la columna izquierda de un layout de dos.

---

### `Producto`

| | |
| --- | --- |
| **Archivo** | `components/Producto.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-hueso text-tinta` |
| **Estructura** | `SectionLabel` + h2 + [2 fotos en `grid-cols-[1.3fr_1fr]`] + [copy + 5 `ProductSpec`] |
| **Variantes** | Responsive `lg:grid-cols-2`; `md:` h2 34 → 44 px |

Las fotos usan `rounded-[6px]` y `aspect-[3/4]`; la tabla de specs abre con
`border-t-2 border-tinta` (único borde de 2 px del proyecto).

---

### `FePrimero`

| | |
| --- | --- |
| **Archivo** | `components/FePrimero.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-tinta text-hueso` |
| **Estructura** | `SectionLabel` + `CrossIcon` (34 px) + statement 27/32 px + 2 párrafos |
| **Variantes** | Responsive `md:` — statement 27 → 32 px |

Único consumidor de `CrossIcon`. Los dos párrafos usan colores distintos
(`gris-copy` y `gris-claro`) para escalonar la jerarquía.

---

### `CTAFinal`

| | |
| --- | --- |
| **Archivo** | `components/CTAFinal.tsx` · **Usos** 1 (`/`) · **Fondo** `bg-tinta-2 text-hueso` |
| **Estructura** | Centrado: h2 62/80 px + tagline mono + copy + CTA apilado + enlace WhatsApp |
| **Variantes** | Responsive `md:` — h2 62 → 80 px |

**Contiene el titular más grande del proyecto** (80 px en desktop) y **duplica
`.btn-hueso` inline** con otro tamaño (`py-[17px]`, 16 px) y otra duración de
transición. Usa `py-20` en vez de `py-seccion`.

---

### `FAQ`

| | |
| --- | --- |
| **Archivo** | `components/FAQ.tsx` · **Usos** 2 (`/` y `/producto`) · **Fondo** `bg-hueso text-tinta` |
| **Estructura** | `SectionLabel` + h2 + lista de 12 `FAQItem` en `max-w-[760px]` con `border-t border-borde-claro` |
| **Variantes** | Ninguna propia. Responsive `md:` en el h2 (34 → 44 px) |

Consume `FAQS` de `lib/content.ts`. Alimenta también el JSON-LD `FAQPage` de
`lib/structured-data.ts`.

---

### `Footer`

| | |
| --- | --- |
| **Archivo** | `components/Footer.tsx` · **Usos** 2 · **Fondo** `bg-tinta text-hueso`, `border-t border-borde` |
| **Estructura** | Logo (124×26) + tagline mono en 2 líneas + 3 enlaces + copyright con `border-t` |
| **Variantes** | Ninguna. Único cambio responsive: gutter `md:px-10` |

Cuatro tamaños de mono distintos en un solo componente: 11 px `tracking-[0.16em]`
`leading-[2]` (tagline), 11 px `tracking-[0.1em]` (enlaces), 10.5 px
`tracking-[0.08em]` (copyright).

---

## 3. Componentes de producto — `components/producto/`

### `ProductoPrincipal`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoPrincipal.tsx` · **Usos** 1 · **Fondo** `bg-hueso text-tinta` |
| **Rol** | Contenedor de layout: compone `ProductoGaleria` + `ProductoCompra` |
| **Variantes** | Responsive `lg:grid-cols-2 lg:items-start lg:gap-16`; `md:pt-12` |

Única sección con padding vertical asimétrico: `pb-seccion pt-[26px]`.

---

### `ProductoGaleria`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoGaleria.tsx` |
| **Tipo** | **Client component** (`"use client"`) |
| **Usos** | 1 (dentro de `ProductoPrincipal`) |
| **Estructura** | Foto principal `aspect-square rounded-[10px] bg-superficie-clara` + tira de 5 miniaturas en `grid-cols-5` |

**Variantes**

| Tipo | Variante | Efecto |
| --- | --- | --- |
| Estado | `activa` (índice) | Miniatura activa: `ring-2 ring-tierra`. Inactiva: `opacity-70 hover:opacity-100` |

**Observaciones**

- **`outline-none` sin indicador de foco sustituto** (`ProductoGaleria.tsx:36`): el `ring-2` está atado al estado activo (`aria-pressed`), no al foco. La galería no es navegable visualmente por teclado.
- Único componente con `transition-all`.
- Consume `PRODUCTO_GALERIA` (5 fotos, reutiliza los assets existentes de `/public/img`).

---

### `ProductoCompra`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoCompra.tsx` · **Usos** 1 (dentro de `ProductoPrincipal`) |
| **Estructura** | Label + h1 + descripción + bloque de precio + CTA WhatsApp + nota + 3 badges de confianza |
| **Variantes** | Responsive `md:` — h1 30 → 36 px |

**Elementos únicos en el proyecto**

- **Único botón full-width y única variante de botón oscuro:** `bg-tinta text-hueso rounded-full w-full py-[16px]` con `hover:bg-[#211D19]` (hardcodeado, existiendo `hover:bg-tinta-2`)
- **Único precio:** Archivo 34 px/900 (`PRECIO` es una constante local, no está en `lib/content.ts`)
- **Tipografía más pequeña del proyecto:** badges de confianza a 9.5 px
- Íconos sin contenedor, en `text-gris-oscuro` (el resto usa `text-tierra` dentro de un círculo)

**Observaciones**

- Usa `.grit-label` en un `<div>` crudo (línea 18) en vez de `<SectionLabel>` → sin punto de color.
- `gris-medio` sobre `hueso` en 4 lugares (3.16:1) a 9.5–11 px.

---

### `ProductoPasos`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoPasos.tsx` · **Usos** 1 · **Fondo** `bg-tinta-2 text-hueso` |
| **Estructura** | `SectionLabel` + h2 + lead + 3 cards con ícono |
| **Card** | `rounded-[10px] border border-borde bg-tinta p-6` |
| **IconBox** | `h-11 w-11 rounded-full bg-tinta-2 text-tierra`, ícono 22 px |
| **Variantes** | Responsive `md:grid-cols-3`; `md:` h2 34 → 44 px |

Mapea `PRODUCTO_PASOS` contra un array local `ICONOS` por índice, con fallback
`?? IconWrist`.

---

### `ProductoRecordatorio`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoRecordatorio.tsx` · **Usos** 1 · **Fondo** `bg-tinta text-hueso` |
| **Estructura** | Foto + [`SectionLabel`, h2, párrafo, `ul` de 3 bullets con `IconCheckCircle`] |
| **Variantes** | Responsive `lg:grid-cols-2`; foto `aspect-[4/5]` → `lg:aspect-[3/4]`; `md:` h2 32 → 40 px |

Los checks van **sin contenedor circular**, en `text-tierra` a 19 px — distinto del
patrón de `ProductoIncluye`, que sí los encierra en un círculo.

---

### `ProductoBeneficios`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoBeneficios.tsx` · **Usos** 1 · **Fondo** `bg-hueso text-tinta` |
| **Estructura** | `SectionLabel` + h2 + grilla de 6 cards con ícono |
| **Card** | `rounded-[10px] border border-borde-claro bg-superficie-clara p-6` |
| **IconBox** | `h-10 w-10 rounded-full bg-tinta text-tierra`, ícono 19 px |
| **Variantes** | Responsive `sm:grid-cols-2 lg:grid-cols-3`; `md:` h2 32 → 40 px |

Es la **variante clara de la card de `ProductoPasos`**, pero no comparte componente:
mismo radio y padding, distinto fondo, borde y tamaño de IconBox (40 vs 44 px).

---

### `ProductoIncluye`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoIncluye.tsx` · **Usos** 1 · **Fondo** `bg-hueso text-tinta` ⚠️ |
| **Estructura** | Foto + [`SectionLabel`, h2, `ul` de 5 ítems con check en círculo] |
| **IconBox** | `h-6 w-6 rounded-full bg-tinta text-tierra`, ícono 13 px |
| **Variantes** | Responsive `lg:grid-cols-2`; foto `aspect-[4/5]` → `lg:aspect-[3/4]`; `md:` h2 32 → 40 px |

⚠️ Comparte fondo `hueso` con la sección inmediatamente anterior
(`ProductoBeneficios`): dos secciones claras consecutivas rompen la alternancia
tinta ↔ hueso que el README declara como regla del sistema.

Tercer tratamiento de check en el mismo sitio: aquí en círculo de 24 px, en
`ProductoRecordatorio` suelto a 19 px, en `ProductoCompra` suelto a 20 px y en gris.

---

### `ProductoRegalo`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoRegalo.tsx` · **Usos** 1 · **Fondo** `bg-tinta-2 text-hueso` |
| **Estructura** | Centrado: `SectionLabel` + h2 + párrafo + 4 cards + `.btn-hueso` |
| **Card** | `rounded-[10px] border border-borde p-6` — **sin fondo** |
| **Variantes** | Responsive `sm:grid-cols-2`; `md:` h2 32 → 42 px |

Único `md:` a 42 px (el resto usa 40 o 44). Único uso de `SectionLabel` centrado.

La card comparte fondo de sección con la de `ProductoPasos` (`tinta-2`) pero una
lleva relleno (`bg-tinta`) y esta no: dos tratamientos para la misma elevación.

---

### `ProductoCTAFinal`

| | |
| --- | --- |
| **Archivo** | `components/producto/ProductoCTAFinal.tsx` · **Usos** 1 · **Fondo** `bg-tinta text-hueso` |
| **Estructura** | Centrado: h2 42/58 px + párrafo + `.btn-hueso` a `#comprar` |
| **Variantes** | Responsive `md:` — h2 42 → 58 px |

Usa `py-20` (igual que `CTAFinal`, distinto de `py-seccion`). A diferencia de
`CTAFinal`, **sí reutiliza** `.btn-hueso` en vez de duplicarlo.

---

## 4. Clases CSS de componente — `app/globals.css`

| Clase | Línea | Definición | Consumidores |
| --- | --- | --- | --- |
| `.grit-label` | 40-42 | `flex items-center gap-[9px] font-mono text-[11px] uppercase tracking-[0.2em] text-gris-medio` | `SectionLabel` (11×), `ProductoCompra` (directo) |
| `.btn-tierra` | 45-47 | `inline-flex … rounded-full bg-tierra px-[17px] py-[9px] font-inter text-[12px] font-semibold text-tinta hover:bg-tierra-oscura duration-200` | `Header` |
| `.btn-hueso` | 50-52 | `inline-flex … rounded-full bg-hueso px-[26px] py-[15px] font-archivo text-[15px] font-bold text-tinta hover:bg-[#e2dccf] duration-200` | `Hero`, `ProductoRegalo`, `ProductoCTAFinal` |

**Sin clase compartida** (definidos inline): el CTA de `CTAFinal` (duplica
`.btn-hueso`), el CTA oscuro de `ProductoCompra`, los enlaces ghost, el trigger del
acordeón y las miniaturas de galería.

---

## 5. Fuentes de datos

Ningún componente define su propio copy salvo dos excepciones.

| Export | Archivo | Consumidor | Forma |
| --- | --- | --- | --- |
| `RITUAL_STEPS` | `lib/content.ts` | `Ritual` | 3 objetos (`numero`, `titulo`, `etiqueta`, `descripcion`, `activo`) |
| `CONTENIDO_EJEMPLO` | `lib/content.ts` | `Contenido` | Objeto (`etiqueta`, `texto`, `referencia`, `accion`) |
| `CONTENIDO_TIPOS` | `lib/content.ts` | `Contenido` | 3 objetos |
| `PRODUCT_SPECS` | `lib/content.ts` | `Producto` | 5 objetos (`label`, `valor`) |
| `FAQS` | `lib/content.ts` | `FAQ`, `structured-data` | 12 objetos |
| `PRODUCTO_GALERIA` | `lib/content.ts` | `ProductoGaleria` | 5 objetos (`src`, `alt`) |
| `PRODUCTO_PASOS` | `lib/content.ts` | `ProductoPasos` | 3 objetos |
| `PRODUCTO_RECORDATORIO_PUNTOS` | `lib/content.ts` | `ProductoRecordatorio` | 3 strings |
| `PRODUCTO_BENEFICIOS` | `lib/content.ts` | `ProductoBeneficios` | 6 objetos |
| `PRODUCTO_INCLUYE` | `lib/content.ts` | `ProductoIncluye` | 5 strings |
| `PRODUCTO_REGALO_ITEMS` | `lib/content.ts` | `ProductoRegalo` | 4 objetos |
| `LINKS` | `lib/content.ts` | `Hero`, `CTAFinal`, `Footer`, `ProductoCompra` | Objeto (`whatsapp`, `instagram`, `contacto`) |
| `NAV_LINKS` | `components/Header.tsx` | `Header` | **Local** — 4 objetos |
| `PRECIO` | `components/producto/ProductoCompra.tsx` | `ProductoCompra` | **Local** — `"85.000 Gs"` |

`PRECIO` está duplicado como dato: aparece en `ProductoCompra.tsx:9`, en
`PRODUCT_SPECS` de `lib/content.ts:71` y en el copy de `CTAFinal`.

---

## 6. Patrones repetidos sin abstraer

| Patrón | Repeticiones | Dónde | Candidato |
| --- | --- | --- | --- |
| Envoltorio de sección `mx-auto max-w-contenido px-[26px] py-seccion md:px-10` | 17 | Todas las secciones + header | `<Section>` |
| Card `rounded-[10px] border border-* p-6` | 4 | Pasos, Beneficios, Regalo (+ mockup con otro radio) | `<Card tone>` |
| Contenedor circular de ícono `rounded-full bg-* text-tierra` | 3 | Pasos (44), Beneficios (40), Incluye (24) | `<IconBox size tone>` |
| Botón claro sobre oscuro | 2 definiciones | `.btn-hueso` + inline en `CTAFinal` | `<Button>` |
| Enlace ghost `text-gris-copy hover:text-hueso` | 6 | Hero, CTAFinal, Header (4 nav), Footer (3) | `<Button variant="ghost">` |
| H2 de sección Archivo uppercase extrabold | 9 | Con 3 escalas divergentes | `<Heading level={2}>` |
| Punto final acentuado `<span className="text-tierra">.</span>` | 5 | Hero, Ritual, Contenido, CTAFinal, ProductoCTAFinal | Convención tipográfica del sistema |
| Ítem de lista con check | 3 | Recordatorio (19 px suelto), Incluye (13 px en círculo), Compra (20 px gris) | `<ChecklistItem>` |

---

## 7. Resumen por reutilización

| Nivel | Componentes |
| --- | --- |
| **Compartidos entre páginas** (3) | `Header`, `Footer`, `FAQ` |
| **Primitivas reutilizadas** (6) | `SectionLabel` (11×), `FAQItem` (12×), `RitualStep` (3×), `ProductSpec` (5×), `ProductoIcons` (11 de 15 en uso), `CrossIcon` (1×) |
| **Utilidad sin estilo** (1) | `FechaHoy` |
| **Secciones de uso único** (16) | 7 de la landing + 9 de producto |
| **Código muerto** (5) | `IconStar`, `IconRotate`, `IconMinus`, `IconPlus`, `public/img/logo-dark.svg` |
