import "server-only";
import { Pool, types, type PoolClient } from "pg";

/** Las columnas date (OID 1082) se devuelven como "YYYY-MM-DD" y no como Date (evita corrimientos de zona horaria). */
const TIPOS = {
  getTypeParser: (oid: number, formato?: "text" | "binary") =>
    oid === 1082 ? (valor: string) => valor : types.getTypeParser(oid, formato as "text"),
};

const globalConPool = globalThis as unknown as { __umbralPool?: Pool };

/** Pool único (se reutiliza entre recargas en desarrollo). Usar la cadena *pooled* de Neon. */
export function obtenerPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL (ver docs/CONFIGURACION.md).");
  globalConPool.__umbralPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, types: TIPOS });
  return globalConPool.__umbralPool;
}

/**
 * Ejecuta consultas "como" una persona: dentro de una transacción baja al rol sin privilegios `umbral_app`
 * y fija app.user_id, de modo que las políticas RLS de la base filtran por esa persona.
 * Todo acceso a tablas de UMBRAL debe pasar por aquí.
 */
export async function conUsuario<T>(userId: string, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("begin");
    await cliente.query("set local role umbral_app");
    await cliente.query("select set_config('app.user_id', $1, true)", [userId]);
    const resultado = await fn(cliente);
    await cliente.query("commit");
    return resultado;
  } catch (error) {
    await cliente.query("rollback").catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}
