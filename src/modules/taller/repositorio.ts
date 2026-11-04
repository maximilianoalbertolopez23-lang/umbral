import type { Db } from "@/modules/archivo/repositorio";
import type { AparienciaId } from "@/modules/onboarding/apariencias";
import { PLANTILLAS, type Plantilla } from "@/modules/escritorio/paginas";
import { AJUSTES_BASE, MAX_PLANTILLAS, esquemaAjustes, esquemaNombrePlantilla, validarAjustes, type AjustesJournal } from "./journal";
import { obtenerArticulo, puedeUsar } from "@/modules/torre/reglas";
import { disenoInicial, esquemaDiseno, validarDiseno, type DisenoSala } from "./sala";

/**
 * Datos de El Taller. Reciben una conexión que ya corre como `umbral_app` con app.user_id fijado (conUsuario).
 * Todo lo que se guarda aquí es PRESENTACIÓN: nunca modifica libros, páginas ni notas.
 */

/** Lo que la persona tiene en su inventario (se gana o se compra en La Torre). */
async function inventarioDe(db: Db, userId: string): Promise<Set<string>> {
  const r = await db.query<{ clave: string }>("select clave from inventario where user_id = $1", [userId]);
  return new Set(r.rows.map((x) => x.clave));
}

/** Error si alguna de las claves es de la tienda y todavía no está en el inventario. */
function exigirInventario(claves: string[], inventario: ReadonlySet<string>): void {
  for (const c of claves) {
    if (!puedeUsar(c, inventario)) throw new ErrorTaller("bloqueado", `«${obtenerArticulo(c)?.nombre ?? c}» se consigue en La Torre.`);
  }
}

export type CodigoErrorTaller = "invalido" | "conflicto" | "limite_plantillas" | "no_encontrada" | "sin_biblioteca" | "bloqueado";

export class ErrorTaller extends Error {
  constructor(public readonly codigo: CodigoErrorTaller, mensaje: string) {
    super(mensaje);
    this.name = "ErrorTaller";
  }
}

// ---------------------------------------------------------------------------
// Diseño de la sala
// ---------------------------------------------------------------------------

export interface DisenoGuardado {
  diseno: DisenoSala;
  /** 0 = todavía no se guardó nunca (se usa el diseño inicial). */
  version: number;
}

/** Diseño guardado de la sala, o el inicial (estilo clásico, con la luz elegida en la bienvenida) si no hay ninguno. */
export async function obtenerDisenoSala(db: Db, userId: string): Promise<DisenoGuardado> {
  const r = await db.query<{ diseno: unknown; version: number }>(
    "select diseno, version from disenos_sala where user_id = $1 and habitacion = 'sala'",
    [userId],
  );
  const fila = r.rows[0];
  if (fila) {
    const p = esquemaDiseno.safeParse(fila.diseno);
    if (p.success) return { diseno: p.data, version: fila.version };
  }
  const luz = await db.query<{ apariencia: AparienciaId }>("select apariencia from personalizaciones where user_id = $1", [userId]);
  return { diseno: disenoInicial(luz.rows[0]?.apariencia), version: fila?.version ?? 0 };
}

/**
 * Guarda la distribución. `version` es la que la persona tenía abierta: si cambió en otra pestaña se rechaza (no se
 * pisa nada). Valida todo de nuevo, incluidas las reglas de colocación.
 */
