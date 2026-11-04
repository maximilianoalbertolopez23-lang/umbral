import type { LibroResumen } from "@/modules/archivo/tipos";

/**
 * La Gran Sala: definición de los objetos interactivos y de la escena. Las posiciones están en porcentaje de una
 * escena de 1600 × 900 (el mismo sistema de coordenadas que el arte SVG), de modo que arte y objetos coinciden.
 * Regla: ningún objeto existe si no tiene una acción real (abrir una ruta, abrir un panel o encender/apagar algo).
 */

export const ANCHO_ESCENA = 1600;
export const ALTO_ESCENA = 900;

export type AccionObjeto =
  | { tipo: "ruta"; href: string }
  | { tipo: "puerta" }
  | { tipo: "inspeccion"; panel: "escudo" | "ventanal" }
  | { tipo: "velas" };

export interface ObjetoSala {
  id: "estanteria" | "puerta" | "ventanal" | "candelabro" | "escudo" | "escritorio" | "taller" | "torre";
  /** Rectángulo en unidades de la escena (1600 × 900). */
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Nombre accesible y rótulo. */
  nombre: string;
  accion: AccionObjeto;
}

export const OBJETOS: readonly ObjetoSala[] = [
  { id: "estanteria", x: 38, y: 57, ancho: 372, alto: 420, nombre: "Las estanterías: abre El Archivo", accion: { tipo: "ruta", href: "/archivo" } },
  { id: "candelabro", x: 34, y: 483, ancho: 175, alto: 244, nombre: "La chimenea: encender o apagar las velas", accion: { tipo: "velas" } },
  { id: "escudo", x: 442, y: 215, ancho: 72, alto: 260, nombre: "El estandarte: inspeccionar el emblema", accion: { tipo: "inspeccion", panel: "escudo" } },
  { id: "puerta", x: 425, y: 500, ancho: 90, alto: 130, nombre: "La puerta lateral: cambiar de estancia", accion: { tipo: "puerta" } },
  { id: "ventanal", x: 598, y: 144, ancho: 75, alto: 230, nombre: "El ventanal: mirar la luz de la biblioteca", accion: { tipo: "inspeccion", panel: "ventanal" } },
  { id: "torre", x: 708, y: 53, ancho: 185, alto: 322, nombre: "El gran ventanal: abre La Torre", accion: { tipo: "ruta", href: "/torre" } },
  { id: "escritorio", x: 560, y: 520, ancho: 480, alto: 230, nombre: "Bajo el balcón: abre El Escritorio", accion: { tipo: "ruta", href: "/escritorio" } },
  { id: "taller", x: 1230, y: 430, ancho: 340, alto: 340, nombre: "Los arcos de la derecha: abre El Taller", accion: { tipo: "ruta", href: "/taller" } },
];

export const pct = (valor: number, total: number) => `${((valor / total) * 100).toFixed(3)}%`;

/** Libro que se muestra en el atril: el que se está leyendo; si no hay, el último agregado; si no hay libros, ninguno. */
export function elegirLibroDestacado<T extends Pick<LibroResumen, "estado" | "fechaInicio" | "creadoAt">>(libros: T[]): T | null {
  if (libros.length === 0) return null;
  const reciente = (a: T, b: T) => (b.fechaInicio ?? b.creadoAt.slice(0, 10)).localeCompare(a.fechaInicio ?? a.creadoAt.slice(0, 10)) || b.creadoAt.localeCompare(a.creadoAt);
  const leyendo = libros.filter((l) => l.estado === "leyendo").sort(reciente);
  if (leyendo[0]) return leyendo[0];
  return [...libros].sort((a, b) => b.creadoAt.localeCompare(a.creadoAt))[0];
}

export interface Lomo {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  color: string;
  franja: boolean;
}

/** Colores de lomos: paleta oficial y mezclas derivadas. */
const COLORES_LOMO = ["#512d47", "#ae7a7e", "#f2c7a2", "#7a4666", "#3b1f3a", "#c79a93", "#8a5a62"] as const;

/** Estantes: y = donde apoyan los libros; los lomos ocupan de x = 76 a x = 474. */
export const ESTANTES_Y = [250, 390, 530, 670] as const;
const X_INICIO = 76;
const X_FIN = 474;

function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/**
 * Un lomo por cada libro real de la colección (de arriba abajo, en el orden en que se agregaron), con forma y
 * color estables por libro. Si no hay libros, los estantes quedan vacíos; si no entran todos, `restantes` > 0.
 */
export function generarLomos(libros: { id: string }[]): { lomos: Lomo[]; restantes: number } {
  const lomos: Lomo[] = [];
  let fila = 0;
  let x = X_INICIO;
  let colocados = 0;
  for (const libro of libros) {
    const h = hash(libro.id);
    const ancho = 14 + (h % 13);
    const alto = 78 + ((h >>> 5) % 41);
    if (x + ancho > X_FIN) {
      fila++;
      x = X_INICIO;
    }
    if (fila >= ESTANTES_Y.length) break;
    lomos.push({ x, y: ESTANTES_Y[fila] - alto, ancho, alto, color: COLORES_LOMO[(h >>> 11) % COLORES_LOMO.length], franja: (h >>> 17) % 3 === 0 });
    x += ancho + 2;
    colocados++;
  }
  return { lomos, restantes: libros.length - colocados };
}
