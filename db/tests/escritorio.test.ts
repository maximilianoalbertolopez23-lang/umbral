import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearLibro, eliminarLibro, aplicarEstado, type Db } from "../../src/modules/archivo/repositorio";
import type { LibroInput } from "../../src/modules/archivo/tipos";
import { crearBloque, type Bloque } from "../../src/modules/escritorio/bloques";
import {
  aplicarPlantillaAAmbito, contarPaginasPorLibro, crearPagina, eliminarDefinitivamente, eliminarPagina, ErrorEscritorio,
  estadisticasAnio, guardarImagen, guardarPagina, guardarPlantillaPreferida, listarPaginas, listarPapelera, obtenerImagen,
  obtenerPagina, reordenarPaginas, restaurarPagina,
} from "../../src/modules/escritorio/repositorio";

/** Pruebas del Escritorio contra Postgres real (PGlite): todas las migraciones y el mismo código que usa la app. */
const pg = new PGlite({ parsers: { [types.DATE]: (v: string) => v } });
const ANA = "usuaria-ana";
const BETO = "usuario-beto";
const LLENA = "usuaria-llena";

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

const libroBase: LibroInput = {
  titulo: "Dune", autores: ["Frank Herbert"], isbn: null, saga: null, sagaNumero: null, generos: [], etiquetas: [],
  paginasTotal: 500, sinopsis: null, estado: "quiero_leer", fechaInicio: null, fechaFin: null, calificacion: null,
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const HOY = "2026-11-02";
let libroAna = "";
let libroBeto = "";

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true), ('${LLENA}', 'llena', 'l@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'B Ana'), ('${BETO}', 'B Beto'), ('${LLENA}', 'B Llena')`);
  libroAna = await como(ANA, (db) => crearLibro(db, ANA, libroBase));
  libroBeto = await como(BETO, (db) => crearLibro(db, BETO, { ...libroBase, titulo: "Libro de Beto" }));
});

afterAll(() => pg.close());

const texto = (t: string): Bloque => ({
  id: crypto.randomUUID(), tipo: "texto",
  doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] },
});

describe("crear y leer páginas", () => {
  it("crea páginas de libro y del diario general con contenido inicial válido y orden creciente", async () => {
    const a = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "resena" }));
    const b = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "citas" }));
    const g = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "objetivos" }));
    const pa = await como(ANA, (db) => obtenerPagina(db, ANA, a));
    expect(pa).toMatchObject({ tipo: "resena", titulo: "Mi reseña", estado: "borrador", plantilla: "pergamino", version: 1 });
    expect(pa?.libro).toMatchObject({ id: libroAna, titulo: "Dune" });
    expect(pa?.bloques).toHaveLength(1);
    const lista = await como(ANA, (db) => listarPaginas(db, ANA, libroAna));
    expect(lista.map((p) => p.id)).toEqual([a, b]);
    expect(lista.map((p) => p.orden)).toEqual([0, 1]);
    const general = await como(ANA, (db) => listarPaginas(db, ANA, null));
    expect(general.map((p) => p.id)).toEqual([g]);
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, g)))?.libro).toBeNull();
    expect(await como(ANA, (db) => contarPaginasPorLibro(db, ANA))).toEqual({ [libroAna]: 2 });
  });

  it("rechaza páginas para libros inexistentes o ajenos", async () => {
    await expect(como(ANA, (db) => crearPagina(db, ANA, { libroId: libroBeto, tipo: "libre" }))).rejects.toMatchObject({ codigo: "libro_inexistente" });
    await expect(como(ANA, (db) => crearPagina(db, ANA, { libroId: "00000000-0000-4000-8000-000000000000", tipo: "libre" }))).rejects.toBeInstanceOf(ErrorEscritorio);
  });

  it("aplica el límite de páginas por persona", async () => {
    await pg.exec(`insert into diario_paginas (user_id, tipo) select '${LLENA}', 'libre' from generate_series(1, 500)`);
    await expect(como(LLENA, (db) => crearPagina(db, LLENA, { libroId: null, tipo: "libre" }))).rejects.toMatchObject({ codigo: "limite_paginas" });
  });
});

