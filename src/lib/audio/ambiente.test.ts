import { describe, expect, it } from "vitest";
import { ACORDES, NOTAS_ARPA, SEGUNDOS_POR_ACORDE } from "./ambiente";

describe("música ambiente", () => {
  it("los acordes son cuatro, graves y de cuatro voces (sonido suave, sin agudos molestos)", () => {
    expect(ACORDES).toHaveLength(4);
    for (const a of ACORDES) {
      expect(a).toHaveLength(4);
      for (const f of a) {
        expect(f).toBeGreaterThan(100);
        expect(f).toBeLessThan(400);
      }
    }
  });
  it("las notas de arpa están ordenadas, en el registro medio-agudo y sin repetirse", () => {
    expect([...NOTAS_ARPA].sort((a, b) => a - b)).toEqual([...NOTAS_ARPA]);
    expect(new Set(NOTAS_ARPA).size).toBe(NOTAS_ARPA.length);
    expect(Math.min(...NOTAS_ARPA)).toBeGreaterThan(250);
    expect(Math.max(...NOTAS_ARPA)).toBeLessThan(800);
  });
  it("cada acorde dura lo suficiente para sentirse lento", () => {
    expect(SEGUNDOS_POR_ACORDE).toBeGreaterThanOrEqual(10);
  });
});
