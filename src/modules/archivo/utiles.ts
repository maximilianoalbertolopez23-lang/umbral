/** Funciones puras del Archivo (sin dependencias de servidor ni de navegador). */

/** "a, b; c\nd" → ["a","b","c","d"] sin vacíos ni duplicados (sin distinguir mayúsculas). */
export function parsearLista(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const crudo of texto.split(/[,;\n]/)) {
    const valor = crudo.trim().replace(/\s+/g, " ");
    const clave = valor.toLocaleLowerCase("es");
    if (!valor || vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(valor);
  }
  return salida;
}

/** Quita acentos y pasa a minúsculas, para buscar sin importar tildes ni mayúsculas. */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
}

/** Devuelve el ISBN normalizado (10 o 13 caracteres) si el dígito verificador es correcto; si no, null. */
export function validarIsbn(entrada: string): string | null {
  const isbn = entrada.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const suma = [...isbn].reduce((acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return suma % 11 === 0 ? isbn : null;
  }
  if (/^\d{13}$/.test(isbn)) {
    const suma = [...isbn].reduce((acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3), 0);
    return suma % 10 === 0 ? isbn : null;
  }
  return null;
}

/** Porcentaje leído (0–100, entero), o null si no se conocen las páginas totales. */
export function porcentaje(paginaActual: number | null | undefined, total: number | null | undefined): number | null {
  if (!total || total <= 0) return null;
  const pagina = Math.min(Math.max(paginaActual ?? 0, 0), total);
  return Math.round((pagina / total) * 100);
}

/** Fecha de hoy (YYYY-MM-DD) en horario de Argentina. */
export function fechaHoy(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

/** Detecta el formato real por los primeros bytes (no se confía en el nombre ni en el tipo declarado). */
export function detectarImagen(bytes: Uint8Array): TipoImagen | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export const MAX_BYTES_PORTADA = 400_000;
