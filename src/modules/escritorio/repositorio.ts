import { fechaHoy } from "@/modules/archivo/utiles";
import { extraerCitas, type Frase } from "@/modules/frases/frases";
import type { Db } from "@/modules/archivo/repositorio";
import { imagenesReferenciadas, textoPlano, validarContenido, type Bloque } from "./bloques";
import {
  INFO_TIPO, MAX_IMAGENES_POR_PERSONA, MAX_PAGINAS_POR_PERSONA, PLANTILLAS,
  type EstadoPagina, type Plantilla, type TipoPagina,
} from "./paginas";

/**
 * Datos del Escritorio. Reciben una conexión que ya corre como `umbral_app` con app.user_id fijado (conUsuario),
 * de modo que RLS filtra por persona; los filtros por user_id explícitos son redundantes a propósito.
 */

export type CodigoErrorEscritorio =
  | "no_encontrada" | "conflicto" | "limite_paginas" | "limite_imagenes" | "contenido_invalido" | "libro_inexistente";

export class ErrorEscritorio extends Error {
  constructor(public readonly codigo: CodigoErrorEscritorio, mensaje: string) {
    super(mensaje);
    this.name = "ErrorEscritorio";
  }
}

export interface ResumenPagina {
  id: string;
  libroId: string | null;
  tipo: TipoPagina;
  titulo: string;
  estado: EstadoPagina;
  plantilla: Plantilla;
  /** Plantilla propia (de El Taller) que se aplica sobre la base; null si usa la base tal cual. */
  plantillaCustomId: string | null;
  orden: number;
  actualizadaAt: string;
  fragmento: string;
  eliminadaAt: string | null;
}

export interface PaginaCompleta extends ResumenPagina {
  bloques: Bloque[];
  version: number;
  libro: { id: string; titulo: string; autores: string[]; portadaVersion: number } | null;
}

interface FilaPagina {
  id: string; libro_id: string | null; tipo: TipoPagina; titulo: string; estado: EstadoPagina; plantilla: Plantilla; plantilla_custom_id: string | null;
  orden: number; updated_at: Date | string; contenido: unknown; version: number; eliminada_at: Date | string | null;
}

const COLUMNAS = "id, libro_id, tipo, titulo, estado, plantilla, plantilla_custom_id, orden, updated_at, contenido, version, eliminada_at";

function aResumen(f: FilaPagina): ResumenPagina {
  // El contenido ya fue validado al guardarse; si por algún motivo no lo está, se muestra vacío antes que romper.
  const v = validarContenido(f.contenido);
  return {
    id: f.id, libroId: f.libro_id, tipo: f.tipo, titulo: f.titulo, estado: f.estado, plantilla: f.plantilla, plantillaCustomId: f.plantilla_custom_id, orden: f.orden,
    actualizadaAt: new Date(f.updated_at).toISOString(), fragmento: v.ok ? textoPlano(v.bloques) : "",
    eliminadaAt: f.eliminada_at ? new Date(f.eliminada_at).toISOString() : null,
  };
}

const clausulaAmbito = (libroId: string | null) => (libroId ? "libro_id = $2" : "libro_id is null and $2::uuid is null");

/** Páginas de un libro (o del diario general si libroId es null), en el orden elegido por la persona. */
export async function listarPaginas(db: Db, userId: string, libroId: string | null): Promise<ResumenPagina[]> {
  const r = await db.query<FilaPagina>(
    `select ${COLUMNAS} from diario_paginas where user_id = $1 and ${clausulaAmbito(libroId)} and eliminada_at is null
      order by orden, created_at`,
    [userId, libroId],
  );
  return r.rows.map(aResumen);
}

/** Cantidad de páginas por libro (para el índice de libros del Escritorio). */
export async function contarPaginasPorLibro(db: Db, userId: string): Promise<Record<string, number>> {
  const r = await db.query<{ libro_id: string; n: number }>(
    `select libro_id, count(*)::int as n from diario_paginas
      where user_id = $1 and libro_id is not null and eliminada_at is null group by libro_id`,
    [userId],
  );
  return Object.fromEntries(r.rows.map((x) => [x.libro_id, x.n]));
}

