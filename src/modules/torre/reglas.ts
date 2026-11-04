/**
 * Reglas de La Torre, todas como DATOS: para sumar una misión, un logro, una actividad o un objeto de la tienda basta
 * una entrada nueva aquí; ninguna otra parte de la arquitectura cambia.
 *
 * Filosofía: la progresión es una invitación, no una obligación. No hay rachas, no hay vencimientos y nada se pierde por
 * no leer. Todo se calcula a partir de hechos verificables guardados en la base (libros terminados, reseñas escritas…).
 */

// ---------------------------------------------------------------------------
// Métricas: hechos verificables que se leen de la base (ver repositorio.ts)
// ---------------------------------------------------------------------------

export interface Metricas {
  librosTerminados: number;
  fantasiaTerminados: number;
  sagasCompletas: number;
  resenas: number;
  reflexiones: number;
  citas: number;
  paginasLeidas: number;
  salaPersonalizada: number; // 0 | 1
  plantillasPropias: number;
  objetosEnSala: number;
}

export type ClaveMetrica = keyof Metricas;

export const METRICAS_VACIAS: Metricas = {
  librosTerminados: 0, fantasiaTerminados: 0, sagasCompletas: 0, resenas: 0, reflexiones: 0, citas: 0,
  paginasLeidas: 0, salaPersonalizada: 0, plantillasPropias: 0, objetosEnSala: 0,
};

// ---------------------------------------------------------------------------
// Niveles: cada «piso» de la Torre pide un poco más que el anterior, sin tope práctico
// ---------------------------------------------------------------------------

/** XP total necesario para ENTRAR al nivel n (nivel 1 = 0). */
export const xpParaNivel = (n: number): number => 50 * n * (n - 1);

export const TITULOS_PISO = [
  "Umbral", "Aprendiz de archivo", "Lectora de pasillos", "Guardiana de estantes", "Cronista de la torre",
  "Tejedora de relatos", "Custodia de mundos", "Archivista mayor", "Voz del archivo", "Guardiana de los mundos",
];

export interface EstadoNivel {
  nivel: number;
  titulo: string;
  xpEnNivel: number;
  xpHastaSiguiente: number;
  /** 0–1 */
  progreso: number;
}

export function estadoNivel(xp: number): EstadoNivel {
  const total = Math.max(0, Math.floor(xp));
  let nivel = 1;
  while (xpParaNivel(nivel + 1) <= total) nivel++;
  const base = xpParaNivel(nivel);
  const techo = xpParaNivel(nivel + 1);
  return {
    nivel,
    titulo: TITULOS_PISO[Math.min(nivel, TITULOS_PISO.length) - 1],
    xpEnNivel: total - base,
    xpHastaSiguiente: techo - base,
    progreso: (total - base) / (techo - base),
  };
}

// ---------------------------------------------------------------------------
// Definiciones
// ---------------------------------------------------------------------------

export interface Recompensa {
  xp: number;
  esencias: number;
  /** Objetos del inventario que se regalan (claves de la tienda, p. ej. «objeto:globo»). */
  items?: string[];
}

export interface Meta {
  metrica: ClaveMetrica;
  objetivo: number;
}

export interface Mision {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  meta: Meta;
  recompensa: Recompensa;
}

export interface Logro {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  meta: Meta;
  recompensa?: Recompensa;
}

/** Actividades que dan XP y Esencias una sola vez por hecho (la clave del evento la arma el repositorio). */
export const ACTIVIDADES = {
  libro_terminado: { titulo: "Terminaste un libro", xp: 100, esencias: 30 },
  resena: { titulo: "Escribiste una reseña", xp: 40, esencias: 15 },
  reflexion: { titulo: "Registraste una reflexión", xp: 25, esencias: 10 },
} as const;
export type TipoActividad = keyof typeof ACTIVIDADES;