describe("guardar (autosave) y control de versiones", () => {
  it("persiste título, bloques, estado y plantilla; la versión sube en cada guardado", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "libre" }));
    const bloques: Bloque[] = [{ id: crypto.randomUUID(), tipo: "titulo", nivel: 1, texto: "Mi página" }, texto("Contenido <b>literal</b>"), crearBloque("separador", HOY)];
    const v2 = await como(ANA, (db) => guardarPagina(db, ANA, id, { version: 1, titulo: "Título", bloques, plantilla: "archivo", estado: "publicada" }));
    expect(v2).toBe(2);
    const p = await como(ANA, (db) => obtenerPagina(db, ANA, id));
    expect(p).toMatchObject({ titulo: "Título", plantilla: "archivo", estado: "publicada", version: 2 });
    expect(p?.bloques).toEqual(bloques);
    const v3 = await como(ANA, (db) => guardarPagina(db, ANA, id, { version: 2, titulo: "Título 2", bloques: bloques.slice(0, 2), plantilla: "archivo", estado: "borrador" }));
    expect(v3).toBe(3);
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, id)))?.bloques).toHaveLength(2);
  });

  it("un guardado con una versión vieja es un conflicto y no pisa nada", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "libre" }));
    await como(ANA, (db) => guardarPagina(db, ANA, id, { version: 1, titulo: "Pestaña A", bloques: [texto("A")], plantilla: "pergamino", estado: "borrador" }));
    await expect(
      como(ANA, (db) => guardarPagina(db, ANA, id, { version: 1, titulo: "Pestaña B", bloques: [texto("B")], plantilla: "pergamino", estado: "borrador" })),
    ).rejects.toMatchObject({ codigo: "conflicto" });
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, id)))?.titulo).toBe("Pestaña A");
  });

  it("guardar una página inexistente o eliminada falla con 'no encontrada'", async () => {
    await expect(
      como(ANA, (db) => guardarPagina(db, ANA, "00000000-0000-4000-8000-000000000000", { version: 1, titulo: "x", bloques: [], plantilla: "pergamino", estado: "borrador" })),
    ).rejects.toMatchObject({ codigo: "no_encontrada" });
  });

  it("el índice muestra un fragmento del texto", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre", titulo: "Fragmento" }));
    await como(ANA, (db) => guardarPagina(db, ANA, id, { version: 1, titulo: "Fragmento", bloques: [texto("Me encantó el final.")], plantilla: "pergamino", estado: "borrador" }));
    const lista = await como(ANA, (db) => listarPaginas(db, ANA, null));
    expect(lista.find((p) => p.id === id)?.fragmento).toBe("Me encantó el final.");
  });
});

describe("organizar páginas", () => {
  it("reordena las páginas de un ámbito y rechaza listas incompletas", async () => {
    const x = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "libre", titulo: "X" }));
    const antes = (await como(ANA, (db) => listarPaginas(db, ANA, libroAna))).map((p) => p.id);
    const nuevo = [x, ...antes.filter((i) => i !== x)];
    await como(ANA, (db) => reordenarPaginas(db, ANA, libroAna, nuevo));
    expect((await como(ANA, (db) => listarPaginas(db, ANA, libroAna))).map((p) => p.id)).toEqual(nuevo);
    await expect(como(ANA, (db) => reordenarPaginas(db, ANA, libroAna, nuevo.slice(1)))).rejects.toBeInstanceOf(ErrorEscritorio);
    await expect(como(ANA, (db) => reordenarPaginas(db, ANA, libroAna, [...nuevo.slice(1), nuevo[1]]))).rejects.toBeInstanceOf(ErrorEscritorio);
  });

  it("cambiar de plantilla no toca el contenido; se puede aplicar a todo el ámbito", async () => {
    const antes = await como(ANA, (db) => listarPaginas(db, ANA, libroAna));
    const contenido = await Promise.all(antes.map((p) => como(ANA, (db) => obtenerPagina(db, ANA, p.id))));
    await como(ANA, (db) => aplicarPlantillaAAmbito(db, ANA, libroAna, "editorial"));
    const despues = await Promise.all(antes.map((p) => como(ANA, (db) => obtenerPagina(db, ANA, p.id))));
    expect(despues.every((p) => p?.plantilla === "editorial")).toBe(true);
    expect(despues.map((p) => p?.bloques)).toEqual(contenido.map((p) => p?.bloques));
  });

  it("las páginas nuevas usan la plantilla preferida", async () => {
    await como(ANA, (db) => guardarPlantillaPreferida(db, ANA, "archivo"));
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, id)))?.plantilla).toBe("archivo");
  });
});

