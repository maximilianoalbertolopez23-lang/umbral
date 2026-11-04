import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/modules/archivo/repositorio";
import type { Bloque } from "../../src/modules/escritorio/bloques";
import { crearPagina, eliminarPagina, guardarPagina, obtenerPagina, restaurarPagina } from "../../src/modules/escritorio/repositorio";
import { AJUSTES_BASE } from "../../src/modules/taller/journal";
import {
  actualizarPlantilla, aplicarPlantillaATodas, contarUsoPlantilla, crearPlantilla, eliminarPlantilla, ErrorTaller, establecerPlantillaPredeterminada,
  guardarDisenoSala, listarPlantillas, obtenerDisenoSala, obtenerPreferenciaPlantilla,
} from "../../src/modules/taller/repositorio";
import { DECORACION_INICIAL, agregarObjeto, aplicarEstilo, type DisenoSala } from "../../src/modules/taller/sala";

/** El Taller sobre Postgres real: solo presentación, por usuario, y sin tocar nunca el contenido. */
const pg = new PGlite({ parsers: { [types.DATE]: (v: string) => v } });
const ANA = "usuaria-ana";
const BETO = "usuario-beto";
const SIN_BIBLIOTECA = "usuaria-sin-biblioteca";

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

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const conObjetos = (...tipos: string[]): DisenoSala => {
  let d: DisenoSala = { estilo: "clasica", objetos: [] };
  tipos.forEach((t, n) => {
    const r = agregarObjeto(d, t, id(n + 1));
    if (!r.ok) throw new Error(r.error);
    d = r.diseno;
  });
  return d;
};
const texto = (t: string): Bloque => ({
  id: crypto.randomUUID(), tipo: "texto",
  doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] },
});
const contenidoCrudo = async (paginaId: string) => (await pg.query<{ c: unknown }>("select contenido as c from diario_paginas where id = $1", [paginaId])).rows[0].c;

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true), ('${SIN_BIBLIOTECA}', 's', 's@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'B Ana'), ('${BETO}', 'B Beto')`);
  await pg.exec(`insert into personalizaciones (biblioteca_id, user_id, apariencia) select id, user_id, 'alba' from bibliotecas`);
});

afterAll(() => pg.close());

describe("diseño de la sala", () => {
  it("sin diseño guardado se usa el inicial, conservando la luz de la bienvenida", async () => {
    const r = await como(ANA, (db) => obtenerDisenoSala(db, ANA));
    expect(r).toEqual({ diseno: { estilo: "clasica", luz: "alba", objetos: DECORACION_INICIAL }, version: 0 });
  });

  it("guarda la distribución y la recupera idéntica", async () => {
    const d = conObjetos("sillon-orejero", "planta-helecho", "cuadro-paisaje");
    const g = await como(ANA, (db) => guardarDisenoSala(db, ANA, d, 0));
    expect(g.version).toBe(1);
    const leido = await como(ANA, (db) => obtenerDisenoSala(db, ANA));
    expect(leido.version).toBe(1);
    expect(leido.diseno).toEqual(d);
    expect(leido.diseno.objetos.map((o) => o.tipo)).toEqual(["sillon-orejero", "planta-helecho", "cuadro-paisaje"]);
  });

  it("cada guardado sube la versión y un guardado con versión vieja es un conflicto que no pisa nada", async () => {
    await pg.exec("insert into inventario (user_id, clave, origen) values ('usuaria-ana', 'estilo:acogedora', 'compra')");
    const actual = await como(ANA, (db) => obtenerDisenoSala(db, ANA));
    const nuevo = aplicarEstilo(actual.diseno, "acogedora");
    const g = await como(ANA, (db) => guardarDisenoSala(db, ANA, nuevo, actual.version));
    expect(g.version).toBe(actual.version + 1);
    await expect(como(ANA, (db) => guardarDisenoSala(db, ANA, actual.diseno, actual.version))).rejects.toMatchObject({ codigo: "conflicto" });
    expect((await como(ANA, (db) => obtenerDisenoSala(db, ANA))).diseno.estilo).toBe("acogedora");
  });

  it("rechaza diseños inválidos: objetos desconocidos, fuera de lugar o con datos manipulados", async () => {
    const { version } = await como(ANA, (db) => obtenerDisenoSala(db, ANA));
    const malos: unknown[] = [
      { estilo: "clasica", objetos: [{ id: id(1), tipo: "bomba", x: 800, y: 800 }] },
      { estilo: "clasica", objetos: [{ id: id(1), tipo: "puf", x: 800, y: 100 }] },
      { estilo: "clasica", objetos: [{ id: id(1), tipo: "cuadro-paisaje", x: 280, y: 300 }] },
      { estilo: "neon", objetos: [] },
      "x",
    ];
    for (const m of malos) await expect(como(ANA, (db) => guardarDisenoSala(db, ANA, m, version)), JSON.stringify(m).slice(0, 60)).rejects.toMatchObject({ codigo: "invalido" });
  });

  it("sin biblioteca no se puede guardar", async () => {
    await expect(como(SIN_BIBLIOTECA, (db) => guardarDisenoSala(db, SIN_BIBLIOTECA, { estilo: "clasica", objetos: [] }, 0))).rejects.toMatchObject({ codigo: "sin_biblioteca" });
  });

  it("cada persona ve y guarda solo su propia sala", async () => {
    const d = conObjetos("puf");
    await como(ANA, async (db) => guardarDisenoSala(db, ANA, d, (await obtenerDisenoSala(db, ANA)).version));
    const deBeto = await como(BETO, (db) => obtenerDisenoSala(db, BETO));
    expect(deBeto).toEqual({ diseno: { estilo: "clasica", luz: "alba", objetos: DECORACION_INICIAL }, version: 0 });
    await como(BETO, (db) => guardarDisenoSala(db, BETO, conObjetos("mesa-baja"), 0));
    expect((await como(ANA, (db) => obtenerDisenoSala(db, ANA))).diseno.objetos.map((o) => o.tipo)).toEqual(["puf"]);
    const r = await como(BETO, (db) => db.query("update disenos_sala set diseno = '{}'::jsonb where user_id = $1", [ANA]));
    expect(r.rowCount).toBe(0);
    await expect(como(BETO, (db) => db.query("select * from disenos_sala").then((x) => x.rows.length))).resolves.toBe(1);
  });

  it("la base impide un diseño que no sea un objeto o demasiado grande", async () => {
    await expect(como(ANA, (db) => db.query("update disenos_sala set diseno = '[]'::jsonb"))).rejects.toThrow(/check/i);
    await expect(como(ANA, (db) => db.query("update disenos_sala set diseno = jsonb_build_object('x', repeat('a', 100001))"))).rejects.toThrow(/check/i);
  });
});

