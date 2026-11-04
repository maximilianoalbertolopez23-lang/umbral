import { describe, expect, it } from "vitest";
import { MODULOS } from "@/modules/registry";
import {
  ALTO_ESCENA, ANCHO_ESCENA, ESTANTES_Y, OBJETOS, elegirLibroDestacado, generarLomos,
} from "./objetos";

const libro = (p: { estado?: string; fechaInicio?: string | null; creadoAt?: string }) => ({
  estado: "quiero_leer" as never, fechaInicio: null, creadoAt: "2026-01-01T00:00:00.000Z", ...p,
}) as Parameters<typeof elegirLibroDestacado>[0][number];

describe("objetos de la Gran Sala", () => {
  it("todos caben en la escena y tienen una acción definida", () => {
    for (const o of OBJETOS) {
      expect(o.x).toBeGreaterThanOrEqual(0);
      expect(o.y).toBeGreaterThanOrEqual(0);
      expect(o.x + o.ancho).toBeLessThanOrEqual(ANCHO_ESCENA);
      expect(o.y + o.alto).toBeLessThanOrEqual(ALTO_ESCENA);
      expect(o.accion.tipo).toBeTruthy();
      expect(o.nombre.length).toBeGreaterThan(10);
    }
  });

  it("los ids son únicos y los objetos que abren rutas apuntan a habitaciones reales", () => {
    expect(new Set(OBJETOS.map((o) => o.id)).size).toBe(OBJETOS.length);
    const rutas = new Set(MODULOS.map((m) => m.ruta));
    for (const o of OBJETOS) if (o.accion.tipo === "ruta") expect(rutas.has(o.accion.href as `/${string}`), o.id).toBe(true);
  });

  it("estantería, escritorio y taller abren El Archivo, El Escritorio y El Taller", () => {
    const ruta = (id: string) => OBJETOS.find((o) => o.id === id)?.accion;
    expect(ruta("estanteria")).toEqual({ tipo: "ruta", href: "/archivo" });
    expect(ruta("escritorio")).toEqual({ tipo: "ruta", href: "/escritorio" });
    expect(ruta("taller")).toEqual({ tipo: "ruta", href: "/taller" });
    expect(ruta("puerta")).toEqual({ tipo: "puerta" });
  });

  it("ningún objeto se superpone con otro (cada uno es un blanco claro)", () => {
    for (const [i, a] of OBJETOS.entries()) {
      for (const b of OBJETOS.slice(i + 1)) {
        const choca = a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
        expect(choca, `${a.id} / ${b.id}`).toBe(false);
      }
    }
  });
});

describe("libro destacado", () => {
  it("sin libros no hay libro destacado", () => {
    expect(elegirLibroDestacado([])).toBeNull();
  });

  it("prefiere el que se está leyendo (el de inicio más reciente)", () => {
    const a = libro({ estado: "leyendo", fechaInicio: "2026-03-01" });
    const b = libro({ estado: "leyendo", fechaInicio: "2026-05-01" });
    const c = libro({ estado: "terminado", creadoAt: "2026-09-01T00:00:00.000Z" });
    expect(elegirLibroDestacado([a, b, c])).toBe(b);
  });

  it("si no se lee ninguno, toma el último agregado", () => {
    const a = libro({ estado: "terminado", creadoAt: "2026-02-01T00:00:00.000Z" });
    const b = libro({ estado: "quiero_leer", creadoAt: "2026-08-01T00:00:00.000Z" });
    expect(elegirLibroDestacado([a, b])).toBe(b);
  });
});

describe("lomos de la estantería (colección real)", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `libro-${i}` }));

  it("sin libros los estantes quedan vacíos", () => {
    expect(generarLomos([])).toEqual({ lomos: [], restantes: 0 });
  });

  it("hay exactamente un lomo por libro mientras entren", () => {
    expect(generarLomos(ids(1)).lomos).toHaveLength(1);
    expect(generarLomos(ids(12)).lomos).toHaveLength(12);
    expect(generarLomos(ids(12)).restantes).toBe(0);
  });

  it("es determinista: el mismo libro siempre tiene el mismo lomo", () => {
    expect(generarLomos(ids(20))).toEqual(generarLomos(ids(20)));
  });

  it("los lomos quedan dentro de la estantería y apoyados en un estante", () => {
    const { lomos } = generarLomos(ids(60));
    expect(lomos.length).toBeGreaterThan(30);
    for (const l of lomos) {
      expect(l.x).toBeGreaterThanOrEqual(76);
      expect(l.x + l.ancho).toBeLessThanOrEqual(474);
      expect(ESTANTES_Y as readonly number[]).toContain(l.y + l.alto);
    }
  });

  it("si la colección no entra, informa cuántos libros quedaron afuera", () => {
    const { lomos, restantes } = generarLomos(ids(500));
    expect(lomos.length + restantes).toBe(500);
    expect(restantes).toBeGreaterThan(0);
  });
});
