# Grit · Landing Page

> **Fe que acompaña. Fuerza en cada toque.**

Landing page oficial de **Grit** — una marca de identidad que vende pulseras que
funcionan como recordatorio diario de fe, disciplina y propósito. No es un
accesorio de moda: es una herramienta de intención.

Construida con **Next.js 15 (App Router)**, **TypeScript strict** y
**TailwindCSS**, siguiendo el sistema visual Grit v2. Mobile-first, responsive y
optimizada para SEO y performance.

---

## Stack

| Área          | Tecnología                                    |
| ------------- | --------------------------------------------- |
| Framework     | Next.js 15 (App Router, React 19)             |
| Lenguaje      | TypeScript (modo `strict`)                    |
| Estilos       | TailwindCSS 3 + config custom (paleta Grit)   |
| Imágenes      | `next/image` (AVIF/WebP, lazy load)           |
| Tipografía    | `next/font` — Archivo, Inter, IBM Plex Mono   |
| SEO           | Metadata dinámica, Open Graph, JSON-LD        |

---

## Estructura del proyecto

```
grit/
├── app/
│   ├── layout.tsx          # Fuentes, metadata, Open Graph, JSON-LD
│   ├── page.tsx            # Composición de secciones
│   ├── globals.css         # Base Tailwind + utilidades del sistema
│   ├── icon.svg            # Favicon
│   ├── robots.ts           # robots.txt
│   └── sitemap.ts          # sitemap.xml
├── components/
│   ├── Header.tsx          # Nav sticky con blur en scroll
│   ├── Hero.tsx            # Titular + CTA + foto producto
│   ├── Manifiesto.tsx
│   ├── Ritual.tsx          # Tap → Reflexionar → Progreso
│   ├── Producto.tsx        # Fotos + specs
│   ├── FePrimero.tsx
│   ├── ProximasCategorias.tsx
│   ├── Comunidad.tsx       # UGC + testimonial
│   ├── CTAFinal.tsx
│   ├── FAQ.tsx             # 12 preguntas en acordeón
│   ├── Footer.tsx
│   └── ui/                 # Componentes reutilizables
│       ├── SectionLabel.tsx
│       ├── RitualStep.tsx
│       ├── ProductSpec.tsx
│       ├── CategoryCard.tsx
│       ├── TestimonialCard.tsx
│       ├── FAQItem.tsx
│       ├── ImageSlot.tsx   # Drag & drop + localStorage (sin librerías)
│       └── CrossIcon.tsx
├── lib/
│   ├── content.ts          # Todo el copy (FAQ, categorías, specs, links)
│   └── structured-data.ts  # JSON-LD: Organization, Product, FAQPage
└── public/
    ├── img/                # Logos + foto de producto
    └── brand/              # Recursos de marca (contexto, brand kit)
```

---

## Sistema de diseño

**Colores** (`tailwind.config.ts`):

| Token             | Hex       | Uso                          |
| ----------------- | --------- | ---------------------------- |
| `tinta`           | `#14110F` | Fondo oscuro principal       |
| `tinta-2`         | `#211D19` | Fondo oscuro secundario      |
| `hueso`           | `#F2EEE6` | Fondo claro / copy           |
| `tierra`          | `#C2693F` | Acento primario (CTA)        |
| `tierra-oscura`   | `#7A3B2B` | Acento secundario            |
| grises            | varios    | Soporte / copy secundario    |

**Tipografía:** Archivo (titulares), Inter (body), IBM Plex Mono (etiquetas).

Los fondos alternan **Tinta ↔ Hueso** y el acento tierra ocupa ~10-15% de la
superficie (CTAs, puntos de sección, números de ritual).

---

## Componente `ImageSlot`

Placeholders de imagen rellenables por el usuario, **sin librerías externas**:

- Arrastrá una imagen (drag & drop nativo) o hacé clic para buscar.
- Se redimensiona a máx. 1200px y se guarda en `localStorage` (persiste entre
  recargas).
- Usado en las fotos de producto, la grilla de UGC y el avatar del testimonial.

---

## Correr localmente

Requisitos: **Node.js 18.18+** (recomendado 20/22) y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo (http://localhost:3000)
npm run dev

# 3. Build de producción
npm run build

# 4. Servir el build
npm run start

# 5. Lint
npm run lint
```

---

## Deploy en Vercel

El repositorio está conectado a Vercel con **deploy automático desde `main`**.
Cada push a `main` dispara un nuevo deploy de producción.

Deploy manual (opcional):

```bash
npm i -g vercel
vercel --prod
```

Variables de entorno: ver `.env.example`. Todas son opcionales para que la
landing compile y funcione; el checkout y el panel necesitan las de Supabase, y
el Meta Pixel funciona con el ID por defecto si no se configura
`NEXT_PUBLIC_META_PIXEL_ID`.

> **Antes de publicar:** actualizá los datos reales en `lib/content.ts`
> (`LINKS.whatsapp`, `LINKS.instagram`, `LINKS.contacto`) y la URL canónica en
> `lib/structured-data.ts` (`SITE_URL`).

---

## Performance & SEO

- Imágenes optimizadas con `next/image` (AVIF/WebP, `srcset`, lazy load).
- Fuentes self-hosted vía `next/font` (sin FOUT, mejor LCP).
- Página estática (SSG) — First Load JS ~113 kB.
- Metadata dinámica + Open Graph + Twitter Card.
- Datos estructurados JSON-LD: `Organization`, `Product`, `FAQPage`.
- `robots.txt` y `sitemap.xml` generados automáticamente.

---

## Seguridad de dependencias

Este repo tiene **Dependabot** activado (`.github/dependabot.yml`), que revisa
`npm` semanalmente y abre un PR automático apenas se publica un parche para
una vulnerabilidad conocida en `next`, `react` o cualquier otra dependencia.

Antes de cada deploy importante, correr:

```bash
npm run audit
```

Si aparece algo en `high` o `critical`, actualizar la dependencia señalada
(`npm install <paquete>@latest`) y volver a correr `npm run build` antes de
pushear a `main`.

---

## Notas de marca

El tono es **auténtico, exigente sin juzgar, optimista pero realista**. Nunca
urgencia falsa, culpa ni promesas mágicas. Cualquier cambio de copy debe respetar
la [Constitución de Grit](public/brand/Grit_Contexto.txt).

© 2026 Grit · Paraguay · Vivir con intención.
