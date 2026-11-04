import { describe, expect, it } from "vitest";
import { FRASES_GENERALES, extraerCitas, frasesGuardadas, mezclar } from "./frases";

const cita = (texto: string, autor = "") => ({ id: "x", tipo: "cita", texto, autor, pagina: "" });

describe("frases de carga", () => {
  it("extrae solo citas válidas, sin repetir y recortando las largas", () => {
    const r = extraerCitas([
      [cita("Una frase que quiero guardar.", "Ana"), { tipo: "texto", texto: "no es cita" }, cita("corta")],
      [cita("Una frase que quiero guardar."), cita("x".repeat(500))],
      "basura",
      null,
    ]);
    expect(r.map((f) => f.autor)).toEqual(["Ana", undefined]);
    expect(r[1].texto.length).toBeLessThanOrEqual(240);
    expect(r.every((f) => f.propia)).toBe(true);
  });

  it("respeta el máximo", () => {
    const muchas = Array.from({ length: 30 }, (_, i) => cita(`Frase número ${i} del journal`));
    expect(extraerCitas([muchas], 5)).toHaveLength(5);
  });

  it("sin citas propias usa las generales; con propias las intercala", () => {
    expect(mezclar([])).toEqual([...FRASES_GENERALES]);
    const propias = extraerCitas([[cita("Primera cita guardada"), cita("Segunda cita guardada"), cita("Tercera cita guardada")]]);
    const m = mezclar(propias);
    expect(m.filter((f) => f.propia)).toHaveLength(3);
    expect(m.length).toBe(5);
  });

  it("descarta lo que no tenga forma de frase al leer el almacenamiento", () => {
    expect(frasesGuardadas("x")).toEqual([]);
    expect(frasesGuardadas([{ texto: "ok" }, { texto: 5 }, null, { texto: "" }])).toEqual([{ texto: "ok", autor: undefined, propia: true }]);
  });
});
