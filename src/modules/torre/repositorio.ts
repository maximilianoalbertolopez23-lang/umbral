import type { Db } from "@/modules/archivo/repositorio";
import { textoPlano, validarContenido } from "@/modules/escritorio/bloques";
import {
  ACTIVIDADES, LOGROS, METRICAS_VACIAS, MISIONES, claveLogro, claveMision, estadoNivel, eventosPendientes, obtenerArticulo,
  type EstadoNivel, type Logro, type Metricas, type Mision, type TipoActividad,
} from "./reglas";

/**
 * Progreso de La Torre. Recibe una conexión que ya corre como `umbral_app` con app.user_id fijado (conUsuario).
 * El libro mayor `eventos_progreso` es de solo-agregar y cada evento tiene una clave única por persona: los premios no
 * se pueden duplicar editando, recargando ni evaluando dos veces.
 */

export type CodigoErrorTorre = "no_existe" | "ya_tienes" | "nivel" | "esencias";

export class ErrorTorre extends Error {
  constructor(public readonly codigo: CodigoErrorTorre, mensaje: string) {
    super(mensaje);
    this.name = "ErrorTorre";
  }
}

/** Una reseña o reflexión cuenta si tiene algo escrito de verdad (evita premiar páginas vacías). */
export const MIN_CARACTERES = 60;

// ---------------------------------------------------------------------------
// Métricas verificables
// ---------------------------------------------------------------------------

interface Hechos {
  metricas: Metricas;
  /** Actividades elegibles con su clave única y el nombre para el historial. */
  actividades: { clave: string; tipo: TipoActividad; titulo: string }[];
}

