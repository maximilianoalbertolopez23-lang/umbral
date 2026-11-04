import type { Estado, LibroResumen } from "./tipos";
import { normalizarTexto, porcentaje } from "./utiles";

/** Búsqueda, filtros y orden del Archivo. Puro y compartido por la estantería y el catálogo. */

export type Orden = "recientes" | "titulo" | "autor" | "calificacion" | "progreso" | "finalizacion";

export const ETIQUETA_ORDEN: Record<Orden, string> = {
  recientes: "Agregados recientemente",
  titulo: "Título (A–Z)",
  autor: "Autor (A–Z)",
  calificacion: "Mejor calificados",
  progreso: "Más avanzados",
  finalizacion: "Terminados hace poco",
};

export interface Filtros {
  q: string;
  estados: Estado[];
  autor: string;
  genero: string;
  saga: string;
  etiqueta: string;
  /** 0 = sin filtro. */
  calificacionMin: number;
  orden: Orden;
}

export const FILTROS_VACIOS: Filtros = {
  q: "",
  estados: [],
  autor: "",
  genero: "",
  saga: "",
  etiqueta: "",
  calificacionMin: 0,
  orden: "recientes",
};

export function hayFiltros(f: Filtros): boolean {
  return Boolean(
    f.q.trim() || f.estados.length || f.autor || f.genero || f.saga || f.etiqueta || f.calificacionMin > 0,
  );
}

const igual = (lista: string[], valor: string) => lista.some((x) => normalizarTexto(x) === normalizarTexto(valor));

function pajar(l: LibroResumen): string {
  return normalizarTexto(
    [l.titulo, ...l.autores, l.saga ?? "", l.isbn ?? "", ...l.generos, ...l.etiquetas].join(" "),
  );
}

export function filtrarLibros(libros: LibroResumen[], f: Filtros): LibroResumen[] {
  const tokens = normalizarTexto(f.q).split(/\s+/).filter(Boolean);
  return libros.filter((l) => {
    if (f.estados.length && !f.estados.includes(l.estado)) return false;
    if (f.autor && !igual(l.autores, f.autor)) return false;
    if (f.genero && !igual(l.generos, f.genero)) return false;
    if (f.etiqueta && !igual(l.etiquetas, f.etiqueta)) return false;
    if (f.saga && normalizarTexto(l.saga ?? "") !== normalizarTexto(f.saga)) return false;
    if (f.calificacionMin > 0 && (l.calificacion ?? 0) < f.calificacionMin) return false;
    if (tokens.length) {
      const texto = pajar(l);
      if (!tokens.every((t) => texto.includes(t))) return false;
    }
    return true;
  });
}

const porTitulo = (a: LibroResumen, b: LibroResumen) => a.titulo.localeCompare(b.titulo, "es", { sensitivity: "base" });

/** Compara números dejando los valores ausentes (null) siempre al final. */
function descNullsAlFinal(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export function ordenarLibros(libros: LibroResumen[], orden: Orden): LibroResumen[] {
  const copia = [...libros];
  const comparar: Record<Orden, (a: LibroResumen, b: LibroResumen) => number> = {
    recientes: (a, b) => b.creadoAt.localeCompare(a.creadoAt),
    titulo: porTitulo,
    autor: (a, b) =>
      (a.autores[0] ?? "￿").localeCompare(b.autores[0] ?? "￿", "es", { sensitivity: "base" }) ||
      (a.sagaNumero ?? 0) - (b.sagaNumero ?? 0),
    calificacion: (a, b) => descNullsAlFinal(a.calificacion, b.calificacion),
    progreso: (a, b) =>
      descNullsAlFinal(porcentaje(a.paginaActual, a.paginasTotal), porcentaje(b.paginaActual, b.paginasTotal)),
    finalizacion: (a, b) => {
      if (!a.fechaFin && !b.fechaFin) return 0;
      if (!a.fechaFin) return 1;
      if (!b.fechaFin) return -1;
      return b.fechaFin.localeCompare(a.fechaFin);
    },
  };
  return copia.sort((a, b) => comparar[orden](a, b) || porTitulo(a, b));
}

export function aplicarFiltros(libros: LibroResumen[], f: Filtros): LibroResumen[] {
  return ordenarLibros(filtrarLibros(libros, f), f.orden);
}

export interface OpcionesFiltro {
  autores: string[];
  generos: string[];
  sagas: string[];
  etiquetas: string[];
}

function unicos(valores: string[]): string[] {
  const mapa = new Map<string, string>();
  for (const v of valores) if (!mapa.has(normalizarTexto(v))) mapa.set(normalizarTexto(v), v);
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/** Valores disponibles para los selectores de filtro, tomados de los libros reales de la persona. */
export function opcionesFiltro(libros: LibroResumen[]): OpcionesFiltro {
  return {
    autores: unicos(libros.flatMap((l) => l.autores)),
    generos: unicos(libros.flatMap((l) => l.generos)),
    sagas: unicos(libros.flatMap((l) => (l.saga ? [l.saga] : []))),
    etiquetas: unicos(libros.flatMap((l) => l.etiquetas)),
  };
}
