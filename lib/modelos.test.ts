import { describe, expect, it } from "vitest";
import {
  ajustarModelos,
  getModelo,
  modelosAParam,
  modelosDeMetadata,
  modelosDesdeParam,
  nombreModelo,
  textoModelos,
} from "@/lib/modelos";
import { ESTADO_INICIAL, cartReducer, totalesDeEstado, type CartState } from "@/lib/cart";
import { modelosDelPedido, pedidoDesdeParams, totalesCheckout } from "@/lib/checkout";
import { PRODUCTO_MODELOS } from "@/lib/content";

/**
 * Modelos (colores) de la pulsera: cómo se ajusta la elección al cambiar de
 * pack, cómo viaja por carrito y checkout, y cómo se lee del pedido guardado.
 * Los escenarios A–E son los de la especificación.
 */

describe("catálogo", () => {
  it("tiene los seis modelos, con Negro primero", () => {
    expect(PRODUCTO_MODELOS.map((m) => m.nombre)).toEqual([
      "Negro",
      "Azul",
      "Verde",
      "Gris",
      "Rosa",
      "Floral",
    ]);
  });

  it("un id desconocido cae a Negro para mostrar una foto, pero no para nombrarlo", () => {
    expect(getModelo("violeta").id).toBe("negro");
    expect(nombreModelo("violeta")).toBe("Violeta");
    expect(nombreModelo("azul")).toBe("Azul");
  });
});

describe("ajustarModelos — cambio de cantidad", () => {
  it("por defecto todas las pulseras nacen en Negro", () => {
    expect(ajustarModelos([], 3)).toEqual(["negro", "negro", "negro"]);
  });

  it("caso D: de 2 a 3 conserva las dos y agrega Negro", () => {
    expect(ajustarModelos(["azul", "floral"], 3)).toEqual(["azul", "floral", "negro"]);
  });

  it("caso E: de 3 a 2 quita solo la tercera", () => {
    expect(ajustarModelos(["azul", "floral", "rosa"], 2)).toEqual(["azul", "floral"]);
  });

  it("un id inválido en una posición vuelve a Negro sin mover las demás", () => {
    expect(ajustarModelos(["azul", "violeta", 3, "rosa"], 4)).toEqual([
      "azul",
      "negro",
      "negro",
      "rosa",
    ]);
  });

  it("tolera null, undefined y no-arrays", () => {
    expect(ajustarModelos(null, 1)).toEqual(["negro"]);
    expect(ajustarModelos(undefined, 2)).toEqual(["negro", "negro"]);
    expect(ajustarModelos("azul" as unknown as string[], 1)).toEqual(["negro"]);
  });
});

describe("texto compacto", () => {
  it("Negro · Azul · Floral", () => {
    expect(textoModelos(["negro", "azul", "floral"])).toBe("Negro · Azul · Floral");
  });
});

/* ------------------------------------------------------------------ */

const conPack = (over: Partial<CartState> = {}): CartState => ({ ...ESTADO_INICIAL, ...over });

describe("carrito — los modelos viajan con el pack", () => {
  it("caso C: agregar el pack de 3 con Verde, Rosa, Azul", () => {
    const s = cartReducer(ESTADO_INICIAL, {
      type: "agregarBundle",
      id: "3",
      modelos: ["verde", "rosa", "azul"],
    });
    expect(s.packId).toBe("3");
    expect(s.modelos).toEqual(["verde", "rosa", "azul"]);
  });

  it("sin modelos (llamada vieja) completa en Negro", () => {
    const s = cartReducer(ESTADO_INICIAL, { type: "agregarBundle", id: "2" });
    expect(s.modelos).toEqual(["negro", "negro"]);
  });

  it("agregar otro pack reemplaza también los modelos", () => {
    const a = cartReducer(ESTADO_INICIAL, { type: "agregarBundle", id: "3", modelos: ["azul", "azul", "azul"] });
    const b = cartReducer(a, { type: "agregarBundle", id: "1", modelos: ["rosa"] });
    expect(b.modelos).toEqual(["rosa"]);
  });

  it("el stepper del pack de 1 suma Negro al final y quita del final", () => {
    let s = cartReducer(ESTADO_INICIAL, { type: "agregarBundle", id: "1", modelos: ["azul"] });
    s = cartReducer(s, { type: "subirCantidad" });
    expect(s.modelos).toEqual(["azul", "negro"]);
    s = cartReducer(s, { type: "bajarCantidad" });
    expect(s.modelos).toEqual(["azul"]);
  });

  it("quitar el pack vacía los modelos", () => {
    const s = cartReducer(conPack({ packId: "2", modelos: ["azul", "rosa"] }), {
      type: "quitarBundle",
    });
    expect(s.modelos).toEqual([]);
  });

  it("los modelos no cambian ningún importe", () => {
    const negro = totalesDeEstado(conPack({ packId: "3", modelos: ["negro", "negro", "negro"] }));
    const mix = totalesDeEstado(conPack({ packId: "3", modelos: ["verde", "rosa", "floral"] }));
    expect(mix).toEqual(negro);
  });

  it("la extra nace en Negro, se cambia y vuelve a Negro al quitarla", () => {
    let s = cartReducer(conPack({ packId: "2", modelos: ["negro", "negro"] }), {
      type: "agregarExtra",
    });
    expect(s.modeloExtra).toBe("negro");
    s = cartReducer(s, { type: "cambiarModeloExtra", modelo: "rosa" });
    expect(s.modeloExtra).toBe("rosa");
    s = cartReducer(s, { type: "quitarExtra" });
    expect(s.modeloExtra).toBe("negro");
  });

  it("un carrito guardado antes de los modelos se hidrata en Negro", () => {
    const s = cartReducer(ESTADO_INICIAL, {
      type: "hidratar",
      estado: { packId: "3", packQty: 1, hasExtra: true },
    });
    expect(s.modelos).toEqual(["negro", "negro", "negro"]);
    expect(s.modeloExtra).toBe("negro");
  });

  it("hidratar conserva modelos válidos y corrige el largo", () => {
    const s = cartReducer(ESTADO_INICIAL, {
      type: "hidratar",
      estado: { packId: "2", packQty: 1, hasExtra: false, modelos: ["floral", "gris", "rosa"] },
    });
    expect(s.modelos).toEqual(["floral", "gris"]);
  });
});

