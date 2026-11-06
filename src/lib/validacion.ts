import { z } from "zod";
import { APARIENCIA_IDS } from "@/modules/onboarding/apariencias";

/** Esquemas compartidos por los formularios (cliente) y las Server Actions (servidor). */

const correo = z
  .string({ error: "Ingresá tu correo." })
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu correo.")
  .max(254, "El correo es demasiado largo.")
  .pipe(z.email("Ese correo no parece válido."));

const contrasena = z
  .string({ error: "Ingresá una contraseña." })
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar los 72 caracteres.");

export const esquemaIngreso = z.object({
  correo,
  contrasena: z.string({ error: "Ingresá tu contraseña." }).min(1, "Ingresá tu contraseña.").max(72),
});

export const esquemaRegistro = z
  .object({ correo, contrasena, confirmacion: z.string() })
  .refine((v) => v.contrasena === v.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export const esquemaRecuperar = z.object({ correo });

export const esquemaRestablecer = z
  .object({ contrasena, confirmacion: z.string() })
  .refine((v) => v.contrasena === v.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export const esquemaGuardiana = z.object({
  nombre: z
    .string({ error: "Elegí un nombre." })
    .trim()
    .min(2, "El nombre necesita al menos 2 letras.")
    .max(40, "El nombre no puede superar los 40 caracteres.")
    .regex(/^[\p{L}\p{N}][\p{L}\p{N} '’.\-]*$/u, "Usá solo letras, números, espacios, apóstrofes, puntos o guiones."),
});

export const esquemaBiblioteca = z.object({
  nombre: z
    .string({ error: "Elegí un nombre." })
    .trim()
    .min(2, "El nombre necesita al menos 2 caracteres.")
    .max(60, "El nombre no puede superar los 60 caracteres.")
    .regex(/^[^\p{Cc}<>]+$/u, "El nombre no puede contener caracteres especiales de control ni < >."),
});

export const esquemaApariencia = z.object({
  apariencia: z.enum(APARIENCIA_IDS, { error: "Elegí una de las apariencias." }),
});

/** Convierte un ZodError en { campo: primer mensaje }. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "_");
    salida[campo] ??= issue.message;
  }
  return salida;
}

/** Bienvenida del diario: el nombre y el nombre de la biblioteca, en un solo paso. */
export const esquemaDiario = z.object({
  nombre: esquemaGuardiana.shape.nombre,
  biblioteca: esquemaBiblioteca.shape.nombre,
});
