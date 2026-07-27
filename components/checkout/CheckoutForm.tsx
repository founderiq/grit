"use client";

import Input from "@/components/ui/Input";
import { CHECKOUT } from "@/lib/content";
import type { CamposContacto, CampoId, Errores } from "@/lib/checkout";

/**
 * Datos de contacto y envío. Los cuatro campos requeridos van en una grilla
 * de dos columnas en desktop; la ubicación ocupa el ancho completo.
 */
type CheckoutFormProps = {
  campos: CamposContacto;
  errores: Errores;
  onCampo: (id: CampoId, valor: string) => void;
  onBlur: () => void;
  refs: Record<CampoId, React.RefObject<HTMLInputElement | null>>;
};

export default function CheckoutForm({
  campos,
  errores,
  onCampo,
  onBlur,
  refs,
}: CheckoutFormProps) {
  const c = CHECKOUT.campos;

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-4 font-archivo text-[15px] font-bold uppercase tracking-[-0.01em] text-tinta lg:text-[17px]">
        {CHECKOUT.seccionDatos}
      </legend>

      <div className="grid gap-[14px] lg:grid-cols-2">
        <Input
          label={c.nombre.label}
          placeholder={c.nombre.placeholder}
          value={campos.nombre}
          onChange={(v) => onCampo("nombre", v)}
          onBlur={onBlur}
          error={errores.nombre}
          required
          autoComplete="name"
          inputRef={refs.nombre}
        />
        <Input
          label={c.telefono.label}
          placeholder={c.telefono.placeholder}
          value={campos.telefono}
          onChange={(v) => onCampo("telefono", v)}
          onBlur={onBlur}
          error={errores.telefono}
          required
          type="tel"
          autoComplete="tel"
          inputRef={refs.telefono}
        />
        <Input
          label={c.ciudad.label}
          placeholder={c.ciudad.placeholder}
          value={campos.ciudad}
          onChange={(v) => onCampo("ciudad", v)}
          onBlur={onBlur}
          error={errores.ciudad}
          required
          autoComplete="address-level2"
          inputRef={refs.ciudad}
        />
        <Input
          label={c.direccion.label}
          placeholder={c.direccion.placeholder}
          value={campos.direccion}
          onChange={(v) => onCampo("direccion", v)}
          onBlur={onBlur}
          error={errores.direccion}
          required
          autoComplete="street-address"
          inputRef={refs.direccion}
        />
        <Input
          className="lg:col-span-2"
          label={c.ubicacion.label}
          placeholder={c.ubicacion.placeholder}
          ayuda={c.ubicacion.ayuda}
          value={campos.ubicacion}
          onChange={(v) => onCampo("ubicacion", v)}
          onBlur={onBlur}
          error={errores.ubicacion}
          type="url"
          inputRef={refs.ubicacion}
        />
      </div>
    </fieldset>
  );
}
