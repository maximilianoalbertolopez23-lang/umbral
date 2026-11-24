import { describe, expect, it } from "vitest";
import { animoDe, frasesDe } from "./companera";

describe("compañera", () => {
  it("se alegra con recompensas nuevas, por encima de todo", () => {
    expect(animoDe({ recompensasNuevas: 2, libroEnCurso: "Dune" })).toBe("contenta");
  });
  it("lee con vos si hay un libro en curso y duerme si no", () => {
    expect(animoDe({ recompensasNuevas: 0, libroEnCurso: "Dune" })).toBe("leyendo");
    expect(animoDe({ recompensasNuevas: 0, libroEnCurso: null })).toBe("dormida");
  });
  it("nombra el libro y siempre tiene qué decir", () => {
    expect(frasesDe("leyendo", "Dune")[0]).toContain("Dune");
    for (const a of ["contenta", "leyendo", "dormida"] as const) expect(frasesDe(a, "x").length).toBeGreaterThan(0);
  });
});
