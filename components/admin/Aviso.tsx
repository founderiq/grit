/**
 * Resultado de una escritura del panel.
 *
 * `role="status"` y no `alert`: el mensaje aparece después de una acción que el
 * administrador acaba de hacer, así que se anuncia sin interrumpir. El error
 * es genérico —el detalle queda en el log del servidor— y el color no es el
 * único indicador: el texto dice qué pasó.
 */
export default function Aviso({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={`m-0 rounded-strip border-hairline px-[12px] py-[9px] text-[12.5px] leading-[1.45] ${
        ok
          ? "border-estado-verde-borde bg-estado-verde-fondo text-estado-verde-texto"
          : "border-estado-rojo-borde bg-estado-rojo-fondo text-estado-rojo-texto"
      }`}
    >
      {children}
    </p>
  );
}