export async function obtenerPagina(db: Db, userId: string, id: string): Promise<PaginaCompleta | null> {
  const r = await db.query<FilaPagina>(`select ${COLUMNAS} from diario_paginas where user_id = $1 and id = $2`, [userId, id]);
  const f = r.rows[0];
  if (!f || f.eliminada_at) return null;
  const v = validarContenido(f.contenido);
  let libro: PaginaCompleta["libro"] = null;
  if (f.libro_id) {
    const l = await db.query<{ id: string; titulo: string; autores: string[]; portada_version: number }>(
      "select id, titulo, autores, portada_version from libros where user_id = $1 and id = $2",
      [userId, f.libro_id],
    );
    if (l.rows[0]) libro = { id: l.rows[0].id, titulo: l.rows[0].titulo, autores: l.rows[0].autores, portadaVersion: l.rows[0].portada_version };
  }
  return { ...aResumen(f), bloques: v.ok ? v.bloques : [], version: f.version, libro };
}

export interface DatosNuevaPagina {
  libroId: string | null;
  tipo: TipoPagina;
  titulo?: string;
  plantilla?: Plantilla;
}

export async function crearPagina(db: Db, userId: string, d: DatosNuevaPagina): Promise<string> {
  const total = await db.query<{ n: number }>("select count(*)::int as n from diario_paginas where user_id = $1", [userId]);
  if (total.rows[0].n >= MAX_PAGINAS_POR_PERSONA) {
    throw new ErrorEscritorio("limite_paginas", `Llegaste al máximo de ${MAX_PAGINAS_POR_PERSONA} páginas. Eliminá alguna para crear otra.`);
  }
  if (d.libroId) {
    const l = await db.query("select 1 from libros where user_id = $1 and id = $2", [userId, d.libroId]);
    if (!l.rowCount) throw new ErrorEscritorio("libro_inexistente", "Ese libro no existe en tu Archivo.");
  }
  const pref = await db.query<{ plantilla_diario: Plantilla; plantilla_diario_custom_id: string | null }>("select plantilla_diario, plantilla_diario_custom_id from preferencias where user_id = $1", [userId]);
  const plantilla = d.plantilla ?? pref.rows[0]?.plantilla_diario ?? "pergamino";
  const plantillaCustomId = d.plantilla ? null : (pref.rows[0]?.plantilla_diario_custom_id ?? null);
  const orden = await db.query<{ o: number }>(
    `select coalesce(max(orden), -1) + 1 as o from diario_paginas where user_id = $1 and ${clausulaAmbito(d.libroId)}`,
    [userId, d.libroId],
  );
  const info = INFO_TIPO[d.tipo];
  const r = await db.query<{ id: string }>(
    `insert into diario_paginas (user_id, libro_id, tipo, titulo, contenido, plantilla, plantilla_custom_id, orden)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8) returning id`,
    [userId, d.libroId, d.tipo, (d.titulo ?? info.titulo).slice(0, 120), JSON.stringify(info.bloques(fechaHoy())), plantilla, plantillaCustomId, orden.rows[0].o],
  );
  return r.rows[0].id;
}

export interface DatosGuardado {
  /** Versión que la persona tenía abierta. Si cambió en otro lado, el guardado se rechaza (no se pisa nada). */
  version: number;
  titulo: string;
  bloques: Bloque[];
  plantilla: Plantilla;
  /** Plantilla propia aplicada (null = solo la base). Es presentación: no afecta al contenido. */
  plantillaCustomId?: string | null;
  estado: EstadoPagina;
}

/**
 * Guarda la página (autosave). Devuelve la nueva versión. `bloques` debe venir ya validado (validarContenido).
 * Las imágenes subidas hace más de un día que ya no están en la página se eliminan (margen para deshacer).
 */
