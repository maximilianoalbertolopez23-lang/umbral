import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/modules/archivo/repositorio";
import { guardarDisenoSala } from "../../src/modules/taller/repositorio";
import { agregarObjeto, type DisenoSala } from "../../src/modules/taller/sala";
import { comprarArticulo, ErrorTorre, obtenerInventario, obtenerProgreso, sincronizarProgreso } from "../../src/modules/torre/repositorio";

/** La Torre sobre Postgres real: premios únicos, inventario por usuario y uso real de lo adquirido en El Taller. */
const pg = new PGlite({ parsers: { [types.DATE]: (v: string) => v } });
const ANA = "usuaria-ana";
const BETO = "usuario-beto";
const CARLA = "usuaria-carla";

const adaptador: Db = {
  async query(sql, params) {
    const r = await pg.query(sql, params);
    return { rows: r.rows as never[], rowCount: r.rows.length || r.affectedRows || 0 };
  },
};

async function como<T>(uid: string, fn: (db: Db) => Promise<T>): Promise<T> {
  await pg.exec("begin");
  try {
    await pg.exec("set local role umbral_app");
    await pg.query("select set_config('app.user_id', $1, true)", [uid]);
    const r = await fn(adaptador);
    await pg.exec("commit");
    return r;
  } catch (e) {
    await pg.exec("rollback");
    throw e;
  }
}

const sync = (uid: string) => como(uid, (db) => sincronizarProgreso(db, uid));
const progreso = (uid: string) => como(uid, (db) => obtenerProgreso(db, uid));

async function libroTerminado(uid: string, titulo: string, extra = "") {
  const b = (await pg.query<{ id: string }>("select id from bibliotecas where user_id = $1", [uid])).rows[0].id;
  const l = await pg.query<{ id: string }>(
    `insert into libros (user_id, biblioteca_id, titulo, estado, paginas_total ${extra ? ", " + extra.split("|")[0] : ""})
     values ($1, $2, $3, 'terminado', 300 ${extra ? ", " + extra.split("|")[1] : ""}) returning id`,
    [uid, b, titulo],
  );
  await pg.query("insert into lecturas (libro_id, user_id, numero, estado, fecha_inicio, fecha_fin) values ($1, $2, 1, 'terminado', '2026-01-01', '2026-01-10')", [l.rows[0].id, uid]);
  return l.rows[0].id;
}

const TEXTO = "Una reseña con suficiente texto para contar como escrita de verdad, no como una página vacía.";
const bloqueTexto = (t: string) => [{ id: crypto.randomUUID(), tipo: "texto", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] } }];

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true), ('${CARLA}', 'carla', 'carla@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'B Ana'), ('${BETO}', 'B Beto'), ('${CARLA}', 'B Carla')`);
  await pg.exec(`insert into personalizaciones (biblioteca_id, user_id, apariencia) select id, user_id, 'alba' from bibliotecas`);
});

afterAll(() => pg.close());

describe("recompensas", () => {
  it("sin actividad no hay nada: ni castigo ni premio", async () => {
    expect(await sync(ANA)).toEqual([]);
    const p = await progreso(ANA);
    expect([p.xp, p.esencias, p.nivel.nivel]).toEqual([0, 0, 1]);
  });

  it("terminar un libro da XP y Esencias una sola vez, aunque se evalúe muchas veces", async () => {
    await libroTerminado(ANA, "Primero");
    const nuevos = await sync(ANA);
    expect(nuevos.map((n) => n.titulo)).toEqual(expect.arrayContaining([expect.stringContaining("Terminaste un libro"), expect.stringContaining("El primer libro")]));
    const antes = await progreso(ANA);
    expect(antes.xp).toBe(100 + 60);
    expect(antes.esencias).toBe(30 + 25);
    for (let i = 0; i < 3; i++) expect(await sync(ANA)).toEqual([]);
    expect(await progreso(ANA)).toMatchObject({ xp: antes.xp, esencias: antes.esencias });
    expect(antes.misiones.find((m) => m.def.id === "primer-libro")?.cumplida).toBe(true);
  });

  it("editar una reseña no vuelve a premiarla; una reseña vacía no cuenta", async () => {
    const libro = await libroTerminado(ANA, "Segundo");
    await pg.query("insert into diario_paginas (user_id, libro_id, tipo, contenido) values ($1, $2, 'resena', $3::jsonb)", [ANA, libro, JSON.stringify(bloqueTexto("corto"))]);
    await sync(ANA);
    expect((await progreso(ANA)).historial.some((e) => e.clave === `resena:${libro}`)).toBe(false);

    await pg.query("update diario_paginas set contenido = $2::jsonb where libro_id = $1 and tipo = 'resena'", [libro, JSON.stringify(bloqueTexto(TEXTO))]);
    await sync(ANA);
    const tras1 = await progreso(ANA);
    expect(tras1.historial.filter((e) => e.clave === `resena:${libro}`)).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      await pg.query("update diario_paginas set contenido = $2::jsonb where libro_id = $1 and tipo = 'resena'", [libro, JSON.stringify(bloqueTexto(TEXTO + " ".repeat(i + 1) + "más"))]);
      await sync(ANA);
    }
    expect((await progreso(ANA)).xp).toBe(tras1.xp);
  });

  it("borrar y volver a crear una reflexión el mismo día no da más XP (una por día)", async () => {
    const antes = (await progreso(ANA)).xp;
    for (let i = 0; i < 3; i++) {
      await pg.query("insert into diario_paginas (user_id, tipo, contenido) values ($1, 'reflexiones', $2::jsonb)", [ANA, JSON.stringify(bloqueTexto(TEXTO))]);
      await sync(ANA);
      await pg.query("delete from diario_paginas where user_id = $1 and tipo = 'reflexiones'", [ANA]);
    }
    const p = await progreso(ANA);
    expect(p.historial.filter((e) => e.clave.startsWith("reflexion:"))).toHaveLength(1);
    expect(p.xp).toBe(antes + 25);
  });

  it("completar una saga y leer fantasía alimentan sus misiones", async () => {
    await libroTerminado(BETO, "Saga 1", "saga, generos|'Los Reinos', ARRAY['Fantasía']");
    await libroTerminado(BETO, "Saga 2", "saga, generos|'Los Reinos', ARRAY['fantasia épica']");
    await sync(BETO);
    const p = await progreso(BETO);
    expect(p.metricas).toMatchObject({ librosTerminados: 2, sagasCompletas: 1, fantasiaTerminados: 2 });
    expect(p.misiones.find((m) => m.def.id === "una-saga")?.cumplida).toBe(true);
    expect(p.misiones.find((m) => m.def.id === "tres-fantasia")?.cumplida).toBe(false);
  });

  it("el libro mayor es de solo agregar y cada persona ve solo lo suyo", async () => {
    await expect(como(ANA, (db) => db.query("update eventos_progreso set xp = 99999"))).rejects.toThrow(/permission/i);
    await expect(como(ANA, (db) => db.query("delete from eventos_progreso"))).rejects.toThrow(/permission/i);
    await expect(como(ANA, (db) => db.query("insert into eventos_progreso (user_id, clave, tipo, titulo, xp) values ($1, 'x:trampa', 'actividad', 'x', 5)", [BETO]))).rejects.toThrow();
    const filas = await como(ANA, (db) => db.query<{ user_id: string }>("select user_id from eventos_progreso"));
    expect(new Set(filas.rows.map((f) => f.user_id))).toEqual(new Set([ANA]));
    // Un evento que no es compra no puede restar Esencias.
    await expect(pg.query("insert into eventos_progreso (user_id, clave, tipo, titulo, esencias) values ($1, 'x:neg', 'logro', 'x', -5)", [ANA])).rejects.toThrow(/check/i);
  });
});

