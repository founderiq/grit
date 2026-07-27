import { describe, expect, it } from "vitest";
import { esUuid, validarYCalcular } from "@/lib/pedidos";

/**
 * Estas pruebas cubren la superficie de seguridad del endpoint: que el
 * servidor recalcule todos los importes y que ningún dato del navegador
 * pueda alterar lo que se cobra.
 *
 * La idempotencia, la atomicidad y la concurrencia se validan contra
 * PostgreSQL (ver supabase/README.md § Validación local), porque son
 * propiedades de la base y no de este módulo.
 */

const CONTACTO_OK = {
  nombre: "Camila Rodríguez",
  telefono: "0992363483",
  ciudad: "Asunción",
  direccion: "Av. España 1234",
};

const base = (extra: Record<string, unknown> = {}) => ({
  idempotencyKey: "3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34",
  packId: "2",
  qty: 1,
  extra: false,
  zona: "asuncion",
  vip: false,
  metodoPago: "transferencia",
  contacto: CONTACTO_OK,
  ...extra,
});

/** Atajo: valida y devuelve el pedido, fallando el test si hubo errores. */
const calcular = (payload: Record<string, unknown>) => {
  const r = validarYCalcular(payload);
  if (!r.ok) throw new Error(`esperaba ok, hubo errores: ${JSON.stringify(r.errores)}`);
  return r.pedido;
};

/** Atajo: espera que falle y devuelve los campos con error. */
const camposConError = (payload: unknown) => {
  const r = validarYCalcular(payload);
  if (r.ok) throw new Error("esperaba error de validación, pero pasó");
  return r.errores.map((e) => e.campo);
};

describe("cálculo server-side de bundles", () => {
  it("Pack 1 × 1 → subtotal 115.000, sin ahorro", () => {
    const p = calcular(base({ packId: "1" }));
    expect(p.subtotal).toBe(115_000);
    expect(p.descuento).toBe(0);
    expect(p.unidades).toBe(1);
  });

  it("Pack 1 × 2 sigue costando 230.000, no se convierte en Pack 2", () => {
    const p = calcular(base({ packId: "1", qty: 2 }));
    expect(p.subtotal).toBe(230_000);
    expect(p.descuento).toBe(0);
    expect(p.total).toBe(230_000 + 20_000);
  });

  it("Pack 1 × 3 → 345.000 y envío gratis por llegar a 3 pulseras", () => {
    const p = calcular(base({ packId: "1", qty: 3 }));
    expect(p.subtotal).toBe(345_000);
    expect(p.envioGratis).toBe(true);
    expect(p.envio).toBe(0);
    expect(p.total).toBe(345_000);
  });

  it("Pack 2 → 199.000 con ahorro de 31.000", () => {
    const p = calcular(base({ packId: "2" }));
    expect(p.subtotal).toBe(199_000);
    expect(p.descuento).toBe(31_000);
    expect(p.total).toBe(219_000);
  });

  it("Pack 2 + extra → 269.000 y envío gratis", () => {
    const p = calcular(base({ packId: "2", extra: true }));
    expect(p.subtotal).toBe(269_000);
    expect(p.unidades).toBe(3);
    expect(p.envioGratis).toBe(true);
    expect(p.envio).toBe(0);
    expect(p.total).toBe(269_000);
  });

  it("Pack 3 → 269.000 y envío gratis", () => {
    const p = calcular(base({ packId: "3" }));
    expect(p.subtotal).toBe(269_000);
    expect(p.envio).toBe(0);
    expect(p.total).toBe(269_000);
  });

  it("Pack 3 + extra + VIP → 349.000", () => {
    const p = calcular(base({ packId: "3", extra: true, vip: true, zona: "interior" }));
    expect(p.subtotal).toBe(339_000);
    expect(p.envio).toBe(0);
    expect(p.vipCosto).toBe(10_000);
    expect(p.total).toBe(349_000);
  });

  it("el VIP se cobra aunque el envío estándar sea gratis", () => {
    const p = calcular(base({ packId: "3", vip: true }));
    expect(p.envio).toBe(0);
    expect(p.total).toBe(279_000);
  });

  it("Interior sin envío gratis cuesta 30.000", () => {
    const p = calcular(base({ packId: "2", zona: "interior" }));
    expect(p.envio).toBe(30_000);
    expect(p.total).toBe(229_000);
  });
});

describe("el payload del navegador no puede alterar importes", () => {
  it("ignora total, subtotal, descuento y envío enviados por el cliente", () => {
    const p = calcular(
      base({
        total: 1,
        subtotal: 1,
        descuento: 999_999,
        envio: 0,
        vipCosto: 0,
        ahorro: 500_000,
      }),
    );
    expect(p.subtotal).toBe(199_000);
    expect(p.descuento).toBe(31_000);
    expect(p.envio).toBe(20_000);
    expect(p.total).toBe(219_000);
  });

  it("ignora una lista de items con precios manipulados", () => {
    const p = calcular(
      base({
        items: [
          { sku: "pack-2", quantity: 1, unit_price: 1, line_total: 1 },
          { sku: "pulsera-extra", quantity: 5, unit_price: 0, line_total: 0 },
        ],
      }),
    );
    // Los ítems se construyen desde el catálogo, no desde el payload.
    expect(p.items).toHaveLength(1);
    expect(p.items[0]!.unit_price).toBe(199_000);
    expect(p.items[0]!.line_total).toBe(199_000);
    expect(p.total).toBe(219_000);
  });

  it("los ítems que guarda el servidor llevan el precio del catálogo", () => {
    const p = calcular(base({ packId: "1", qty: 2, extra: true }));
    expect(p.items).toHaveLength(2);
    expect(p.items[0]).toMatchObject({
      sku: "pack-1",
      quantity: 2,
      unit_price: 115_000,
      line_total: 230_000,
      is_promotional: false,
    });
    expect(p.items[1]).toMatchObject({
      sku: "pulsera-extra",
      quantity: 1,
      unit_price: 70_000,
      compare_at_price: 115_000,
      is_promotional: true,
    });
  });
});

