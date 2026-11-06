import { describe, expect, it } from "vitest";
import { RUTA_INICIO } from "@/lib/juego";
import { MENSAJE_GENERICO, mensajeErrorAuth } from "./errores";
import { rutaSegura } from "./redireccion";

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/archivo")).toBe("/archivo");
    expect(rutaSegura("/sala?x=1")).toBe("/sala?x=1");
  });

  it("rechaza destinos externos o maliciosos", () => {
    for (const malo of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "/a\nb", "", null, undefined]) {
      expect(rutaSegura(malo), String(malo)).toBe(RUTA_INICIO);
    }
  });
});

describe("mensajeErrorAuth", () => {
  it("traduce códigos conocidos", () => {
    expect(mensajeErrorAuth({ code: "INVALID_EMAIL_OR_PASSWORD" })).toMatch(/no son correctos/);
    expect(mensajeErrorAuth({ code: "EMAIL_NOT_VERIFIED" })).toMatch(/confirmaste/);
  });

  it("usa mensaje de límite de intentos con status 429", () => {
    expect(mensajeErrorAuth({ status: 429 })).toMatch(/demasiados intentos/);
  });

  it("no filtra textos internos desconocidos", () => {
    expect(mensajeErrorAuth({ code: "ALGO_INTERNO_RARO" })).toBe(MENSAJE_GENERICO);
    expect(mensajeErrorAuth(null)).toBe(MENSAJE_GENERICO);
  });
});
