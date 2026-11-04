import { describe, expect, it } from "vitest";
import { coberturaUV } from "./cobertura";

describe("coberturaUV (equivale a object-fit: cover)", () => {
  it("pantalla más ancha que la imagen: se recorta arriba y abajo", () => {
    const [sx, sy] = coberturaUV(2, 16 / 9);
    expect(sx).toBe(1);
    expect(sy).toBeCloseTo(0.889, 2);
  });
  it("pantalla más angosta (celular): se recortan los costados", () => {
    const [sx, sy] = coberturaUV(0.5, 16 / 9);
    expect(sy).toBe(1);
    expect(sx).toBeCloseTo(0.281, 2);
  });
  it("misma proporción: se ve entera; valores inválidos no rompen", () => {
    expect(coberturaUV(16 / 9, 16 / 9)).toEqual([1, 1]);
    expect(coberturaUV(0, 1.7)).toEqual([1, 1]);
    expect(coberturaUV(NaN, 1.7)).toEqual([1, 1]);
  });
});
