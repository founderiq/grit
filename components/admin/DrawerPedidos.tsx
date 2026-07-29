"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { refrescarPanel } from "@/components/admin/refrescar";
import Capa from "@/components/admin/Capa";
import DetallePedido from "@/components/admin/DetallePedido";
import { EstadoVacio, PanelError, EsqueletoTabla } from "@/components/admin/Piezas";
import { ADMIN } from "@/lib/admin-content";
import type { PedidoDetalle } from "@/lib/admin-tipos";

/* ------------------------------------------------------------
   Contexto
   ------------------------------------------------------------ */

type Detalle = {
  /** Pedido con el drawer abierto, o `null`. Sirve para resaltar su fila. */
  abiertoId: string | null;
  /** Abre el drawer AHORA. El número es solo para titularlo sin esperar. */
  abrir: (id: string, numero?: string) => void;
  /** Trae el detalle a la cache sin abrir nada. Para hover y foco. */
  precargar: (id: string) => void;
  cerrar: () => void;
};

const Contexto = createContext<Detalle | null>(null);

/**
 * Acceso al drawer desde cualquier fila de la tabla.
 *
 * Devuelve un objeto inerte si no hay proveedor, en lugar de romper: así una
 * fila puede renderizarse en un contexto donde el drawer no exista.
 */
export function useDetalle(): Detalle {
  return (
    useContext(Contexto) ?? {
      abiertoId: null,
      abrir: () => {},
      precargar: () => {},
      cerrar: () => {},
    }
  );
}

/* ------------------------------------------------------------
   Carga del detalle
   ------------------------------------------------------------ */

