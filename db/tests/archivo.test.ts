import { readFileSync, readdirSync } from "node:fs";
import { PGlite, types } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  actualizarFechasLectura,
  actualizarLibro,
  aplicarEstado,
  calificarLibro,
  crearLibro,
  eliminarLibro,
  ErrorDominio,
  guardarVistaArchivo,
  iniciarRelectura,
  listarLibros,
  obtenerLibro,
  obtenerPortada,
  obtenerSugerencias,
  obtenerVistaArchivo,
  quitarPortada,
  registrarProgreso,
  type Db,
} from "../../src/modules/archivo/repositorio";
import type { LibroInput } from "../../src/modules/archivo/tipos";

/**
 * Pruebas de la capa de datos del Archivo contra Postgres real (PGlite): se aplican TODAS las migraciones y se
 * ejecuta el mismo código del repositorio que usa la aplicación, como el rol `umbral_app` con RLS.
 */
const pg = new PGlite({ parsers: { [types.DATE]: (v: string) => v } });
const ANA = "usuaria-ana";
const BETO = "usuario-beto";

const adaptador: Db = {
  async query(sql, params) {
    const r = await pg.query(sql, params);
    return { rows: r.rows as never[], rowCount: r.rows.length || r.affectedRows || 0 };
  },
};

/** Equivalente a conUsuario() de src/lib/db.ts: transacción + rol sin privilegios + app.user_id. */
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

function datos(p: Partial<LibroInput> = {}): LibroInput {
  return {
    titulo: "Dune",
    autores: ["Frank Herbert"],
    isbn: null,
    saga: null,
    sagaNumero: null,
    generos: [],
    etiquetas: [],
    paginasTotal: null,
    sinopsis: null,
    estado: "quiero_leer",
    fechaInicio: null,
    fechaFin: null,
    calificacion: null,
    ...p,
  };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeAll(async () => {
  for (const f of readdirSync("db/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(`db/migrations/${f}`, "utf8"));
  }
  await pg.exec(`insert into "user" (id, name, email, "emailVerified") values
    ('${ANA}', 'ana', 'ana@x.test', true), ('${BETO}', 'beto', 'beto@x.test', true)`);
  await pg.exec(`insert into bibliotecas (user_id, nombre) values ('${ANA}', 'Biblioteca de Ana'), ('${BETO}', 'Biblioteca de Beto')`);
});

afterAll(() => pg.close());

describe("crear y consultar", () => {
  it("crea un libro mínimo en 'quiero leer', sin lecturas", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Mínimo" })));
    const libro = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(libro).toMatchObject({ titulo: "Mínimo", estado: "quiero_leer", nLecturas: 0, paginaActual: null, portadaVersion: 0 });
    expect(libro?.lecturas).toEqual([]);
  });

  it("crea un libro completo en lectura y devuelve todos sus campos", async () => {
    const id = await como(ANA, (db) =>
      crearLibro(
        db,
        ANA,
        datos({
          titulo: "El nombre del viento",
          autores: ["Patrick Rothfuss"],
          isbn: "9780756404079",
          saga: "Crónica del asesino de reyes",
          sagaNumero: 1,
          generos: ["Fantasía", "Épica"],
          etiquetas: ["favorito"],
          paginasTotal: 662,
          sinopsis: "Kvothe cuenta su historia.",
          estado: "leyendo",
          fechaInicio: "2026-01-10",
          calificacion: 5,
        }),
        { origen: "openlibrary", openlibraryKey: "/works/OL1" },
      ),
    );
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({
      isbn: "9780756404079",
      saga: "Crónica del asesino de reyes",
      sagaNumero: 1,
      generos: ["Fantasía", "Épica"],
      etiquetas: ["favorito"],
      paginasTotal: 662,
      sinopsis: "Kvothe cuenta su historia.",
      estado: "leyendo",
      fechaInicio: "2026-01-10",
      fechaFin: null,
      paginaActual: 0,
      calificacion: 5,
      origen: "openlibrary",
      nLecturas: 1,
    });
  });

  it("un libro 'terminado' con total completa el progreso y lo deja en el historial", async () => {
    const id = await como(ANA, (db) =>
      crearLibro(db, ANA, datos({ titulo: "Corto", paginasTotal: 200, estado: "terminado", fechaInicio: "2026-02-01", fechaFin: "2026-02-10" })),
    );
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "terminado", paginaActual: 200, fechaFin: "2026-02-10" });
    expect(l?.sesiones).toHaveLength(1);
    expect(l?.sesiones[0]).toMatchObject({ paginaInicio: 0, paginaFin: 200, fecha: "2026-02-10" });
  });

  it("listarLibros trae todos los libros propios", async () => {
    const lista = await como(ANA, (db) => listarLibros(db, ANA));
    expect(lista.map((x) => x.titulo).sort()).toEqual(["Corto", "El nombre del viento", "Mínimo"]);
  });

  it("sin biblioteca no se puede crear", async () => {
    await pg.exec(`insert into "user" (id, name, email, "emailVerified") values ('sin-bib', 's', 's@x.test', true)`);
    await expect(como("sin-bib", (db) => crearLibro(db, "sin-bib", datos()))).rejects.toMatchObject({ codigo: "sin_biblioteca" });
  });
});