describe("papelera y recuperación", () => {
  it("eliminar manda a la papelera, restaurar la devuelve al final y solo la papelera se borra para siempre", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "libre", titulo: "Efímera" }));
    expect(await como(ANA, (db) => eliminarDefinitivamente(db, ANA, id))).toBe(false); // activa: no se puede borrar de golpe
    expect(await como(ANA, (db) => eliminarPagina(db, ANA, id))).toBe(true);
    expect(await como(ANA, (db) => obtenerPagina(db, ANA, id))).toBeNull();
    expect((await como(ANA, (db) => listarPaginas(db, ANA, libroAna))).some((p) => p.id === id)).toBe(false);
    const papelera = await como(ANA, (db) => listarPapelera(db, ANA));
    expect(papelera.find((p) => p.id === id)).toMatchObject({ titulo: "Efímera", libroTitulo: "Dune" });
    expect(await como(ANA, (db) => restaurarPagina(db, ANA, id))).toBe(true);
    const lista = await como(ANA, (db) => listarPaginas(db, ANA, libroAna));
    expect(lista.at(-1)?.id).toBe(id);
    await como(ANA, (db) => eliminarPagina(db, ANA, id));
    expect(await como(ANA, (db) => eliminarDefinitivamente(db, ANA, id))).toBe(true);
    expect((await como(ANA, (db) => listarPapelera(db, ANA))).some((p) => p.id === id)).toBe(false);
  });

  it("no se puede guardar en una página eliminada", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    await como(ANA, (db) => eliminarPagina(db, ANA, id));
    await expect(
      como(ANA, (db) => guardarPagina(db, ANA, id, { version: 1, titulo: "x", bloques: [], plantilla: "pergamino", estado: "borrador" })),
    ).rejects.toMatchObject({ codigo: "no_encontrada" });
  });
});

describe("imágenes", () => {
  it("guarda y sirve imágenes solo de páginas propias", async () => {
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "recuerdos" }));
    const img = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    const leida = await como(ANA, (db) => obtenerImagen(db, ANA, img));
    expect(leida?.mime).toBe("image/png");
    expect([...leida!.datos]).toEqual([...PNG]);
    expect(await como(BETO, (db) => obtenerImagen(db, BETO, img))).toBeNull();
    await expect(como(BETO, (db) => guardarImagen(db, BETO, pagina, { mime: "image/png", datos: PNG }))).rejects.toMatchObject({ codigo: "no_encontrada" });
  });

  it("la base rechaza imágenes de más de 800 KB o de tipos no permitidos", async () => {
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "recuerdos" }));
    await expect(como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: new Uint8Array(800_001) }))).rejects.toThrow(/check/i);
    await expect(como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/svg+xml", datos: PNG }))).rejects.toThrow(/check/i);
  });

  it("al guardar se limpian las imágenes viejas que ya no están en la página, y se conservan las recientes y las usadas", async () => {
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "recuerdos" }));
    const usada = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    const huerfanaVieja = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    const huerfanaNueva = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    await pg.exec(`update diario_imagenes set created_at = now() - interval '3 days' where id in ('${usada}', '${huerfanaVieja}')`);
    const bloques: Bloque[] = [{ id: crypto.randomUUID(), tipo: "imagen", imagenId: usada, pie: "", ancho: "normal" }];
    await como(ANA, (db) => guardarPagina(db, ANA, pagina, { version: 1, titulo: "", bloques, plantilla: "pergamino", estado: "borrador" }));
    expect(await como(ANA, (db) => obtenerImagen(db, ANA, usada))).not.toBeNull();
    expect(await como(ANA, (db) => obtenerImagen(db, ANA, huerfanaVieja))).toBeNull();
    expect(await como(ANA, (db) => obtenerImagen(db, ANA, huerfanaNueva))).not.toBeNull();
  });

  it("las imágenes de una página eliminada no se sirven", async () => {
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "recuerdos" }));
    const img = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    await como(ANA, (db) => eliminarPagina(db, ANA, pagina));
    expect(await como(ANA, (db) => obtenerImagen(db, ANA, img))).toBeNull();
  });
});

