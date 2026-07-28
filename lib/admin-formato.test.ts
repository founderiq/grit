import { describe, expect, it } from "vitest";
import {
  contarPulseras,
  describirSeleccion,
  enlaceWhatsapp,
  fmtFechaCorta,
  fmtGs,
  fmtMultiplo,
  fmtNumero,
  fmtPedidos,
  fmtPorcentaje,
  nombresProductos,
  normalizarEntrega,
  normalizarPago,
} from "@/lib/admin-formato";

describe("formato de Paraguay", () => {
  it("guaraníes con punto de miles", () => {
    expect(fmtGs(1_250_000)).toBe("Gs. 1.250.000");
    expect(fmtGs(219_000)).toBe("Gs. 219.000");
    expect(fmtGs(0)).toBe("Gs. 0");
  });

  it("sin datos, los guaraníes son cero y no un guion", () => {
    expect(fmtGs(null)).toBe("Gs. 0");
    expect(fmtGs(undefined)).toBe("Gs. 0");
  });

  it("porcentaje con un decimal y coma", () => {
    expect(fmtPorcentaje(0.425)).toBe("42,5%");
    expect(fmtPorcentaje(0.488)).toBe("48,8%");
    expect(fmtPorcentaje(1)).toBe("100,0%");
  });

  it("múltiplo con dos decimales y coma", () => {
    expect(fmtMultiplo(3.25)).toBe("3,25x");
    expect(fmtMultiplo(10.58)).toBe("10,58x");
  });

  it("una división por cero se muestra como valor neutro", () => {
    expect(fmtPorcentaje(null)).toBe("0%");
    expect(fmtMultiplo(null)).toBe("0x");
  });

  it("NaN e Infinity nunca llegan a la pantalla", () => {
    expect(fmtPorcentaje(Number.NaN)).toBe("0%");
    expect(fmtPorcentaje(Number.POSITIVE_INFINITY)).toBe("0%");
    expect(fmtMultiplo(Number.NaN)).toBe("0x");
    expect(fmtMultiplo(Number.POSITIVE_INFINITY)).toBe("0x");
  });

  it("cantidad de pedidos concuerda en singular y plural", () => {
    expect(fmtPedidos(0)).toBe("0 pedidos");
    expect(fmtPedidos(1)).toBe("1 pedido");
    expect(fmtPedidos(1234)).toBe("1.234 pedidos");
  });

  it("números enteros con separador de miles", () => {
    expect(fmtNumero(1234)).toBe("1.234");
    expect(fmtNumero(null)).toBe("0");
  });
});

describe("fechas", () => {
  it("una fecha de venta se muestra tal cual, sin correrse de día", () => {
    // Es una columna `date`: si se convirtiera a Date se leería como
    // medianoche UTC y en Asunción mostraría el 26.
    expect(fmtFechaCorta("2026-07-27")).toBe("27/7/26");
    expect(fmtFechaCorta("2026-01-01")).toBe("1/1/26");
  });

  it("una fecha ausente o rota se muestra como guion", () => {
    expect(fmtFechaCorta(null)).toBe("—");
    expect(fmtFechaCorta("")).toBe("—");
    expect(fmtFechaCorta("ayer")).toBe("—");
  });
});

describe("normalización de estados de pago", () => {
  it("los dos pendientes se muestran como uno solo", () => {
    expect(normalizarPago("pendiente_transferencia")).toBe("pendiente");
    expect(normalizarPago("pendiente_pago_online")).toBe("pendiente");
  });

  it("pagado es pagado", () => {
    expect(normalizarPago("pagado")).toBe("pagado");
  });

  it("fallido se agrupa con cancelado: en ninguno entró la plata", () => {
    expect(normalizarPago("cancelado")).toBe("cancelado");
    expect(normalizarPago("fallido")).toBe("cancelado");
  });

  it("un valor desconocido cae en pendiente, nunca en pagado", () => {
    expect(normalizarPago("algo_nuevo")).toBe("pendiente");
    expect(normalizarPago(null)).toBe("pendiente");
  });
});

