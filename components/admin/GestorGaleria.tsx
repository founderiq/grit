"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Aviso from "@/components/admin/Aviso";
import { BotonPrimario, BotonSecundario } from "@/components/admin/Campos";
import ModalEliminarImagen from "@/components/admin/ModalEliminarImagen";
import ModalImagenGaleria from "@/components/admin/ModalImagenGaleria";
import { EstadoVacio, PILDORA } from "@/components/admin/Piezas";
import { refrescarPanel } from "@/components/admin/refrescar";
import { IconChevronDown, IconPlus } from "@/components/ui/ProductoIcons";
import { guardarOrdenGaleria, type ResultadoAccionGaleria } from "@/app/admin/galeria/acciones";
import { ADMIN } from "@/lib/admin-content";
import { fmtBytes, mismoOrden, mover, type ImagenGaleriaAdmin } from "@/lib/galeria";

type Dialogo =
  | { tipo: "subir" }
  | { tipo: "reemplazar"; imagen: ImagenGaleriaAdmin }
  | { tipo: "eliminar"; imagen: ImagenGaleriaAdmin }
  | null;

const g = ADMIN.galeria;

/**
 * Gestor de la galería de /producto.
 *
 * EL ORDEN SE EDITA EN LOCAL Y SE GUARDA CON UN BOTÓN
 *   Arrastrar (escritorio) o tocar ↑/↓ (cualquier pantalla) solo cambia el
 *   orden en pantalla; la barra "Guardar orden" lo publica de una vez. Así se
 *   pueden hacer varios movimientos sin publicar estados intermedios, y
 *   "Descartar" vuelve atrás sin tocar nada.
 *
 *   Mientras hay un orden sin guardar, subir, reemplazar y eliminar quedan
 *   deshabilitados: cada una de esas acciones cambia la lista en el servidor y
 *   mezclarlas con un orden a medio editar solo genera confusión.
 *
 * El drag & drop es el nativo de HTML (sin librerías). En pantallas táctiles,
 * donde arrastrar no es confiable, las flechas hacen el mismo trabajo y son
 * también el camino de teclado.
 */
