"use server";

import { revalidatePath } from "next/cache";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { comprarArticulo, ErrorTorre } from "@/modules/torre/repositorio";

export type ResultadoCompra = { ok: true; esencias: number } | { ok: false; error: string };

/** Canjea Esencias por un artículo. Se valida todo en el servidor: piso, saldo y que no lo tenga ya. */
export async function comprarAction(clave: string): Promise<ResultadoCompra> {
  if (typeof clave !== "string" || clave.length > 100) return { ok: false, error: "Artículo no válido." };
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, error: "Tu sesión venció. Volvé a ingresar para continuar." };
  try {
    const r = await conUsuario(usuario.id, (db) => comprarArticulo(db, usuario.id, clave));
    revalidatePath("/torre");
    revalidatePath("/taller", "layout");
    return { ok: true, esencias: r.esencias };
  } catch (e) {
    if (e instanceof ErrorTorre) return { ok: false, error: e.message };
    console.error("[torre] error inesperado", e);
    return { ok: false, error: "No pudimos completar el canje. Probá de nuevo en un momento." };
  }
}
