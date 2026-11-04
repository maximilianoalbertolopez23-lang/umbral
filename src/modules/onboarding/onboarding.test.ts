import { describe, expect, it } from "vitest";
import { APARIENCIAS, APARIENCIA_IDS, getApariencia } from "./apariencias";
import { derivarPaso, type DatosOnboarding } from "./pasos";

const vacio: DatosOnboarding = { guardianaNombre: null, bibliotecaNombre: null, apariencia: null, completadoAt: null };

describe("derivarPaso (retomar onboarding)", () => {
  it("avanza según lo que ya está guardado", () => {
    expect(derivarPaso(vacio)).toBe("guardiana");
    expect(derivarPaso({ ...vacio, guardianaNombre: "Ana" })).toBe("biblioteca");
    expect(derivarPaso({ ...vacio, guardianaNombre: "Ana", bibliotecaNombre: "Mi archivo" })).toBe("apariencia");
    expect(derivarPaso({ guardianaNombre: "Ana", bibliotecaNombre: "Mi archivo", apariencia: "noche", completadoAt: null })).toBe("llaves");
    expect(derivarPaso({ guardianaNombre: "Ana", bibliotecaNombre: "Mi archivo", apariencia: "noche", completadoAt: "2026-11-02" })).toBe("completo");
  });
});

describe("apariencias", () => {
  it("las opciones son limitadas y coinciden con los ids permitidos", () => {
    expect(APARIENCIAS.map((a) => a.id)).toEqual([...APARIENCIA_IDS]);
  });

  it("los ids coinciden con el check de la migración SQL", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("db/migrations/0002_umbral_biblioteca.sql", "utf8");
    for (const id of APARIENCIA_IDS) expect(sql).toContain(`'${id}'`);
  });

  it("getApariencia cae a la primera ante un id desconocido", () => {
    expect(getApariencia("xxx").id).toBe("noche");
    expect(getApariencia(null).id).toBe("noche");
  });
});
