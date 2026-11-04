/**
 * Registro único de las 13 escenas ilustradas. Cualquier pantalla pide su fondo por id: no se repiten rutas de imagen
 * en los componentes. Los archivos son WebP recortados sin las barras negras de las láminas originales (ver docs/ESCENAS.md).
 * Las imágenes son arte, no interfaz: botones, textos, logo y progreso se dibujan con componentes.
 */

export const ESCENA_IDS = [
  "01_bienvenida_castillo",
  "02_portal_de_ingreso",
  "03_invitacion_identidad",
  "04_revelacion_biblioteca",
  "05_gran_sala",
  "06_archivo",
  "07_escritorio_journal",
  "08_taller",
  "09_torre",
  "10_transicion_puerta",
  "11_transicion_libro",
  "12_carga",
  "13_recompensa",
] as const;
export type SceneId = (typeof ESCENA_IDS)[number];

export type SceneRole = "screen" | "module" | "transition" | "loading" | "reward";

export interface SceneAsset {
  id: SceneId;
  src: string;
  /** Dimensiones reales del archivo (para reservar espacio y evitar saltos de diseño). */
  ancho: number;
  alto: number;
  role: SceneRole;
  alt: string;
  /** Recorte preferido cuando el contenedor tiene otra proporción. */
  objectPosition?: string;
}

const e = (id: SceneId, ancho: number, alto: number, role: SceneRole, alt: string, objectPosition?: string): SceneAsset => ({
  id, src: `/escenas/${id}.webp`, ancho, alto, role, alt, objectPosition,
});

export const SCENES: Record<SceneId, SceneAsset> = {
  "01_bienvenida_castillo": e("01_bienvenida_castillo", 1672, 941, "screen", "Un castillo al atardecer entre cascadas y montañas, con un viaducto de piedra"),
  "02_portal_de_ingreso": e("02_portal_de_ingreso", 1978, 1061, "screen", "El portal de piedra de la biblioteca, entreabierto, con estandartes del dragón"),
  "03_invitacion_identidad": e("03_invitacion_identidad", 1955, 1071, "screen", "Un escritorio con libros antiguos, una vela, una pluma y una carta con sello de lacre"),
  "04_revelacion_biblioteca": e("04_revelacion_biblioteca", 1910, 1009, "screen", "El balcón y los grandes ventanales de la biblioteca, con velas en primer plano"),
  "05_gran_sala": e("05_gran_sala", 1672, 941, "screen", "La Gran Sala: una biblioteca gótica con ventanales, escalera, chimenea y una alfombra violeta"),
  "06_archivo": e("06_archivo", 1994, 955, "module", "Estanterías altas con una escalera de madera y un pasillo con alfombra", "30% 50%"),
  "07_escritorio_journal": e("07_escritorio_journal", 1980, 951, "module", "Un libro antiguo abierto sobre un escritorio, con una pluma y tinta"),
  "08_taller": e("08_taller", 1956, 963, "module", "El taller: un sillón de terciopelo, una mesa de trabajo y un cristal violeta", "35% 50%"),
  "09_torre": e("09_torre", 1901, 905, "module", "La Torre sobre su colina, al atardecer", "60% 40%"),
  "10_transicion_puerta": e("10_transicion_puerta", 1905, 1077, "transition", "Una puerta de madera con una grieta de luz dorada"),
  "11_transicion_libro": e("11_transicion_libro", 1901, 1073, "transition", "Un libro abierto con destellos dorados"),
  "12_carga": e("12_carga", 1843, 1089, "loading", "El dragón de la casa sobre un cielo estrellado"),
  "13_recompensa": e("13_recompensa", 1867, 1081, "reward", "Un pergamino con una gema violeta"),
};

export const escena = (id: SceneId): SceneAsset => SCENES[id];

/** Panorámica de la Gran Sala (3,2:1 de ancho). No se estira: hoy no se usa como fondo. */
export const PANORAMA_GRAN_SALA = { src: "/escenas/05_gran_sala_panorama.webp", ancho: 2000, alto: 312 } as const;

/** Fondos de las pantallas de carga (sin barra ni logo dibujados: el progreso y el logo son componentes). */
export const FONDOS_CARGA = [
  "/escenas/carga/carga-1.webp",
  "/escenas/carga/carga-2.webp",
  "/escenas/carga/carga-3.webp",
  "/escenas/carga/carga-4.webp",
] as const;
