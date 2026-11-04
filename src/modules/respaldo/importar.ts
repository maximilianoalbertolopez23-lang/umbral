import { z } from "zod";
import type { Db } from "@/modules/archivo/repositorio";
import { detectarImagen } from "@/modules/archivo/utiles";
import { validarContenido } from "@/modules/escritorio/bloques";
import { esquemaAjustes, MAX_PLANTILLAS } from "@/modules/taller/journal";
import { ErrorTaller, guardarDisenoSala, obtenerDisenoSala } from "@/modules/taller/repositorio";
import { FORMATO_RESPALDO } from "./exportar";

/**
 * Importación de un respaldo (JSON de /api/exportar). Reglas:
 *  - Solo suma: nunca borra ni pisa datos existentes (lo que ya está, se omite).
 *  - Ignora cualquier user_id del archivo: todo queda a nombre de la persona con sesión (y RLS lo exige).
 *  - No importa progreso (eventos_progreso) ni inventario: serían una vía para fabricar Esencias u objetos.
 *    El progreso se vuelve a calcular solo con los libros y páginas importados.
 *  - Todo o nada: ante cualquier dato inválido la transacción entera se revierte.
 *  - Los ids se conservan: importar dos veces lo mismo no duplica. No sirve para pasar datos a OTRA cuenta de la misma base.
 */

export const MAX_BYTES_RESPALDO = 40_000_000;
const MAX_FILAS = 50_000;

export class ErrorRespaldo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorRespaldo";
  }
}

const id = z.string().uuid();
const texto = (max: number) => z.string().max(max);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const marca = z.string().max(40);
const lista = <T extends z.ZodType>(t: T) => z.array(t).max(MAX_FILAS).default([]);

const libro = z.object({
  id, titulo: texto(200), autores: z.array(texto(200)).max(10), isbn: texto(13).nullish(), saga: texto(120).nullish(),
  saga_numero: z.union([z.string().max(10), z.number()]).nullish(), generos: z.array(texto(80)).max(10), etiquetas: z.array(texto(80)).max(20),
  paginas_total: z.number().int().nullish(), sinopsis: texto(4000).nullish(), estado: texto(20), calificacion: z.number().int().nullish(),
  portada_version: z.number().int().default(0), origen: texto(20).default("manual"), openlibrary_key: texto(40).nullish(),
  created_at: marca, updated_at: marca,
});
const lectura = z.object({
  id, libro_id: id, numero: z.number().int(), estado: texto(20), fecha_inicio: fecha.nullish(), fecha_fin: fecha.nullish(),
  pagina_actual: z.number().int(), created_at: marca, updated_at: marca,
});
const sesion = z.object({
  id, lectura_id: id, fecha, pagina_inicio: z.number().int(), pagina_fin: z.number().int(), minutos: z.number().int().nullish(),
  nota: texto(500).nullish(), created_at: marca,
});
const portada = z.object({ libro_id: id, mime: texto(20), datos: z.string(), created_at: marca });
const plantilla = z.object({ id, nombre: texto(60), base: texto(20), ajustes: z.record(z.string(), z.unknown()), created_at: marca });
const pagina = z.object({
  id, libro_id: id.nullish(), tipo: texto(20), titulo: texto(120), contenido: z.unknown(), plantilla: texto(20), estado: texto(20),
  orden: z.number().int(), version: z.number().int().min(1), eliminada_at: marca.nullish(), plantilla_custom_id: id.nullish(),
  created_at: marca, updated_at: marca,
});
const imagen = z.object({ id, pagina_id: id, mime: texto(20), datos: z.string(), created_at: marca });

const esquemaRespaldo = z.object({
  aplicacion: z.literal("UMBRAL"),
  formato: z.literal(FORMATO_RESPALDO),
  datos: z.object({
    libros: lista(libro), lecturas: lista(lectura), sesiones_lectura: lista(sesion), portadas: lista(portada),
    plantillas_journal: lista(plantilla), diario_paginas: lista(pagina), diario_imagenes: lista(imagen),
    disenos_sala: lista(z.object({ diseno: z.unknown() })),
  }),
});