export async function guardarDisenoSala(db: Db, userId: string, crudo: unknown, version: number): Promise<DisenoGuardado> {
  const v = validarDiseno(crudo);
  if (!v.ok) throw new ErrorTaller("invalido", v.error);
  exigirInventario([`estilo:${v.diseno.estilo}`, ...new Set(v.diseno.objetos.map((o) => `objeto:${o.tipo}`))], await inventarioDe(db, userId));
  const biblioteca = await db.query<{ id: string }>("select id from bibliotecas where user_id = $1", [userId]);
  const bibliotecaId = biblioteca.rows[0]?.id;
  if (!bibliotecaId) throw new ErrorTaller("sin_biblioteca", "Primero completá la bienvenida para tener una biblioteca.");

  const actual = await db.query<{ version: number }>(
    "select version from disenos_sala where biblioteca_id = $2 and user_id = $1 and habitacion = 'sala' for update",
    [userId, bibliotecaId],
  );
  const guardada = actual.rows[0]?.version ?? 0;
  if (guardada !== version) {
    throw new ErrorTaller("conflicto", "La sala se modificó en otra pestaña. Recargala para ver la última versión.");
  }
  if (guardada === 0) {
    await db.query("insert into disenos_sala (biblioteca_id, user_id, habitacion, diseno, version) values ($1, $2, 'sala', $3::jsonb, 1)", [bibliotecaId, userId, JSON.stringify(v.diseno)]);
    return { diseno: v.diseno, version: 1 };
  }
  await db.query("update disenos_sala set diseno = $3::jsonb, version = version + 1 where biblioteca_id = $2 and user_id = $1 and habitacion = 'sala'", [userId, bibliotecaId, JSON.stringify(v.diseno)]);
  return { diseno: v.diseno, version: guardada + 1 };
}

// ---------------------------------------------------------------------------
// Plantillas propias del journal
// ---------------------------------------------------------------------------

export interface PlantillaPropia {
  id: string;
  nombre: string;
  base: Plantilla;
  ajustes: AjustesJournal;
  creadaAt: string;
}

interface FilaPlantilla {
  id: string;
  nombre: string;
  base: Plantilla;
  ajustes: unknown;
  created_at: Date | string;
}

const aPlantilla = (f: FilaPlantilla): PlantillaPropia => {
  const p = esquemaAjustes.safeParse(f.ajustes);
  return { id: f.id, nombre: f.nombre, base: f.base, ajustes: p.success ? p.data : AJUSTES_BASE, creadaAt: new Date(f.created_at).toISOString() };
};

export async function listarPlantillas(db: Db, userId: string): Promise<PlantillaPropia[]> {
  const r = await db.query<FilaPlantilla>("select id, nombre, base, ajustes, created_at from plantillas_journal where user_id = $1 order by created_at", [userId]);
  return r.rows.map(aPlantilla);
}

export interface DatosPlantilla {
  nombre: string;
  base: Plantilla;
  ajustes: unknown;
}

function validarDatosPlantilla(d: DatosPlantilla, inventario: ReadonlySet<string>): { nombre: string; base: Plantilla; ajustes: AjustesJournal } {
  const nombre = esquemaNombrePlantilla.safeParse(d.nombre);
  if (!nombre.success) throw new ErrorTaller("invalido", nombre.error.issues[0].message);
  if (!PLANTILLAS.includes(d.base)) throw new ErrorTaller("invalido", "Plantilla base no válida.");
  const a = validarAjustes(d.base, d.ajustes);
  if (!a.ok) throw new ErrorTaller("invalido", a.error);
  exigirInventario([`fondo:${a.ajustes.fondo}`, `borde:${a.ajustes.borde}`, `ornamento:${a.ajustes.ornamento}`], inventario);
  return { nombre: nombre.data, base: d.base, ajustes: a.ajustes };
}

export async function crearPlantilla(db: Db, userId: string, d: DatosPlantilla): Promise<string> {
  const v = validarDatosPlantilla(d, await inventarioDe(db, userId));
  const n = await db.query<{ n: number }>("select count(*)::int as n from plantillas_journal where user_id = $1", [userId]);
  if (n.rows[0].n >= MAX_PLANTILLAS) throw new ErrorTaller("limite_plantillas", `Llegaste al máximo de ${MAX_PLANTILLAS} plantillas propias. Eliminá alguna para crear otra.`);
  const r = await db.query<{ id: string }>(
    "insert into plantillas_journal (user_id, nombre, base, ajustes) values ($1, $2, $3, $4::jsonb) returning id",
    [userId, v.nombre, v.base, JSON.stringify(v.ajustes)],
  );
  return r.rows[0].id;
}

