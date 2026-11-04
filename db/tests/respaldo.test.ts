import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/modules/archivo/repositorio";
import { exportarDatos } from "../../src/modules/respaldo/exportar";
import { ErrorRespaldo, importarRespaldo } from "../../src/modules/respaldo/importar";

/** Exportar → perder datos → importar, sobre Postgres real: fiel, idempotente, solo suma y sin fabricar progreso. */
const pg = new PGlite({ parsers: { [types.DATE]: (v: string) => v } });
const ANA = "usuaria-ana";
const BETO = "usuario-beto";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

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

const exportado = async (uid: string) => JSON.parse(JSON.stringify(await como(uid, exportarDatos)));
const cuenta = async (tabla: string, uid: string) =>
  Number((await pg.query<{ n: string }>(`select count(*) n from ${tabla} where user_id = $1`, [uid])).rows[0].n);
const bloque = (t: string) => [{ id: crypto.randomUUID(), tipo: "texto", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] } }];

let libroId = "";
let paginaId = "";
let plantillaId = "";

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'B Ana'), ('${BETO}', 'B Beto')`);
  await pg.exec("insert into personalizaciones (biblioteca_id, user_id, apariencia) select id, user_id, 'alba' from bibliotecas");

  const bib = (await pg.query<{ id: string }>("select id from bibliotecas where user_id = $1", [ANA])).rows[0].id;
  libroId = (await pg.query<{ id: string }>(
    "insert into libros (user_id, biblioteca_id, titulo, autores, estado, paginas_total, saga, saga_numero) values ($1, $2, 'Dune', '{Frank Herbert}', 'terminado', 300, 'Dune', 1.5) returning id", [ANA, bib])).rows[0].id;
  const lectura = (await pg.query<{ id: string }>(
    "insert into lecturas (libro_id, user_id, numero, estado, fecha_inicio, fecha_fin, pagina_actual) values ($1, $2, 1, 'terminado', '2026-01-01', '2026-01-10', 300) returning id", [libroId, ANA])).rows[0].id;
  await pg.query("insert into sesiones_lectura (lectura_id, user_id, fecha, pagina_inicio, pagina_fin, minutos, nota) values ($1, $2, '2026-01-02', 0, 50, 30, 'buen comienzo')", [lectura, ANA]);
  await pg.query("insert into portadas (libro_id, user_id, mime, datos) values ($1, $2, 'image/png', $3)", [libroId, ANA, PNG]);
  plantillaId = (await pg.query<{ id: string }>("insert into plantillas_journal (user_id, nombre, base, ajustes) values ($1, 'Mi plantilla', 'archivo', '{}') returning id", [ANA])).rows[0].id;
  paginaId = (await pg.query<{ id: string }>(
    "insert into diario_paginas (user_id, libro_id, tipo, titulo, contenido, plantilla_custom_id) values ($1, $2, 'resena', 'Reseña', $3::jsonb, $4) returning id",
    [ANA, libroId, JSON.stringify(bloque("Una reseña con tildes: ñandú, canción.")), plantillaId])).rows[0].id;
  await pg.query("insert into diario_imagenes (user_id, pagina_id, mime, datos) values ($1, $2, 'image/png', $3)", [ANA, paginaId, PNG]);
});

afterAll(() => pg.close());

describe("respaldo", () => {
  let archivo: Awaited<ReturnType<typeof exportado>>;

  it("exporta solo lo propio, con binarios en base64", async () => {
    archivo = await exportado(ANA);
    expect(archivo.datos.libros).toHaveLength(1);
    expect(archivo.datos.portadas[0].datos).toBe(PNG.toString("base64"));
    expect((await exportado(BETO)).datos.libros).toHaveLength(0);
  });

  it("restaura fielmente tras perder los datos y no duplica al repetir", async () => {
    await pg.exec(`delete from libros where user_id = '${ANA}'; delete from plantillas_journal where user_id = '${ANA}'`);
    expect(await cuenta("libros", ANA)).toBe(0);

    const r = await como(ANA, (db) => importarRespaldo(db, ANA, archivo));
    expect(r.nuevos).toMatchObject({ libros: 1, lecturas: 1, sesiones_lectura: 1, portadas: 1, diario_paginas: 1, diario_imagenes: 1, plantillas_journal: 1 });

    const libro = (await pg.query<{ id: string; titulo: string; saga_numero: string; user_id: string }>("select * from libros where user_id = $1", [ANA])).rows[0];
    expect(libro).toMatchObject({ id: libroId, titulo: "Dune", saga_numero: "1.5" });
    const pagina = (await pg.query<{ contenido: unknown; plantilla_custom_id: string }>("select contenido, plantilla_custom_id from diario_paginas where id = $1", [paginaId])).rows[0];
    expect(JSON.stringify(pagina.contenido)).toContain("ñandú, canción");
    expect(pagina.plantilla_custom_id).toBe(plantillaId);
    const portada = (await pg.query<{ datos: Uint8Array }>("select datos from portadas where libro_id = $1", [libroId])).rows[0];
    expect(Buffer.from(portada.datos).equals(PNG)).toBe(true);

    const otra = await como(ANA, (db) => importarRespaldo(db, ANA, archivo));
    expect(Object.values(otra.nuevos).every((n) => n === 0)).toBe(true);
    expect(await cuenta("libros", ANA)).toBe(1);
    expect(await cuenta("diario_paginas", ANA)).toBe(1);
  });

  it("solo suma: no pisa lo que ya existe", async () => {
    await pg.query("update libros set titulo = 'Editado después' where id = $1", [libroId]);
    await como(ANA, (db) => importarRespaldo(db, ANA, archivo));
    expect((await pg.query<{ titulo: string }>("select titulo from libros where id = $1", [libroId])).rows[0].titulo).toBe("Editado después");
  });

  it("ignora el user_id del archivo y no importa progreso ni inventario", async () => {
    const copia = structuredClone(archivo);
    const nuevoId = crypto.randomUUID();
    copia.datos.libros = [{ ...copia.datos.libros[0], id: nuevoId, user_id: BETO, titulo: "Libro nuevo" }];
    copia.datos.lecturas = [];
    copia.datos.sesiones_lectura = [];
    copia.datos.portadas = [];
    copia.datos.diario_paginas = [];
    copia.datos.diario_imagenes = [];
    copia.datos.plantillas_journal = [];
    copia.datos.eventos_progreso = [{ clave: "trampa:1", tipo: "actividad", titulo: "x", xp: 99999, esencias: 99999 }];
    copia.datos.inventario = [{ clave: "objeto:globo", origen: "compra" }];
    await como(ANA, (db) => importarRespaldo(db, ANA, copia));
    expect((await pg.query<{ user_id: string }>("select user_id from libros where id = $1", [nuevoId])).rows[0].user_id).toBe(ANA);
    expect(await cuenta("eventos_progreso", ANA)).toBe(0);
    expect(await cuenta("inventario", ANA)).toBe(0);
  });

  it("no mezcla cuentas: datos de otra cuenta de la misma base se rechazan sin importar nada", async () => {
    await expect(como(BETO, (db) => importarRespaldo(db, BETO, archivo))).rejects.toBeInstanceOf(ErrorRespaldo);
    expect(await cuenta("libros", BETO)).toBe(0);
  });

  it("rechaza archivos ajenos, contenido no permitido e imágenes falsas, sin importar nada", async () => {
    await expect(como(ANA, (db) => importarRespaldo(db, ANA, { aplicacion: "Otra", formato: 1, datos: {} }))).rejects.toBeInstanceOf(ErrorRespaldo);
    await expect(como(ANA, (db) => importarRespaldo(db, ANA, "texto"))).rejects.toBeInstanceOf(ErrorRespaldo);

    const html = structuredClone(archivo);
    html.datos.diario_paginas = [{ ...html.datos.diario_paginas[0], id: crypto.randomUUID(), contenido: [{ id: crypto.randomUUID(), tipo: "html", html: "<script>alert(1)</script>" }] }];
    await expect(como(ANA, (db) => importarRespaldo(db, ANA, html))).rejects.toBeInstanceOf(ErrorRespaldo);

    const falsa = structuredClone(archivo);
    falsa.datos.diario_imagenes = [{ ...falsa.datos.diario_imagenes[0], id: crypto.randomUUID(), datos: Buffer.from("<svg onload=alert(1)>").toString("base64") }];
    await expect(como(ANA, (db) => importarRespaldo(db, ANA, falsa))).rejects.toBeInstanceOf(ErrorRespaldo);
    expect(await cuenta("diario_imagenes", ANA)).toBe(1);
  });
});
