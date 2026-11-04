import { crearBloque, type Bloque } from "./bloques";

/** Plantillas visuales. Cambiarla es solo una capa de estilo: el contenido no se toca. */
export const PLANTILLAS = ["pergamino", "archivo", "editorial"] as const;
export type Plantilla = (typeof PLANTILLAS)[number];

export const INFO_PLANTILLA: Record<Plantilla, { nombre: string; descripcion: string }> = {
  pergamino: { nombre: "Pergamino clásico", descripcion: "Papel cálido y tinta oscura, como un cuaderno antiguo." },
  archivo: { nombre: "Archivo fantástico", descripcion: "Papel de noche, tinta durazno y marcos ornamentados." },
  editorial: { nombre: "Minimalista editorial", descripcion: "Páginas limpias, mucho aire y tipografía cuidada." },
};

export const ESTADOS_PAGINA = ["borrador", "publicada"] as const;
export type EstadoPagina = (typeof ESTADOS_PAGINA)[number];
export const ETIQUETA_ESTADO_PAGINA: Record<EstadoPagina, string> = { borrador: "Borrador", publicada: "Terminada" };

export const TIPOS_PAGINA = [
  "resena", "reflexiones", "citas", "personajes", "momentos", "notas", "libre",
  "objetivos", "lista", "recuerdos", "resumen",
] as const;
export type TipoPagina = (typeof TIPOS_PAGINA)[number];

interface InfoTipo {
  etiqueta: string;
  descripcion: string;
  titulo: string;
  bloques: (hoy: string) => Bloque[];
}

export const INFO_TIPO: Record<TipoPagina, InfoTipo> = {
  resena: { etiqueta: "Reseña personal", descripcion: "Qué te pareció el libro.", titulo: "Mi reseña", bloques: (h) => [crearBloque("texto", h)] },
  reflexiones: { etiqueta: "Reflexiones", descripcion: "Ideas y preguntas que te dejó.", titulo: "Reflexiones", bloques: (h) => [crearBloque("texto", h)] },
  citas: { etiqueta: "Citas favoritas", descripcion: "Frases que querés conservar.", titulo: "Citas favoritas", bloques: (h) => [crearBloque("cita", h)] },
  personajes: { etiqueta: "Personajes favoritos", descripcion: "Quiénes te marcaron y por qué.", titulo: "Personajes favoritos", bloques: (h) => [crearBloque("personaje", h)] },
  momentos: { etiqueta: "Momentos destacados", descripcion: "Escenas que no vas a olvidar.", titulo: "Momentos destacados", bloques: (h) => [crearBloque("momento", h)] },
  notas: { etiqueta: "Notas con fecha", descripcion: "Apuntes mientras leés.", titulo: "Notas de lectura", bloques: (h) => [crearBloque("nota", h)] },
  libre: { etiqueta: "Página en blanco", descripcion: "Armala como quieras.", titulo: "", bloques: (h) => [crearBloque("texto", h)] },
  objetivos: { etiqueta: "Objetivos personales", descripcion: "Metas de lectura con tareas.", titulo: "Mis objetivos de lectura", bloques: (h) => [{ ...crearBloque("lista", h), modo: "tareas" } as Bloque] },
  lista: { etiqueta: "Lista", descripcion: "Pendientes, recomendaciones, lo que sea.", titulo: "Lista", bloques: (h) => [crearBloque("lista", h)] },
  recuerdos: { etiqueta: "Recuerdos y fotos", descripcion: "Momentos de lectura con imágenes.", titulo: "Recuerdos", bloques: (h) => [crearBloque("texto", h)] },
  resumen: { etiqueta: "Resumen de lecturas", descripcion: "Un balance del año con tus datos reales.", titulo: "Resumen de lecturas", bloques: (h) => [crearBloque("resumen_lecturas", h), crearBloque("texto", h)] },
};

/** Tipos que se ofrecen en cada ámbito. */
export const TIPOS_LIBRO: TipoPagina[] = ["resena", "reflexiones", "citas", "personajes", "momentos", "notas", "libre"];
export const TIPOS_GENERAL: TipoPagina[] = ["objetivos", "reflexiones", "lista", "recuerdos", "resumen", "libre"];

export const MAX_PAGINAS_POR_PERSONA = 500;
export const MAX_IMAGENES_POR_PERSONA = 300;
export const MAX_BYTES_IMAGEN = 600_000;
