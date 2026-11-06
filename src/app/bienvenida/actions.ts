"use server";

import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { RUTA_INICIO } from "@/lib/juego";
import { erroresPorCampo, esquemaApariencia, esquemaBiblioteca, esquemaDiario, esquemaGuardiana } from "@/lib/validacion";
import type { EstadoForm } from "@/app/(auth)/actions";

/**
 * Cada paso se valida de nuevo en el servidor y se escribe con `conUsuario`: la transacción corre con el rol
 * `umbral_app` y RLS garantiza que solo se toquen filas de quien llama. Sin credenciales privilegiadas.
 */
const ERROR_GENERAL = "No pudimos guardar este paso. Probá de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Volvé a ingresar para continuar.";

const texto = (fd: FormData, campo: string) => (typeof fd.get(campo) === "string" ? (fd.get(campo) as string) : "");

export async function guardarGuardiana(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const r = esquemaGuardiana.safeParse({ nombre: texto(fd, "nombre") });
  if (!r.success) return { campos: erroresPorCampo(r.error), valores: { nombre: texto(fd, "nombre") } };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION_VENCIDA };

  try {
    const filas = await conUsuario(usuario.id, async (db) => {
      const res = await db.query("update profiles set guardiana_nombre = $1 where id = $2 returning id", [r.data.nombre, usuario.id]);
      return res.rowCount ?? 0;
    });
    if (!filas) return { error: ERROR_GENERAL, valores: { nombre: r.data.nombre } };
  } catch {
    return { error: ERROR_GENERAL, valores: { nombre: r.data.nombre } };
  }
  return { ok: true, valores: { nombre: r.data.nombre } };
}

export async function guardarBiblioteca(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const r = esquemaBiblioteca.safeParse({ nombre: texto(fd, "nombre") });
  if (!r.success) return { campos: erroresPorCampo(r.error), valores: { nombre: texto(fd, "nombre") } };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION_VENCIDA };

  try {
    await conUsuario(usuario.id, async (db) => {
      const actualizada = await db.query("update bibliotecas set nombre = $1 where user_id = $2", [r.data.nombre, usuario.id]);
      if (!actualizada.rowCount) {
        await db.query("insert into bibliotecas (user_id, nombre) values ($1, $2)", [usuario.id, r.data.nombre]);
      }
    });
  } catch {
    return { error: ERROR_GENERAL, valores: { nombre: r.data.nombre } };
  }
  return { ok: true, valores: { nombre: r.data.nombre } };
}

export async function guardarApariencia(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const r = esquemaApariencia.safeParse({ apariencia: texto(fd, "apariencia") });
  if (!r.success) return { campos: erroresPorCampo(r.error) };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION_VENCIDA };

  try {
    const hecho = await conUsuario(usuario.id, async (db) => {
      const biblioteca = await db.query<{ id: string }>("select id from bibliotecas where user_id = $1", [usuario.id]);
      const id = biblioteca.rows[0]?.id;
      if (!id) return false;
      const actualizada = await db.query("update personalizaciones set apariencia = $1 where biblioteca_id = $2", [r.data.apariencia, id]);
      if (!actualizada.rowCount) {
        await db.query("insert into personalizaciones (biblioteca_id, user_id, apariencia) values ($1, $2, $3)", [id, usuario.id, r.data.apariencia]);
      }
      return true;
    });
    if (!hecho) return { error: "Primero elegí el nombre de tu biblioteca." };
  } catch {
    return { error: ERROR_GENERAL };
  }
  return { ok: true, valores: { apariencia: r.data.apariencia } };
}

export async function entrarEnLaSala(): Promise<EstadoForm> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION_VENCIDA };
  try {
    await conUsuario(usuario.id, (db) => db.query("select completar_onboarding()"));
  } catch {
    return { error: "Todavía falta completar algún paso. Volvé atrás y revisalo." };
  }
  redirect(RUTA_INICIO);
}

/** Bienvenida del diario (sin juego): guarda el nombre y el de la biblioteca, completa el onboarding y entra al Archivo. */
export async function comenzarDiario(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = { nombre: texto(fd, "nombre"), biblioteca: texto(fd, "biblioteca") };
  const r = esquemaDiario.safeParse(valores);
  if (!r.success) return { campos: erroresPorCampo(r.error), valores };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION_VENCIDA, valores };

  try {
    await conUsuario(usuario.id, async (db) => {
      await db.query("update profiles set guardiana_nombre = $1 where id = $2", [r.data.nombre, usuario.id]);
      const actualizada = await db.query("update bibliotecas set nombre = $1 where user_id = $2", [r.data.biblioteca, usuario.id]);
      if (!actualizada.rowCount) await db.query("insert into bibliotecas (user_id, nombre) values ($1, $2)", [usuario.id, r.data.biblioteca]);
      const id = (await db.query<{ id: string }>("select id from bibliotecas where user_id = $1", [usuario.id])).rows[0]?.id;
      const luz = await db.query("update personalizaciones set apariencia = coalesce(apariencia, 'noche') where biblioteca_id = $1", [id]);
      if (!luz.rowCount) await db.query("insert into personalizaciones (biblioteca_id, user_id, apariencia) values ($1, $2, 'noche')", [id, usuario.id]);
      await db.query("select completar_onboarding()");
    });
  } catch {
    return { error: ERROR_GENERAL, valores };
  }
  redirect(RUTA_INICIO);
}
