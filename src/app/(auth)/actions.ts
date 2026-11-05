"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerAuth } from "@/lib/auth/auth";
import { mensajeErrorAuth } from "@/lib/auth/errores";
import { rutaSegura } from "@/lib/auth/redireccion";
import { backendConfigurado } from "@/lib/config";
import {
  erroresPorCampo,
  esquemaIngreso,
  esquemaRecuperar,
  esquemaRegistro,
  esquemaRestablecer,
} from "@/lib/validacion";

export interface EstadoForm {
  error?: string;
  info?: string;
  ok?: boolean;
  campos?: Record<string, string>;
  valores?: Record<string, string>;
}

const SIN_CONFIG: EstadoForm = {
  error: "El servicio de cuentas todavía no está configurado. Mirá las instrucciones en esta página.",
};

const texto = (fd: FormData, campo: string) => (typeof fd.get(campo) === "string" ? (fd.get(campo) as string) : "");

export async function ingresar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!backendConfigurado()) return SIN_CONFIG;
  const entrada = { correo: texto(fd, "correo"), contrasena: texto(fd, "contrasena") };
  const r = esquemaIngreso.safeParse(entrada);
  if (!r.success) return { campos: erroresPorCampo(r.error), valores: { correo: entrada.correo } };

  try {
    await obtenerAuth().api.signInEmail({
      // callbackURL: a dónde lleva el enlace del correo si hubo que reenviarlo (cuenta sin confirmar).
      body: { email: r.data.correo, password: r.data.contrasena, callbackURL: "/bienvenida" },
      headers: await headers(),
    });
  } catch (error) {
    return { error: mensajeErrorAuth(error), valores: { correo: entrada.correo } };
  }
  redirect(rutaSegura(texto(fd, "siguiente"), "/sala"));
}

export async function registrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!backendConfigurado()) return SIN_CONFIG;
  const entrada = {
    correo: texto(fd, "correo"),
    contrasena: texto(fd, "contrasena"),
    confirmacion: texto(fd, "confirmacion"),
  };
  const r = esquemaRegistro.safeParse(entrada);
  if (!r.success) return { campos: erroresPorCampo(r.error), valores: { correo: entrada.correo } };

  let conSesion = false;
  try {
    const res = await obtenerAuth().api.signUpEmail({
      // El nombre real (el de la Guardiana) se elige en el onboarding; esto es solo un valor provisorio.
      body: { email: r.data.correo, password: r.data.contrasena, name: r.data.correo.split("@")[0], callbackURL: "/bienvenida" },
      headers: await headers(),
    });
    conSesion = Boolean(res.token);
  } catch (error) {
    return { error: mensajeErrorAuth(error), valores: { correo: entrada.correo } };
  }

  // Con verificación de correo activada no hay sesión todavía (y se responde igual si el correo ya existía).
  if (conSesion) redirect("/bienvenida");
  return {
    ok: true,
    info: "Te enviamos un correo para confirmar tu cuenta. Abrí el enlace y vas a entrar a la biblioteca.",
  };
}

export async function recuperar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!backendConfigurado()) return SIN_CONFIG;
  const entrada = { correo: texto(fd, "correo") };
  const r = esquemaRecuperar.safeParse(entrada);
  if (!r.success) return { campos: erroresPorCampo(r.error), valores: entrada };

  try {
    await obtenerAuth().api.requestPasswordReset({
      body: { email: r.data.correo, redirectTo: "/restablecer" },
      headers: await headers(),
    });
  } catch (error) {
    const mensaje = mensajeErrorAuth(error);
    // Solo se informa el límite de intentos; cualquier otro fallo se responde igual que un éxito
    // para no revelar qué correos están registrados.
    if (/demasiados/.test(mensaje)) return { error: mensaje, valores: entrada };
  }
  return { ok: true, info: "Si ese correo tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva." };
}

export async function restablecer(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!backendConfigurado()) return SIN_CONFIG;
  const token = texto(fd, "token");
  const r = esquemaRestablecer.safeParse({ contrasena: texto(fd, "contrasena"), confirmacion: texto(fd, "confirmacion") });
  if (!r.success) return { campos: erroresPorCampo(r.error) };
  if (!token) return { error: mensajeErrorAuth({ code: "INVALID_TOKEN" }) };

  try {
    await obtenerAuth().api.resetPassword({ body: { newPassword: r.data.contrasena, token }, headers: await headers() });
  } catch (error) {
    return { error: mensajeErrorAuth(error) };
  }
  redirect("/ingresar?restablecida=1");
}

export async function salir() {
  if (backendConfigurado()) {
    await obtenerAuth().api.signOut({ headers: await headers() });
  }
  redirect("/");
}