describe("integración con El Archivo", () => {
  it("borrar un libro borra en cascada sus páginas e imágenes del journal", async () => {
    const libro = await como(ANA, (db) => crearLibro(db, ANA, { ...libroBase, titulo: "Efímero" }));
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libro, tipo: "recuerdos" }));
    const img = await como(ANA, (db) => guardarImagen(db, ANA, pagina, { mime: "image/png", datos: PNG }));
    await como(ANA, (db) => eliminarLibro(db, ANA, libro));
    expect(await como(ANA, (db) => obtenerPagina(db, ANA, pagina))).toBeNull();
    expect(await como(ANA, (db) => obtenerImagen(db, ANA, img))).toBeNull();
    const restos = await pg.query(`select (select count(*)::int from diario_paginas where id = $1) p, (select count(*)::int from diario_imagenes where id = $2) i`, [pagina, img]);
    expect(restos.rows[0]).toEqual({ p: 0, i: 0 });
  });

  it("el resumen de lecturas sale de los datos reales del Archivo", async () => {
    const a = await como(ANA, (db) => crearLibro(db, ANA, { ...libroBase, titulo: "R1", paginasTotal: 300, estado: "terminado", fechaInicio: "2026-02-01", fechaFin: "2026-02-10", calificacion: 4 }));
    await como(ANA, (db) => crearLibro(db, ANA, { ...libroBase, titulo: "R2", paginasTotal: 200, estado: "terminado", fechaInicio: "2026-03-01", fechaFin: "2026-03-05", calificacion: 5 }));
    await como(ANA, (db) => crearLibro(db, ANA, { ...libroBase, titulo: "R-2025", paginasTotal: 999, estado: "terminado", fechaInicio: "2025-12-01", fechaFin: "2025-12-20" }));
    await como(ANA, (db) => crearLibro(db, ANA, { ...libroBase, titulo: "En curso", estado: "leyendo", fechaInicio: "2026-05-01" }));
    await pg.query(`insert into sesiones_lectura (lectura_id, user_id, fecha, pagina_inicio, pagina_fin, minutos)
      select t.id, t.user_id, '2026-02-05', 0, 10, 30 from lecturas t where t.libro_id = $1`, [a]);
    const s = await como(ANA, (db) => estadisticasAnio(db, ANA, 2026));
    expect(s).toMatchObject({ anio: 2026, librosTerminados: 2, paginasLeidas: 500, calificacionMedia: 4.5, minutosLeidos: 30 });
    expect(s.libros.map((l) => l.titulo)).toEqual(["R1", "R2"]);
    expect((await como(ANA, (db) => estadisticasAnio(db, ANA, 2024))).librosTerminados).toBe(0);
    expect((await como(BETO, (db) => estadisticasAnio(db, BETO, 2026))).librosTerminados).toBe(0);
    await como(ANA, (db) => aplicarEstado(db, ANA, a, "terminado", { fechaInicio: "2026-02-01", fechaFin: "2026-02-10" }));
  });
});

describe("múltiples usuarios: journals separados", () => {
  let paginaAna = "";
  beforeAll(async () => {
    paginaAna = await como(ANA, (db) => crearPagina(db, ANA, { libroId: libroAna, tipo: "reflexiones", titulo: "Privado de Ana" }));
  });

  it("Beto no ve, abre, guarda, elimina ni restaura páginas de Ana", async () => {
    expect(await como(BETO, (db) => listarPaginas(db, BETO, libroAna))).toEqual([]);
    expect(await como(BETO, (db) => listarPaginas(db, ANA, libroAna))).toEqual([]);
    expect(await como(BETO, (db) => obtenerPagina(db, BETO, paginaAna))).toBeNull();
    await expect(
      como(BETO, (db) => guardarPagina(db, BETO, paginaAna, { version: 1, titulo: "Hack", bloques: [], plantilla: "pergamino", estado: "borrador" })),
    ).rejects.toMatchObject({ codigo: "no_encontrada" });
    expect(await como(BETO, (db) => eliminarPagina(db, BETO, paginaAna))).toBe(false);
    expect(await como(BETO, (db) => eliminarDefinitivamente(db, BETO, paginaAna))).toBe(false);
    expect(await como(BETO, (db) => restaurarPagina(db, BETO, paginaAna))).toBe(false);
    expect(await como(BETO, (db) => contarPaginasPorLibro(db, BETO))).toEqual({});
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, paginaAna)))?.titulo).toBe("Privado de Ana");
  });

  it("la base impide colgar páginas de un libro ajeno o escribir a nombre de otra persona", async () => {
    await expect(
      como(BETO, (db) => db.query(`insert into diario_paginas (user_id, libro_id, tipo) values ($1, $2, 'libre')`, [BETO, libroAna])),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      como(BETO, (db) => db.query(`insert into diario_paginas (user_id, tipo) values ($1, 'libre')`, [ANA])),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("restricciones de la base", () => {
  it("rechaza contenido que no es una lista, demasiado grande, o plantillas/estados/tipos inválidos", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    const malos = [
      `update diario_paginas set contenido = '{"a":1}'::jsonb where id = '${id}'`,
      `update diario_paginas set contenido = jsonb_build_array(repeat('x', 400001)) where id = '${id}'`,
      `update diario_paginas set plantilla = 'neon' where id = '${id}'`,
      `update diario_paginas set estado = 'secreta' where id = '${id}'`,
      `update diario_paginas set titulo = repeat('x', 121) where id = '${id}'`,
      `insert into diario_paginas (user_id, tipo) values ('${ANA}', 'inventado')`,
    ];
    for (const sql of malos) await expect(como(ANA, (db) => db.query(sql)), sql).rejects.toThrow(/check/i);
  });

  it("el rol de la aplicación no puede cambiar a quién pertenece una página", async () => {
    const id = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    await expect(como(ANA, (db) => db.query(`update diario_paginas set user_id = $2 where id = $1`, [id, BETO]))).rejects.toThrow(/permission denied/i);
    await expect(como(ANA, (db) => db.query(`update diario_paginas set libro_id = $2 where id = $1`, [id, libroAna]))).rejects.toThrow(/permission denied/i);
  });
});
