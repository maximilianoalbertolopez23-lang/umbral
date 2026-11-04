/**
 * Apariencias iniciales de la biblioteca. Opciones limitadas a propósito; solo usan la paleta oficial.
 * Los ids deben coincidir con el check de public.personalizaciones.apariencia (db/migrations).
 */
export const APARIENCIA_IDS = ["noche", "ocaso", "alba"] as const;
export type AparienciaId = (typeof APARIENCIA_IDS)[number];

export interface Apariencia {
  id: AparienciaId;
  nombre: string;
  descripcion: string;
  /** Fondo CSS de la Gran Sala y de la muestra en el onboarding. */
  fondo: string;
}

export const APARIENCIAS: readonly Apariencia[] = [
  {
    id: "noche",
    nombre: "Noche de luna",
    descripcion: "Ciruela profundo y una luna alta. Silencio de biblioteca cerrada.",
    fondo: "radial-gradient(ellipse at 70% 15%, #f2c7a255, transparent 45%), linear-gradient(160deg, #512d47, #2e182f)",
  },
  {
    id: "ocaso",
    nombre: "Ocaso malva",
    descripcion: "La última luz sobre los lomos. Cálido, apagado, nostálgico.",
    fondo: "radial-gradient(ellipse at 50% 100%, #ae7a7e88, transparent 60%), linear-gradient(180deg, #2e182f, #512d47)",
  },
  {
    id: "alba",
    nombre: "Alba durazno",
    descripcion: "Amanece entre los estantes. Luz suave sobre madera y papel.",
    fondo: "radial-gradient(ellipse at 30% 0%, #f2c7a277, transparent 55%), linear-gradient(200deg, #ae7a7e66, #2e182f)",
  },
];

export function getApariencia(id: string | null | undefined): Apariencia {
  return APARIENCIAS.find((a) => a.id === id) ?? APARIENCIAS[0];
}