type Carga =
  | { fase: "cargando" }
  | { fase: "listo"; pedido: PedidoDetalle }
  | { fase: "no_encontrado" }
  | { fase: "error" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Drawer del detalle de pedido — abre y cierra al instante.
 *
 * POR QUÉ ESTÁ ASÍ
 *   Antes el drawer se abría poniendo `?pedido=<uuid>` con `router.replace()`.
 *   Eso hacía que Next volviera al servidor y re-renderizara el dashboard
 *   ENTERO —métricas, listado y detalle— antes de que la capa apareciera: dos o
 *   tres segundos para abrir, y otros tantos para cerrar. El dashboard no había
 *   cambiado en absoluto; se recalculaba igual.
 *
 *   Ahora el pedido abierto es estado de este componente. Abrir es un
 *   `setState` (el mismo frame), y el contenido llega por
 *   `GET /api/admin/pedidos/[id]`, que autoriza de nuevo del lado del servidor.
 *
 * LA URL SIGUE MANDANDO
 *   `?pedido=<uuid>` se mantiene con `history.pushState`, que actualiza la
 *   barra de direcciones sin pedirle nada al servidor. El enlace se puede
 *   compartir y recargar: al cargar la página con ese parámetro, el drawer
 *   arranca abierto (`pedidoInicial`).
 *
 *   Abrir desde cero empuja una entrada al historial, así que Atrás cierra el
 *   drawer. Saltar de un pedido a otro la reemplaza, para no llenar el
 *   historial de pasos intermedios. Cerrar vuelve atrás si fuimos nosotros los
 *   que empujamos, y si no, limpia el parámetro con `replaceState`.
 *
 * CACHE Y PRECARGA
 *   Cada detalle cargado queda en memoria mientras dure la página: reabrir el
 *   mismo pedido es inmediato y sin red. El hover y el foco sobre una fila
 *   disparan la carga por adelantado, así que para cuando llega el clic el
 *   detalle suele estar listo. Los errores NO se cachean: el próximo intento
 *   vuelve a pedir.
 */
export default function DrawerPedidos({
  pedidoInicial,
  children,
}: {
  /** Pedido de la URL al cargar la página. Ya validado como UUID en el servidor. */
  pedidoInicial: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [abierto, setAbierto] = useState<{ id: string; numero: string | null } | null>(
    pedidoInicial ? { id: pedidoInicial, numero: null } : null,
  );
  const [carga, setCarga] = useState<Carga>({ fase: "cargando" });

  const abiertoRef = useRef<string | null>(pedidoInicial);
  const empujadoRef = useRef(false);
  const cache = useRef(new Map<string, Carga>());
  const enVuelo = useRef(new Map<string, Promise<Carga>>());
  /** Números de pedido ya conocidos, para titular el drawer sin esperar. */
  const numeros = useRef(new Map<string, string>());

  /* --- Red ------------------------------------------------------------- */

  const pedir = useCallback((id: string, forzar = false): Promise<Carga> => {
    if (!forzar) {
      const guardado = cache.current.get(id);
      if (guardado) return Promise.resolve(guardado);
      const enCurso = enVuelo.current.get(id);
      if (enCurso) return enCurso;
    }

    const promesa = (async (): Promise<Carga> => {
      try {
        const r = await fetch(`/api/admin/pedidos/${encodeURIComponent(id)}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });

        if (r.status === 404) return { fase: "no_encontrado" };
        if (!r.ok) return { fase: "error" };

        const cuerpo = (await r.json()) as { pedido?: PedidoDetalle };
        if (!cuerpo?.pedido) return { fase: "error" };
        return { fase: "listo", pedido: cuerpo.pedido };
      } catch {
        // Sin red, o el request se cortó. No se cachea: se reintenta solo.
        return { fase: "error" };
      }
    })().then((resultado) => {
      enVuelo.current.delete(id);
      if (resultado.fase !== "error") cache.current.set(id, resultado);
      if (resultado.fase === "listo") {
        numeros.current.set(id, resultado.pedido.orderNumber);
      }
      return resultado;
    });

    enVuelo.current.set(id, promesa);
    return promesa;
  }, []);

  /** Pone el detalle en pantalla: desde la cache si está, o pidiéndolo. */
  const mostrar = useCallback(
    (id: string) => {
      const guardado = cache.current.get(id);
      if (guardado) {
        setCarga(guardado);
        return;
      }
      setCarga({ fase: "cargando" });
      void pedir(id).then((r) => {
        // Puede haber cambiado el pedido abierto mientras viajaba la respuesta.
        if (abiertoRef.current === id) setCarga(r);
      });
    },
    [pedir],
  );

  /* --- URL -------------------------------------------------------------- */

  const sincronizarUrl = useCallback((id: string | null, modo: "push" | "replace") => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("pedido", id);
    else url.searchParams.delete("pedido");

    const destino = `${url.pathname}${url.search}${url.hash}`;
    if (modo === "push") window.history.pushState(null, "", destino);
    else window.history.replaceState(null, "", destino);
  }, []);

  /* --- Acciones --------------------------------------------------------- */

  const abrir = useCallback(
    (id: string, numero?: string) => {
      if (!UUID.test(id) || abiertoRef.current === id) return;
      if (numero) numeros.current.set(id, numero);

      const yaHabiaUno = abiertoRef.current !== null;
      abiertoRef.current = id;
      setAbierto({ id, numero: numeros.current.get(id) ?? null });
      mostrar(id);

      sincronizarUrl(id, yaHabiaUno ? "replace" : "push");
      if (!yaHabiaUno) empujadoRef.current = true;
    },
    [mostrar, sincronizarUrl],
  );

  const precargar = useCallback(
    (id: string) => {
      if (!UUID.test(id)) return;
      if (cache.current.has(id) || enVuelo.current.has(id)) return;
      void pedir(id);
    },
    [pedir],
  );

  const cerrar = useCallback(() => {
    if (abiertoRef.current === null) return;
    abiertoRef.current = null;
    setAbierto(null);

    if (empujadoRef.current) {
      // La entrada del historial es nuestra: volver atrás deja la URL como
      // estaba y no agrega un paso más.
      empujadoRef.current = false;
      window.history.back();
    } else {
      sincronizarUrl(null, "replace");
    }
  }, [sincronizarUrl]);

  /** Después de guardar: el detalle se vuelve a pedir y el listado se refresca. */
  const refrescar = useCallback(() => {
    const id = abiertoRef.current;
    if (!id) return;

    cache.current.delete(id);
    // Sin pasar por "cargando": el contenido viejo queda a la vista hasta que
    // llega el nuevo, en lugar de parpadear a un esqueleto.
    void pedir(id, true).then((r) => {
      if (abiertoRef.current === id) setCarga(r);
    });

    // Métricas y tabla viven en el servidor: se refrescan por su cuenta.
    refrescarPanel(router);
  }, [pedir, router]);

  /* --- Historial -------------------------------------------------------- */

  useEffect(() => {
    const onPop = () => {
      const crudo = new URLSearchParams(window.location.search).get("pedido");
      const id = crudo && UUID.test(crudo) ? crudo : null;

      // Después de un popstate la entrada actual ya no es la que empujamos.
      empujadoRef.current = false;
      if (id === abiertoRef.current) return;

      abiertoRef.current = id;
      setAbierto(id ? { id, numero: numeros.current.get(id) ?? null } : null);
      if (id) mostrar(id);
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mostrar]);

  /* --- Arranque con ?pedido en la URL ----------------------------------- */

  useEffect(() => {
    if (pedidoInicial) mostrar(pedidoInicial);
    // Solo al montar: después manda el estado del componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Render ----------------------------------------------------------- */

  const titulo =
    carga.fase === "listo" && abierto?.id === carga.pedido.id
      ? carga.pedido.orderNumber
      : (abierto?.numero ?? "…");

  return (
    <Contexto.Provider value={{ abiertoId: abierto?.id ?? null, abrir, precargar, cerrar }}>
      {children}

      {abierto && (
        <Capa
          variante="drawer"
          eyebrow={ADMIN.detalle.eyebrow}
          titulo={titulo}
          etiqueta={`${ADMIN.detalle.eyebrow} ${titulo}`}
          cerrarEtiqueta={ADMIN.detalle.cerrar}
          onCerrar={cerrar}
        >
          {carga.fase === "cargando" && <EsqueletoTabla filas={4} />}
          {carga.fase === "error" && <PanelError />}
          {carga.fase === "no_encontrado" && (
            <EstadoVacio
              titulo={ADMIN.detalle.noEncontrado}
              detalle={ADMIN.detalle.noEncontradoDetalle}
            />
          )}
          {carga.fase === "listo" && (
            <DetallePedido pedido={carga.pedido} onCambio={refrescar} />
          )}
        </Capa>
      )}
    </Contexto.Provider>
  );
}