export default function GestorGaleria({ imagenes: delServidor }: { imagenes: ImagenGaleriaAdmin[] }) {
  const router = useRouter();
  const [imagenes, setImagenes] = useState(delServidor);
  const [orden, setOrden] = useState(() => delServidor.map((i) => i.id));
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();
  const listaRef = useRef<HTMLOListElement>(null);

  const idsServidor = imagenes.map((i) => i.id);
  const sucio = !mismoOrden(orden, idsServidor);
  const sucioRef = useRef(sucio);
  sucioRef.current = sucio;

  const aplicar = useCallback((lista: ImagenGaleriaAdmin[]) => {
    setImagenes(lista);
    setOrden(lista.map((i) => i.id));
  }, []);

  // Un refresco del servidor (botón Actualizar, revalidación) trae la lista
  // real. Si hay un orden sin guardar, no se pisa: lo que se ve es lo que el
  // administrador está armando, y al guardar la base valida que coincida.
  useEffect(() => {
    if (!sucioRef.current) aplicar(delServidor);
  }, [delServidor, aplicar]);

  const porId = new Map(imagenes.map((i) => [i.id, i]));
  const lista = orden.map((id) => porId.get(id)).filter((i): i is ImagenGaleriaAdmin => !!i);

  /** Resultado de cualquier acción: lista nueva, aviso y refresco si hizo falta. */
  const recibir = (r: ResultadoAccionGaleria) => {
    if (r.imagenes) aplicar(r.imagenes);
    else if (r.ok) refrescarPanel(router);
    setAviso({ ok: r.ok, texto: r.ok ? r.mensaje : r.error });
  };

  /** Cada diálogo arranca sin el aviso de la acción anterior. */
  const abrir = (d: Exclude<Dialogo, null>) => {
    setAviso(null);
    setDialogo(d);
  };

  /* --- Orden ------------------------------------------------------------- */

  const moverA = (desde: number, hasta: number, enfocar?: { id: string; dir: "arriba" | "abajo" }) => {
    setOrden((prev) => mover(prev, desde, hasta));
    setAviso(null);
    setAnuncio(`Foto movida a la posición ${hasta + 1}.`);

    // Mover un nodo en el DOM le quita el foco: se lo devolvemos a la flecha
    // que se tocó, o a la otra si esa quedó deshabilitada en el borde.
    if (enfocar) {
      requestAnimationFrame(() => {
        const raiz = listaRef.current;
        const boton =
          raiz?.querySelector<HTMLButtonElement>(`[data-mover="${enfocar.id}-${enfocar.dir}"]:not(:disabled)`) ??
          raiz?.querySelector<HTMLButtonElement>(`[data-mover^="${enfocar.id}-"]:not(:disabled)`);
        boton?.focus();
      });
    }
  };

  const guardarOrden = () => {
    if (guardando) return;
    setAviso(null);
    iniciar(async () => {
      recibir(await guardarOrdenGaleria({ ids: orden }));
    });
  };

  const descartar = () => {
    setOrden(idsServidor);
    setAviso(null);
  };

  /* --- Drag & drop ------------------------------------------------------- */

  const arrastre = (id: string) => ({
    draggable: !guardando,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      setArrastrando(id);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!arrastrando) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    // El orden cambia en vivo al pasar sobre otra fila: lo que se ve mientras
    // se arrastra es exactamente lo que queda al soltar.
    onDragEnter: () => {
      if (!arrastrando || arrastrando === id) return;
      setOrden((prev) => mover(prev, prev.indexOf(arrastrando), prev.indexOf(id)));
    },
    onDrop: (e: React.DragEvent) => {
      if (!arrastrando) return;
      e.preventDefault();
      const posicion = orden.indexOf(arrastrando) + 1;
      if (posicion > 0) setAnuncio(`Foto movida a la posición ${posicion}.`);
      setArrastrando(null);
    },
    onDragEnd: () => setArrastrando(null),
  });

  /* --- Render ------------------------------------------------------------ */

  const bloqueado = sucio || guardando;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-5 lg:px-6 lg:pt-6">
        <div className="min-w-0">
          <p className="m-0 font-mono text-[9.5px] uppercase tracking-[0.12em] text-gris-oscuro">
            {imagenes.length === 1 ? "1 imagen" : `${imagenes.length} imágenes`}
          </p>
          <h2 className="m-0 mt-[6px] font-archivo text-[17px] font-bold leading-[1.2] tracking-[-0.01em] text-tinta lg:text-[18px]">
            {g.titulo}
          </h2>
          <p className="m-0 mt-1 max-w-[560px] text-[12.5px] leading-[1.5] text-gris-oscuro">
            {g.detalle}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/producto"
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center rounded-pill border-hairline border-borde-claro bg-superficie-input px-[17px] py-[9px] font-inter text-[12.5px] font-semibold text-tinta transition-[background-color] duration-control ease-grit hover:bg-bone-300"
          >
            {g.verProducto}
            <span aria-hidden="true" className="ml-[6px]">
              ↗
            </span>
          </a>
          <button
            type="button"
            onClick={() => abrir({ tipo: "subir" })}
            disabled={bloqueado}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill bg-tinta px-[17px] py-[9px] font-inter text-[12.5px] font-semibold text-hueso transition-[background-color] duration-control ease-grit hover:bg-tinta-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlus width={13} />
            {g.subir}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-4 lg:px-6">
        <p className="m-0 text-[11.5px] leading-[1.45] text-gris-oscuro">
          <span className="lg:hidden">{g.orden.ayudaMovil}</span>
          <span className="hidden lg:inline">{g.orden.ayudaEscritorio}</span>
        </p>

        {sucio && (
          <div
            role="region"
            aria-label={g.orden.guardar}
            className="flex flex-wrap items-center justify-between gap-3 rounded-strip border-hairline border-estado-amarillo-borde bg-estado-amarillo-fondo px-[14px] py-[10px]"
          >
            <div>
              <p className="m-0 text-[12.5px] font-semibold leading-[1.45] text-estado-amarillo-texto">
                {g.orden.sinGuardar}
              </p>
              <p className="m-0 mt-[2px] text-[11.5px] leading-[1.45] text-estado-amarillo-texto">
                {g.orden.bloqueado}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotonPrimario onClick={guardarOrden} ocupado={guardando}>
                {guardando ? g.orden.guardando : g.orden.guardar}
              </BotonPrimario>
              <BotonSecundario onClick={descartar} deshabilitado={guardando}>
                {g.orden.descartar}
              </BotonSecundario>
            </div>
          </div>
        )}

        {aviso && <Aviso ok={aviso.ok}>{aviso.texto}</Aviso>}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </p>

      {lista.length === 0 ? (
        <div className="border-t border-borde-claro">
          <EstadoVacio titulo={g.vacio} detalle={g.vacioDetalle} />
        </div>
      ) : (
        <ol ref={listaRef} className="m-0 list-none p-0">
          {lista.map((img, i) => (
            <FilaImagen
              key={img.id}
              imagen={img}
              indice={i}
              total={lista.length}
              arrastrando={arrastrando === img.id}
              bloqueado={bloqueado}
              guardando={guardando}
              arrastre={arrastre(img.id)}
              onMover={(hasta, dir) => moverA(i, hasta, { id: img.id, dir })}
              onReemplazar={() => abrir({ tipo: "reemplazar", imagen: img })}
              onEliminar={() => abrir({ tipo: "eliminar", imagen: img })}
            />
          ))}
        </ol>
      )}

      {(dialogo?.tipo === "subir" || dialogo?.tipo === "reemplazar") && (
        <ModalImagenGaleria
          modo={
            dialogo.tipo === "subir"
              ? { tipo: "subir", posicionNueva: imagenes.length + 1 }
              : { tipo: "reemplazar", imagen: dialogo.imagen }
          }
          onCerrar={() => setDialogo(null)}
          onResultado={(r) => {
            recibir(r);
            if (r.ok) setDialogo(null);
          }}
        />
      )}

      {dialogo?.tipo === "eliminar" && (
        <ModalEliminarImagen
          imagen={dialogo.imagen}
          onCerrar={() => setDialogo(null)}
          onResultado={(r) => {
            recibir(r);
            if (r.ok) setDialogo(null);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------
   Fila
   ------------------------------------------------------------ */

const BOTON_FILA =
  "inline-flex min-h-11 items-center justify-center rounded-pill border-hairline border-borde-claro bg-superficie-input font-inter text-[12.5px] font-semibold transition-[background-color,color] duration-control ease-grit hover:bg-bone-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-superficie-input";

function FilaImagen({
  imagen,
  indice,
  total,
  arrastrando,
  bloqueado,
  guardando,
  arrastre,
  onMover,
  onReemplazar,
  onEliminar,
}: {
  imagen: ImagenGaleriaAdmin;
  indice: number;
  total: number;
  arrastrando: boolean;
  bloqueado: boolean;
  guardando: boolean;
  arrastre: React.LiHTMLAttributes<HTMLLIElement> & { draggable: boolean };
  onMover: (hasta: number, dir: "arriba" | "abajo") => void;
  onReemplazar: () => void;
  onEliminar: () => void;
}) {
  const posicion = indice + 1;
  const principal = indice === 0;
  const unica = total === 1;

  const meta = [
    imagen.ancho && imagen.alto ? `${imagen.ancho} × ${imagen.alto}` : null,
    imagen.bytes ? fmtBytes(imagen.bytes) : null,
    imagen.origen === "estatica" ? g.origenEstatica : g.origenStorage,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      {...arrastre}
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-borde-claro px-5 py-3 transition-[opacity,background-color] duration-control ease-grit lg:flex-nowrap lg:px-6 ${
        arrastrando ? "bg-superficie-clara opacity-60" : ""
      } ${arrastre.draggable ? "lg:cursor-grab" : ""}`}
    >
      {/* Asa de arrastre: solo en escritorio, donde el drag & drop funciona. */}
      <span
        aria-hidden="true"
        title={g.arrastrar(posicion)}
        className="hidden h-11 w-5 shrink-0 items-center justify-center text-gris-oscuro lg:flex"
      >
        <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
          <circle cx="2" cy="2" r="1.4" />
          <circle cx="8" cy="2" r="1.4" />
          <circle cx="2" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="2" cy="14" r="1.4" />
          <circle cx="8" cy="14" r="1.4" />
        </svg>
      </span>

      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-image border-hairline border-borde-claro bg-superficie-clara lg:h-[84px] lg:w-[84px]">
        {imagen.src ? (
          <Image
            src={imagen.src}
            alt=""
            fill
            sizes="84px"
            draggable={false}
            className="pointer-events-none object-contain"
          />
        ) : (
          <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-[1.3] text-estado-rojo-texto">
            {g.rotaTitulo}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-archivo text-[17px] font-bold leading-none tracking-[-0.01em] text-tinta">
            {g.posicion(posicion)}
          </span>
          {principal && (
            <span className={`${PILDORA} border-tinta bg-tinta text-hueso`}>{g.principal}</span>
          )}
          {!imagen.activa && (
            <span className={`${PILDORA} border-borde-claro bg-hueso text-gris-oscuro`}>
              {g.oculta}
            </span>
          )}
        </div>
        <p
          className={`m-0 mt-[6px] truncate text-[12.5px] leading-[1.4] ${
            imagen.alt ? "text-tinta" : "italic text-gris-oscuro"
          }`}
          title={imagen.alt ?? undefined}
        >
          {imagen.alt ?? g.sinDescripcion}
        </p>
        <p className="m-0 mt-[3px] truncate font-mono text-[9.5px] uppercase tracking-[0.08em] text-gris-oscuro">
          {meta}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
        <button
          type="button"
          data-mover={`${imagen.id}-arriba`}
          onClick={() => onMover(indice - 1, "arriba")}
          disabled={indice === 0 || guardando}
          aria-label={g.subirUno(posicion)}
          className={`${BOTON_FILA} w-11 text-tinta`}
        >
          <IconChevronDown width={16} className="rotate-180" />
        </button>
        <button
          type="button"
          data-mover={`${imagen.id}-abajo`}
          onClick={() => onMover(indice + 1, "abajo")}
          disabled={indice === total - 1 || guardando}
          aria-label={g.bajarUno(posicion)}
          className={`${BOTON_FILA} w-11 text-tinta`}
        >
          <IconChevronDown width={16} />
        </button>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-borde-claro lg:block" />

        <button
          type="button"
          onClick={onReemplazar}
          disabled={bloqueado}
          className={`${BOTON_FILA} px-[14px] text-tinta`}
        >
          {g.reemplazar}
        </button>
        <button
          type="button"
          onClick={onEliminar}
          disabled={bloqueado || unica}
          title={unica ? g.ultimaNoSeElimina : undefined}
          className={`${BOTON_FILA} px-[14px] text-estado-rojo-texto`}
        >
          {g.eliminar}
        </button>
      </div>
    </li>
  );
}
