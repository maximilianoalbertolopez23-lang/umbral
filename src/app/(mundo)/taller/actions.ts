"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import type { EstadoForm } from "@/app/(auth)/actions";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { PLANTILLAS, type Plantilla } from "@/modules/escritorio/paginas";
import { ErrorSala, guardarMovimiento, type Movimiento } from "@/modules/sala/repositorio";
import {
  actualizarPlantilla, aplicarPlantillaATodas, crearPlantilla, eliminarPlantilla, ErrorTaller, establecerPlantillaPredeterminada,
  guardarDisenoSala,
} from "@/modules/taller/repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar el cambio. Probá de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Volvé a ingresar para continuar.";

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string; conflicto?: boolean };

/** Corre una operación como la persona autenticada y traduce los errores a mensajes. */
async function ejecutar<T>(operacion: (userId: string, db: PoolClient) => Promise<T>): Promise<Resultado<T>> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, error: SESION_VENCIDA };
  try {
    return { ok: true, valor: await conUsuario(usuario.id, (db) => operacion(usuario.id, db)) };
  } catch (e) {
    if (e instanceof ErrorTaller) return { ok: false, error: e.message, conflicto: e.codigo === "conflicto" };
    if (e instanceof ErrorSala) return { ok: false, error: e.message };
    console.error("[taller] error inesperado", e);
    return { ok: false, error: ERROR_GENERAL };
  }
}

const refrescarSala = () => {
  revalidatePath("/sala");
  revalidatePath("/archivo");
  revalidatePath("/escritorio");
};

// --------------------------- Sala ---------------------------

export type ResultadoDiseno = { ok: true; version: number } | { ok: false; error: string; conflicto?: boolean };

/** Autosave de la distribución. Se valida de nuevo todo en el servidor (tipos, posiciones y reglas de colocación). */
export async function guardarDisenoAction(diseno: unknown, version: number): Promise<ResultadoDiseno> {
  if (!Number.isInteger(version) || version < 0) return { ok: false, error: "Versión no válida." };
  const r = await ejecutar((uid, db) => guardarDisenoSala(db, uid, diseno, version));
  if (!r.ok) return { ok: false, error: r.error, conflicto: r.conflicto };
  refrescarSala();
  return { ok: true, version: r.valor.version };
}

export async function guardarMovimientoAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valor = typeof fd.get("movimiento") === "string" ? (fd.get("movimiento") as string) : "";
  if (valor !== "sistema" && valor !== "si") return { error: "Elegí una de las opciones." };
  const r = await ejecutar((uid, db) => guardarMovimiento(db, uid, valor as Movimiento));
  if (!r.ok) return { error: r.error };
  revalidatePath("/", "layout");
  return { ok: true, info: valor === "si" ? "Las animaciones quedaron reducidas." : "Se siguen las preferencias de tu dispositivo." };
}

// --------------------------- Journal: plantillas propias ---------------------------

export type ResultadoPlantilla = { ok: true; id?: string; info?: string } | { ok: false; error: string };

function refrescarJournal() {
  revalidatePath("/taller/journal");
  revalidatePath("/escritorio", "layout");
}

interface DatosPlantilla {
  nombre: string;
  base: Plantilla;
  ajustes: unknown;
}

export async function crearPlantillaAction(d: DatosPlantilla): Promise<ResultadoPlantilla> {
  const r = await ejecutar((uid, db) => crearPlantilla(db, uid, d));
  if (!r.ok) return { ok: false, error: r.error };
  refrescarJournal();
  return { ok: true, id: r.valor, info: "Plantilla creada." };
}

export async function actualizarPlantillaAction(id: string, d: DatosPlantilla): Promise<ResultadoPlantilla> {
  if (!UUID.test(id)) return { ok: false, error: "Plantilla no válida." };
  const r = await ejecutar((uid, db) => actualizarPlantilla(db, uid, id, d));
  if (!r.ok) return { ok: false, error: r.error };
  refrescarJournal();
  return { ok: true, id, info: "Cambios guardados. Las páginas que usan esta plantilla ya se ven con ellos." };
}

export async function eliminarPlantillaAction(id: string): Promise<ResultadoPlantilla> {
  if (!UUID.test(id)) return { ok: false, error: "Plantilla no válida." };
  const r = await ejecutar((uid, db) => eliminarPlantilla(db, uid, id));
  if (!r.ok) return { ok: false, error: r.error };
  refrescarJournal();
  return {
    ok: true,
    info: r.valor === 0 ? "Plantilla eliminada." : `Plantilla eliminada. ${r.valor === 1 ? "Una página volvió" : `${r.valor} páginas volvieron`} a su plantilla base; nada de lo escrito se perdió.`,
  };
}

export async function plantillaPredeterminadaAction(base: Plantilla, customId: string | null): Promise<ResultadoPlantilla> {
  if (!PLANTILLAS.includes(base) || (customId !== null && !UUID.test(customId))) return { ok: false, error: "Datos no válidos." };
  const r = await ejecutar((uid, db) => establecerPlantillaPredeterminada(db, uid, { base, customId }));
  if (!r.ok) return { ok: false, error: r.error };
  refrescarJournal();
  return { ok: true, info: "Será la plantilla de tus páginas nuevas." };
}

export async function aplicarPlantillaATodasAction(base: Plantilla, customId: string | null): Promise<ResultadoPlantilla> {
  if (!PLANTILLAS.includes(base) || (customId !== null && !UUID.test(customId))) return { ok: false, error: "Datos no válidos." };
  const r = await ejecutar((uid, db) => aplicarPlantillaATodas(db, uid, { base, customId }));
  if (!r.ok) return { ok: false, error: r.error };
  refrescarJournal();
  return { ok: true, info: r.valor === 0 ? "Todavía no tenés páginas." : `Se aplicó a ${r.valor} ${r.valor === 1 ? "página" : "páginas"}. El contenido no cambió.` };
}