export const MISIONES: readonly Mision[] = [
  { id: "primer-libro", nombre: "El primer libro", descripcion: "Terminá tu primer libro.", icono: "libro", meta: { metrica: "librosTerminados", objetivo: 1 }, recompensa: { xp: 60, esencias: 25 } },
  { id: "tres-fantasia", nombre: "Tres mundos fantásticos", descripcion: "Terminá tres libros de fantasía.", icono: "dragon", meta: { metrica: "fantasiaTerminados", objetivo: 3 }, recompensa: { xp: 120, esencias: 50 } },
  { id: "cinco-resenas", nombre: "Voz propia", descripcion: "Escribí cinco reseñas.", icono: "pluma", meta: { metrica: "resenas", objetivo: 5 }, recompensa: { xp: 100, esencias: 40 } },
  { id: "una-saga", nombre: "Hasta el final", descripcion: "Completá una saga (al menos dos tomos, todos terminados).", icono: "saga", meta: { metrica: "sagasCompletas", objetivo: 1 }, recompensa: { xp: 150, esencias: 60 } },
  { id: "diez-citas", nombre: "Frases para guardar", descripcion: "Registrá diez citas favoritas.", icono: "cita", meta: { metrica: "citas", objetivo: 10 }, recompensa: { xp: 80, esencias: 35 } },
  { id: "primera-habitacion", nombre: "Hacer un hogar", descripcion: "Personalizá la sala por primera vez.", icono: "sala", meta: { metrica: "salaPersonalizada", objetivo: 1 }, recompensa: { xp: 50, esencias: 20 } },
];

export const LOGROS: readonly Logro[] = [
  { id: "lectora-constante", nombre: "Lectora a su ritmo", descripcion: "Terminaste cinco libros, sin apuro.", icono: "libro", meta: { metrica: "librosTerminados", objetivo: 5 }, recompensa: { xp: 120, esencias: 40 } },
  { id: "biblioteca-viva", nombre: "Biblioteca viva", descripcion: "Terminaste diez libros.", icono: "estanteria", meta: { metrica: "librosTerminados", objetivo: 10 }, recompensa: { xp: 250, esencias: 80, items: ["objeto:globo"] } },
  { id: "memoria-escrita", nombre: "Memoria escrita", descripcion: "Registraste diez reflexiones.", icono: "pluma", meta: { metrica: "reflexiones", objetivo: 10 } },
  { id: "coleccionista-citas", nombre: "Coleccionista de citas", descripcion: "Guardaste veinticinco citas.", icono: "cita", meta: { metrica: "citas", objetivo: 25 }, recompensa: { xp: 100, esencias: 40 } },
  { id: "mil-paginas", nombre: "Mil páginas", descripcion: "Leíste mil páginas en libros terminados.", icono: "pergamino", meta: { metrica: "paginasLeidas", objetivo: 1000 } },
  { id: "diseno-propio", nombre: "Mano de artesana", descripcion: "Creaste una plantilla propia para tu journal.", icono: "plantilla", meta: { metrica: "plantillasPropias", objetivo: 1 } },
  { id: "sala-habitada", nombre: "Una sala habitada", descripcion: "Colocaste ocho objetos en la sala.", icono: "sala", meta: { metrica: "objetosEnSala", objetivo: 8 } },
];

// ---------------------------------------------------------------------------
// Tienda de la Torre: se paga con Esencias. Las claves son `tipo:id`.
// ---------------------------------------------------------------------------

export type TipoTienda = "objeto" | "estilo" | "fondo" | "borde" | "ornamento";

export interface ArticuloTienda {
  clave: string;
  tipo: TipoTienda;
  nombre: string;
  descripcion: string;
  precio: number;
  /** Piso de la Torre desde el cual se puede conseguir. */
  nivel: number;
}

