import { describe, expect, it } from "vitest";
import { totalesManual, validarPedidoManual } from "@/lib/admin-pedido-manual";

/**
 * Pedido manual: validación y recálculo.
 *
 * Lo que más importa acá es lo que NO pasa: que un total mandado desde el
 * navegador no se use, que no se pueda pedir más de una pulsera promocional y
 * que ningún campo de costo o de autoría entre por el formulario.
 */

const HOY = "2026-07-28";

const BASE = {
  idempotencyKey: "3f1a6c8e-2b4d-4a7f-9c1e-5d8a0b6f2e34",
  cliente: {
    nombre: "Camila Rodríguez",
    whatsapp: "0992 363 483",
    ciudad: "Asunción",
    direccion: "Av. España 1234",
    ubicacion: "",
  },
  zona: "asuncion",
  lineas: [{ packId: "2", qty: 1 }],
  extra: false,
  envio: "20000",
  descuento: "0",
  vip: false,
  metodoPago: "transferencia",
  pago: "pendiente",
  entrega: "pendiente",
  saleDate: HOY,
  notas: "",
};

const valido = (over: Record<string, unknown> = {}) =>
  validarPedidoManual({ ...BASE, ...over }, HOY);

const codigos = (r: ReturnType<typeof validarPedidoManual>) =>
  r.ok ? [] : r.errores.map((e) => e.campo);

/* ------------------------------------------------------------------ */