describe("tienda e inventario", () => {
  it("no se puede comprar sin Esencias ni sin el piso necesario", async () => {
    await expect(como(CARLA, (db) => comprarArticulo(db, CARLA, "estilo:nocturno"))).rejects.toMatchObject({ codigo: "nivel" });
    await expect(como(CARLA, (db) => comprarArticulo(db, CARLA, "objeto:globo"))).rejects.toMatchObject({ codigo: "esencias" });
    await expect(como(CARLA, (db) => comprarArticulo(db, CARLA, "inventado:nada"))).rejects.toMatchObject({ codigo: "no_existe" });
    expect(await como(CARLA, (db) => obtenerInventario(db, CARLA))).toEqual([]);
    expect((await progreso(CARLA)).esencias).toBe(0);
  });

  it("comprar descuenta las Esencias, suma al inventario y no se puede repetir", async () => {
    const antes = (await progreso(ANA)).esencias;
    const r = await como(ANA, (db) => comprarArticulo(db, ANA, "objeto:globo"));
    expect(r.esencias).toBe(antes - 40);
    expect(await como(ANA, (db) => obtenerInventario(db, ANA))).toContain("objeto:globo");
    await expect(como(ANA, (db) => comprarArticulo(db, ANA, "objeto:globo"))).rejects.toMatchObject({ codigo: "ya_tienes" });
    expect((await progreso(ANA)).esencias).toBe(antes - 40);
  });

  it("el inventario de una persona no es visible ni modificable por otra", async () => {
    expect(await como(BETO, (db) => obtenerInventario(db, BETO))).toEqual([]);
    await expect(como(BETO, (db) => db.query("insert into inventario (user_id, clave, origen) values ($1, 'objeto:baul', 'compra')", [ANA]))).rejects.toThrow();
    await expect(como(BETO, (db) => db.query("update inventario set clave = 'objeto:baul'"))).rejects.toThrow(/permission/i);
  });

  it("flujo completo: un objeto de la tienda solo se puede usar en la sala si se tiene", async () => {
    let d: DisenoSala = { estilo: "clasica", objetos: [] };
    const r = agregarObjeto(d, "globo", "00000000-0000-4000-8000-000000000001");
    if (!r.ok) throw new Error(r.error);
    d = r.diseno;
    // Beto no tiene el globo: el servidor rechaza el diseño.
    await expect(como(BETO, (db) => guardarDisenoSala(db, BETO, d, 0))).rejects.toMatchObject({ codigo: "bloqueado" });
    // Ana lo compró: se guarda y queda en su sala.
    const g = await como(ANA, (db) => guardarDisenoSala(db, ANA, d, 0));
    expect(g.diseno.objetos.map((o) => o.tipo)).toEqual(["globo"]);
    // Y colocar un objeto en la sala alimenta el logro de «sala personalizada».
    await sync(ANA);
    expect((await progreso(ANA)).misiones.find((m) => m.def.id === "primera-habitacion")?.cumplida).toBe(true);
  });

  it("un logro con recompensa de objeto lo agrega al inventario una sola vez", async () => {
    for (let i = 0; i < 8; i++) await libroTerminado(BETO, `Extra ${i}`);
    await sync(BETO);
    await sync(BETO);
    const inv = await como(BETO, (db) => obtenerInventario(db, BETO));
    expect(inv.filter((c) => c === "objeto:globo")).toHaveLength(1);
    expect((await progreso(BETO)).logros.find((l) => l.def.id === "biblioteca-viva")?.obtenido).toBe(true);
  });
});
