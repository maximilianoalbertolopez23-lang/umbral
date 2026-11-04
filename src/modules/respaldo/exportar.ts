import type { Db } from "@/modules/archivo/repositorio";

/** Tablas de UMBRAL de la persona (RLS ya filtra por dueña). Orden estable para que el respaldo sea legible. */
export const TABLAS_EXPORTADAS = [
  "profiles", "bibliotecas", "personalizaciones", "preferencias",
  "libros", "lecturas", "sesiones_lectura", "portadas",
  "diario_paginas", "diario_imagenes",
  "disenos_sala", "plantillas_journal",
  "eventos_progreso", "inventario",
] as const;

export const FORMATO_RESPALDO = 1;

/** Los campos binarios (portadas, imágenes) viajan en base64 para que el archivo sea JSON válido. */
const aJson = (v: unknown): unknown => (v instanceof Uint8Array ? Buffer.from(v).toString("base64") : v);

export async function exportarDatos(db: Db) {
  const datos: Record<string, unknown[]> = {};
  for (const tabla of TABLAS_EXPORTADAS) {
    const r = await db.query<Record<string, unknown>>(`select * from public.${tabla}`);
    datos[tabla] = r.rows.map((fila) => Object.fromEntries(Object.entries(fila).map(([k, v]) => [k, aJson(v)])));
  }
  return {
    aplicacion: "UMBRAL",
    formato: FORMATO_RESPALDO,
    exportado: new Date().toISOString(),
    nota: "Binarios (portadas, imágenes) en base64.",
    datos,
  };
}
