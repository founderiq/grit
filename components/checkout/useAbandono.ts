"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Paso } from "@/lib/checkout-abandonado";

/**
 * Captura del checkout abandonado, desde el navegador.
 *
 * QUÉ HACE
 *   Mientras alguien completa el checkout, manda cada tanto lo que lleva
 *   escrito a `POST /api/checkout-abandonado`. Si termina el pedido, el
 *   servidor marca esa misma fila como convertida. Si se va, queda en el panel
 *   como un contacto al que escribirle.
 *
 * CUÁNDO EMPIEZA
 *   Recién cuando hay nombre y un WhatsApp con suficientes dígitos. Antes no se
 *   manda nada: no hay a quién recuperar y no tiene sentido registrar a alguien
 *   que solo pasó por la página. El servidor vuelve a exigir lo mismo.
 *
 * CADA CUÁNTO
 *   Con debounce: se espera a que deje de escribir. Además hay un mínimo entre
 *   envíos, así que tipear rápido no dispara una cascada de requests. El
 *   servidor tiene su propio mínimo, por las dudas.
 *
 * AL IRSE
 *   `pagehide` es el único evento confiable en móvil —`beforeunload` no se
 *   dispara cuando el sistema descarta la pestaña—. Ahí se manda un último
 *   estado con `sendBeacon`, que el navegador entrega aunque la página ya no
 *   exista. Si no está disponible, se usa `fetch` con `keepalive`.
 *
 * LA CLAVE DE SESIÓN
 *   Un UUID guardado en `localStorage`. Sobrevive a una recarga y a volver más
 *   tarde, así que la misma persona actualiza su fila en lugar de crear otra.
 *   Se borra al confirmar el pedido. Si `localStorage` está bloqueado, la clave
 *   vive solo en memoria: se captura igual, pero cada recarga es una fila nueva.
 */

const CLAVE_SESION = "grit_checkout_sesion";

/** Espera después del último cambio antes de mandar. */
const DEBOUNCE_MS = 1500;

/** Mínimo entre dos envíos, aunque el debounce se cumpla antes. */
const MIN_ENTRE_ENVIOS_MS = 5000;

const RUTA = "/api/checkout-abandonado";

export type EstadoAbandono = {
  nombre: string;
  whatsapp: string;
  ciudad: string;
  packId: string | null;
  packQty: number;
  extra: boolean;
  zona: string;
  paso: Paso;
};

/** Mismo mínimo que exige el servidor: sin esto no se manda nada. */
const hayContacto = (e: EstadoAbandono) =>
  e.nombre.trim().length >= 2 && (e.whatsapp.match(/\d/g) ?? []).length >= 8;

/** Lee la clave de sesión, o crea una. Nunca lanza. */
function obtenerClave(memoria: { actual: string }): string {
  if (memoria.actual) return memoria.actual;

  try {
    const guardada = window.localStorage.getItem(CLAVE_SESION);
    if (guardada && guardada.length === 36) {
      memoria.actual = guardada;
      return guardada;
    }
  } catch {
    // localStorage bloqueado: se sigue con una clave en memoria.
  }

  const nueva = crypto.randomUUID();
  memoria.actual = nueva;
  try {
    window.localStorage.setItem(CLAVE_SESION, nueva);
  } catch {
    // Igual sirve para esta visita.
  }
  return nueva;
}

/** Borra la clave. Se llama cuando el pedido quedó creado. */
export function olvidarSesionCheckout() {
  try {
    window.localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Nada que hacer.
  }
}

/** La clave actual, para mandarla junto con el pedido. */
export function claveSesionCheckout(): string | null {
  try {
    const v = window.localStorage.getItem(CLAVE_SESION);
    return v && v.length === 36 ? v : null;
  } catch {
    return null;
  }
}

export function useAbandono(estado: EstadoAbandono) {
  // El estado más reciente, para que los temporizadores y `pagehide` manden lo
  // que hay AHORA y no lo que había cuando se registraron.
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  const memoriaClave = useRef({ actual: "" });
  const ultimoEnvio = useRef(0);
  const ultimoCuerpo = useRef("");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armarCuerpo = useCallback(() => {
    const e = estadoRef.current;
    if (!hayContacto(e)) return null;

    return JSON.stringify({
      sessionKey: obtenerClave(memoriaClave.current),
      nombre: e.nombre,
      whatsapp: e.whatsapp,
      ciudad: e.ciudad,
      packId: e.packId,
      packQty: e.packQty,
      extra: e.extra,
      zona: e.zona,
      paso: e.paso,
    });
  }, []);

  const enviar = useCallback(
    (conBeacon: boolean) => {
      const cuerpo = armarCuerpo();
      if (!cuerpo) return;

      // Nada cambió desde el último envío: no se repite el request.
      if (!conBeacon && cuerpo === ultimoCuerpo.current) return;

      ultimoCuerpo.current = cuerpo;
      ultimoEnvio.current = Date.now();

      if (conBeacon && typeof navigator.sendBeacon === "function") {
        // `type: "application/json"` para que el endpoint lo parsee igual que
        // un fetch normal.
        navigator.sendBeacon(RUTA, new Blob([cuerpo], { type: "application/json" }));
        return;
      }

      void fetch(RUTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        // `keepalive` permite que el request sobreviva a la navegación.
        keepalive: true,
      }).catch(() => {
        // Perder una captura no puede afectar en nada al checkout.
      });
    },
    [armarCuerpo],
  );

  /* --- Debounce sobre los cambios del formulario ------------------------ */
  useEffect(() => {
    if (!hayContacto(estado)) return;

    const desdeUltimo = Date.now() - ultimoEnvio.current;
    const espera = Math.max(DEBOUNCE_MS, MIN_ENTRE_ENVIOS_MS - desdeUltimo);

    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => enviar(false), espera);

    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
    // Se depende del contenido, no del objeto: `estado` se recrea en cada render.
  }, [
    estado,
    estado.nombre,
    estado.whatsapp,
    estado.ciudad,
    estado.packId,
    estado.packQty,
    estado.extra,
    estado.zona,
    estado.paso,
    enviar,
  ]);

  /* --- Última señal al irse -------------------------------------------- */
  useEffect(() => {
    const alIrse = () => enviar(true);

    window.addEventListener("pagehide", alIrse);
    // Complemento para escritorio: cambiar de pestaña y no volver.
    const alOcultar = () => {
      if (document.visibilityState === "hidden") enviar(true);
    };
    document.addEventListener("visibilitychange", alOcultar);

    return () => {
      window.removeEventListener("pagehide", alIrse);
      document.removeEventListener("visibilitychange", alOcultar);
    };
  }, [enviar]);
}
