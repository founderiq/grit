"use client";

import { useEffect, useState } from "react";

/**
 * Fecha de hoy en español, formato "día, DD de mes" (p. ej. "jueves, 24 de julio").
 * Se calcula en el cliente para reflejar el día real de quien visita, no la
 * fecha del build. Arranca vacía y se completa al montar, así no hay desajuste
 * de hidratación.
 */
export default function FechaHoy() {
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    setFecha(
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
  }, []);

  return <>{fecha}</>;
}