export const TIENDA: readonly ArticuloTienda[] = [
  { clave: "objeto:globo", tipo: "objeto", nombre: "Globo terráqueo", descripcion: "Con pie de madera.", precio: 40, nivel: 1 },
  { clave: "objeto:reloj", tipo: "objeto", nombre: "Reloj de pared", descripcion: "Marca las horas de lectura.", precio: 30, nivel: 1 },
  { clave: "objeto:baul", tipo: "objeto", nombre: "Baúl", descripcion: "Madera y herrajes de hierro.", precio: 60, nivel: 2 },
  { clave: "objeto:lampara-pie", tipo: "objeto", nombre: "Lámpara de pie", descripcion: "Una luz cálida para leer.", precio: 45, nivel: 2 },
  { clave: "objeto:planta-alta", tipo: "objeto", nombre: "Planta alta", descripcion: "Hojas grandes sobre un tronco fino.", precio: 35, nivel: 2 },
  { clave: "objeto:mapa", tipo: "objeto", nombre: "Mapa antiguo", descripcion: "Pergamino con rutas dibujadas.", precio: 50, nivel: 2 },
  { clave: "objeto:candelabro-pared", tipo: "objeto", nombre: "Candelabro de pared", descripcion: "Una vela en un soporte de hierro.", precio: 55, nivel: 3 },
  { clave: "objeto:tapiz", tipo: "objeto", nombre: "Tapiz", descripcion: "Una tela colgante con la luna bordada.", precio: 70, nivel: 3 },
  { clave: "estilo:nocturno", tipo: "estilo", nombre: "Refugio fantástico nocturno", descripcion: "Estilo de sala: sombras profundas y luz de luna.", precio: 120, nivel: 2 },
  { clave: "estilo:acogedora", tipo: "estilo", nombre: "Biblioteca cálida y acogedora", descripcion: "Estilo de sala: maderas claras y luz de vela.", precio: 120, nivel: 2 },
  { clave: "fondo:grano", tipo: "fondo", nombre: "Papel con grano", descripcion: "Fondo de journal.", precio: 25, nivel: 1 },
  { clave: "fondo:cuadriculado", tipo: "fondo", nombre: "Cuadriculado", descripcion: "Fondo de journal.", precio: 25, nivel: 1 },
  { clave: "fondo:puntos", tipo: "fondo", nombre: "Punteado", descripcion: "Fondo de journal.", precio: 25, nivel: 1 },
  { clave: "borde:doble", tipo: "borde", nombre: "Borde de doble línea", descripcion: "Borde de página.", precio: 30, nivel: 2 },
  { clave: "borde:ornamental", tipo: "borde", nombre: "Borde ornamental", descripcion: "Borde de página.", precio: 60, nivel: 3 },
  { clave: "ornamento:flores", tipo: "ornamento", nombre: "Ornamento de flores", descripcion: "Separador de bloques.", precio: 20, nivel: 1 },
];

const POR_CLAVE = new Map(TIENDA.map((a) => [a.clave, a]));
export const obtenerArticulo = (clave: string): ArticuloTienda | undefined => POR_CLAVE.get(clave);

/** Claves que NO son libres: hay que tenerlas en el inventario para usarlas. */
export const CLAVES_BLOQUEADAS: ReadonlySet<string> = new Set(TIENDA.map((a) => a.clave));

/** ¿Se puede usar esta clave? Es libre si no está en la tienda; si no, debe estar en el inventario. */
export const puedeUsar = (clave: string, inventario: ReadonlySet<string>): boolean => !CLAVES_BLOQUEADAS.has(clave) || inventario.has(clave);

export const NOMBRE_TIPO_TIENDA: Record<TipoTienda, string> = {
  objeto: "Muebles y decoraciones", estilo: "Estilos de sala", fondo: "Fondos de journal", borde: "Bordes de página", ornamento: "Ornamentos",
};

// ---------------------------------------------------------------------------
// Evaluación: qué eventos nuevos corresponden (función pura, sin base de datos)
// ---------------------------------------------------------------------------

export interface EventoNuevo {
  clave: string;
  tipo: "mision" | "logro";
  titulo: string;
  xp: number;
  esencias: number;
  items: string[];
}

export const claveMision = (id: string) => `mision:${id}`;
export const claveLogro = (id: string) => `logro:${id}`;

/** Misiones y logros cuya meta ya se cumplió y todavía no figuran en el libro mayor. Nunca devuelve un evento ya otorgado. */
export function eventosPendientes(m: Metricas, otorgados: ReadonlySet<string>): EventoNuevo[] {
  const salida: EventoNuevo[] = [];
  for (const x of MISIONES) {
    const clave = claveMision(x.id);
    if (m[x.meta.metrica] >= x.meta.objetivo && !otorgados.has(clave)) {
      salida.push({ clave, tipo: "mision", titulo: `Misión cumplida: ${x.nombre}`, xp: x.recompensa.xp, esencias: x.recompensa.esencias, items: x.recompensa.items ?? [] });
    }
  }
  for (const x of LOGROS) {
    const clave = claveLogro(x.id);
    if (m[x.meta.metrica] >= x.meta.objetivo && !otorgados.has(clave)) {
      salida.push({ clave, tipo: "logro", titulo: `Logro: ${x.nombre}`, xp: x.recompensa?.xp ?? 0, esencias: x.recompensa?.esencias ?? 0, items: x.recompensa?.items ?? [] });
    }
  }
  return salida;
}
