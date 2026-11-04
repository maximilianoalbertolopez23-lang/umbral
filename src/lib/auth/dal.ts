import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerAuth } from "@/lib/auth/auth";
import { backendConfigurado } from "@/lib/config";
import { conUsuario } from "@/lib/db";
import { derivarPaso, type DatosOnboarding, type PasoOnboarding } from "@/modules/onboarding/pasos";

/**
 * Capa de acceso a datos de sesión. Autoriza en el servidor (la sesión se valida contra la base);
 * el proxy solo hace una comprobación optimista de la cookie y RLS es la última barrera.
 */
export const obtenerUsuario = cache(async () => {
  if (!backendConfigurado()) return null;
  const sesion = await obtenerAuth().api.getSession({ headers: await headers() });
  return sesion?.user ?? null;
});

export interface EstadoGuardiana extends DatosOnboarding {
  userId: string;
  /** Preferencia de movimiento elegida en El Taller ("si" = reducirlo siempre). */
  movimiento: "sistema" | "si" | "no";
  paso: PasoOnboarding;
}

export const obtenerEstadoGuardiana = cache(async (): Promise<EstadoGuardiana | null> => {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;

  const { datos, movimiento } = await conUsuario(usuario.id, async (db) => {
    const perfil = await db.query<{ guardiana_nombre: string | null; onboarding_completado_at: Date | null }>(
      "select guardiana_nombre, onboarding_completado_at from profiles",
    );
    const biblioteca = await db.query<{ nombre: string }>("select nombre from bibliotecas");
    const personalizacion = await db.query<{ apariencia: string }>("select apariencia from personalizaciones");
    const preferencias = await db.query<{ reducir_movimiento: "sistema" | "si" | "no" }>("select reducir_movimiento from preferencias");
    const datos: DatosOnboarding = {
      guardianaNombre: perfil.rows[0]?.guardiana_nombre ?? null,
      bibliotecaNombre: biblioteca.rows[0]?.nombre ?? null,
      apariencia: personalizacion.rows[0]?.apariencia ?? null,
      completadoAt: perfil.rows[0]?.onboarding_completado_at?.toISOString() ?? null,
    };
    return { datos, movimiento: preferencias.rows[0]?.reducir_movimiento ?? "sistema" };
  });
  return { userId: usuario.id, ...datos, movimiento, paso: derivarPaso(datos) };
});

/** Para el mundo privado: exige sesión y onboarding completo. */
export async function requerirGuardiana(): Promise<EstadoGuardiana> {
  const estado = await obtenerEstadoGuardiana();
  if (!estado) redirect("/ingresar");
  if (estado.paso !== "completo") redirect("/bienvenida");
  return estado;
}

/** Para /bienvenida: exige sesión y que el onboarding siga pendiente. */
export async function requerirOnboardingPendiente(): Promise<EstadoGuardiana> {
  const estado = await obtenerEstadoGuardiana();
  if (!estado) redirect("/ingresar");
  if (estado.paso === "completo") redirect("/sala");
  return estado;
}
