/**
 * El progreso del onboarding NO se guarda como contador: se deduce de lo que ya existe en la base.
 * Así puede retomarse en cualquier momento y no hay estado que se desincronice.
 */
export type PasoOnboarding = "guardiana" | "biblioteca" | "apariencia" | "llaves" | "completo";

export interface DatosOnboarding {
  guardianaNombre: string | null;
  bibliotecaNombre: string | null;
  apariencia: string | null;
  completadoAt: string | null;
}

export function derivarPaso(d: DatosOnboarding): PasoOnboarding {
  if (d.completadoAt) return "completo";
  if (!d.guardianaNombre) return "guardiana";
  if (!d.bibliotecaNombre) return "biblioteca";
  if (!d.apariencia) return "apariencia";
  return "llaves";
}