describe("plantillas propias del journal", () => {
  const datos = (nombre: string, extra: Record<string, unknown> = {}) => ({ nombre, base: "pergamino" as const, ajustes: { ...AJUSTES_BASE, ...extra } });

  it("crea, lista, actualiza y elimina", async () => {
    const pid = await como(ANA, (db) => crearPlantilla(db, ANA, datos("Mi cuaderno", { fuente: "lora", papel: "crema", columnas: 2 })));
    let lista = await como(ANA, (db) => listarPlantillas(db, ANA));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ id: pid, nombre: "Mi cuaderno", base: "pergamino" });
    expect(lista[0].ajustes).toMatchObject({ fuente: "lora", papel: "crema", columnas: 2 });
    await como(ANA, (db) => actualizarPlantilla(db, ANA, pid, { nombre: "Cuaderno nocturno", base: "archivo", ajustes: { ...AJUSTES_BASE, fuente: "caveat" } }));
    lista = await como(ANA, (db) => listarPlantillas(db, ANA));
    expect(lista[0]).toMatchObject({ nombre: "Cuaderno nocturno", base: "archivo" });
    expect(await como(ANA, (db) => eliminarPlantilla(db, ANA, pid))).toBe(0);
    expect(await como(ANA, (db) => listarPlantillas(db, ANA))).toEqual([]);
  });

  it("rechaza nombres vacíos, ajustes ilegibles o inventados y bases inexistentes", async () => {
    await expect(como(ANA, (db) => crearPlantilla(db, ANA, datos("   ")))).rejects.toMatchObject({ codigo: "invalido" });
    await expect(como(ANA, (db) => crearPlantilla(db, ANA, datos("x".repeat(61))))).rejects.toMatchObject({ codigo: "invalido" });
    await expect(como(ANA, (db) => crearPlantilla(db, ANA, datos("Ilegible", { papel: "ciruela", tinta: "morado" })))).rejects.toThrow(/contraste|distingue/);
    await expect(como(ANA, (db) => crearPlantilla(db, ANA, datos("Rara", { fuente: "comic" })))).rejects.toMatchObject({ codigo: "invalido" });
    await expect(como(ANA, (db) => crearPlantilla(db, ANA, { nombre: "Base mala", base: "neon" as never, ajustes: AJUSTES_BASE }))).rejects.toMatchObject({ codigo: "invalido" });
  });

  it("aplica un límite de plantillas propias por persona", async () => {
    for (let n = 0; n < 20; n++) await como(BETO, (db) => crearPlantilla(db, BETO, datos(`P${n}`)));
    await expect(como(BETO, (db) => crearPlantilla(db, BETO, datos("Una más")))).rejects.toMatchObject({ codigo: "limite_plantillas" });
  });

  it("cada persona ve y toca solo sus plantillas", async () => {
    const pid = await como(ANA, (db) => crearPlantilla(db, ANA, datos("Privada")));
    expect((await como(BETO, (db) => listarPlantillas(db, BETO))).some((p) => p.id === pid)).toBe(false);
    await expect(como(BETO, (db) => actualizarPlantilla(db, BETO, pid, datos("Hack")))).rejects.toMatchObject({ codigo: "no_encontrada" });
    await expect(como(BETO, (db) => eliminarPlantilla(db, BETO, pid))).rejects.toMatchObject({ codigo: "no_encontrada" });
    expect((await como(ANA, (db) => listarPlantillas(db, ANA))).find((p) => p.id === pid)?.nombre).toBe("Privada");
  });

  it("usar una plantilla propia en una página y borrarla NO elimina el contenido: la página vuelve a su base", async () => {
    const pid = await como(ANA, (db) => crearPlantilla(db, ANA, datos("Efímera", { fuente: "inter" })));
    const pagina = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    const bloques = [texto("Mi texto importante"), texto("Otro párrafo")];
    await como(ANA, (db) => guardarPagina(db, ANA, pagina, { version: 1, titulo: "Con plantilla", bloques, plantilla: "pergamino", plantillaCustomId: pid, estado: "borrador" }));
    const antes = await contenidoCrudo(pagina);
    expect((await como(ANA, (db) => obtenerPagina(db, ANA, pagina)))?.plantillaCustomId).toBe(pid);
    expect(await como(ANA, (db) => contarUsoPlantilla(db, ANA, pid))).toBe(1);

    expect(await como(ANA, (db) => eliminarPlantilla(db, ANA, pid))).toBe(1);
    const despues = await como(ANA, (db) => obtenerPagina(db, ANA, pagina));
    expect(despues).toMatchObject({ plantillaCustomId: null, plantilla: "pergamino", titulo: "Con plantilla" });
    expect(despues?.bloques).toEqual(bloques);
    expect(await contenidoCrudo(pagina)).toEqual(antes);
  });

  it("no se puede asignar la plantilla de otra persona a una página", async () => {
    const ajena = await como(ANA, (db) => crearPlantilla(db, ANA, datos("De Ana")));
    const pagina = await como(BETO, (db) => crearPagina(db, BETO, { libroId: null, tipo: "libre" }));
    await expect(
      como(BETO, (db) => guardarPagina(db, BETO, pagina, { version: 1, titulo: "x", bloques: [texto("a")], plantilla: "pergamino", plantillaCustomId: ajena, estado: "borrador" })),
    ).rejects.toThrow(/foreign key/i);
  });

  it("la plantilla predeterminada se usa en las páginas nuevas; elegir una base la reemplaza", async () => {
    const pid = await como(ANA, (db) => crearPlantilla(db, ANA, datos("Predeterminada", { fuente: "caveat" })));
    await como(ANA, (db) => establecerPlantillaPredeterminada(db, ANA, { base: "pergamino", customId: pid }));
    expect(await como(ANA, (db) => obtenerPreferenciaPlantilla(db, ANA))).toEqual({ base: "pergamino", customId: pid });
    const nueva = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    expect(await como(ANA, (db) => obtenerPagina(db, ANA, nueva))).toMatchObject({ plantilla: "pergamino", plantillaCustomId: pid });
    await expect(como(ANA, (db) => establecerPlantillaPredeterminada(db, ANA, { base: "pergamino", customId: id(99) }))).rejects.toBeInstanceOf(ErrorTaller);
    await como(ANA, (db) => eliminarPlantilla(db, ANA, pid));
    expect(await como(ANA, (db) => obtenerPreferenciaPlantilla(db, ANA))).toEqual({ base: "pergamino", customId: null });
  });

  it("aplicar una plantilla a todas las páginas cambia solo la presentación", async () => {
    const pid = await como(ANA, (db) => crearPlantilla(db, ANA, datos("Para todas", { fuente: "lora" })));
    const a = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    const b = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "lista" }));
    const eliminada = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    await como(ANA, (db) => eliminarPagina(db, ANA, eliminada));
    const antes = [await contenidoCrudo(a), await contenidoCrudo(b)];
    const n = await como(ANA, (db) => aplicarPlantillaATodas(db, ANA, { base: "archivo", customId: pid }));
    expect(n).toBeGreaterThanOrEqual(2);
    expect(await como(ANA, (db) => obtenerPagina(db, ANA, a))).toMatchObject({ plantilla: "archivo", plantillaCustomId: pid });
    expect([await contenidoCrudo(a), await contenidoCrudo(b)]).toEqual(antes);
    // Las eliminadas no se tocan; al restaurarlas conservan lo que tenían.
    await como(ANA, (db) => restaurarPagina(db, ANA, eliminada));
    expect(await como(ANA, (db) => obtenerPagina(db, ANA, eliminada))).toMatchObject({ plantillaCustomId: null });
  });

  it("la base impide ajustes que no sean un objeto o nombres fuera de rango", async () => {
    await expect(como(ANA, (db) => db.query("update plantillas_journal set ajustes = '[]'::jsonb"))).rejects.toThrow(/check/i);
    await expect(como(ANA, (db) => db.query("update plantillas_journal set nombre = ''"))).rejects.toThrow(/check/i);
    await expect(como(ANA, (db) => db.query("update plantillas_journal set base = 'neon'"))).rejects.toThrow(/check/i);
  });
});
