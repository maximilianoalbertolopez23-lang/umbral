import { RUTA_INICIO } from "@/lib/juego";

/** Acepta solo rutas internas ("/algo"); evita open redirects ("//evil.com", "https://…", "/\\evil"). */
export function rutaSegura(destino: string | null | undefined, porDefecto: string = RUTA_INICIO): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) return porDefecto;
  if (/[\u0000-\u001f]/.test(destino)) return porDefecto;
  return destino;
}
