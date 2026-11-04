import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Pruebas de aislamiento contra Postgres real (PGlite, WASM). Se aplican las migraciones tal cual están en
 * db/migrations/ y se consulta como el rol de la aplicación (`umbral_app`), igual que src/lib/db.ts.
 */
const db = new PGlite();
const ANA = "usuaria-ana";
const BETO = "usuario-beto";
let bibliotecaAna = "";

async function como<T = Record<string, unknown>>(uid: string | null, sql: string) {
  await db.exec("set role umbral_app");
  await db.query(`select set_config('app.user_id', $1, false)`, [uid ?? ""]);
  try {
    return await db.query<T>(sql);
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  for (const f of ["0001_better_auth.sql", "0002_umbral_biblioteca.sql"]) {
    await db.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await db.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true)`);
  await como(ANA, `update profiles set guardiana_nombre = 'Ana' where id = '${ANA}'`);
  const r = await como<{ id: string }>(
    ANA,
    `insert into bibliotecas (user_id, nombre) values ('${ANA}', 'Archivo de Ana') returning id`,
  );
  bibliotecaAna = r.rows[0].id;
  await como(
    ANA,
    `insert into personalizaciones (biblioteca_id, user_id, apariencia) values ('${bibliotecaAna}', '${ANA}', 'noche')`,
  );
});

afterAll(() => db.close());

describe("alta de cuenta", () => {
  it("el trigger crea perfil y preferencias", async () => {
    const p = await db.query(`select count(*)::int as n from profiles`);
    const pr = await db.query(`select count(*)::int as n from preferencias`);
    expect(p.rows[0]).toEqual({ n: 2 });
    expect(pr.rows[0]).toEqual({ n: 2 });
  });
});

describe("aislamiento entre usuarios", () => {
  it("cada persona ve solo su perfil", async () => {
    const r = await como<{ id: string }>(BETO, `select id from profiles`);
    expect(r.rows).toEqual([{ id: BETO }]);
  });

  it("no puede leer la biblioteca, personalización ni preferencias ajenas", async () => {
    for (const t of ["bibliotecas", "personalizaciones"]) {
      const r = await como(BETO, `select * from ${t}`);
      expect(r.rows, t).toEqual([]);
    }
    const pref = await como<{ user_id: string }>(BETO, `select user_id from preferencias`);
    expect(pref.rows).toEqual([{ user_id: BETO }]);
    const propia = await como(ANA, `select * from bibliotecas`);
    expect(propia.rows).toHaveLength(1);
  });

  it("no puede modificar datos ajenos (0 filas afectadas)", async () => {
    const a = await como(BETO, `update profiles set guardiana_nombre = 'Hack' where id = '${ANA}'`);
    const b = await como(BETO, `update bibliotecas set nombre = 'Hack' where user_id = '${ANA}'`);
    const c = await como(BETO, `update personalizaciones set apariencia = 'alba' where user_id = '${ANA}'`);
    const d = await como(BETO, `update preferencias set idioma = 'es-AR' where user_id = '${ANA}'`);
    expect([a, b, c, d].map((r) => r.affectedRows)).toEqual([0, 0, 0, 0]);
    const ana = await como<{ guardiana_nombre: string }>(ANA, `select guardiana_nombre from profiles`);
    expect(ana.rows[0].guardiana_nombre).toBe("Ana");
  });

  it("no puede insertar filas a nombre de otra persona", async () => {
    await expect(
      como(BETO, `insert into bibliotecas (user_id, nombre) values ('${ANA}', 'Intrusa')`),
    ).rejects.toThrow(/row-level security/i);
  });

  it("no puede colgar su personalización de la biblioteca de otra persona", async () => {
    await expect(
      como(
        BETO,
        `insert into personalizaciones (biblioteca_id, user_id, apariencia) values ('${bibliotecaAna}', '${BETO}', 'alba')`,
      ),
    ).rejects.toThrow(/foreign key|duplicate key/i);
    const filas = await como(BETO, "select * from personalizaciones");
    expect(filas.rows).toEqual([]);
  });

  it("no puede borrar nada", async () => {
    await expect(como(ANA, `delete from bibliotecas`)).rejects.toThrow(/permission denied/i);
  });

  it("sin app.user_id no se ve ninguna fila", async () => {
    for (const t of ["profiles", "bibliotecas", "personalizaciones", "preferencias"]) {
      const r = await como(null, `select * from ${t}`);
      expect(r.rows, t).toEqual([]);
    }
  });

  it("el rol de la aplicación no accede a las tablas de Better Auth (contraseñas, sesiones)", async () => {
    for (const t of ['"user"', "session", "account", "verification"]) {
      await expect(como(ANA, `select * from ${t}`), t).rejects.toThrow(/permission denied/i);
    }
  });
});

describe("integridad", () => {
  it("una sola biblioteca por cuenta", async () => {
    await expect(
      como(ANA, `insert into bibliotecas (user_id, nombre) values ('${ANA}', 'Otra')`),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("rechaza nombres fuera de rango y apariencias inválidas", async () => {
    await expect(como(ANA, `update profiles set guardiana_nombre = 'A'`)).rejects.toThrow(/check/i);
    await expect(como(ANA, `update bibliotecas set nombre = repeat('x', 61)`)).rejects.toThrow(/check/i);
    await expect(como(ANA, `update personalizaciones set apariencia = 'fucsia'`)).rejects.toThrow(/check/i);
  });

  it("no se puede fijar onboarding_completado_at ni cambiar el id directamente", async () => {
    await expect(como(ANA, `update profiles set onboarding_completado_at = now()`)).rejects.toThrow(
      /permission denied/i,
    );
    await expect(como(ANA, `update profiles set id = 'otro'`)).rejects.toThrow(/permission denied/i);
  });
});

describe("completar_onboarding()", () => {
  it("falla si falta algún paso", async () => {
    await expect(como(BETO, `select completar_onboarding()`)).rejects.toThrow(/onboarding_incompleto/);
  });

  it("falla sin identidad", async () => {
    await expect(como(null, `select completar_onboarding()`)).rejects.toThrow(/no_autenticada/);
  });

  it("completa solo el onboarding de quien la llama", async () => {
    await como(ANA, `select completar_onboarding()`);
    const ana = await como<{ c: boolean }>(ANA, `select onboarding_completado_at is not null as c from profiles`);
    const beto = await como<{ c: boolean }>(BETO, `select onboarding_completado_at is not null as c from profiles`);
    expect(ana.rows[0].c).toBe(true);
    expect(beto.rows[0].c).toBe(false);
  });
});