describe("normalización de estados de entrega", () => {
  it("nuevo y confirmado son Pendiente", () => {
    expect(normalizarEntrega("nuevo")).toBe("pendiente");
    expect(normalizarEntrega("confirmado")).toBe("pendiente");
  });

  it("el resto mantiene su significado", () => {
    expect(normalizarEntrega("preparando")).toBe("preparado");
    expect(normalizarEntrega("enviado")).toBe("enviado");
    expect(normalizarEntrega("entregado")).toBe("entregado");
    expect(normalizarEntrega("cancelado")).toBe("cancelado");
  });

  it("un valor desconocido cae en pendiente", () => {
    expect(normalizarEntrega("en_camino")).toBe("pendiente");
    expect(normalizarEntrega(null)).toBe("pendiente");
  });
});

describe("enlace de WhatsApp", () => {
  it("acepta el formato local", () => {
    expect(enlaceWhatsapp("0992363483")).toBe("https://wa.me/595992363483");
  });

  it("acepta el formato internacional", () => {
    expect(enlaceWhatsapp("+595992363483")).toBe("https://wa.me/595992363483");
  });

  it("tolera espacios y guiones", () => {
    expect(enlaceWhatsapp(" 0992-363-483 ")).toBe("https://wa.me/595992363483");
  });

  it("no arma un link con un número incompleto o inválido", () => {
    expect(enlaceWhatsapp("123")).toBeNull();
    expect(enlaceWhatsapp("")).toBeNull();
    expect(enlaceWhatsapp(null)).toBeNull();
    expect(enlaceWhatsapp("no es un teléfono")).toBeNull();
    expect(enlaceWhatsapp("099236348")).toBeNull();
  });
});

describe("cantidad de pulseras del pedido", () => {
  it("bundle_id es cuántas pulseras trae el pack", () => {
    expect(
      contarPulseras([{ product_name: "Pack de 2", quantity: 1, bundle_id: "2" }]),
    ).toBe(2);
  });

  it("la pulsera extra no lleva bundle_id y cuenta como una", () => {
    expect(
      contarPulseras([
        { product_name: "Pack de 2", quantity: 1, bundle_id: "2" },
        { product_name: "Pulsera extra", quantity: 1, bundle_id: null },
      ]),
    ).toBe(3);
  });

  it("multiplica por la cantidad de packs", () => {
    expect(
      contarPulseras([{ product_name: "1 Pulsera", quantity: 3, bundle_id: "1" }]),
    ).toBe(3);
  });

  it("un bundle_id no numérico cuenta como una pulsera", () => {
    expect(
      contarPulseras([{ product_name: "Modelo futuro", quantity: 2, bundle_id: "edicion-x" }]),
    ).toBe(2);
  });

  it("sin ítems da cero", () => {
    expect(contarPulseras([])).toBe(0);
    expect(contarPulseras(null)).toBe(0);
  });
});

describe("nombres de productos del pedido", () => {
  it("sale de order_items, sin asumir ningún modelo", () => {
    expect(
      nombresProductos([
        { product_name: "All-black con cruz", quantity: 1, bundle_id: "1" },
        { product_name: "Pulsera extra 35% OFF", quantity: 1, bundle_id: null },
      ]),
    ).toEqual(["All-black con cruz", "Pulsera extra 35% OFF"]);
  });

  it("no repite un mismo producto", () => {
    expect(
      nombresProductos([
        { product_name: "Pack de 2", quantity: 1, bundle_id: "2" },
        { product_name: "Pack de 2", quantity: 1, bundle_id: "2" },
      ]),
    ).toEqual(["Pack de 2"]);
  });

  it("descarta nombres vacíos", () => {
    expect(
      nombresProductos([
        { product_name: "  ", quantity: 1, bundle_id: null },
        { product_name: null, quantity: 1, bundle_id: null },
      ]),
    ).toEqual([]);
  });
});

describe("selección de un checkout abandonado", () => {
  it("describe pack, cantidad y extra", () => {
    expect(describirSeleccion({ pack_id: "2", pack_qty: 1, has_extra: true })).toBe(
      "Pack 2 · con pulsera extra",
    );
  });

  it("muestra la cantidad solo cuando es mayor a una", () => {
    expect(describirSeleccion({ pack_id: "1", pack_qty: 3, has_extra: false })).toBe("Pack 1 × 3");
    expect(describirSeleccion({ pack_id: "1", pack_qty: 1, has_extra: false })).toBe("Pack 1");
  });

  it("sin datos muestra un guion", () => {
    expect(describirSeleccion({ pack_id: null, pack_qty: null, has_extra: false })).toBe("—");
  });
});