describe("la pulsera extra no se puede duplicar", () => {
  it("como máximo hay un ítem promocional", () => {
    const p = calcular(base({ extra: true }));
    expect(p.items.filter((i) => i.is_promotional)).toHaveLength(1);
  });

  it("rechaza extra numérica (intento de pedir dos)", () => {
    expect(camposConError(base({ extra: 2 }))).toContain("extra");
  });

  it("rechaza extra como string", () => {
    expect(camposConError(base({ extra: "1" }))).toContain("extra");
  });

  it("rechaza extra como array", () => {
    expect(camposConError(base({ extra: [true, true] }))).toContain("extra");
  });
});

describe("reglas de cantidad por pack", () => {
  it("rechaza Pack 2 con cantidad mayor a 1", () => {
    expect(camposConError(base({ packId: "2", qty: 2 }))).toContain("qty");
  });

  it("rechaza Pack 3 con cantidad mayor a 1", () => {
    expect(camposConError(base({ packId: "3", qty: 4 }))).toContain("qty");
  });

  it("acepta Pack 1 con cantidad mayor a 1", () => {
    expect(calcular(base({ packId: "1", qty: 5 })).qty).toBe(5);
  });

  it("rechaza cantidad fuera de rango y no entera", () => {
    expect(camposConError(base({ packId: "1", qty: 0 }))).toContain("qty");
    expect(camposConError(base({ packId: "1", qty: 99 }))).toContain("qty");
    expect(camposConError(base({ packId: "1", qty: 1.5 }))).toContain("qty");
  });
});

describe("estados iniciales según el método de pago", () => {
  it("transferencia → pendiente_transferencia", () => {
    expect(calcular(base({ metodoPago: "transferencia" })).paymentStatus).toBe(
      "pendiente_transferencia",
    );
  });

  it("tarjeta → pendiente_pago_online", () => {
    expect(calcular(base({ metodoPago: "tarjeta" })).paymentStatus).toBe(
      "pendiente_pago_online",
    );
  });

  it("rechaza cualquier otro método", () => {
    expect(camposConError(base({ metodoPago: "efectivo" }))).toContain("metodoPago");
  });
});

describe("validación del resto del payload", () => {
  it("rechaza bundles inexistentes", () => {
    expect(camposConError(base({ packId: "9" }))).toContain("packId");
    expect(camposConError(base({ packId: null }))).toContain("packId");
  });

  it("rechaza zonas inválidas", () => {
    expect(camposConError(base({ zona: "chaco" }))).toContain("zona");
  });

  it("rechaza idempotencyKey que no sea UUID", () => {
    expect(camposConError(base({ idempotencyKey: "abc" }))).toContain("idempotencyKey");
    expect(camposConError(base({ idempotencyKey: 123 }))).toContain("idempotencyKey");
  });

  it("rechaza contacto incompleto o inválido", () => {
    const campos = camposConError(
      base({ contacto: { nombre: "A", telefono: "123", ciudad: "", direccion: "x" } }),
    );
    expect(campos).toEqual(
      expect.arrayContaining([
        "contacto.nombre",
        "contacto.telefono",
        "contacto.ciudad",
        "contacto.direccion",
      ]),
    );
  });

  it("acepta los dos formatos de teléfono aprobados", () => {
    expect(calcular(base({ contacto: { ...CONTACTO_OK, telefono: "0992363483" } })).contacto.telefono)
      .toBe("0992363483");
    expect(
      calcular(base({ contacto: { ...CONTACTO_OK, telefono: "+595992363483" } })).contacto.telefono,
    ).toBe("+595992363483");
  });

  it("la ubicación es opcional pero, si viene, debe ser una URL", () => {
    expect(validarYCalcular(base({ contacto: { ...CONTACTO_OK, ubicacion: "" } })).ok).toBe(true);
    expect(
      camposConError(base({ contacto: { ...CONTACTO_OK, ubicacion: "no es url" } })),
    ).toContain("contacto.ubicacion");
    expect(
      validarYCalcular(
        base({ contacto: { ...CONTACTO_OK, ubicacion: "https://maps.app.goo.gl/x" } }),
      ).ok,
    ).toBe(true);
  });

  it("rechaza cuerpos que no son objetos", () => {
    for (const v of [null, undefined, "texto", 42, [1, 2]]) {
      expect(validarYCalcular(v).ok).toBe(false);
    }
  });
});

describe("esUuid — el guard que usa /gracias", () => {
  it("acepta UUID v4 bien formados", () => {
    expect(esUuid("3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34")).toBe(true);
  });

  it("rechaza tokens inválidos", () => {
    for (const v of ["", "abc", "3f1a6c8e2b4d4a7f9c1e5d8a0b6f2e34", null, 1, {}]) {
      expect(esUuid(v)).toBe(false);
    }
  });

  it("rechaza intentos de inyección", () => {
    expect(esUuid("' or 1=1 --")).toBe(false);
    expect(esUuid("3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34' or '1'='1")).toBe(false);
  });
});
