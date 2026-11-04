"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
import { z } from "zod";
import type { EstadoForm } from "@/app/(auth)/actions";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { validarContenido } from "@/modules/escritorio/bloques";
import { ESTADOS_PAGINA, PLANTILLAS, TIPOS_PAGINA, type Plantilla, type TipoPagina } from "@/modules/escritorio/paginas";
import {
  aplicarPlantillaAAmbito, crearPagina, eliminarDefinitivamente, eliminarPagina, ErrorEscritorio, estadisticasAnio,
  guardarPagina, guardarPlantillaPreferida, reordenarPaginas, restaurarPagina, type EstadisticasAnio,
} from "@/modules/escritorio/repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos completar la acción. Probá de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Volvé a ingresar para continuar.";

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string; conflicto?: boolean };

/** Corre una operación como la persona autenticada y traduce los errores a mensajes. */
async function ejecutar<T>(operacion: (userId: string, db: PoolClient) => Promise<T>): Promise<Resultado<T>> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, error: SESION_VENCIDA };
  try {
    return { ok: true, valor: await conUsuario(usuario.id, (db) => operacion(usuario.id, db)) };
  } catch (e) {
    if (e instanceof ErrorEscritorio) return { ok: false, error: e.message, conflicto: e.codigo === "conflicto" };
    console.error("[escritorio] error inesperado", e);
    return { ok: false, error: ERROR_GENERAL };
  }
}

function refrescar(libroId: string | null, paginaId?: string) {
  revalidatePath("/escritorio");
  if (libroId) revalidatePath(`/escritorio/libro/${libroId}`);
  if (paginaId) revalidatePath(`/escritorio/pagina/${paginaId}`);
}

export async function crearPaginaAction(libroId: string | null, tipo: TipoPagina, _: EstadoForm): Promise<EstadoForm> {
  if ((libroId !== null && !UUID.test(libroId)) || !TIPOS_PAGINA.includes(tipo)) return { error: "Datos no válidos." };
  const r = await ejecutar((uid, db) => crearPagina(db, uid, { libroId, tipo }));
  if (!r.ok) return { error: r.error };
  refrescar(libroId);
  redirect(`/escritorio/pagina/${r.valor}`);
}

const esquemaGuardado = z.object({
  version: z.number().int().min(1),
  titulo: z.string().max(120),
  plantilla: z.enum(PLANTILLAS),
  plantillaCustomId: z.string().uuid().nullable().optional(),
  estado: z.enum(ESTADOS_PAGINA),
});

export type ResultadoGuardadoPagina = { ok: true; version: number } | { ok: false; error: string; conflicto?: boolean };

/** Autosave: valida de nuevo todo en el servidor (el cliente nunca es la barrera). */
export async function guardarPaginaAction(
  id: string,
  datos: { version: number; titulo: string; plantilla: Plantilla; plantillaCustomId?: string | null; estado: "borrador" | "publicada"; bloques: unknown },
): Promise<ResultadoGuardadoPagina> {
  if (!UUID.test(id)) return { ok: false, error: "Página no válida." };
  const cabecera = esquemaGuardado.safeParse(datos);
  const contenido = validarContenido(datos.bloques);
  if (!cabecera.success || !contenido.ok) {
    return { ok: false, error: contenido.ok ? "Datos de la página no válidos." : contenido.error };
  }
  const r = await ejecutar((uid, db) => guardarPagina(db, uid, id, { ...cabecera.data, bloques: contenido.bloques }));
  if (!r.ok) return { ok: false, error: r.error, conflicto: r.conflicto };
  return { ok: true, version: r.valor };
}

export async function eliminarPaginaAction(id: string, libroId: string | null): Promise<EstadoForm> {
  if (!UUID.test(id)) return { error: "Página no válida." };
  const r = await ejecutar((uid, db) => eliminarPagina(db, uid, id));
  if (!r.ok) return { error: r.error };
  if (!r.valor) return { error: "Esa página ya no existe." };
  refrescar(libroId, id);
  revalidatePath("/escritorio/papelera");
  redirect(libroId ? `/escritorio/libro/${libroId}` : "/escritorio");
}

export async function restaurarPaginaAction(id: string, _: EstadoForm): Promise<EstadoForm> {
  if (!UUID.test(id)) return { error: "Página no válida." };
  const r = await ejecutar((uid, db) => restaurarPagina(db, uid, id));
  if (!r.ok) return { error: r.error };
  if (!r.valor) return { error: "Esa página ya no está en la papelera." };
  revalidatePath("/escritorio", "layout");
  return { ok: true, info: "Página restaurada." };
}

export async function eliminarDefinitivaAction(id: string, _: EstadoForm): Promise<EstadoForm> {
  if (!UUID.test(id)) return { error: "Página no válida." };
  const r = await ejecutar((uid, db) => eliminarDefinitivamente(db, uid, id));
  if (!r.ok) return { error: r.error };
  if (!r.valor) return { error: "Esa página ya no está en la papelera." };
  revalidatePath("/escritorio/papelera");
  return { ok: true, info: "Página eliminada para siempre." };
}

export async function reordenarPaginasAction(libroId: string | null, ids: string[]): Promise<EstadoForm> {
  if ((libroId !== null && !UUID.test(libroId)) || !ids.every((i) => UUID.test(i))) return { error: "Datos no válidos." };
  const r = await ejecutar((uid, db) => reordenarPaginas(db, uid, libroId, ids));
  if (!r.ok) return { error: r.error };
  refrescar(libroId);
  return { ok: true };
}

export async function plantillaAmbitoAction(libroId: string | null, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const plantilla = fd.get("plantilla");
  if ((libroId !== null && !UUID.test(libroId)) || typeof plantilla !== "string" || !PLANTILLAS.includes(plantilla as Plantilla)) {
    return { error: "Elegí una plantilla." };
  }
  const r = await ejecutar(async (uid, db) => {
    await guardarPlantillaPreferida(db, uid, plantilla as Plantilla);
    return aplicarPlantillaAAmbito(db, uid, libroId, plantilla as Plantilla);
  });
  if (!r.ok) return { error: r.error };
  refrescar(libroId);
  revalidatePath("/escritorio/pagina/[id]", "page");
  return { ok: true, info: r.valor === 1 ? "Plantilla aplicada a 1 página." : `Plantilla aplicada a ${r.valor} páginas.` };
}

/** Estadísticas reales de un año (para el bloque «Resumen de lecturas» recién agregado en el editor). */
export async function estadisticasAnioAction(anio: number): Promise<EstadisticasAnio | null> {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return null;
  const r = await ejecutar((uid, db) => estadisticasAnio(db, uid, anio));
  return r.ok ? r.valor : null;
}