describe("actualizar", () => {
  it("modifica los datos del libro y su calificación", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Borrador", paginasTotal: 300 })));
    await como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Definitivo", autores: ["A", "B"], paginasTotal: 320, generos: ["Novela"] })));
    await como(ANA, (db) => calificarLibro(db, ANA, id, 4));
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ titulo: "Definitivo", autores: ["A", "B"], paginasTotal: 320, generos: ["Novela"], calificacion: 4 });
  });

  it("cambiar el estado crea la lectura y modificar fechas actualiza la última", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Estados", paginasTotal: 100 })));
    await como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Estados", paginasTotal: 100, estado: "pausado", fechaInicio: "2026-03-01" })));
    let l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "pausado", nLecturas: 1, fechaInicio: "2026-03-01" });
    await como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Estados", paginasTotal: 100, estado: "abandonado", fechaInicio: "2026-03-02", fechaFin: "2026-03-20" })));
    l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "abandonado", nLecturas: 1, fechaInicio: "2026-03-02", fechaFin: "2026-03-20" });
  });

  it("no permite volver a 'quiero leer' si ya hay lecturas", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Ya leído", estado: "leyendo" })));
    await expect(como(ANA, (db) => aplicarEstado(db, ANA, id, "quiero_leer"))).rejects.toMatchObject({ codigo: "estado_invalido" });
  });

  it("rechaza fechas incoherentes", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Fechas" })));
    await expect(
      como(ANA, (db) => aplicarEstado(db, ANA, id, "terminado", { fechaInicio: "2026-05-02", fechaFin: "2026-05-01" })),
    ).rejects.toMatchObject({ codigo: "fechas_invalidas" });
  });
});

