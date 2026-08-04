import { describe, expect, it } from "vitest";
import {
  MONEDA,
  SKU_EXTRA,
  contenidosDePedido,
  datosDeItems,
  paramsDePedido,
  rutaConPixel,
  skuDeBundle,
  trackPurchase,
} from "@/lib/meta-pixel";

describe("SKUs", () => {
  it("usa el mismo formato que order_items", () => {
    expect(skuDeBundle("1")).toBe("pack-1");
    expect(skuDeBundle("2")).toBe("pack-2");
    expect(SKU_EXTRA).toBe("pulsera-extra");
  });
});

describe("rutas con pixel", () => {
  it("cubre la landing, el producto, el checkout y la confirmación", () => {
    expect(rutaConPixel("/")).toBe(true);
    expect(rutaConPixel("/producto")).toBe(true);
    expect(rutaConPixel("/checkout")).toBe(true);
    expect(rutaConPixel("/gracias")).toBe(true);
  });

  it("deja el panel afuera: es uso interno, no marketing", () => {
    expect(rutaConPixel("/admin")).toBe(false);
    expect(rutaConPixel("/admin/pedidos")).toBe(false);
  });
});

describe("contenidos del pedido", () => {
  it("un pack fijo es una sola línea, sin importar qty", () => {
    expect(contenidosDePedido({ packId: "2", qty: 3, extra: false })).toEqual([
      { id: "pack-2", quantity: 1 },
    ]);
  });

  it("el pack de 1 sí lleva la cantidad elegida", () => {
    expect(contenidosDePedido({ packId: "1", qty: 3, extra: false })).toEqual([
      { id: "pack-1", quantity: 3 },
    ]);
  });

  it("suma la pulsera promocional como línea aparte", () => {
    expect(contenidosDePedido({ packId: "3", qty: 1, extra: true })).toEqual([
      { id: "pack-3", quantity: 1 },
      { id: "pulsera-extra", quantity: 1 },
    ]);
  });
});

describe("parámetros de ecommerce", () => {
  it("manda ids, tipo, valor real, moneda y cantidad de pulseras", () => {
    const params = paramsDePedido({ packId: "2", qty: 1, extra: true }, 289_000, 3);

    expect(params).toMatchObject({
      content_ids: ["pack-2", "pulsera-extra"],
      content_name: "Pack de 2 Pulseras GRIT",
      content_type: "product",
      value: 289_000,
      currency: MONEDA,
      num_items: 3,
    });
    expect(MONEDA).toBe("PYG");
  });

  it("no incluye ningún dato del cliente", () => {
    const params = paramsDePedido({ packId: "1", qty: 1, extra: false }, 135_000, 1);
    const claves = Object.keys(params);

    for (const prohibida of ["nombre", "telefono", "direccion", "ciudad", "email"]) {
      expect(claves).not.toContain(prohibida);
    }
  });
});

describe("ítems guardados del pedido", () => {
  it("cuenta pulseras, no líneas", () => {
    const { contents, unidades } = datosDeItems([
      { sku: "pack-2", bundle_id: "2", quantity: 1 },
      { sku: "pulsera-extra", bundle_id: null, quantity: 1 },
    ]);

    expect(contents).toEqual([
      { id: "pack-2", quantity: 1 },
      { id: "pulsera-extra", quantity: 1 },
    ]);
    expect(unidades).toBe(3);
  });

  it("multiplica las unidades del pack por la cantidad de packs", () => {
    expect(
      datosDeItems([{ sku: "pack-1", bundle_id: "1", quantity: 4 }]).unidades,
    ).toBe(4);
    expect(
      datosDeItems([{ sku: "pack-3", bundle_id: "3", quantity: 2 }]).unidades,
    ).toBe(6);
  });
});

describe("Purchase", () => {
  it("no se envía fuera del navegador", () => {
    // El entorno de los tests es node: sin `window` no hay pixel que tocar.
    expect(
      trackPurchase({
        orderId: "GRIT-0001",
        valor: 219_000,
        contents: [{ id: "pack-2", quantity: 1 }],
        unidades: 2,
      }),
    ).toBe(false);
  });
});
