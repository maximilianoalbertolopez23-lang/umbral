/** Acepta solo rutas internas ("/algo"); evita open redirects ("//evil.com", "https://…", "/\\evil"). */
export function rutaSegura(destino: string | null | undefined, porDefecto = "/sala"): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.includes("\\")) return porDefecto;
  if (/[\u0000-\u001f]/.test(destino)) return porDefecto;
  return destino;
}
