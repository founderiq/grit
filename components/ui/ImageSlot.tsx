"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * <ImageSlot /> — placeholder de imagen que el usuario puede rellenar
 * arrastrando un archivo (drag & drop nativo) o haciendo clic para buscar.
 *
 * La imagen se guarda en localStorage (dataURL) bajo la clave `id`, así que
 * persiste entre recargas. Pensado para UGC / mockups sin backend.
 * Sin librerías externas: usa la API nativa File + canvas para redimensionar.
 */

const STORAGE_PREFIX = "grit:image-slot:";
const MAX_DIM = 1200; // px — evita llenar localStorage con imágenes gigantes
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/avif"];

type ImageSlotProps = {
  id: string;
  placeholder?: string;
  shape?: "rounded" | "circle";
  /** Radio del borde en px cuando shape="rounded". */
  radius?: number;
  className?: string;
};

/** Redimensiona un archivo de imagen a un dataURL (máx MAX_DIM px). */
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el contexto de canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}

export default function ImageSlot({
  id,
  placeholder = "Arrastrá una imagen",
  shape = "rounded",
  radius = 12,
  className = "",
}: ImageSlotProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [dragActivo, setDragActivo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();

  const storageKey = `${STORAGE_PREFIX}${id}`;

  // Restaura la imagen guardada al montar
  useEffect(() => {
    try {
      const guardada = window.localStorage.getItem(storageKey);
      if (guardada) setSrc(guardada);
    } catch {
      // localStorage puede no estar disponible (modo privado); se ignora
    }
  }, [storageKey]);

  const guardarArchivo = useCallback(
    async (file: File) => {
      if (!ACCEPT.includes(file.type)) return;
      setCargando(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        setSrc(dataUrl);
        try {
          window.localStorage.setItem(storageKey, dataUrl);
        } catch {
          // Cuota excedida: mostramos la imagen igual, sin persistir
        }
      } finally {
        setCargando(false);
      }
    },
    [storageKey],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActivo(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void guardarArchivo(file);
    },
    [guardarArchivo],
  );

  const limpiar = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSrc(null);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* noop */
      }
    },
    [storageKey],
  );

  const borderRadius = shape === "circle" ? "50%" : `${radius}px`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={placeholder}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActivo(true);
      }}
      onDragLeave={() => setDragActivo(false)}
      onDrop={onDrop}
      className={`group relative flex cursor-pointer items-center justify-center overflow-hidden bg-[#211D19]/60 outline-none ring-tierra transition-all focus-visible:ring-2 ${
        dragActivo ? "ring-2" : ""
      } ${className}`}
      style={{ borderRadius }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- dataURL de usuario, no optimizable por next/image
        <img
          src={src}
          alt={placeholder}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-2 text-center font-mono text-[10px] uppercase leading-[1.4] tracking-[0.12em] text-gris-medio">
          {placeholder || "◳"}
        </span>
      )}

      {cargando && (
        <span className="absolute inset-0 flex items-center justify-center bg-tinta/60 font-mono text-[10px] uppercase tracking-[0.12em] text-hueso">
          Cargando…
        </span>
      )}

      {src && (
        <button
          type="button"
          onClick={limpiar}
          aria-label="Quitar imagen"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-tinta/80 text-hueso opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          ×
        </button>
      )}

      <input
        ref={inputRef}
        id={`file-${reactId}`}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void guardarArchivo(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