describe("seguimiento de lectura", () => {
  it("registra progreso, guarda el historial y calcula el porcentaje", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Progreso", paginasTotal: 400, estado: "leyendo", fechaInicio: "2026-04-01" })));
    const r1 = await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 100, minutos: 45, fecha: "2026-04-02" }));
    const r2 = await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 220, fecha: "2026-04-03", nota: "Buen capítulo" }));
    expect(r1).toEqual({ porcentaje: 25, terminado: false });
    expect(r2).toEqual({ porcentaje: 55, terminado: false });
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ paginaActual: 220, estado: "leyendo" });
    expect(l?.sesiones.map((s) => [s.paginaInicio, s.paginaFin, s.minutos, s.nota])).toEqual([
      [100, 220, null, "Buen capítulo"],
      [0, 100, 45, null],
    ]);
  });

  it("no acepta páginas mayores al total (aplicación y base de datos)", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Tope", paginasTotal: 100, estado: "leyendo" })));
    await expect(como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 101 }))).rejects.toMatchObject({ codigo: "progreso_excede_total" });
    // Aunque el código fallara, el trigger de la base lo impide:
    await expect(
      como(ANA, (db) => db.query("update lecturas set pagina_actual = 150 where libro_id = $1", [id])),
    ).rejects.toThrow(/progreso_excede_total/);
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l?.paginaActual).toBe(0);
  });

  it("no permite bajar el total de páginas por debajo del progreso", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Total", paginasTotal: 500, estado: "leyendo" })));
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 300 }));
    await expect(
      como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Total", paginasTotal: 250, estado: "leyendo" }))),
    ).rejects.toMatchObject({ codigo: "total_menor_que_progreso" });
  });

  it("llegar a la última página termina la lectura con la fecha del registro", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Final", paginasTotal: 50, estado: "leyendo", fechaInicio: "2026-06-01" })));
    const r = await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 50, fecha: "2026-06-05" }));
    expect(r).toEqual({ porcentaje: 100, terminado: true });
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "terminado", fechaFin: "2026-06-05", paginaActual: 50 });
  });

  it("registrar progreso en 'quiero leer' inicia la lectura; en pausado la retoma", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Arranque", paginasTotal: 300 })));
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 30, fecha: "2026-07-01" }));
    let l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "leyendo", fechaInicio: "2026-07-01", nLecturas: 1 });
    await como(ANA, (db) => aplicarEstado(db, ANA, id, "pausado"));
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 60, fecha: "2026-07-09" }));
    l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "leyendo", paginaActual: 60, nLecturas: 1 });
  });

  it("no se registra progreso sobre una lectura cerrada", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Cerrada", paginasTotal: 80, estado: "terminado" })));
    await expect(como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 10 }))).rejects.toMatchObject({ codigo: "estado_invalido" });
  });

  it("sin total de páginas el progreso se guarda pero no hay porcentaje", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Sin total", estado: "leyendo" })));
    const r = await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 77 }));
    expect(r).toEqual({ porcentaje: null, terminado: false });
  });
});

describe("relecturas", () => {
  it("una relectura suma una lectura nueva sin perder la anterior ni su historial", async () => {
    const id = await como(ANA, (db) =>
      crearLibro(db, ANA, datos({ titulo: "Relectura", paginasTotal: 100, estado: "leyendo", fechaInicio: "2026-01-01" })),
    );
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 60, fecha: "2026-01-05" }));
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 100, fecha: "2026-01-09" }));

    const numero = await como(ANA, (db) => iniciarRelectura(db, ANA, id, "2026-09-01"));
    expect(numero).toBe(2);
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 25, fecha: "2026-09-02" }));

    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l).toMatchObject({ estado: "leyendo", nLecturas: 2, paginaActual: 25, fechaInicio: "2026-09-01", fechaFin: null });
    const [segunda, primera] = l!.lecturas;
    expect(segunda).toMatchObject({ numero: 2, estado: "leyendo", paginaActual: 25 });
    expect(primera).toMatchObject({ numero: 1, estado: "terminado", paginaActual: 100, fechaInicio: "2026-01-01", fechaFin: "2026-01-09" });
    expect(l!.sesiones.filter((s) => s.lecturaId === primera.id)).toHaveLength(2);
    expect(l!.sesiones.filter((s) => s.lecturaId === segunda.id)).toHaveLength(1);
  });

  it("solo se puede releer una lectura terminada o abandonada", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "En curso", estado: "leyendo" })));
    await expect(como(ANA, (db) => iniciarRelectura(db, ANA, id))).rejects.toMatchObject({ codigo: "relectura_no_permitida" });
    const sin = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Sin leer" })));
    await expect(como(ANA, (db) => iniciarRelectura(db, ANA, sin))).rejects.toMatchObject({ codigo: "relectura_no_permitida" });
  });

  it("se pueden modificar las fechas de cualquier lectura, con validaciones", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Fechas 2", paginasTotal: 10, estado: "terminado", fechaInicio: "2026-01-01", fechaFin: "2026-01-02" })));
    await como(ANA, (db) => iniciarRelectura(db, ANA, id, "2026-02-01"));
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    const primera = l!.lecturas.find((x) => x.numero === 1)!;
    const segunda = l!.lecturas.find((x) => x.numero === 2)!;
    await como(ANA, (db) => actualizarFechasLectura(db, ANA, primera.id, { fechaInicio: "2025-12-20", fechaFin: "2025-12-31" }));
    const l2 = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l2!.lecturas.find((x) => x.numero === 1)).toMatchObject({ fechaInicio: "2025-12-20", fechaFin: "2025-12-31" });
    await expect(
      como(ANA, (db) => actualizarFechasLectura(db, ANA, primera.id, { fechaInicio: "2026-01-05", fechaFin: "2026-01-01" })),
    ).rejects.toMatchObject({ codigo: "fechas_invalidas" });
    await expect(
      como(ANA, (db) => actualizarFechasLectura(db, ANA, segunda.id, { fechaInicio: "2026-02-01", fechaFin: "2026-02-10" })),
    ).rejects.toMatchObject({ codigo: "fechas_invalidas" });
  });
});

