import { describe, expect, it } from "vitest";
import { JUEGO_ACTIVO, RUTA_INICIO } from "./juego";
import { MODULOS_VISIBLES } from "@/modules/registry";

describe("interruptor del juego", () => {
  it("está apagado por defecto y la app arranca en el Archivo", () => {
    expect(JUEGO_ACTIVO).toBe(false);
    expect(RUTA_INICIO).toBe("/archivo");
  });
  it("sin juego solo se ven el Archivo, el Escritorio y los Ajustes", () => {
    expect(MODULOS_VISIBLES.map((m) => m.id)).toEqual(["archivo", "escritorio", "ajustes"]);
  });
});
