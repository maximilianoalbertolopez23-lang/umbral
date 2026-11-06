import { describe, expect, it } from "vitest";
import { MODULOS, MODULOS_NUCLEO, getModulo } from "./registry";

describe("registro de módulos", () => {
  it("tiene ids, rutas y numerales únicos", () => {
    for (const campo of ["id", "ruta", "numeral"] as const) {
      const valores = MODULOS.map((m) => m[campo]);
      expect(new Set(valores).size).toBe(valores.length);
    }
  });

  it("el núcleo son las cinco habitaciones del mundo más los Ajustes", () => {
    expect(MODULOS_NUCLEO.map((m) => m.id)).toEqual(["sala", "archivo", "escritorio", "taller", "torre", "ajustes"]);
  });

  it("la ruta de cada módulo es su id", () => {
    for (const m of MODULOS) expect(m.ruta).toBe(`/${m.id}`);
  });

  it("solo los módulos ya implementados se declaran disponibles", () => {
    expect(MODULOS.filter((m) => m.estado === "disponible").map((m) => m.id)).toEqual(["sala", "archivo", "escritorio", "taller", "torre", "ajustes"]);
  });

  it("getModulo devuelve el módulo pedido", () => {
    expect(getModulo("torre").titulo).toBe("La Torre");
  });
});
