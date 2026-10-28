"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import Aviso from "@/components/admin/Aviso";
import Capa from "@/components/admin/Capa";
import { BotonPrimario, BotonSecundario, Campo } from "@/components/admin/Campos";
import {
  reemplazarImagen,
  subirImagen,
  type ResultadoAccionGaleria,
} from "@/app/admin/galeria/acciones";
import { ADMIN } from "@/lib/admin-content";
import { fmtBytes, MAX_ALT, MIME_PERMITIDOS, type ImagenGaleriaAdmin } from "@/lib/galeria";
import { optimizarImagen, type ImagenOptimizada } from "@/lib/galeria-optimizar";

const g = ADMIN.galeria;
const a = g.archivo;

export type ModoImagen =
  | { tipo: "subir"; posicionNueva: number }
  | { tipo: "reemplazar"; imagen: ImagenGaleriaAdmin };

/**
 * Subir una imagen nueva o reemplazar una existente.
 *
 * El flujo es siempre el mismo: elegir (o soltar) el archivo → el navegador lo
 * optimiza y muestra cómo va a quedar en la galería (cuadro 1:1, completa, sin
 * recortes) → confirmar. Nada se sube hasta ese último clic.
 *
 * Al reemplazar se ve la actual al lado de la nueva y se aclara que la
 * posición no cambia.
 */
