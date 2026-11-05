/** Traduce errores de Better Auth a mensajes claros. Nunca se muestra el texto crudo del servicio. */
const MENSAJES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El correo o la contraseña no son correctos.",
  EMAIL_NOT_VERIFIED: "Todavía no confirmaste tu correo. Te enviamos el mensaje de nuevo: revisá tu bandeja de entrada (y el spam).",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo. Probá iniciar sesión.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Probá iniciar sesión.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña no puede superar los 72 caracteres.",
  INVALID_EMAIL: "Ese correo no parece válido.",
  INVALID_TOKEN: "El enlace venció o ya se usó. Pedí uno nuevo.",
  TOKEN_EXPIRED: "El enlace venció o ya se usó. Pedí uno nuevo.",
  SESSION_EXPIRED: "Tu sesión venció. Iniciá sesión de nuevo.",
  RATE_LIMIT: "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.",
};

export const MENSAJE_GENERICO = "Algo salió mal de nuestro lado. Probá de nuevo en un momento.";

interface ErrorAuthLike {
  code?: string;
  status?: number | string;
  statusCode?: number;
  body?: { code?: string };
}

/** Acepta el APIError de Better Auth (body.code / statusCode) o un objeto { code, status }. */
export function mensajeErrorAuth(error: unknown): string {
  if (!error || typeof error !== "object") return MENSAJE_GENERICO;
  const e = error as ErrorAuthLike;
  const codigo = e.body?.code ?? e.code;
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo];
  if (e.statusCode === 429 || e.status === 429 || e.status === "TOO_MANY_REQUESTS") return MENSAJES.RATE_LIMIT;
  return MENSAJE_GENERICO;
}