export async function actualizarPlantilla(db: Db, userId: string, id: string, d: DatosPlantilla): Promise<void> {
  const v = validarDatosPlantilla(d, await inventarioDe(db, userId));
  const r = await db.query("update plantillas_journal set nombre = $3, base = $4, ajustes = $5::jsonb where id = $2 and user_id = $1", [userId, id, v.nombre, v.base, JSON.stringify(v.ajustes)]);
  if (!r.rowCount) throw new ErrorTaller("no_encontrada", "Esa plantilla ya no existe.");
}

/** Cuántas páginas usan una plantilla propia (las eliminadas también: si se restauran la siguen usando). */
export async function contarUsoPlantilla(db: Db, userId: string, id: string): Promise<number> {
  const r = await db.query<{ n: number }>("select count(*)::int as n from diario_paginas where user_id = $1 and plantilla_custom_id = $2", [userId, id]);
  return r.rows[0].n;
}

/**
 * Elimina una plantilla propia. Las páginas que la usaban vuelven a su plantilla base: su contenido no se toca.
 * Devuelve cuántas páginas quedaron con la plantilla base.
 */
export async function eliminarPlantilla(db: Db, userId: string, id: string): Promise<number> {
  const usadas = await contarUsoPlantilla(db, userId, id);
  const r = await db.query("delete from plantillas_journal where id = $2 and user_id = $1", [userId, id]);
  if (!r.rowCount) throw new ErrorTaller("no_encontrada", "Esa plantilla ya no existe.");
  return usadas;
}

export interface PreferenciaPlantilla {
  base: Plantilla;
  customId: string | null;
}

export async function obtenerPreferenciaPlantilla(db: Db, userId: string): Promise<PreferenciaPlantilla> {
  const r = await db.query<{ plantilla_diario: Plantilla; plantilla_diario_custom_id: string | null }>(
    "select plantilla_diario, plantilla_diario_custom_id from preferencias where user_id = $1",
    [userId],
  );
  return { base: r.rows[0]?.plantilla_diario ?? "pergamino", customId: r.rows[0]?.plantilla_diario_custom_id ?? null };
}

/** Plantilla de las páginas nuevas: una base o una propia (si es propia, `base` es la de esa plantilla). */
export async function establecerPlantillaPredeterminada(db: Db, userId: string, p: PreferenciaPlantilla): Promise<void> {
  if (!PLANTILLAS.includes(p.base)) throw new ErrorTaller("invalido", "Plantilla base no válida.");
  if (p.customId) {
    const e = await db.query("select 1 from plantillas_journal where id = $2 and user_id = $1", [userId, p.customId]);
    if (!e.rowCount) throw new ErrorTaller("no_encontrada", "Esa plantilla ya no existe.");
  }
  await db.query("update preferencias set plantilla_diario = $2, plantilla_diario_custom_id = $3 where user_id = $1", [userId, p.base, p.customId]);
}

/** Cambia la presentación de TODAS las páginas de la persona (no toca su contenido). Devuelve cuántas. */
export async function aplicarPlantillaATodas(db: Db, userId: string, p: PreferenciaPlantilla): Promise<number> {
  if (!PLANTILLAS.includes(p.base)) throw new ErrorTaller("invalido", "Plantilla base no válida.");
  if (p.customId) {
    const e = await db.query("select 1 from plantillas_journal where id = $2 and user_id = $1", [userId, p.customId]);
    if (!e.rowCount) throw new ErrorTaller("no_encontrada", "Esa plantilla ya no existe.");
  }
  const r = await db.query("update diario_paginas set plantilla = $2, plantilla_custom_id = $3 where user_id = $1 and eliminada_at is null", [userId, p.base, p.customId]);
  return r.rowCount ?? 0;
}
