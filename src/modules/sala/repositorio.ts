import type { Db } from "@/modules/archivo/repositorio";
import { APARIENCIA_IDS, type AparienciaId } from "@/modules/onboarding/apariencias";

/**
 * Datos propios de La Gran Sala y El Taller. Ningún dato nuevo: la Sala muestra lo que ya existe en El Archivo y
 * El Escritorio, y El Taller modifica la apariencia (personalizaciones) y la preferencia de movimiento (preferencias).
 */

export const MOVIMIENTOS = ["sistema", "si", "no"] as const;
export type Movimiento = (typeof MOVIMIENTOS)[number];

export class ErrorSala extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorSala";
  }
}

/** Cantidad de páginas del Escritorio (sin las eliminadas), para el rótulo del escritorio de la Sala. */
export async function contarPaginasJournal(db: Db, userId: string): Promise<number> {
  const r = await db.query<{ n: number }>(
    "select count(*)::int as n from diario_paginas where user_id = $1 and eliminada_at is null",
    [userId],
  );
  return r.rows[0]?.n ?? 0;
}

export async function obtenerMovimiento(db: Db, userId: string): Promise<Movimiento> {
  const r = await db.query<{ reducir_movimiento: Movimiento }>("select reducir_movimiento from preferencias where user_id = $1", [userId]);
  return r.rows[0]?.reducir_movimiento ?? "sistema";
}

export async function guardarMovimiento(db: Db, userId: string, movimiento: Movimiento): Promise<void> {
  if (!MOVIMIENTOS.includes(movimiento)) throw new ErrorSala("Opción de movimiento no válida.");
  await db.query("update preferencias set reducir_movimiento = $2 where user_id = $1", [userId, movimiento]);
}

/** Cambia la apariencia (la luz) de la biblioteca. Falla si todavía no hay biblioteca configurada. */
export async function cambiarApariencia(db: Db, userId: string, apariencia: AparienciaId): Promise<void> {
  if (!APARIENCIA_IDS.includes(apariencia)) throw new ErrorSala("Apariencia no válida.");
  const r = await db.query("update personalizaciones set apariencia = $2 where user_id = $1", [userId, apariencia]);
  if (!r.rowCount) throw new ErrorSala("Primero completá la bienvenida para configurar tu biblioteca.");
}
