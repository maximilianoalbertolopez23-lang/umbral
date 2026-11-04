export const ESTADOS = ["quiero_leer", "leyendo", "terminado", "pausado", "abandonado"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  quiero_leer: "Quiero leer",
  leyendo: "Leyendo",
  terminado: "Terminado",
  pausado: "Pausado",
  abandonado: "Abandonado",
};

/** Estados de una lectura concreta (el estado "quiero_leer" es de un libro sin lecturas). */
export type EstadoLectura = Exclude<Estado, "quiero_leer">;

export type VistaArchivo = "estanteria" | "catalogo";

/** Lo que necesitan la estantería y el catálogo. Ambas vistas consumen exactamente esta lista. */
export interface LibroResumen {
  id: string;
  titulo: string;
  autores: string[];
  isbn: string | null;
  saga: string | null;
  sagaNumero: number | null;
  generos: string[];
  etiquetas: string[];
  paginasTotal: number | null;
  estado: Estado;
  calificacion: number | null;
  /** 0 = sin portada. Cambia al reemplazarla (invalida la caché del navegador). */
  portadaVersion: number;
  /** Página y fechas de la lectura más reciente (null si todavía no hay lecturas). */
  paginaActual: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  nLecturas: number;
  creadoAt: string;
}

export interface Lectura {
  id: string;
  numero: number;
  estado: EstadoLectura;
  fechaInicio: string | null;
  fechaFin: string | null;
  paginaActual: number;
}

export interface Sesion {
  id: string;
  lecturaId: string;
  fecha: string;
  paginaInicio: number;
  paginaFin: number;
  minutos: number | null;
  nota: string | null;
}

export interface LibroDetalle extends LibroResumen {
  sinopsis: string | null;
  origen: "manual" | "openlibrary";
  lecturas: Lectura[];
  sesiones: Sesion[];
}

/** Datos ya validados y normalizados de un libro (salida de esquemaLibro). */
export interface LibroInput {
  titulo: string;
  autores: string[];
  isbn: string | null;
  saga: string | null;
  sagaNumero: number | null;
  generos: string[];
  etiquetas: string[];
  paginasTotal: number | null;
  sinopsis: string | null;
  estado: Estado;
  fechaInicio: string | null;
  fechaFin: string | null;
  calificacion: number | null;
}