export async function guardarPagina(db: Db, userId: string, id: string, d: DatosGuardado): Promise<number> {
  if (!PLANTILLAS.includes(d.plantilla)) throw new ErrorEscritorio("contenido_invalido", "Plantilla no válida.");
  const r = await db.query<{ version: number }>(
    `update diario_paginas set titulo = $3, contenido = $4::jsonb, plantilla = $5, estado = $6, plantilla_custom_id = $8, version = version + 1
      where id = $2 and user_id = $1 and version = $7 and eliminada_at is null returning version`,
    [userId, id, d.titulo.slice(0, 120), JSON.stringify(d.bloques), d.plantilla, d.estado, d.version, d.plantillaCustomId ?? null],
  );
  if (!r.rows[0]) {
    const existe = await db.query("select 1 from diario_paginas where id = $2 and user_id = $1 and eliminada_at is null", [userId, id]);
    if (!existe.rowCount) throw new ErrorEscritorio("no_encontrada", "Esa página ya no existe.");
    throw new ErrorEscritorio("conflicto", "Esta página se modificó en otra pestaña. Recargala para ver la última versión.");
  }
  const usadas = imagenesReferenciadas(d.bloques);
  await db.query(
    `delete from diario_imagenes where pagina_id = $2 and user_id = $1 and created_at < now() - interval '1 day'
       and not (id = any($3::uuid[]))`,
    [userId, id, usadas],
  );
  return r.rows[0].version;
}

/** Fija el orden de las páginas de un ámbito según la lista de ids (todos deben ser de ese ámbito). */
export async function reordenarPaginas(db: Db, userId: string, libroId: string | null, ids: string[]) {
  const actuales = await db.query<{ id: string }>(
    `select id from diario_paginas where user_id = $1 and ${clausulaAmbito(libroId)} and eliminada_at is null`,
    [userId, libroId],
  );
  const validos = new Set(actuales.rows.map((x) => x.id));
  if (ids.length !== validos.size || !ids.every((i) => validos.has(i)) || new Set(ids).size !== ids.length) {
    throw new ErrorEscritorio("no_encontrada", "La lista de páginas no coincide con las que existen.");
  }
  for (const [i, id] of ids.entries()) {
    await db.query("update diario_paginas set orden = $3 where id = $2 and user_id = $1", [userId, id, i]);
  }
}

export async function eliminarPagina(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query("update diario_paginas set eliminada_at = now() where id = $2 and user_id = $1 and eliminada_at is null", [userId, id]);
  return (r.rowCount ?? 0) > 0;
}