describe("importes", () => {
  it("usa los precios del catálogo, no los del formulario", () => {
    const r = valido({ total: 1, subtotal: 1, precio: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.pedido.subtotal).toBe(199_000);
    expect(r.pedido.total).toBe(219_000); // 199.000 + 20.000 de envío
  });

  it("suma varias líneas y cuenta bien las pulseras", () => {
    const r = valido({
      lineas: [
        { packId: "3", qty: 1 },
        { packId: "1", qty: 2 },
      ],
      envio: "0",
    });
    if (!r.ok) throw new Error("debía ser válido");

    expect(r.pedido.subtotal).toBe(269_000 + 115_000 * 2);
    expect(r.pedido.unidades).toBe(3 + 2);
    expect(r.pedido.items).toHaveLength(2);
  });

  it("la pulsera extra suma 70.000 y una sola unidad", () => {
    const conExtra = valido({ extra: true, envio: "0" });
    const sinExtra = valido({ extra: false, envio: "0" });
    if (!conExtra.ok || !sinExtra.ok) throw new Error("debían ser válidos");

    expect(conExtra.pedido.subtotal - sinExtra.pedido.subtotal).toBe(70_000);
    expect(conExtra.pedido.unidades - sinExtra.pedido.unidades).toBe(1);
    expect(conExtra.pedido.items.filter((i) => i.is_promotional)).toHaveLength(1);
  });

  it("no hay forma de pedir dos pulseras promocionales", () => {
    // `extra` es un booleano: no acepta un contador.
    expect(codigos(valido({ extra: 2 }))).toContain("extra");
  });

  it("el VIP suma su costo fijo", () => {
    const r = valido({ vip: true });
    if (!r.ok) throw new Error("debía ser válido");
    expect(r.pedido.vipCosto).toBe(10_000);
    expect(r.pedido.total).toBe(199_000 + 20_000 + 10_000);
  });

  it("el descuento se acota al subtotal: el total nunca es negativo", () => {
    const r = valido({ descuento: "999999999", envio: "0" });
    if (!r.ok) throw new Error("debía ser válido");
    expect(r.pedido.descuento).toBe(199_000);
    expect(r.pedido.total).toBe(0);
  });

  it("acepta montos con separador de miles y rechaza decimales", () => {
    expect(valido({ envio: "20.000" }).ok).toBe(true);
    expect(codigos(valido({ envio: "20000,50" }))).toContain("envio");
  });

  it("`totalesManual` da lo mismo que la validación completa", () => {
    const r = valido({ extra: true, vip: true, envio: "30000", descuento: "5000" });
    if (!r.ok) throw new Error("debía ser válido");

    const t = totalesManual({
      lineas: [{ packId: "2", qty: 1 }],
      extra: true,
      envio: 30_000,
      descuento: 5_000,
      vip: true,
    });

    expect(t.total).toBe(r.pedido.total);
    expect(t.unidades).toBe(r.pedido.unidades);
  });
});

/* ------------------------------------------------------------------ */

describe("estados y método de pago", () => {
  it("pendiente con transferencia o efectivo espera una transferencia", () => {
    for (const metodo of ["transferencia", "efectivo"]) {
      const r = valido({ metodoPago: metodo, pago: "pendiente" });
      if (!r.ok) throw new Error("debía ser válido");
      expect(r.pedido.paymentStatus).toBe("pendiente_transferencia");
    }
  });

  it("pendiente con tarjeta espera un pago online", () => {
    const r = valido({ metodoPago: "tarjeta", pago: "pendiente" });
    if (!r.ok) throw new Error("debía ser válido");
    expect(r.pedido.paymentStatus).toBe("pendiente_pago_online");
  });

  it("pagado y cancelado son directos", () => {
    expect((valido({ pago: "pagado" }) as { pedido: { paymentStatus: string } }).pedido.paymentStatus).toBe("pagado");
    expect((valido({ pago: "cancelado" }) as { pedido: { paymentStatus: string } }).pedido.paymentStatus).toBe("cancelado");
  });

  it("traduce el estado de entrega visible al de la base", () => {
    const r = valido({ entrega: "preparado" });
    if (!r.ok) throw new Error("debía ser válido");
    expect(r.pedido.orderStatus).toBe("preparando");
  });

  it("rechaza métodos y estados que no existen", () => {
    expect(codigos(valido({ metodoPago: "cripto" }))).toContain("metodoPago");
    expect(codigos(valido({ pago: "fallido" }))).toContain("pago");
    expect(codigos(valido({ entrega: "confirmado" }))).toContain("entrega");
  });
});

/* ------------------------------------------------------------------ */

describe("validación de datos", () => {
  it("exige nombre, WhatsApp, ciudad y dirección", () => {
    const c = codigos(
      valido({ cliente: { nombre: "", whatsapp: "12", ciudad: "", direccion: "", ubicacion: "" } }),
    );
    expect(c).toEqual(
      expect.arrayContaining([
        "cliente.nombre",
        "cliente.whatsapp",
        "cliente.ciudad",
        "cliente.direccion",
      ]),
    );
  });

  it("la ubicación es opcional pero tiene que ser http(s)", () => {
    expect(valido({ cliente: { ...BASE.cliente, ubicacion: "" } }).ok).toBe(true);
    expect(
      codigos(valido({ cliente: { ...BASE.cliente, ubicacion: "javascript:alert(1)" } })),
    ).toContain("cliente.ubicacion");
  });

  it("exige al menos una línea de producto", () => {
    expect(codigos(valido({ lineas: [] }))).toContain("lineas");
  });

  it("rechaza un pack que no está en el catálogo", () => {
    expect(codigos(valido({ lineas: [{ packId: "9", qty: 1 }] }))).toContain("lineas.0.packId");
  });

  it("rechaza cantidades fuera de rango", () => {
    expect(codigos(valido({ lineas: [{ packId: "1", qty: 0 }] }))).toContain("lineas.0.qty");
    expect(codigos(valido({ lineas: [{ packId: "1", qty: 500 }] }))).toContain("lineas.0.qty");
  });

  it("acepta fechas pasadas y hasta mañana, no más allá", () => {
    expect(valido({ saleDate: "2026-01-15" }).ok).toBe(true);
    expect(valido({ saleDate: "2026-07-29" }).ok).toBe(true);
    expect(codigos(valido({ saleDate: "2026-07-30" }))).toContain("saleDate");
    expect(codigos(valido({ saleDate: "no-es-fecha" }))).toContain("saleDate");
  });

  it("exige una clave de idempotencia con forma de UUID", () => {
    expect(codigos(valido({ idempotencyKey: "abc" }))).toContain("idempotencyKey");
  });

  it("un cuerpo que no es objeto se rechaza entero", () => {
    expect(validarPedidoManual("hola", HOY).ok).toBe(false);
    expect(validarPedidoManual(null, HOY).ok).toBe(false);
    expect(validarPedidoManual([1, 2], HOY).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe("lo que el formulario no puede mandar", () => {
  it("ni el autor, ni los costos, ni el origen salen de la entrada", () => {
    const r = valido({
      created_by: "11111111-1111-4111-8111-111111111111",
      user_id: "11111111-1111-4111-8111-111111111111",
      product_cost_total: 1,
      logistics_cost: 1,
      source: "web",
      order_number: "GRT-INVENTADO",
    });
    if (!r.ok) throw new Error("debía ser válido");

    const claves = Object.keys(r.pedido);
    expect(claves).not.toContain("created_by");
    expect(claves).not.toContain("user_id");
    expect(claves).not.toContain("product_cost_total");
    expect(claves).not.toContain("logistics_cost");
    expect(claves).not.toContain("source");
    expect(claves).not.toContain("order_number");
  });
});