/* ------------------------------------------------------------------ */

describe("checkout — modelos desde el carrito o desde Comprar ahora", () => {
  it("caso B por query params: Floral, Gris", () => {
    const p = pedidoDesdeParams({ pack: "2", modelos: "floral,gris" })!;
    expect(p.modelos).toEqual(["floral", "gris"]);
  });

  it("un link viejo sin `modelos` sigue funcionando, en Negro", () => {
    const p = pedidoDesdeParams({ pack: "3" })!;
    expect(p.modelos).toEqual(["negro", "negro", "negro"]);
    expect(p.modeloExtra).toBeUndefined();
  });

  it("params con más o menos modelos que el pack se ajustan al pack", () => {
    expect(pedidoDesdeParams({ pack: "1", modelos: "azul,rosa" })!.modelos).toEqual(["azul"]);
    expect(pedidoDesdeParams({ pack: "3", modelos: "azul" })!.modelos).toEqual([
      "azul",
      "negro",
      "negro",
    ]);
  });

  it("el pack de 1 con cantidad 2 lleva dos modelos", () => {
    const p = pedidoDesdeParams({ pack: "1", qty: "2", modelos: "verde,rosa" })!;
    expect(p.modelos).toEqual(["verde", "rosa"]);
  });

  it("modelosDelPedido: la extra solo tiene modelo si hay extra", () => {
    expect(
      modelosDelPedido({ packId: "1", qty: 1, extra: false, modeloExtra: "rosa" }).modeloExtra,
    ).toBeNull();
    expect(modelosDelPedido({ packId: "1", qty: 1, extra: true }).modeloExtra).toBe("negro");
  });

  it("los totales del checkout no dependen de los modelos", () => {
    const a = totalesCheckout({ packId: "3", qty: 1, extra: true }, "interior", true);
    const b = totalesCheckout(
      { packId: "3", qty: 1, extra: true, modelos: ["rosa", "verde", "azul"], modeloExtra: "floral" },
      "interior",
      true,
    );
    expect(b).toEqual(a);
  });

  it("ida y vuelta por el query param", () => {
    expect(modelosDesdeParam(modelosAParam(["negro", "azul", "floral"]))).toEqual([
      "negro",
      "azul",
      "floral",
    ]);
  });
});

/* ------------------------------------------------------------------ */

describe("modelosDeMetadata — pedidos guardados", () => {
  it("lee modelos y modelo extra", () => {
    expect(
      modelosDeMetadata({ origen: "checkout_web", modelos: ["negro", "azul"], modelo_extra: "rosa" }),
    ).toEqual({ pack: ["negro", "azul"], extra: "rosa" });
  });

  it("pedidos anteriores o manuales: vacío, sin undefined ni null en la lista", () => {
    expect(modelosDeMetadata({ origen: "panel_admin", unidades: 2 })).toEqual({
      pack: [],
      extra: null,
    });
    expect(modelosDeMetadata(null)).toEqual({ pack: [], extra: null });
    expect(modelosDeMetadata(undefined)).toEqual({ pack: [], extra: null });
    expect(modelosDeMetadata("{}")).toEqual({ pack: [], extra: null });
  });

  it("datos rotos se filtran en lugar de romper", () => {
    expect(modelosDeMetadata({ modelos: ["azul", null, 3, ""], modelo_extra: 5 })).toEqual({
      pack: ["azul"],
      extra: null,
    });
    expect(modelosDeMetadata({ modelos: "azul" })).toEqual({ pack: [], extra: null });
  });
});
