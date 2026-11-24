/** La compañera de la biblioteca: su ánimo sale de hechos reales. Nunca castiga ni pide nada: solo acompaña. */

export type Animo = "contenta" | "leyendo" | "dormida";

export interface EntradaAnimo {
  /** Recompensas nuevas desde la última visita. */
  recompensasNuevas: number;
  /** Título de un libro que se está leyendo (si hay). */
  libroEnCurso: string | null;
}

export function animoDe({ recompensasNuevas, libroEnCurso }: EntradaAnimo): Animo {
  if (recompensasNuevas > 0) return "contenta";
  return libroEnCurso ? "leyendo" : "dormida";
}

export function frasesDe(animo: Animo, libroEnCurso: string | null): string[] {
  if (animo === "contenta") return ["¡Mirá lo que ganaste! Trajo Esencias para la biblioteca.", "Esto se merece una vela nueva."];
  if (animo === "leyendo")
    return [`Hoy te acompaño con «${libroEnCurso}».`, "Sin apuro: leé lo que tengas ganas.", "Cuando quieras, anotá lo que pensaste."];
  return ["Zzz… cuando elijas un libro, me despierto.", "Los estantes te esperan, sin apuro."];
}
