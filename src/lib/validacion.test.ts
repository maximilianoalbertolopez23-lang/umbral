import { describe, expect, it } from "vitest";
import {
  erroresPorCampo,
  esquemaApariencia,
  esquemaBiblioteca,
  esquemaGuardiana,
  esquemaIngreso,
  esquemaRegistro,
} from "./validacion";

describe("registro", () => {
  const base = { correo: "  Ana@Mail.COM ", contrasena: "12345678", confirmacion: "12345678" };

  it("normaliza el correo", () => {
    const r = esquemaRegistro.parse(base);
    expect(r.correo).toBe("ana@mail.com");
  });

  it("exige correo válido, contraseña de 8 a 72 y confirmación igual", () => {
    expect(esquemaRegistro.safeParse({ ...base, correo: "no-es-correo" }).success).toBe(false);
    expect(esquemaRegistro.safeParse({ ...base, contrasena: "corta", confirmacion: "corta" }).success).toBe(false);
    expect(esquemaRegistro.safeParse({ ...base, contrasena: "x".repeat(73), confirmacion: "x".repeat(73) }).success).toBe(false);
    const r = esquemaRegistro.safeParse({ ...base, confirmacion: "otra-cosa" });
    expect(r.success).toBe(false);
    if (!r.success) expect(erroresPorCampo(r.error)).toEqual({ confirmacion: "Las contraseñas no coinciden." });
  });
});

describe("ingreso", () => {
  it("rechaza campos vacíos con mensajes en español", () => {
    const r = esquemaIngreso.safeParse({ correo: "", contrasena: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erroresPorCampo(r.error);
      expect(e.correo).toBe("Ingresá tu correo.");
      expect(e.contrasena).toBe("Ingresá tu contraseña.");
    }
  });
});

describe("onboarding", () => {
  it("nombre de Guardiana: acepta acentos y rechaza símbolos o largos excesivos", () => {
    expect(esquemaGuardiana.parse({ nombre: "  Inés María " }).nombre).toBe("Inés María");
    expect(esquemaGuardiana.safeParse({ nombre: "A" }).success).toBe(false);
    expect(esquemaGuardiana.safeParse({ nombre: "<script>" }).success).toBe(false);
    expect(esquemaGuardiana.safeParse({ nombre: "x".repeat(41) }).success).toBe(false);
  });

  it("nombre de biblioteca: 2 a 60, sin < > ni control", () => {
    expect(esquemaBiblioteca.safeParse({ nombre: "El Archivo de los Mundos" }).success).toBe(true);
    expect(esquemaBiblioteca.safeParse({ nombre: "a<b" }).success).toBe(false);
    expect(esquemaBiblioteca.safeParse({ nombre: "x".repeat(61) }).success).toBe(false);
  });

  it("apariencia: solo las opciones permitidas", () => {
    expect(esquemaApariencia.safeParse({ apariencia: "alba" }).success).toBe(true);
    expect(esquemaApariencia.safeParse({ apariencia: "fucsia" }).success).toBe(false);
  });
});