describe("portadas", () => {
  it("guarda, reemplaza y quita la portada, versionándola", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Con portada" }), { portada: { mime: "image/png", datos: PNG } }));
    let l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l?.portadaVersion).toBe(1);
    const p = await como(ANA, (db) => obtenerPortada(db, ANA, id));
    expect(p?.mime).toBe("image/png");
    expect([...p!.datos]).toEqual([...PNG]);

    await como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Con portada" }), { portada: { mime: "image/jpeg", datos: new Uint8Array([0xff, 0xd8, 0xff, 9]) } }));
    l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l?.portadaVersion).toBe(2);
    expect((await como(ANA, (db) => obtenerPortada(db, ANA, id)))?.mime).toBe("image/jpeg");

    await como(ANA, (db) => quitarPortada(db, ANA, id));
    l = await como(ANA, (db) => obtenerLibro(db, ANA, id));
    expect(l?.portadaVersion).toBe(0);
    expect(await como(ANA, (db) => obtenerPortada(db, ANA, id))).toBeNull();
  });

  it("la base rechaza portadas de más de 500 KB", async () => {
    const id = await como(ANA, (db) => crearLibro(db, ANA, datos({ titulo: "Pesada" })));
    await expect(
      como(ANA, (db) => actualizarLibro(db, ANA, id, datos({ titulo: "Pesada" }), { portada: { mime: "image/png", datos: new Uint8Array(500_001) } })),
    ).rejects.toThrow(/check/i);
  });
});

describe("eliminar", () => {
  it("borra el libro con sus lecturas, sesiones y portada", async () => {
    const id = await como(ANA, (db) =>
      crearLibro(db, ANA, datos({ titulo: "Para borrar", paginasTotal: 10, estado: "leyendo" }), { portada: { mime: "image/png", datos: PNG } }),
    );
    await como(ANA, (db) => registrarProgreso(db, ANA, id, { pagina: 5 }));
    expect(await como(ANA, (db) => eliminarLibro(db, ANA, id))).toBe(true);
    expect(await como(ANA, (db) => obtenerLibro(db, ANA, id))).toBeNull();
    const restos = await pg.query(
      `select (select count(*)::int from lecturas where libro_id = $1) l, (select count(*)::int from portadas where libro_id = $1) p,
              (select count(*)::int from sesiones_lectura s where not exists (select 1 from lecturas t where t.id = s.lectura_id)) s`,
      [id],
    );
    expect(restos.rows[0]).toEqual({ l: 0, p: 0, s: 0 });
    expect(await como(ANA, (db) => eliminarLibro(db, ANA, id))).toBe(false);
  });
});

