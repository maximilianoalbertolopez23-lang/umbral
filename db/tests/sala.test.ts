import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/modules/archivo/repositorio";
import { crearPagina, eliminarPagina } from "../../src/modules/escritorio/repositorio";
import { cambiarApariencia, contarPaginasJournal, ErrorSala, guardarMovimiento, obtenerMovimiento, type Movimiento } from "../../src/modules/sala/repositorio";

/** La Gran Sala y El Taller sobre Postgres real: solo tocan datos que ya existen, y solo los propios. */
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

const apariencia = async (uid: string) =>
  (await pg.query<{ apariencia: string }>("select apariencia from personalizaciones where user_id = $1", [uid])).rows[0]?.apariencia;

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true), ('${SIN_BIBLIOTECA}', 's', 's@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'B Ana'), ('${BETO}', 'B Beto')`);
  await pg.exec(`insert into personalizaciones (biblioteca_id, user_id, apariencia)
    select id, user_id, 'noche' from bibliotecas`);
});

afterAll(() => pg.close());

describe("apariencia (la luz de la biblioteca)", () => {
  it("cambia solo la apariencia de quien lo pide", async () => {
    await como(ANA, (db) => cambiarApariencia(db, ANA, "alba"));
    expect(await apariencia(ANA)).toBe("alba");
    expect(await apariencia(BETO)).toBe("noche");
  });

  it("rechaza apariencias que no existen (aplicación y base)", async () => {
    await expect(como(ANA, (db) => cambiarApariencia(db, ANA, "fucsia" as never))).rejects.toBeInstanceOf(ErrorSala);
    await expect(como(ANA, (db) => db.query("update personalizaciones set apariencia = 'fucsia'"))).rejects.toThrow(/check/i);
    expect(await apariencia(ANA)).toBe("alba");
  });

  it("sin biblioteca configurada falla con un mensaje claro", async () => {
    await expect(como(SIN_BIBLIOTECA, (db) => cambiarApariencia(db, SIN_BIBLIOTECA, "ocaso"))).rejects.toThrow(/bienvenida/);
  });

  it("nadie puede cambiar la apariencia de otra persona", async () => {
    const r = await como(BETO, (db) => db.query("update personalizaciones set apariencia = 'ocaso' where user_id = $1", [ANA]));
    expect(r.rowCount).toBe(0);
    expect(await apariencia(ANA)).toBe("alba");
  });
});

describe("preferencia de movimiento", () => {
  it("por defecto sigue al sistema y se puede cambiar", async () => {
    expect(await como(ANA, (db) => obtenerMovimiento(db, ANA))).toBe("sistema");
    await como(ANA, (db) => guardarMovimiento(db, ANA, "si"));
    expect(await como(ANA, (db) => obtenerMovimiento(db, ANA))).toBe("si");
    expect(await como(BETO, (db) => obtenerMovimiento(db, BETO))).toBe("sistema");
  });

  it("rechaza valores inválidos", async () => {
    await expect(como(ANA, (db) => guardarMovimiento(db, ANA, "rapidisimo" as Movimiento))).rejects.toBeInstanceOf(ErrorSala);
    await expect(como(ANA, (db) => db.query("update preferencias set reducir_movimiento = 'x'"))).rejects.toThrow(/check/i);
  });
});

describe("páginas del Escritorio que muestra la Sala", () => {
  it("cuenta solo las páginas propias que no están en la papelera", async () => {
    expect(await como(ANA, (db) => contarPaginasJournal(db, ANA))).toBe(0);
    const a = await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "libre" }));
    await como(ANA, (db) => crearPagina(db, ANA, { libroId: null, tipo: "lista" }));
    await como(BETO, (db) => crearPagina(db, BETO, { libroId: null, tipo: "libre" }));
    expect(await como(ANA, (db) => contarPaginasJournal(db, ANA))).toBe(2);
    await como(ANA, (db) => eliminarPagina(db, ANA, a));
    expect(await como(ANA, (db) => contarPaginasJournal(db, ANA))).toBe(1);
    expect(await como(BETO, (db) => contarPaginasJournal(db, BETO))).toBe(1);
  });
});
