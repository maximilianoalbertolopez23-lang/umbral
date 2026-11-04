import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/modules/taller/catalogo";
import { BORDES, FONDOS, ORNAMENTOS } from "@/modules/taller/journal";
import { ESTILOS_SALA } from "@/modules/taller/sala";
import {
  ACTIVIDADES, LOGROS, METRICAS_VACIAS, MISIONES, TIENDA, estadoNivel, eventosPendientes, puedeUsar, xpParaNivel,
} from "./reglas";

describe("niveles", () => {
  it("crecen de forma continua y el nivel 1 empieza en 0", () => {
    expect(xpParaNivel(1)).toBe(0);
    expect(estadoNivel(0)).toMatchObject({ nivel: 1, xpEnNivel: 0 });
    expect(estadoNivel(99).nivel).toBe(1);
    expect(estadoNivel(100).nivel).toBe(2);
    expect(estadoNivel(300).nivel).toBe(3);
    const e = estadoNivel(150);
    expect(e.progreso).toBeCloseTo(50 / 200);
  });

  it("nunca falla con valores raros ni con niveles altos", () => {
    expect(estadoNivel(-5).nivel).toBe(1);
    expect(estadoNivel(10_000_000).titulo).toBeTruthy();
  });
});

describe("misiones y logros", () => {
  it("tienen ids únicos y metas positivas", () => {
    for (const lista of [MISIONES, LOGROS]) {
      expect(new Set(lista.map((x) => x.id)).size).toBe(lista.length);
      for (const x of lista) expect(x.meta.objetivo).toBeGreaterThan(0);
    }
  });

  it("no otorgan nada sin cumplir la meta y no repiten lo ya otorgado", () => {
    expect(eventosPendientes(METRICAS_VACIAS, new Set())).toEqual([]);
    const m = { ...METRICAS_VACIAS, librosTerminados: 1 };
    const primero = eventosPendientes(m, new Set());
    expect(primero.map((e) => e.clave)).toEqual(["mision:primer-libro"]);
    expect(eventosPendientes(m, new Set(primero.map((e) => e.clave)))).toEqual([]);
  });

  it("las recompensas nunca restan", () => {
    for (const x of [...MISIONES.map((m) => m.recompensa), ...LOGROS.flatMap((l) => (l.recompensa ? [l.recompensa] : []))]) {
      expect(x.xp).toBeGreaterThanOrEqual(0);
      expect(x.esencias).toBeGreaterThanOrEqual(0);
    }
    for (const a of Object.values(ACTIVIDADES)) expect(a.xp).toBeGreaterThan(0);
  });

  it("los objetos regalados existen en la tienda", () => {
    const claves = new Set(TIENDA.map((a) => a.clave));
    for (const x of [...MISIONES.map((m) => m.recompensa), ...LOGROS.flatMap((l) => (l.recompensa ? [l.recompensa] : []))]) {
      for (const i of x.items ?? []) expect(claves.has(i), i).toBe(true);
    }
  });
});

describe("tienda", () => {
  it("cada artículo apunta a algo que existe en El Taller", () => {
    const existe: Record<string, (id: string) => boolean> = {
      objeto: (id) => CATALOGO.some((i) => i.id === id),
      estilo: (id) => (ESTILOS_SALA as readonly string[]).includes(id),
      fondo: (id) => id in FONDOS,
      borde: (id) => id in BORDES,
      ornamento: (id) => id in ORNAMENTOS,
    };
    expect(new Set(TIENDA.map((a) => a.clave)).size).toBe(TIENDA.length);
    for (const a of TIENDA) {
      expect(a.clave.startsWith(`${a.tipo}:`)).toBe(true);
      expect(existe[a.tipo](a.clave.slice(a.tipo.length + 1)), a.clave).toBe(true);
      expect(a.precio).toBeGreaterThan(0);
    }
  });

  it("lo que no está en la tienda es libre y lo de la tienda exige inventario", () => {
    expect(puedeUsar("objeto:puf", new Set())).toBe(true);
    expect(puedeUsar("estilo:clasica", new Set())).toBe(true);
    expect(puedeUsar("objeto:globo", new Set())).toBe(false);
    expect(puedeUsar("objeto:globo", new Set(["objeto:globo"]))).toBe(true);
  });
});