export async function restaurarPagina(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query(
    `update diario_paginas set eliminada_at = null,
            orden = (select coalesce(max(orden), -1) + 1 from diario_paginas p2
                      where p2.user_id = $1 and p2.libro_id is not distinct from diario_paginas.libro_id and p2.eliminada_at is null)
      where id = $2 and user_id = $1 and eliminada_at is not null`,
    [userId, id],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Borrado definitivo: solo de páginas que ya están en la papelera. */
export async function eliminarDefinitivamente(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query("delete from diario_paginas where id = $2 and user_id = $1 and eliminada_at is not null", [userId, id]);
  return (r.rowCount ?? 0) > 0;
}

export interface PaginaEnPapelera extends ResumenPagina {
  libroTitulo: string | null;
}

export async function listarPapelera(db: Db, userId: string): Promise<PaginaEnPapelera[]> {
  const r = await db.query<FilaPagina & { libro_titulo: string | null }>(
    `select p.id, p.libro_id, p.tipo, p.titulo, p.estado, p.plantilla, p.orden, p.updated_at, p.contenido, p.version, p.eliminada_at,
            l.titulo as libro_titulo
       from diario_paginas p left join libros l on l.id = p.libro_id
      where p.user_id = $1 and p.eliminada_at is not null order by p.eliminada_at desc`,
    [userId],
  );
  return r.rows.map((f) => ({ ...aResumen(f), libroTitulo: f.libro_titulo }));
}

/** Cambia la plantilla de todas las páginas de un ámbito (el contenido no se toca). */
export async function aplicarPlantillaAAmbito(db: Db, userId: string, libroId: string | null, plantilla: Plantilla): Promise<number> {
  const r = await db.query(
    `update diario_paginas set plantilla = $3, plantilla_custom_id = null where user_id = $1 and ${clausulaAmbito(libroId)} and eliminada_at is null`,
    [userId, libroId, plantilla],
  );
  return r.rowCount ?? 0;
}

export async function obtenerPlantillaPreferida(db: Db, userId: string): Promise<Plantilla> {
  const r = await db.query<{ plantilla_diario: Plantilla }>("select plantilla_diario from preferencias where user_id = $1", [userId]);
  return r.rows[0]?.plantilla_diario ?? "pergamino";
}

export async function guardarPlantillaPreferida(db: Db, userId: string, plantilla: Plantilla) {
  await db.query("update preferencias set plantilla_diario = $2, plantilla_diario_custom_id = null where user_id = $1", [userId, plantilla]);
}

// ---------------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------------

export async function guardarImagen(db: Db, userId: string, paginaId: string, imagen: { mime: string; datos: Uint8Array }): Promise<string> {
  const pagina = await db.query("select 1 from diario_paginas where id = $2 and user_id = $1 and eliminada_at is null", [userId, paginaId]);
  if (!pagina.rowCount) throw new ErrorEscritorio("no_encontrada", "Esa página ya no existe.");
  const total = await db.query<{ n: number }>("select count(*)::int as n from diario_imagenes where user_id = $1", [userId]);
  if (total.rows[0].n >= MAX_IMAGENES_POR_PERSONA) {
    throw new ErrorEscritorio("limite_imagenes", `Llegaste al máximo de ${MAX_IMAGENES_POR_PERSONA} imágenes. Quitá alguna de tus páginas para subir otra.`);
  }
  const r = await db.query<{ id: string }>(
    "insert into diario_imagenes (user_id, pagina_id, mime, datos) values ($1, $2, $3, $4) returning id",
    [userId, paginaId, imagen.mime, Buffer.from(imagen.datos)],
  );
  return r.rows[0].id;
}

export async function obtenerImagen(db: Db, userId: string, id: string) {
  const r = await db.query<{ mime: string; datos: Uint8Array }>(
    `select i.mime, i.datos from diario_imagenes i join diario_paginas p on p.id = i.pagina_id
      where i.user_id = $1 and i.id = $2 and p.eliminada_at is null`,
    [userId, id],
  );
  return r.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Resumen de lecturas (datos reales del Archivo)
// ---------------------------------------------------------------------------

export interface EstadisticasAnio {
  anio: number;
  librosTerminados: number;
  paginasLeidas: number;
  calificacionMedia: number | null;
  minutosLeidos: number;
  libros: { id: string; titulo: string; autores: string[]; calificacion: number | null; fechaFin: string }[];
}

/** Balance de un año calculado en el momento a partir de El Archivo: nunca se guardan números copiados. */
export async function estadisticasAnio(db: Db, userId: string, anio: number): Promise<EstadisticasAnio> {
  const inicio = `${anio}-01-01`;
  const fin = `${anio + 1}-01-01`;
  const libros = await db.query<{ id: string; titulo: string; autores: string[]; calificacion: number | null; paginas_total: number | null; fecha_fin: string }>(
    `select l.id, l.titulo, l.autores, l.calificacion, l.paginas_total, t.fecha_fin
       from lecturas t join libros l on l.id = t.libro_id
      where t.user_id = $1 and t.estado = 'terminado' and t.fecha_fin >= $2 and t.fecha_fin < $3
      order by t.fecha_fin`,
    [userId, inicio, fin],
  );
  const minutos = await db.query<{ m: number | null }>(
    "select sum(minutos)::int as m from sesiones_lectura where user_id = $1 and fecha >= $2 and fecha < $3",
    [userId, inicio, fin],
  );
  const calificados = libros.rows.filter((l) => l.calificacion !== null);
  return {
    anio,
    librosTerminados: libros.rows.length,
    paginasLeidas: libros.rows.reduce((a, l) => a + (l.paginas_total ?? 0), 0),
    calificacionMedia: calificados.length ? Math.round((calificados.reduce((a, l) => a + (l.calificacion ?? 0), 0) / calificados.length) * 10) / 10 : null,
    minutosLeidos: minutos.rows[0]?.m ?? 0,
    libros: libros.rows.map((l) => ({ id: l.id, titulo: l.titulo, autores: l.autores, calificacion: l.calificacion, fechaFin: l.fecha_fin })),
  };
}

/** Citas guardadas en el journal, en orden aleatorio, para mostrar en las pantallas de carga. */
export async function obtenerCitasParaCarga(db: Db, userId: string, max = 12): Promise<Frase[]> {
  const r = await db.query<{ contenido: unknown }>(
    `select contenido from diario_paginas
     where user_id = $1 and eliminada_at is null and contenido @> '[{"tipo":"cita"}]'::jsonb
     order by random() limit 20`,
    [userId],
  );
  return extraerCitas(r.rows.map((x) => x.contenido), max);
}