export default function ModalImagenGaleria({
  modo,
  onCerrar,
  onResultado,
}: {
  modo: ModoImagen;
  onCerrar: () => void;
  onResultado: (r: ResultadoAccionGaleria) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [optimizada, setOptimizada] = useState<ImagenOptimizada | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [optimizando, setOptimizando] = useState(false);
  const [sobreZona, setSobreZona] = useState(false);
  const [alt, setAlt] = useState(modo.tipo === "reemplazar" ? (modo.imagen.alt ?? "") : "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const reemplazo = modo.tipo === "reemplazar";
  const ocupado = optimizando || pendiente;

  // La URL de la vista previa vive en memoria del navegador: se libera al
  // cambiar de archivo o al cerrar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const elegir = async (archivo: File | undefined) => {
    if (!archivo || ocupado) return;
    setError(null);
    setOptimizando(true);
    try {
      const r = await optimizarImagen(archivo);
      if (!r.ok) {
        setError(g.errores[r.error]);
        return;
      }
      setOptimizada(r.imagen);
      setPreview(URL.createObjectURL(r.imagen.archivo));
    } catch {
      setError(g.errores.no_se_pudo_optimizar);
    } finally {
      setOptimizando(false);
      // Permite volver a elegir el mismo archivo después de un error.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const enviar = () => {
    if (!optimizada || ocupado) return;
    if (alt.trim().length > MAX_ALT) {
      setError(g.errores.alt_invalido);
      return;
    }
    setError(null);

    const datos = new FormData();
    datos.set("archivo", optimizada.archivo);
    datos.set("alt", alt);
    if (reemplazo) datos.set("id", modo.imagen.id);

    iniciar(async () => {
      try {
        const r = reemplazo ? await reemplazarImagen(datos) : await subirImagen(datos);
        if (!r.ok) setError(r.error);
        onResultado(r);
      } catch {
        setError(g.errores.error_interno);
      }
    });
  };

  const sucio = optimizada !== null;

  return (
    <Capa
      eyebrow={reemplazo ? a.eyebrowReemplazar(modo.imagen.posicion) : a.eyebrowSubir}
      titulo={reemplazo ? a.tituloReemplazar : a.tituloSubir}
      cerrarEtiqueta={ADMIN.formulario.cerrar}
      onCerrar={onCerrar}
      // Mientras sube no se cierra; con una imagen elegida y sin subir, pide
      // confirmación para no perderla por un clic en el overlay.
      puedeCerrar={() =>
        !pendiente && (!sucio || window.confirm(ADMIN.formulario.salirSinGuardar))
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[12.5px] leading-[1.55] text-gris-oscuro">
          {reemplazo ? a.conservaPosicion(modo.imagen.posicion) : a.alFinal(modo.posicionNueva)}
        </p>

        {/* --- Zona de archivo ------------------------------------------- */}
        <div
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setSobreZona(true);
          }}
          onDragLeave={() => setSobreZona(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setSobreZona(false);
            void elegir(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center gap-2 rounded-card border border-dashed px-4 py-5 text-center transition-[background-color,border-color] duration-control ease-grit ${
            sobreZona ? "border-tinta bg-bone-300" : "border-borde-claro bg-superficie-input"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={MIME_PERMITIDOS.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void elegir(e.target.files?.[0])}
          />
          <BotonSecundario onClick={() => inputRef.current?.click()} ocupado={optimizando} deshabilitado={pendiente}>
            {optimizando ? a.optimizando : optimizada ? a.cambiar : a.elegir}
          </BotonSecundario>
          <p className="m-0 hidden text-[11.5px] text-gris-oscuro lg:block">{a.soltar}</p>
          <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.08em] text-gris-oscuro">
            {a.formatos}
          </p>
        </div>

        {/* --- Vista previa ---------------------------------------------- */}
        {(optimizada || reemplazo) && (
          <div className={`grid gap-3 ${reemplazo ? "grid-cols-2" : "grid-cols-1"}`}>
            {reemplazo && (
              <Cuadro etiqueta={a.actual}>
                {modo.imagen.src && (
                  <Image src={modo.imagen.src} alt="" fill sizes="240px" className="object-contain" />
                )}
              </Cuadro>
            )}
            <Cuadro etiqueta={reemplazo ? a.nueva : a.vistaPrevia} centrado={!reemplazo}>
                {preview ? (
                  // Vista previa local (blob:): no pasa por el optimizador de Next.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <span className="flex h-full items-center justify-center px-3 text-center text-[11.5px] text-gris-oscuro">
                    {optimizando ? a.optimizando : a.elegir}
                  </span>
                )}
            </Cuadro>
          </div>
        )}

        {optimizada && (
          <div className="rounded-strip border-hairline border-borde-claro bg-superficie-input px-[12px] py-[10px]">
            <p className="m-0 text-[11.5px] leading-[1.5] text-gris-oscuro">{a.vistaPreviaNota}</p>
            <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.06em]">
              <dt className="text-gris-oscuro">{a.original}</dt>
              <dd className="m-0 text-tinta">
                {optimizada.original.ancho} × {optimizada.original.alto} · {fmtBytes(optimizada.original.bytes)}
              </dd>
              <dt className="text-gris-oscuro">{a.optimizada}</dt>
              <dd className="m-0 text-tinta">
                {optimizada.ancho} × {optimizada.alto} · {fmtBytes(optimizada.archivo.size)} ·{" "}
                {optimizada.archivo.type === "image/webp" ? "WebP" : "JPG"}
              </dd>
            </dl>
          </div>
        )}

        <Campo
          etiqueta={a.alt}
          ayuda={a.altAyuda}
          valor={alt}
          placeholder={a.altPlaceholder}
          deshabilitado={pendiente}
          onCambio={setAlt}
        />

        <div className="flex flex-wrap gap-2">
          <BotonPrimario onClick={enviar} ocupado={pendiente} deshabilitado={!optimizada || optimizando}>
            {reemplazo
              ? pendiente
                ? a.reemplazando
                : a.reemplazar
              : pendiente
                ? a.subiendo
                : a.subir}
          </BotonPrimario>
          <BotonSecundario onClick={onCerrar} deshabilitado={pendiente}>
            {ADMIN.formulario.cancelar}
          </BotonSecundario>
        </div>

        {error && <Aviso ok={false}>{error}</Aviso>}
      </div>
    </Capa>
  );
}

/** Cuadro 1:1 con `object-contain`, como la foto principal de /producto. */
function Cuadro({
  etiqueta,
  centrado = false,
  children,
}: {
  etiqueta: string;
  centrado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className={`m-0 ${centrado ? "mx-auto w-full max-w-[280px]" : ""}`}>
      <figcaption className="mb-[6px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-gris-oscuro">
        {etiqueta}
      </figcaption>
      <div className="relative aspect-square w-full overflow-hidden rounded-image border-hairline border-borde-claro bg-superficie-clara">
        {children}
      </div>
    </figure>
  );
}
