import { afterEach, describe, expect, it, vi } from "vitest";
import { correoOpcional, exigeVerificacionCorreo, variablesFaltantes } from "./config";

const base = { DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "x".repeat(40), BETTER_AUTH_URL: "https://umbral.test" };
const entorno = (v: Record<string, string>) => {
  for (const k of ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "SMTP_URL", "CORREO_OPCIONAL", "NODE_ENV"]) vi.stubEnv(k, "");
  for (const [k, val] of Object.entries(v)) vi.stubEnv(k, val);
};

describe("modo sin correo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("en producción exige SMTP y verificar el correo por defecto", () => {
    entorno({ ...base, NODE_ENV: "production" });
    expect(correoOpcional()).toBe(false);
    expect(exigeVerificacionCorreo()).toBe(true);
    expect(variablesFaltantes()).toContain("SMTP_URL");
  });

  it("con CORREO_OPCIONAL=1 no pide SMTP ni verificación", () => {
    entorno({ ...base, NODE_ENV: "production", CORREO_OPCIONAL: "1" });
    expect(correoOpcional()).toBe(true);
    expect(exigeVerificacionCorreo()).toBe(false);
    expect(variablesFaltantes()).toEqual([]);
  });

  it("solo el valor exacto «1» lo activa", () => {
    entorno({ ...base, NODE_ENV: "production", CORREO_OPCIONAL: "true" });
    expect(correoOpcional()).toBe(false);
  });
});