export async function leerHechos(db: Db, userId: string): Promise<Hechos> {
  const terminadas = await db.query<{ id: string; titulo: string }>(
    "select t.id, l.titulo from lecturas t join libros l on l.id = t.libro_id where t.user_id = $1 and t.estado = 'terminado' order by t.created_at",
    [userId],
  );
  const libros = await db.query<{ paginas: number | null; fantasia: boolean }>(
    `select l.paginas_total as paginas, exists (select 1 from unnest(l.generos) g where g ilike '%fantas%') as fantasia
       from libros l where l.user_id = $1 and exists (select 1 from lecturas t where t.libro_id = l.id and t.estado = 'terminado')`,
    [userId],
  );
  const sagas = await db.query<{ n: number }>(
    `select count(*)::int as n from (
       select saga from libros where user_id = $1 and saga is not null
        group by saga having count(*) >= 2 and bool_and(estado = 'terminado')) s`,
    [userId],
  );
  const paginas = await db.query<{ tipo: string; libro_id: string | null; contenido: unknown; dia: string; titulo: string | null }>(
    `select p.tipo, p.libro_id, p.contenido, to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD') as dia, l.titulo
       from diario_paginas p left join libros l on l.id = p.libro_id
      where p.user_id = $1 and p.eliminada_at is null`,
    [userId],
  );
  const sala = await db.query<{ objetos: number }>(
    "select coalesce(jsonb_array_length(diseno -> 'objetos'), 0)::int as objetos from disenos_sala where user_id = $1 and habitacion = 'sala'",
    [userId],
  );
  const plantillas = await db.query<{ n: number }>("select count(*)::int as n from plantillas_journal where user_id = $1", [userId]);

  const actividades: Hechos["actividades"] = terminadas.rows.map((t) => ({
    clave: `terminado:${t.id}`, tipo: "libro_terminado", titulo: `${ACTIVIDADES.libro_terminado.titulo}: ${t.titulo}`,
  }));
  const resenas = new Set<string>();
  const reflexiones = new Set<string>();
  let citas = 0;
  let nReflexiones = 0;
  for (const p of paginas.rows) {
    const v = validarContenido(p.contenido);
    if (!v.ok) continue;
    citas += v.bloques.filter((b) => b.tipo === "cita" && b.texto.trim().length > 0).length;
    const suficiente = textoPlano(v.bloques, 100000).length >= MIN_CARACTERES;
    if (p.tipo === "resena" && p.libro_id && suficiente) {
      if (!resenas.has(p.libro_id)) {
        resenas.add(p.libro_id);
        actividades.push({ clave: `resena:${p.libro_id}`, tipo: "resena", titulo: `${ACTIVIDADES.resena.titulo}: ${p.titulo ?? "un libro"}` });
      }
    }
    if (p.tipo === "reflexiones" && suficiente) {
      nReflexiones++;
      // Como mucho una por día: crear y borrar páginas no da más.
      if (!reflexiones.has(p.dia)) {
        reflexiones.add(p.dia);
        actividades.push({ clave: `reflexion:${p.dia}`, tipo: "reflexion", titulo: ACTIVIDADES.reflexion.titulo });
      }
    }
  }
  return {
    actividades,
    metricas: {
      ...METRICAS_VACIAS,
      librosTerminados: libros.rows.length,
      fantasiaTerminados: libros.rows.filter((l) => l.fantasia).length,
      sagasCompletas: sagas.rows[0]?.n ?? 0,
      resenas: resenas.size,
      reflexiones: nReflexiones,
      citas,
      paginasLeidas: libros.rows.reduce((a, l) => a + (l.paginas ?? 0), 0),
      salaPersonalizada: sala.rows.length ? 1 : 0,
      plantillasPropias: plantillas.rows[0].n,
      objetosEnSala: sala.rows[0]?.objetos ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Sincronización: otorga lo que corresponde, una sola vez
// ---------------------------------------------------------------------------

async function insertarEvento(
  db: Db, userId: string, e: { clave: string; tipo: string; titulo: string; xp: number; esencias: number },
): Promise<boolean> {
  const r = await db.query(
    "insert into eventos_progreso (user_id, clave, tipo, titulo, xp, esencias) values ($1, $2, $3, $4, $5, $6) on conflict (user_id, clave) do nothing returning id",
    [userId, e.clave, e.tipo, e.titulo, e.xp, e.esencias],
  );
  return r.rows.length > 0;
}

const darItem = (db: Db, userId: string, clave: string) =>
  db.query("insert into inventario (user_id, clave, origen) values ($1, $2, 'recompensa') on conflict do nothing", [userId, clave]);

/** Bloquea las operaciones de progreso de la persona hasta el final de la transacción (evita carreras entre pestañas). */
const bloquear = (db: Db, userId: string) => db.query("select pg_advisory_xact_lock(hashtext($1))", ["torre:" + userId]);

/**
 * Revisa los hechos actuales y otorga lo que falte: actividades, luego misiones y logros. Idempotente: ejecutarla N veces
 * da el mismo resultado que una. Devuelve los eventos nuevos (para avisarle a la persona).
 */
export async function sincronizarProgreso(db: Db, userId: string): Promise<{ titulo: string; xp: number; esencias: number }[]> {
  await bloquear(db, userId);
  const hechos = await leerHechos(db, userId);
  const nuevos: { titulo: string; xp: number; esencias: number }[] = [];

  for (const a of hechos.actividades) {
    const cfg = ACTIVIDADES[a.tipo];
    if (await insertarEvento(db, userId, { clave: a.clave, tipo: "actividad", titulo: a.titulo, xp: cfg.xp, esencias: cfg.esencias })) {
      nuevos.push({ titulo: a.titulo, xp: cfg.xp, esencias: cfg.esencias });
    }
  }
  const otorgados = new Set((await db.query<{ clave: string }>("select clave from eventos_progreso where user_id = $1", [userId])).rows.map((r) => r.clave));
  for (const e of eventosPendientes(hechos.metricas, otorgados)) {
    if (await insertarEvento(db, userId, e)) {
      for (const item of e.items) await darItem(db, userId, item);
      nuevos.push({ titulo: e.titulo, xp: e.xp, esencias: e.esencias });
    }
  }
  return nuevos;
}

// ---------------------------------------------------------------------------
// Lectura del progreso
// ---------------------------------------------------------------------------

export interface EventoHistorial {
  clave: string;
  tipo: "actividad" | "mision" | "logro" | "compra";
  titulo: string;
  xp: number;
  esencias: number;
  fecha: string;
}

export interface EstadoMision {
  def: Mision;
  actual: number;
  cumplida: boolean;
  fecha: string | null;
}
export interface EstadoLogro {
  def: Logro;
  actual: number;
  obtenido: boolean;
  fecha: string | null;
}

export interface Progreso {
  xp: number;
  esencias: number;
  nivel: EstadoNivel;
  metricas: Metricas;
  misiones: EstadoMision[];
  logros: EstadoLogro[];
  historial: EventoHistorial[];
  inventario: string[];
}

export async function obtenerInventario(db: Db, userId: string): Promise<string[]> {
  const r = await db.query<{ clave: string }>("select clave from inventario where user_id = $1 order by created_at", [userId]);
  return r.rows.map((x) => x.clave);
}

export async function obtenerProgreso(db: Db, userId: string): Promise<Progreso> {
  const totales = await db.query<{ xp: number; esencias: number }>(
    "select coalesce(sum(xp), 0)::int as xp, coalesce(sum(esencias), 0)::int as esencias from eventos_progreso where user_id = $1",
    [userId],
  );
  const eventos = await db.query<{ clave: string; tipo: EventoHistorial["tipo"]; titulo: string; xp: number; esencias: number; created_at: Date | string }>(
    "select clave, tipo, titulo, xp, esencias, created_at from eventos_progreso where user_id = $1 order by created_at desc, id desc",
    [userId],
  );
  const { metricas } = await leerHechos(db, userId);
  const fechas = new Map(eventos.rows.map((e) => [e.clave, new Date(e.created_at).toISOString()]));
  return {
    xp: totales.rows[0].xp,
    esencias: totales.rows[0].esencias,
    nivel: estadoNivel(totales.rows[0].xp),
    metricas,
    misiones: MISIONES.map((def) => ({ def, actual: Math.min(metricas[def.meta.metrica], def.meta.objetivo), cumplida: fechas.has(claveMision(def.id)), fecha: fechas.get(claveMision(def.id)) ?? null })),
    logros: LOGROS.map((def) => ({ def, actual: Math.min(metricas[def.meta.metrica], def.meta.objetivo), obtenido: fechas.has(claveLogro(def.id)), fecha: fechas.get(claveLogro(def.id)) ?? null })),
    historial: eventos.rows.slice(0, 50).map((e) => ({ clave: e.clave, tipo: e.tipo, titulo: e.titulo, xp: e.xp, esencias: e.esencias, fecha: new Date(e.created_at).toISOString() })),
    inventario: await obtenerInventario(db, userId),
  };
}

// ---------------------------------------------------------------------------
// Adquisiciones
// ---------------------------------------------------------------------------

/**
 * Compra un artículo de la tienda con Esencias. Todo ocurre bajo el bloqueo de la persona: se comprueba que no lo tenga,
 * que alcance el piso y que le alcancen las Esencias; el gasto y el objeto se guardan juntos o no se guarda nada.
 */
export async function comprarArticulo(db: Db, userId: string, clave: string): Promise<{ esencias: number }> {
  const art = obtenerArticulo(clave);
  if (!art) throw new ErrorTorre("no_existe", "Ese artículo no existe.");
  await bloquear(db, userId);
  if ((await obtenerInventario(db, userId)).includes(clave)) throw new ErrorTorre("ya_tienes", "Ya tenés este objeto en tu inventario.");
  const t = await db.query<{ xp: number; esencias: number }>(
    "select coalesce(sum(xp), 0)::int as xp, coalesce(sum(esencias), 0)::int as esencias from eventos_progreso where user_id = $1",
    [userId],
  );
  const { xp, esencias } = t.rows[0];
  if (estadoNivel(xp).nivel < art.nivel) throw new ErrorTorre("nivel", `Se abre en el piso ${art.nivel} de la Torre.`);
  if (esencias < art.precio) throw new ErrorTorre("esencias", `Te faltan ${art.precio - esencias} Esencias.`);
  const ok = await insertarEvento(db, userId, { clave: `compra:${clave}`, tipo: "compra", titulo: `Adquiriste: ${art.nombre}`, xp: 0, esencias: -art.precio });
  if (!ok) throw new ErrorTorre("ya_tienes", "Ya tenés este objeto en tu inventario.");
  await db.query("insert into inventario (user_id, clave, origen) values ($1, $2, 'compra')", [userId, clave]);
  return { esencias: esencias - art.precio };
}
