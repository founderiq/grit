import { ADMIN } from "@/lib/admin-content";

/**
 * Las tres acciones de escritura del panel: pedido manual, Ad Spend y costos.
 *
 * En esta fase el panel es de solo lectura, así que están deshabilitadas de
 * verdad —`disabled`, no un `pointer-events: none` que igual recibe foco— y
 * cada una explica por qué con un `title` y un texto para lectores de pantalla.
 * Se muestran igual porque son parte del mapa del panel: esconderlas haría
 * parecer que el panel está terminado.
 */
export default function AccionesFuturas() {
  return (
    <div className="flex flex-wrap gap-2">
      {ADMIN.panel.acciones.map((a, i) => (
        <button
          key={a.id}
          type="button"
          disabled
          title={ADMIN.panel.proximaFase}
          className={`inline-flex min-h-11 cursor-not-allowed items-center rounded-pill px-[17px] py-[9px] font-inter text-[12.5px] font-semibold opacity-45 ${
            // La primera es la acción principal del panel: mantiene la jerarquía
            // aunque todavía no haga nada.
            i === 0
              ? "bg-tinta text-hueso"
              : "border-hairline border-borde-claro bg-superficie-input text-tinta"
          }`}
        >
          {a.etiqueta}
          <span className="sr-only"> — {ADMIN.panel.proximaFase}</span>
        </button>
      ))}
    </div>
  );
}
