import type { Estado, EstadoLectura, Lectura, LibroDetalle, LibroInput, LibroResumen, Sesion, VistaArchivo } from "./tipos";
import { fechaHoy } from "./utiles";

/**
 * Operaciones de datos del Archivo. Reciben una conexión que ya corre como `umbral_app` con app.user_id fijado
 * (ver conUsuario en src/lib/db.ts), de modo que RLS filtra por persona. Los filtros por user_id/id explícitos
 * son redundantes a propósito. Cada función que escribe varias tablas debe ejecutarse dentro de una transacción
 * (conUsuario ya la abre).
 */

export interface Db {
  query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

export type CodigoError =
  | "sin_biblioteca"
  | "no_encontrado"
  | "progreso_excede_total"
  | "total_menor_que_progreso"
  | "estado_invalido"
  | "relectura_no_permitida"
  | "fechas_invalidas";

export class ErrorDominio extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDominio";
  }
}

const MENSAJES_DB: Record<string, [CodigoError, string]> = {
  progreso_excede_total: ["progreso_excede_total", "La página no puede superar el total de páginas del libro."],
  total_menor_que_progreso: [
    "total_menor_que_progreso",
    "El total de páginas no puede ser menor que el progreso ya registrado.",
  ],
};

/** Convierte los errores de los triggers de la base en errores de dominio con mensaje claro. */
export function traducirErrorDb(error: unknown): unknown {
  const texto = error instanceof Error ? error.message : "";
  for (const [clave, [codigo, mensaje]] of Object.entries(MENSAJES_DB)) {
    if (texto.includes(clave)) return new ErrorDominio(codigo, mensaje);
  }
  return error;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

interface FilaResumen {
  id: string;
  titulo: string;
  autores: string[];
  isbn: string | null;
  saga: string | null;
  saga_numero: string | null;
  generos: string[];
  etiquetas: string[];
  paginas_total: number | null;
  estado: Estado;
  calificacion: number | null;
  portada_version: number;
  created_at: Date | string;
  pagina_actual: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  n_lecturas: number;
}

function aResumen(f: FilaResumen): LibroResumen {
  return {
    id: f.id,
    titulo: f.titulo,
    autores: f.autores,
    isbn: f.isbn,
    saga: f.saga,
    sagaNumero: f.saga_numero === null ? null : Number(f.saga_numero),
    generos: f.generos,
    etiquetas: f.etiquetas,
    paginasTotal: f.paginas_total,
    estado: f.estado,
    calificacion: f.calificacion,
    portadaVersion: f.portada_version,
    paginaActual: f.pagina_actual,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    nLecturas: f.n_lecturas,
    creadoAt: new Date(f.created_at).toISOString(),
  };
}

const SELECT_RESUMEN = `
  select l.id, l.titulo, l.autores, l.isbn, l.saga, l.saga_numero, l.generos, l.etiquetas, l.paginas_total,
         l.estado, l.calificacion, l.portada_version, l.created_at,
         lc.pagina_actual, lc.fecha_inicio, lc.fecha_fin, coalesce(n.n, 0)::int as n_lecturas
    from libros l
    left join lateral (
      select pagina_actual, fecha_inicio, fecha_fin from lecturas where libro_id = l.id order by numero desc limit 1
    ) lc on true
    left join lateral (select count(*) as n from lecturas where libro_id = l.id) n on true`;

/** Todos los libros de la persona. La estantería y el catálogo se alimentan de esta misma lista. */
export async function listarLibros(db: Db, userId: string): Promise<LibroResumen[]> {
  const r = await db.query<FilaResumen>(`${SELECT_RESUMEN} where l.user_id = $1 order by l.created_at desc`, [userId]);
  return r.rows.map(aResumen);
}

export async function obtenerLibro(db: Db, userId: string, id: string): Promise<LibroDetalle | null> {
  const base = await db.query<FilaResumen & { sinopsis: string | null; origen: "manual" | "openlibrary" }>(
    `select r.*, l2.sinopsis, l2.origen from (${SELECT_RESUMEN} where l.user_id = $1 and l.id = $2) r
       join libros l2 on l2.id = r.id`,
    [userId, id],
  );
  const fila = base.rows[0];
  if (!fila) return null;

  const lecturas = await db.query<{
    id: string;
    numero: number;
    estado: EstadoLectura;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    pagina_actual: number;
  }>(
    `select id, numero, estado, fecha_inicio, fecha_fin, pagina_actual from lecturas
      where user_id = $1 and libro_id = $2 order by numero desc`,
    [userId, id],
  );
  const sesiones = await db.query<{
    id: string;
    lectura_id: string;
    fecha: string;
    pagina_inicio: number;
    pagina_fin: number;
    minutos: number | null;
    nota: string | null;
  }>(
    `select s.id, s.lectura_id, s.fecha, s.pagina_inicio, s.pagina_fin, s.minutos, s.nota
       from sesiones_lectura s join lecturas t on t.id = s.lectura_id
      where s.user_id = $1 and t.libro_id = $2 order by s.fecha desc, s.created_at desc`,
    [userId, id],
  );

  return {
    ...aResumen(fila),
    sinopsis: fila.sinopsis,
    origen: fila.origen,
    lecturas: lecturas.rows.map(
      (l): Lectura => ({
        id: l.id,
        numero: l.numero,
        estado: l.estado,
        fechaInicio: l.fecha_inicio,
        fechaFin: l.fecha_fin,
        paginaActual: l.pagina_actual,
      }),
    ),
    sesiones: sesiones.rows.map(
      (s): Sesion => ({
        id: s.id,
        lecturaId: s.lectura_id,
        fecha: s.fecha,
        paginaInicio: s.pagina_inicio,
        paginaFin: s.pagina_fin,
        minutos: s.minutos,
        nota: s.nota,
      }),
    ),
  };
}

export interface Sugerencias {
  autores: string[];
  generos: string[];
  etiquetas: string[];
  sagas: string[];
}

/** Valores ya usados por la persona, para autocompletar el formulario. */
export async function obtenerSugerencias(db: Db, userId: string): Promise<Sugerencias> {
  // En secuencia: una conexión de pg no admite consultas simultáneas.
  const columna = (sql: string) => db.query<{ v: string }>(sql, [userId]).then((r) => r.rows.map((x) => x.v));
  const autores = await columna("select distinct unnest(autores) as v from libros where user_id = $1 order by 1");
  const generos = await columna("select distinct unnest(generos) as v from libros where user_id = $1 order by 1");
  const etiquetas = await columna("select distinct unnest(etiquetas) as v from libros where user_id = $1 order by 1");
  const sagas = await columna("select distinct saga as v from libros where user_id = $1 and saga is not null order by 1");
  return { autores, generos, etiquetas, sagas };
}

export async function obtenerPortada(db: Db, userId: string, libroId: string) {
  const r = await db.query<{ mime: string; datos: Uint8Array }>(
    "select mime, datos from portadas where user_id = $1 and libro_id = $2",
    [userId, libroId],
  );
  return r.rows[0] ?? null;
}

export async function obtenerVistaArchivo(db: Db, userId: string): Promise<VistaArchivo> {
  const r = await db.query<{ vista_archivo: VistaArchivo }>("select vista_archivo from preferencias where user_id = $1", [userId]);
  return r.rows[0]?.vista_archivo ?? "estanteria";
}

export async function guardarVistaArchivo(db: Db, userId: string, vista: VistaArchivo): Promise<void> {
  await db.query("update preferencias set vista_archivo = $1 where user_id = $2", [vista, userId]);
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export interface PortadaNueva {
  mime: string;
  datos: Uint8Array;
}

async function guardarPortada(db: Db, userId: string, libroId: string, portada: PortadaNueva) {
  await db.query(
    `insert into portadas (libro_id, user_id, mime, datos) values ($1, $2, $3, $4)
     on conflict (libro_id) do update set mime = excluded.mime, datos = excluded.datos`,
    [libroId, userId, portada.mime, Buffer.from(portada.datos)],
  );
  await db.query("update libros set portada_version = portada_version + 1 where id = $1 and user_id = $2", [libroId, userId]);
}

export async function quitarPortada(db: Db, userId: string, libroId: string) {
  await db.query("delete from portadas where libro_id = $1 and user_id = $2", [libroId, userId]);
  await db.query("update libros set portada_version = 0 where id = $1 and user_id = $2", [libroId, userId]);
}

export interface OpcionesCreacion {
  portada?: PortadaNueva | null;
  origen?: "manual" | "openlibrary";
  openlibraryKey?: string | null;
}

export async function crearLibro(db: Db, userId: string, d: LibroInput, opciones: OpcionesCreacion = {}): Promise<string> {
  const biblioteca = await db.query<{ id: string }>("select id from bibliotecas where user_id = $1", [userId]);
  const bibliotecaId = biblioteca.rows[0]?.id;
  if (!bibliotecaId) throw new ErrorDominio("sin_biblioteca", "Primero completá la bienvenida para crear tu biblioteca.");

  try {
    const r = await db.query<{ id: string }>(
      `insert into libros (user_id, biblioteca_id, titulo, autores, isbn, saga, saga_numero, generos, etiquetas,
                           paginas_total, sinopsis, estado, calificacion, origen, openlibrary_key)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'quiero_leer', $12, $13, $14) returning id`,
      [
        userId, bibliotecaId, d.titulo, d.autores, d.isbn, d.saga, d.sagaNumero, d.generos, d.etiquetas,
        d.paginasTotal, d.sinopsis, d.calificacion, opciones.origen ?? "manual", opciones.openlibraryKey ?? null,
      ],
    );
    const id = r.rows[0].id;
    if (d.estado !== "quiero_leer") await aplicarEstado(db, userId, id, d.estado, { fechaInicio: d.fechaInicio, fechaFin: d.fechaFin });
    if (opciones.portada) await guardarPortada(db, userId, id, opciones.portada);
    return id;
  } catch (e) {
    throw traducirErrorDb(e);
  }
}

export interface OpcionesEdicion {
  /** Reemplaza la portada. */
  portada?: PortadaNueva | null;
  quitarPortada?: boolean;
}

export async function actualizarLibro(db: Db, userId: string, id: string, d: LibroInput, opciones: OpcionesEdicion = {}) {
  try {
    const r = await db.query(
      `update libros set titulo = $3, autores = $4, isbn = $5, saga = $6, saga_numero = $7, generos = $8,
                         etiquetas = $9, paginas_total = $10, sinopsis = $11, calificacion = $12
        where id = $2 and user_id = $1`,
      [userId, id, d.titulo, d.autores, d.isbn, d.saga, d.sagaNumero, d.generos, d.etiquetas, d.paginasTotal, d.sinopsis, d.calificacion],
    );
    if (!r.rowCount) throw new ErrorDominio("no_encontrado", "No encontramos ese libro.");
    await aplicarEstado(db, userId, id, d.estado, { fechaInicio: d.fechaInicio, fechaFin: d.fechaFin });
    if (opciones.quitarPortada) await quitarPortada(db, userId, id);
    if (opciones.portada) await guardarPortada(db, userId, id, opciones.portada);
  } catch (e) {
    throw traducirErrorDb(e);
  }
}

export async function eliminarLibro(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query("delete from libros where id = $1 and user_id = $2", [id, userId]);
  return (r.rowCount ?? 0) > 0;
}

export async function calificarLibro(db: Db, userId: string, id: string, calificacion: number | null) {
  const r = await db.query("update libros set calificacion = $3 where id = $2 and user_id = $1", [userId, id, calificacion]);
  if (!r.rowCount) throw new ErrorDominio("no_encontrado", "No encontramos ese libro.");
}

// ---------------------------------------------------------------------------
// Seguimiento de lectura
// ---------------------------------------------------------------------------

interface LibroBase {
  paginas_total: number | null;
  estado: Estado;
}
interface LecturaBase {
  id: string;
  numero: number;
  estado: EstadoLectura;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  pagina_actual: number;
}

async function leerBase(db: Db, userId: string, libroId: string) {
  const libro = await db.query<LibroBase>("select paginas_total, estado from libros where id = $2 and user_id = $1 for update", [userId, libroId]);
  if (!libro.rows[0]) throw new ErrorDominio("no_encontrado", "No encontramos ese libro.");
  const ultima = await db.query<LecturaBase>(
    `select id, numero, estado, fecha_inicio, fecha_fin, pagina_actual from lecturas
      where libro_id = $2 and user_id = $1 order by numero desc limit 1`,
    [userId, libroId],
  );
  return { libro: libro.rows[0], ultima: ultima.rows[0] ?? null };
}

async function insertarSesion(
  db: Db, userId: string, lecturaId: string, fecha: string, inicio: number, fin: number, minutos: number | null, nota: string | null,
) {
  await db.query(
    `insert into sesiones_lectura (lectura_id, user_id, fecha, pagina_inicio, pagina_fin, minutos, nota)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [lecturaId, userId, fecha, inicio, fin, minutos, nota],
  );
}

export interface FechasEstado {
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

/**
 * Lleva el libro a un estado. Crea la primera lectura si no existía; si ya hay lecturas modifica la más reciente
 * (las anteriores no se tocan). Al pasar a "terminado" con total conocido, el progreso se completa y queda
 * registrado en el historial.
 */
export async function aplicarEstado(db: Db, userId: string, libroId: string, estado: Estado, fechas: FechasEstado = {}) {
  const { libro, ultima } = await leerBase(db, userId, libroId);

  if (estado === "quiero_leer") {
    if (ultima) {
      throw new ErrorDominio(
        "estado_invalido",
        "Este libro ya tiene lecturas registradas. Para volver a empezarlo usá «Releer».",
      );
    }
    return;
  }

  const conFin = estado === "terminado" || estado === "abandonado";
  const inicio = fechas.fechaInicio !== undefined ? fechas.fechaInicio : (ultima?.fecha_inicio ?? null);
  const fin = conFin ? (fechas.fechaFin !== undefined ? fechas.fechaFin : (ultima?.fecha_fin ?? null)) : null;
  if (inicio && fin && fin < inicio) throw new ErrorDominio("fechas_invalidas", "La finalización no puede ser anterior al inicio.");

  const paginaPrevia = ultima?.pagina_actual ?? 0;
  const pagina = estado === "terminado" && libro.paginas_total ? libro.paginas_total : paginaPrevia;
  let lecturaId = ultima?.id;

  if (!ultima) {
    const r = await db.query<{ id: string }>(
      `insert into lecturas (libro_id, user_id, numero, estado, fecha_inicio, fecha_fin, pagina_actual)
       values ($1, $2, 1, $3, $4, $5, $6) returning id`,
      [libroId, userId, estado, inicio, fin, pagina],
    );
    lecturaId = r.rows[0].id;
  } else {
    await db.query(
      "update lecturas set estado = $3, fecha_inicio = $4, fecha_fin = $5, pagina_actual = $6 where id = $2 and user_id = $1",
      [userId, ultima.id, estado, inicio, fin, pagina],
    );
  }
  if (pagina !== paginaPrevia && lecturaId) {
    await insertarSesion(db, userId, lecturaId, fin ?? fechaHoy(), paginaPrevia, pagina, null, "Marcado como terminado");
  }
  await db.query("update libros set estado = $3 where id = $2 and user_id = $1", [userId, libroId, estado]);
}

export interface DatosProgreso {
  pagina: number;
  minutos?: number | null;
  fecha?: string | null;
  nota?: string | null;
}

export interface ResultadoProgreso {
  porcentaje: number | null;
  terminado: boolean;
}

/**
 * Registra un avance: guarda la sesión en el historial y actualiza la página actual de la lectura en curso.
 * Si el libro estaba en "quiero leer" empieza la lectura; si estaba pausado la retoma; si llega a la última
 * página con total conocido, la lectura pasa a "terminado".
 */
export async function registrarProgreso(db: Db, userId: string, libroId: string, d: DatosProgreso): Promise<ResultadoProgreso> {
  const { libro, ultima } = await leerBase(db, userId, libroId);
  const fecha = d.fecha || fechaHoy();

  if (libro.paginas_total && d.pagina > libro.paginas_total) {
    throw new ErrorDominio("progreso_excede_total", `El libro tiene ${libro.paginas_total} páginas: no podés registrar la ${d.pagina}.`);
  }
  if (ultima && (ultima.estado === "terminado" || ultima.estado === "abandonado")) {
    throw new ErrorDominio("estado_invalido", "Esta lectura ya está cerrada. Usá «Releer» para empezar una nueva.");
  }

  let lectura = ultima;
  if (!lectura) {
    const r = await db.query<{ id: string }>(
      `insert into lecturas (libro_id, user_id, numero, estado, fecha_inicio, pagina_actual)
       values ($1, $2, 1, 'leyendo', $3, 0) returning id`,
      [libroId, userId, fecha],
    );
    lectura = { id: r.rows[0].id, numero: 1, estado: "leyendo", fecha_inicio: fecha, fecha_fin: null, pagina_actual: 0 };
  }

  const completa = Boolean(libro.paginas_total) && d.pagina === libro.paginas_total;
  const nuevoEstado: EstadoLectura = completa ? "terminado" : "leyendo";
  const inicio = lectura.fecha_inicio ?? fecha;
  if (completa && fecha < inicio) throw new ErrorDominio("fechas_invalidas", "La fecha del progreso es anterior al inicio de la lectura.");

  await insertarSesion(db, userId, lectura.id, fecha, lectura.pagina_actual, d.pagina, d.minutos ?? null, d.nota || null);
  await db.query(
    "update lecturas set pagina_actual = $3, estado = $4, fecha_inicio = $5, fecha_fin = $6 where id = $2 and user_id = $1",
    [userId, lectura.id, d.pagina, nuevoEstado, inicio, completa ? fecha : null],
  );
  await db.query("update libros set estado = $3 where id = $2 and user_id = $1", [userId, libroId, nuevoEstado]);

  const pct = libro.paginas_total ? Math.round((d.pagina / libro.paginas_total) * 100) : null;
  return { porcentaje: pct, terminado: completa };
}

/** Empieza una relectura. Las lecturas anteriores (con sus fechas e historial) quedan intactas. */
export async function iniciarRelectura(db: Db, userId: string, libroId: string, fechaInicio?: string | null): Promise<number> {
  const { ultima } = await leerBase(db, userId, libroId);
  if (!ultima || (ultima.estado !== "terminado" && ultima.estado !== "abandonado")) {
    throw new ErrorDominio("relectura_no_permitida", "Solo se puede releer un libro cuya lectura anterior esté terminada o abandonada.");
  }
  const numero = ultima.numero + 1;
  await db.query(
    `insert into lecturas (libro_id, user_id, numero, estado, fecha_inicio, pagina_actual)
     values ($1, $2, $3, 'leyendo', $4, 0)`,
    [libroId, userId, numero, fechaInicio || fechaHoy()],
  );
  await db.query("update libros set estado = 'leyendo' where id = $2 and user_id = $1", [userId, libroId]);
  return numero;
}

/** Modifica las fechas de una lectura concreta (cualquiera, no solo la última). */
export async function actualizarFechasLectura(db: Db, userId: string, lecturaId: string, fechas: { fechaInicio: string | null; fechaFin: string | null }) {
  const r = await db.query<{ estado: EstadoLectura }>("select estado from lecturas where id = $2 and user_id = $1 for update", [userId, lecturaId]);
  const lectura = r.rows[0];
  if (!lectura) throw new ErrorDominio("no_encontrado", "No encontramos esa lectura.");
  if (fechas.fechaFin && lectura.estado !== "terminado" && lectura.estado !== "abandonado") {
    throw new ErrorDominio("fechas_invalidas", "La fecha de finalización solo aplica a lecturas terminadas o abandonadas.");
  }
  if (fechas.fechaInicio && fechas.fechaFin && fechas.fechaFin < fechas.fechaInicio) {
    throw new ErrorDominio("fechas_invalidas", "La finalización no puede ser anterior al inicio.");
  }
  await db.query("update lecturas set fecha_inicio = $3, fecha_fin = $4 where id = $2 and user_id = $1", [
    userId, lecturaId, fechas.fechaInicio, fechas.fechaFin,
  ]);
}
