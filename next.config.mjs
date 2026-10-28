/**
 * Host de Supabase Storage para `next/image`.
 *
 * Solo se habilita el bucket público de la galería de /producto, y solo en el
 * proyecto configurado: el optimizador de imágenes no acepta URLs de ningún
 * otro origen ni de otro bucket. Es la misma variable con la que el servidor
 * arma las URLs (`lib/galeria-datos.ts`), así que no pueden quedar desfasadas.
 */
function patronesGaleria() {
  const base = process.env.SUPABASE_URL;
  if (!base) return [];
  try {
    const url = new URL(base);
    return [
      {
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/product-gallery/**",
      },
    ];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Formatos modernos para mejor performance (Lighthouse)
    formats: ["image/avif", "image/webp"],
    remotePatterns: patronesGaleria(),
  },
  experimental: {
    serverActions: {
      // La galería sube imágenes ya optimizadas en el navegador (unos cientos
      // de KB; el servidor rechaza más de 3 MB). El valor por defecto, 1 MB,
      // dejaría afuera una foto grande legítima.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