describe("múltiples usuarios: bibliotecas separadas", () => {
  let idAna = "";
  beforeAll(async () => {
    idAna = await como(ANA, (db) =>
      crearLibro(db, ANA, datos({ titulo: "Secreto de Ana", paginasTotal: 100, estado: "leyendo" }), { portada: { mime: "image/png", datos: PNG } }),
    );
  });

  it("Beto no ve ni lista los libros de Ana", async () => {
    const lista = await como(BETO, (db) => listarLibros(db, BETO));
    expect(lista).toEqual([]);
    expect(await como(BETO, (db) => obtenerLibro(db, BETO, idAna))).toBeNull();
    // Aun pidiendo el user_id de Ana, RLS no devuelve nada:
    expect(await como(BETO, (db) => listarLibros(db, ANA))).toEqual([]);
    expect(await como(BETO, (db) => obtenerPortada(db, ANA, idAna))).toBeNull();
  });

  it("Beto no puede modificar, calificar, borrar ni registrar progreso en libros de Ana", async () => {
    await expect(como(BETO, (db) => actualizarLibro(db, BETO, idAna, datos({ titulo: "Hack" })))).rejects.toMatchObject({ codigo: "no_encontrado" });
    await expect(como(BETO, (db) => calificarLibro(db, BETO, idAna, 1))).rejects.toMatchObject({ codigo: "no_encontrado" });
    await expect(como(BETO, (db) => registrarProgreso(db, BETO, idAna, { pagina: 10 }))).rejects.toMatchObject({ codigo: "no_encontrado" });
    await expect(como(BETO, (db) => iniciarRelectura(db, BETO, idAna))).rejects.toMatchObject({ codigo: "no_encontrado" });
    expect(await como(BETO, (db) => eliminarLibro(db, BETO, idAna))).toBe(false);
    expect(await como(BETO, (db) => eliminarLibro(db, ANA, idAna))).toBe(false);
    const l = await como(ANA, (db) => obtenerLibro(db, ANA, idAna));
    expect(l).toMatchObject({ titulo: "Secreto de Ana", paginaActual: 0, calificacion: null });
  });

  it("Beto no puede colgar lecturas ni portadas de un libro de Ana (FK compuesta + RLS)", async () => {
    await expect(
      como(BETO, (db) => db.query(`insert into lecturas (libro_id, user_id, numero, estado) values ($1, $2, 9, 'leyendo')`, [idAna, BETO])),
    ).rejects.toThrow(/foreign key/i);
    await expect(
      como(BETO, (db) => db.query(`insert into lecturas (libro_id, user_id, numero, estado) values ($1, $2, 9, 'leyendo')`, [idAna, ANA])),
    ).rejects.toThrow(/row-level security/i);
    await expect(
      como(BETO, (db) => db.query(`insert into portadas (libro_id, user_id, mime, datos) values ($1, $2, 'image/png', $3)`, [idAna, BETO, Buffer.from(PNG)])),
    ).rejects.toThrow(/foreign key|duplicate key/i);
    expect((await como(ANA, (db) => obtenerPortada(db, ANA, idAna)))?.mime).toBe("image/png");
  });

  it("cada persona tiene sus propias sugerencias y su propia vista", async () => {
    await como(BETO, (db) => crearLibro(db, BETO, datos({ titulo: "De Beto", autores: ["Autor Beto"], generos: ["Terror"], etiquetas: ["miedo"], saga: "Saga B" })));
    const s = await como(BETO, (db) => obtenerSugerencias(db, BETO));
    expect(s).toEqual({ autores: ["Autor Beto"], generos: ["Terror"], etiquetas: ["miedo"], sagas: ["Saga B"] });
    await como(BETO, (db) => guardarVistaArchivo(db, BETO, "catalogo"));
    expect(await como(BETO, (db) => obtenerVistaArchivo(db, BETO))).toBe("catalogo");
    expect(await como(ANA, (db) => obtenerVistaArchivo(db, ANA))).toBe("estanteria");
  });

  it("los errores de dominio son ErrorDominio", async () => {
    await expect(como(BETO, (db) => calificarLibro(db, BETO, idAna, 3))).rejects.toBeInstanceOf(ErrorDominio);
  });
});

describe("restricciones de la base", () => {
  it("rechaza datos fuera de rango aunque se salte la aplicación", async () => {
    const malos = [
      `update libros set calificacion = 6`,
      `update libros set paginas_total = 0`,
      `update libros set isbn = '123'`,
      `update libros set estado = 'inventado'`,
      `update libros set titulo = ''`,
      `update libros set saga_numero = -1`,
    ];
    for (const sql of malos) {
      await expect(como(ANA, (db) => db.query(sql)), sql).rejects.toThrow(/check/i);
    }
  });
});