export interface ResumenImportacion {
  nuevos: Record<string, number>;
  yaEstaban: Record<string, number>;
  omitidos: string[];
}

function binario(b64: string, mime: string, donde: string): Buffer {
  const bytes = Buffer.from(b64, "base64");
  if (detectarImagen(bytes) !== mime) throw new ErrorRespaldo(`Una imagen (${donde}) no es un JPG, PNG o WebP válido.`);
  return bytes;
}

async function visibles(db: Db, tabla: "libros" | "lecturas" | "plantillas_journal" | "diario_paginas"): Promise<Set<string>> {
  const r = await db.query<{ id: string }>(`select id from public.${tabla}`);
  return new Set(r.rows.map((x) => x.id));
}

/** Tras insertar con "do nothing", todo id del archivo debe ser visible para esta persona; si no, pertenece a otra cuenta. */
function exigirPropios(ids: string[], propios: Set<string>, que: string) {
  if (ids.some((x) => !propios.has(x))) {
    throw new ErrorRespaldo(`Este respaldo contiene ${que} que ya existen en otra cuenta de esta base. Importalo en la cuenta de origen o en una base nueva.`);
  }
}

async function insertar(db: Db, sql: string, filas: unknown[][]): Promise<number> {
  let n = 0;
  for (const p of filas) n += (await db.query(sql, p)).rowCount ?? 0;
  return n;
}

