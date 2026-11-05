/**
 * Variables de entorno necesarias. Se lee en el momento de la petición (nunca se congela en el build).
 * Si falta alguna, la app lo informa y no simula un backend.
 */
export const VARIABLES_REQUERIDAS = ["DATABASE_URL", "BETTER_AUTH_SECRET"] as const;

export function variablesFaltantes(): string[] {
  const faltan: string[] = VARIABLES_REQUERIDAS.filter((v) => !process.env[v]);
  if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
    faltan.push("BETTER_AUTH_SECRET (mínimo 32 caracteres)");
  }
  if (process.env.NODE_ENV === "production") {
    if (!process.env.BETTER_AUTH_URL) faltan.push("BETTER_AUTH_URL");
    if (!process.env.SMTP_URL && !correoOpcional()) faltan.push("SMTP_URL");
  }
  return faltan;
}

export function backendConfigurado(): boolean {
  return variablesFaltantes().length === 0;
}

/**
 * Modo sin correo (CORREO_OPCIONAL=1): permite registrarse y entrar sin confirmar el correo ni tener SMTP. Es una salida
 * transitoria para uso privado: con ella cualquiera con la dirección puede crear una cuenta con un correo inventado y no
 * funciona recuperar la contraseña. Por defecto está apagado.
 */
export function correoOpcional(): boolean {
  return process.env.CORREO_OPCIONAL === "1";
}

/** En producción siempre se exige verificar el correo (salvo modo sin correo); en desarrollo solo si hay SMTP para enviarlo. */
export function exigeVerificacionCorreo(): boolean {
  if (correoOpcional()) return false;
  return process.env.NODE_ENV === "production" || Boolean(process.env.SMTP_URL);
}