export async function importarRespaldo(db: Db, userId: string, crudo: unknown): Promise<ResumenImportacion> {
  const parsed = esquemaRespaldo.safeParse(crudo);
  if (!parsed.success) {
    const p = parsed.error.issues[0];
    throw new ErrorRespaldo(`El archivo no es un respaldo de UMBRAL válido (${p?.path.join(".") || "formato"}).`);
  }
  const d = parsed.data.datos;

  const bib = await db.query<{ id: string }>("select id from bibliotecas where user_id = $1", [userId]);
  const bibliotecaId = bib.rows[0]?.id;
  if (!bibliotecaId) throw new ErrorRespaldo("Primero completá la bienvenida para tener una biblioteca.");

  const nuevos: Record<string, number> = {};
  const yaEstaban: Record<string, number> = {};
  const omitidos: string[] = [];
  const contar = (tabla: string, total: number, insertadas: number) => {
    nuevos[tabla] = insertadas;
    yaEstaban[tabla] = total - insertadas;
  };

  // Plantillas del journal (con tope).
  const plantillasPrevias = await visibles(db, "plantillas_journal");
  if (plantillasPrevias.size + d.plantillas_journal.filter((p) => !plantillasPrevias.has(p.id)).length > MAX_PLANTILLAS) {
    throw new ErrorRespaldo(`El respaldo superaría el máximo de ${MAX_PLANTILLAS} plantillas propias.`);
  }
  const filasPlantilla = d.plantillas_journal.map((p) => {
    const a = esquemaAjustes.safeParse(p.ajustes);
    if (!a.success) throw new ErrorRespaldo(`La plantilla «${p.nombre}» tiene ajustes no válidos.`);
    return [p.id, userId, p.nombre, p.base, JSON.stringify(a.data), p.created_at];
  });
  contar("plantillas_journal", filasPlantilla.length,
    await insertar(db, "insert into plantillas_journal (id, user_id, nombre, base, ajustes, created_at) values ($1, $2, $3, $4, $5::jsonb, $6) on conflict do nothing", filasPlantilla));
  const plantillas = await visibles(db, "plantillas_journal");
  exigirPropios(d.plantillas_journal.map((p) => p.id), plantillas, "plantillas");

  // Libros → lecturas → sesiones → portadas.
  contar("libros", d.libros.length, await insertar(db,
    `insert into libros (id, user_id, biblioteca_id, titulo, autores, isbn, saga, saga_numero, generos, etiquetas, paginas_total, sinopsis, estado,
       calificacion, portada_version, origen, openlibrary_key, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) on conflict do nothing`,
    d.libros.map((l) => [l.id, userId, bibliotecaId, l.titulo, l.autores, l.isbn ?? null, l.saga ?? null, l.saga_numero ?? null, l.generos, l.etiquetas,
      l.paginas_total ?? null, l.sinopsis ?? null, l.estado, l.calificacion ?? null, l.portada_version, l.origen, l.openlibrary_key ?? null, l.created_at, l.updated_at])));
  const libros = await visibles(db, "libros");
  exigirPropios(d.libros.map((l) => l.id), libros, "libros");

  contar("lecturas", d.lecturas.length, await insertar(db,
    `insert into lecturas (id, libro_id, user_id, numero, estado, fecha_inicio, fecha_fin, pagina_actual, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict do nothing`,
    d.lecturas.map((l) => [l.id, l.libro_id, userId, l.numero, l.estado, l.fecha_inicio ?? null, l.fecha_fin ?? null, l.pagina_actual, l.created_at, l.updated_at])));
  exigirPropios(d.lecturas.map((l) => l.id), await visibles(db, "lecturas"), "lecturas");

  const lecturasIds = new Set(d.lecturas.map((l) => l.id));
  contar("sesiones_lectura", d.sesiones_lectura.length, await insertar(db,
    `insert into sesiones_lectura (id, lectura_id, user_id, fecha, pagina_inicio, pagina_fin, minutos, nota, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict do nothing`,
    d.sesiones_lectura.map((s) => {
      if (!lecturasIds.has(s.lectura_id)) throw new ErrorRespaldo("Una sesión de lectura apunta a una lectura que no está en el respaldo.");
      return [s.id, s.lectura_id, userId, s.fecha, s.pagina_inicio, s.pagina_fin, s.minutos ?? null, s.nota ?? null, s.created_at];
    })));

  contar("portadas", d.portadas.length, await insertar(db,
    "insert into portadas (libro_id, user_id, mime, datos, created_at) values ($1, $2, $3, $4, $5) on conflict do nothing",
    d.portadas.map((p) => [p.libro_id, userId, p.mime, binario(p.datos, p.mime, "portada"), p.created_at])));

  // Journal: contenido revalidado con las mismas reglas que el editor.
  contar("diario_paginas", d.diario_paginas.length, await insertar(db,
    `insert into diario_paginas (id, user_id, libro_id, tipo, titulo, contenido, plantilla, estado, orden, version, eliminada_at, plantilla_custom_id, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14) on conflict do nothing`,
    d.diario_paginas.map((p) => {
      const c = validarContenido(p.contenido);
      if (!c.ok) throw new ErrorRespaldo(`La página «${p.titulo || p.tipo}» del journal no es válida. ${c.error}`);
      const custom = p.plantilla_custom_id && plantillas.has(p.plantilla_custom_id) ? p.plantilla_custom_id : null;
      return [p.id, userId, p.libro_id ?? null, p.tipo, p.titulo, JSON.stringify(c.bloques), p.plantilla, p.estado, p.orden, p.version, p.eliminada_at ?? null, custom, p.created_at, p.updated_at];
    })));
  exigirPropios(d.diario_paginas.map((p) => p.id), await visibles(db, "diario_paginas"), "páginas del journal");

  contar("diario_imagenes", d.diario_imagenes.length, await insertar(db,
    "insert into diario_imagenes (id, user_id, pagina_id, mime, datos, created_at) values ($1, $2, $3, $4, $5, $6) on conflict do nothing",
    d.diario_imagenes.map((i) => [i.id, userId, i.pagina_id, i.mime, binario(i.datos, i.mime, "journal"), i.created_at])));

  // Diseño de la sala: solo si todavía no guardó ninguno, y con las mismas reglas (inventario incluido) que el editor.
  const diseno = d.disenos_sala[0];
  if (diseno) {
    const actual = await obtenerDisenoSala(db, userId);
    if (actual.version > 0) omitidos.push("Diseño de la sala: ya tenías uno guardado y no se pisó.");
    else {
      try {
        await guardarDisenoSala(db, userId, diseno.diseno, 0);
        nuevos.disenos_sala = 1;
      } catch (e) {
        if (!(e instanceof ErrorTaller)) throw e;
        omitidos.push(`Diseño de la sala: ${e.message}`);
      }
    }
  }
  return { nuevos, yaEstaban, omitidos };
}
