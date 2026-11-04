import { z } from "zod";
import { APARIENCIA_IDS, type AparienciaId } from "@/modules/onboarding/apariencias";
import type { SceneId } from "@/config/sceneRegistry";
import { OBJETOS } from "@/modules/sala/objetos";
import { CATALOGO, estaDesbloqueado, obtenerItem, type ItemCatalogo } from "./catalogo";

/**
 * Diseño de la Gran Sala: materiales, luz y objetos colocados. Es solo PRESENTACIÓN (no contiene libros ni notas) y
 * se guarda como JSON validado. Los tres estilos son temas: cambian materiales, luz y filtro de decoración, sin cambiar
 * la estructura de datos ni los objetos ya colocados.
 *
 * Posicionamiento 2.5D: la sala es una ilustración de 1600 × 900. Los objetos de piso se colocan por (x, y) sobre la
 * franja del suelo y se ven más chicos cuanto más lejos (menor y); los de pared se cuelgan en espacios libres. No hay
 * eje de profundidad libre ni rotación 3D: «girar» es espejar.
 */

export const LIMITE_OBJETOS = 80;
export const ESCALA_MIN = 0.4;
export const ESCALA_MAX = 2.5;
export const CAPA_MAX = 5;

/** Habitaciones personalizables. Cada objeto pertenece a una; las que no traen `sala` (diseños anteriores) son de la Gran Sala. */
export const SALAS = ["gran-sala", "archivo", "escritorio", "taller"] as const;
export type Sala = (typeof SALAS)[number];

export const ESTILOS_SALA = ["clasica", "nocturno", "acogedora"] as const;
export type EstiloSala = (typeof ESTILOS_SALA)[number];

export const PARED_COLORES = {
  ciruela: { nombre: "Ciruela", hex: "#3b2742" },
  morado: { nombre: "Morado", hex: "#54314d" },
  malva: { nombre: "Malva", hex: "#7a5463" },
  durazno: { nombre: "Durazno", hex: "#a98169" },
  marfil: { nombre: "Marfil", hex: "#b9a99a" },
  noche: { nombre: "Noche", hex: "#241328" },
} as const;
export type ParedColor = keyof typeof PARED_COLORES;

export const PARED_TEXTURAS = { piedra: "Piedra", ladrillo: "Ladrillo", empapelado: "Empapelado", liso: "Revoque liso" } as const;
export type ParedTextura = keyof typeof PARED_TEXTURAS;

export const PISOS = { madera: "Madera oscura", "madera-clara": "Madera clara", piedra: "Piedra", damero: "Damero" } as const;
export type Piso = keyof typeof PISOS;

export const MADERAS = {
  nogal: { nombre: "Nogal", osc: "#2c1830", med: "#5a3350", clara: "#7a4666" },
  roble: { nombre: "Roble", osc: "#4a3430", med: "#8a6a5a", clara: "#b08a70" },
  ebano: { nombre: "Ébano", osc: "#140a16", med: "#2a1a2e", clara: "#4a3552" },
} as const;
export type Madera = keyof typeof MADERAS;

export const BRILLOS = { tenue: "Tenue", normal: "Normal", brillante: "Brillante" } as const;
export type Brillo = keyof typeof BRILLOS;

export interface Materiales {
  luz: AparienciaId;
  paredColor: ParedColor;
  paredTextura: ParedTextura;
  piso: Piso;
  madera: Madera;
  brillo: Brillo;
}

export interface InfoEstilo extends Materiales {
  nombre: string;
  descripcion: string;
  /** Filtro CSS sutil sobre la decoración, para que los objetos «combinen» con el estilo sin tocar los datos. */
  filtroDecoracion: string;
}

export const ESTILOS: Record<EstiloSala, InfoEstilo> = {
  clasica: {
    nombre: "Biblioteca medieval clásica", descripcion: "Piedra, nogal y luz de luna: la sala original.",
    luz: "noche", paredColor: "ciruela", paredTextura: "piedra", piso: "madera", madera: "nogal", brillo: "normal",
    filtroDecoracion: "none",
  },
  nocturno: {
    nombre: "Refugio fantástico nocturno", descripcion: "Muros oscuros, piso de losa y velas tenues.",
    luz: "noche", paredColor: "noche", paredTextura: "liso", piso: "piedra", madera: "ebano", brillo: "tenue",
    filtroDecoracion: "saturate(0.8) brightness(0.92)",
  },
  acogedora: {
    nombre: "Biblioteca cálida y acogedora", descripcion: "Papel pintado, roble claro y luz de amanecer.",
    luz: "alba", paredColor: "durazno", paredTextura: "empapelado", piso: "madera-clara", madera: "roble", brillo: "brillante",
    filtroDecoracion: "sepia(0.18) saturate(1.1)",
  },
};

const clavesDe = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const esquemaObjeto = z.object({
  id: z.string().uuid(),
  tipo: z.string().refine((t) => obtenerItem(t) !== undefined, "Objeto desconocido"),
  x: z.number().finite().min(0).max(1600),
  y: z.number().finite().min(0).max(900),
  sala: z.enum(SALAS).default("gran-sala"),
  giro: z.boolean().default(false),
  /** Tamaño relativo (1 = el del catálogo). */
  escala: z.number().finite().min(ESCALA_MIN).max(ESCALA_MAX).default(1),
  /** Oculto: se conserva en el diseño pero no se dibuja en la habitación. */
  oculto: z.boolean().default(false),
  /** Orden de capas: suma o resta profundidad al orden natural por distancia. */
  capa: z.number().int().min(-CAPA_MAX).max(CAPA_MAX).default(0),
  variante: z.number().int().min(0).max(7).default(0),
});

export const esquemaDiseno = z.object({
  estilo: z.enum(ESTILOS_SALA).default("clasica"),
  luz: z.enum(APARIENCIA_IDS).optional(),
  paredColor: z.enum(clavesDe(PARED_COLORES)).optional(),
  paredTextura: z.enum(clavesDe(PARED_TEXTURAS)).optional(),
  piso: z.enum(clavesDe(PISOS)).optional(),
  madera: z.enum(clavesDe(MADERAS)).optional(),
  brillo: z.enum(clavesDe(BRILLOS)).optional(),
  objetos: z.array(esquemaObjeto).max(LIMITE_OBJETOS).default([]),
});

export type ObjetoColocado = z.infer<typeof esquemaObjeto>;
export type DisenoSala = z.infer<typeof esquemaDiseno>;


/** Un objeto de la decoración de partida (ids fijos para que el diseño inicial sea estable). */
const inicial = (n: number, tipo: string, x: number, y: number, extra: Partial<ObjetoColocado> = {}): ObjetoColocado => ({
  id: `0000d0c0-0000-4000-8000-${String(n).padStart(12, "0")}`, tipo, x, y, sala: "gran-sala", giro: false, escala: 1, oculto: false, capa: 0, variante: 0, ...extra,
});

/**
 * Decoración con la que empieza la Gran Sala (la ilustración es una biblioteca vacía). Son objetos normales: se pueden
 * mover, escalar, ocultar o quitar. Cada objeto cumple las reglas de colocación (hay una prueba que lo verifica).
 */
export const DECORACION_INICIAL: readonly ObjetoColocado[] = [
  inicial(1, "kit_B_016", 790, 772, { escala: 1.3 }),
  inicial(2, "kit_A_001", 640, 792, { escala: 0.95 }),
  inicial(3, "kit_B_014", 1010, 805, { escala: 0.95 }),
  inicial(4, "kit_A_036", 262, 782, { escala: 1.15 }),
  inicial(5, "kit_A_037", 150, 822),
  inicial(6, "kit_A_029", 1330, 790, { escala: 1.2 }),
  inicial(7, "kit_A_030", 1450, 812),
  inicial(8, "kit_A_032", 1225, 800),
  inicial(9, "kit_A_080", 1495, 862),
  inicial(10, "kit_A_042", 540, 850),
  inicial(11, "kit_A_039", 1115, 770, { escala: 1.1 }),
  inicial(12, "kit_A_040", 470, 806),
  inicial(13, "kit_A_065", 1150, 858),
  inicial(14, "kit_B_035", 1060, 330),
];

/** Diseño de quien todavía no personalizó: estilo clásico y la decoración de partida, con la luz que eligió en la bienvenida. */
export function disenoInicial(luz?: AparienciaId): DisenoSala {
  return { estilo: "clasica", ...(luz ? { luz } : {}), objetos: DECORACION_INICIAL.map((o) => ({ ...o })) };
}

/** Materiales efectivos: lo que la persona ajustó a mano, o si no, lo que define el estilo. */
export function resolverMateriales(d: DisenoSala): Materiales & { estilo: EstiloSala; filtroDecoracion: string } {
  const e = ESTILOS[d.estilo];
  return {
    estilo: d.estilo,
    filtroDecoracion: e.filtroDecoracion,
    luz: d.luz ?? e.luz,
    paredColor: d.paredColor ?? e.paredColor,
    paredTextura: d.paredTextura ?? e.paredTextura,
    piso: d.piso ?? e.piso,
    madera: d.madera ?? e.madera,
    brillo: d.brillo ?? e.brillo,
  };
}

export function validarDiseno(crudo: unknown): { ok: true; diseno: DisenoSala } | { ok: false; error: string } {
  const r = esquemaDiseno.safeParse(crudo);
  if (!r.success) return { ok: false, error: `Diseño no válido (${r.error.issues[0]?.path.join(".") || "formato"}).` };
  const errores = validarColocacion(r.data.objetos);
  if (errores.length) return { ok: false, error: errores[0].mensaje };
  return { ok: true, diseno: r.data };
}

// ---------------------------------------------------------------------------
// Geometría 2.5D y reglas de colocación
// ---------------------------------------------------------------------------

export interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SUELO = { xMin: 70, xMax: 1530, yMin: 690, yMax: 890 } as const;
export const PARED = { xMin: 60, xMax: 1540, yMin: 100, yMax: 620 } as const;

interface ZonaSala {
  nombre: string;
  escena: SceneId;
  suelo: { xMin: number; xMax: number; yMin: number; yMax: number };
  pared: { xMin: number; xMax: number; yMin: number; yMax: number };
}

/** Dónde se puede apoyar o colgar algo en cada ilustración (1600 × 900). Solo la Gran Sala tiene objetos interactivos que reservan lugar. */
export const ZONAS_SALA: Record<Sala, ZonaSala> = {
  "gran-sala": { nombre: "La Gran Sala", escena: "05_gran_sala", suelo: SUELO, pared: PARED },
  archivo: { nombre: "El Archivo", escena: "06_archivo", suelo: { xMin: 70, xMax: 1530, yMin: 760, yMax: 890 }, pared: PARED },
  escritorio: { nombre: "El Escritorio", escena: "07_escritorio_journal", suelo: { xMin: 70, xMax: 1530, yMin: 720, yMax: 890 }, pared: PARED },
  taller: { nombre: "El Taller", escena: "08_taller", suelo: { xMin: 70, xMax: 1530, yMin: 740, yMax: 890 }, pared: PARED },
};

const acotar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Escala por perspectiva: 0,8 al fondo del piso, 1,2 al frente. */
export function escalaProfundidad(y: number, sala: Sala = "gran-sala"): number {
  const { yMin, yMax } = ZONAS_SALA[sala].suelo;
  const t = acotar((y - yMin) / (yMax - yMin), 0, 1);
  return 0.8 + 0.4 * t;
}

/** Caja que ocupa el objeto en la escena (el objeto de piso se apoya en (x, y) por abajo y al centro). */
export function cajaDe(o: Pick<ObjetoColocado, "x" | "y"> & { sala?: Sala; escala?: number }, item: ItemCatalogo): Caja {
  const s = (item.zona === "suelo" ? escalaProfundidad(o.y, o.sala) : 1) * (o.escala ?? 1);
  const w = item.ancho * s;
  const h = item.alto * s;
  return item.zona === "suelo" ? { x: o.x - w / 2, y: o.y - h, w, h } : { x: o.x - w / 2, y: o.y - h / 2, w, h };
}

/** Huella en el piso: dos objetos a distinta profundidad pueden estar uno delante del otro sin chocar. */
function huella(o: Pick<ObjetoColocado, "x" | "y"> & { sala?: Sala; escala?: number }, item: ItemCatalogo): Caja {
  const w = item.ancho * escalaProfundidad(o.y, o.sala) * (o.escala ?? 1) * 0.9;
  return { x: o.x - w / 2, y: o.y - 12, w, h: 12 };
}

const choca = (a: Caja, b: Caja) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Partes de la pared que ya están ocupadas por la ilustración o por los objetos interactivos de la sala. */
const MARGEN = 4;
const rect = (x: number, y: number, w: number, h: number, nombre: string): Caja & { nombre: string } => ({ x: x - MARGEN, y: y - MARGEN, w: w + 2 * MARGEN, h: h + 2 * MARGEN, nombre });
export const RESERVADOS_PARED = [
  ...OBJETOS.map((o) => rect(o.x, o.y, o.ancho, o.alto, nombreReservado(o.id))),
];

function nombreReservado(id: string): string {
  const nombres: Record<string, string> = {
    estanteria: "las estanterías", candelabro: "la chimenea", ventanal: "el ventanal", torre: "el gran ventanal", puerta: "la puerta lateral",
    escudo: "el estandarte", escritorio: "el escritorio", taller: "los arcos del taller",
  };
  return nombres[id] ?? "un objeto de la sala";
}

/** Por qué un objeto no puede estar donde está (o null si la posición es válida). Considera solo a los `otros`. */
export function validarObjeto(o: ObjetoColocado, otros: ObjetoColocado[]): string | null {
  const item = obtenerItem(o.tipo);
  if (!item) return "Ese objeto no existe en el catálogo.";
  if (!estaDesbloqueado(item)) return "Ese objeto todavía no está disponible.";
  if (o.variante >= item.variantes.length) return "Esa variante no existe.";
  const zonas = ZONAS_SALA[o.sala];
  otros = otros.filter((x) => x.sala === o.sala);

  if (item.zona === "suelo") {
    const SUELO = zonas.suelo;
    if (o.x < SUELO.xMin || o.x > SUELO.xMax || o.y < SUELO.yMin || o.y > SUELO.yMax) return "El piso no llega hasta ahí: ubicá el objeto sobre el suelo.";
    if (!item.plano) {
      const mia = huella(o, item);
      for (const otro of otros) {
        const it = obtenerItem(otro.tipo);
        if (it && it.zona === "suelo" && !it.plano && choca(mia, huella(otro, it))) return `Ya hay ${it.nombre.toLowerCase()} en ese lugar del piso.`;
      }
    }
    return null;
  }

  const caja = cajaDe(o, item);
  const PARED = zonas.pared;
  if (caja.x < PARED.xMin || caja.x + caja.w > PARED.xMax || caja.y < PARED.yMin || caja.y + caja.h > PARED.yMax) {
    return "Ahí no hay pared: colgalo dentro del muro.";
  }
  for (const r of o.sala === "gran-sala" ? RESERVADOS_PARED : []) if (choca(caja, r)) return `Ese lugar está ocupado por ${r.nombre}.`;
  for (const otro of otros) {
    const it = obtenerItem(otro.tipo);
    if (it && it.zona === "pared" && choca(caja, cajaDe(otro, it))) return `Ya hay ${it.nombre.toLowerCase()} colgado ahí.`;
  }
  return null;
}

export interface ErrorColocacion {
  id: string;
  mensaje: string;
}

/** Valida todo el diseño: cantidad total, máximos por tipo y la posición de cada objeto respecto de los demás. */
export function validarColocacion(objetos: ObjetoColocado[]): ErrorColocacion[] {
  const errores: ErrorColocacion[] = [];
  if (objetos.length > LIMITE_OBJETOS) errores.push({ id: "", mensaje: `Una sala admite hasta ${LIMITE_OBJETOS} objetos.` });
  const cuenta = new Map<string, number>();
  for (const [i, o] of objetos.entries()) {
    const item = obtenerItem(o.tipo);
    if (item) {
      const n = (cuenta.get(o.tipo) ?? 0) + 1;
      cuenta.set(o.tipo, n);
      if (n > item.maximo) errores.push({ id: o.id, mensaje: `Llegaste al máximo de ${item.maximo} ${item.nombre.toLowerCase()}.` });
    }
    const otros = objetos.filter((_, j) => j !== i);
    const motivo = validarObjeto(o, otros);
    if (motivo) errores.push({ id: o.id, mensaje: motivo });
  }
  return errores;
}

/** Primera posición libre para un objeto nuevo (centro hacia afuera), o null si no queda lugar. */
export function ubicacionLibre(tipo: string, objetos: ObjetoColocado[], sala: Sala = "gran-sala"): { x: number; y: number } | null {
  const item = obtenerItem(tipo);
  if (!item) return null;
  const candidatas: { x: number; y: number }[] = [];
  if (item.zona === "suelo") {
    const { yMin } = ZONAS_SALA[sala].suelo;
    for (const y of [800, 770, 840, 880, 745].filter((v) => v >= yMin)) for (let dx = 0; dx <= 700; dx += 70) for (const signo of dx === 0 ? [1] : [1, -1]) candidatas.push({ x: 800 + dx * signo, y });
  } else {
    for (let y = ZONAS_SALA[sala].pared.yMin + 10; y <= ZONAS_SALA[sala].pared.yMax; y += 10) for (let x = 100; x <= 1500; x += 5) candidatas.push({ x, y });
  }
  const base = { id: "00000000-0000-4000-8000-000000000000", tipo, sala, giro: false, escala: 1, oculto: false, capa: 0, variante: 0 };
  return candidatas.find((c) => validarObjeto({ ...base, ...c }, objetos) === null) ?? null;
}

// ---------------------------------------------------------------------------
// Operaciones de edición (puras: devuelven un diseño nuevo o el motivo del rechazo)
// ---------------------------------------------------------------------------

export type ResultadoEdicion = { ok: true; diseno: DisenoSala } | { ok: false; error: string };

const redondear = (n: number) => Math.round(n * 10) / 10;

export function agregarObjeto(d: DisenoSala, tipo: string, id: string, pos?: { x: number; y: number }, sala: Sala = "gran-sala"): ResultadoEdicion {
  const item = obtenerItem(tipo);
  if (!item) return { ok: false, error: "Ese objeto no existe en el catálogo." };
  if (d.objetos.length >= LIMITE_OBJETOS) return { ok: false, error: `Una sala admite hasta ${LIMITE_OBJETOS} objetos.` };
  if (d.objetos.filter((o) => o.tipo === tipo).length >= item.maximo) return { ok: false, error: `Llegaste al máximo de ${item.maximo} ${item.nombre.toLowerCase()}.` };
  const lugar = pos ?? ubicacionLibre(tipo, d.objetos, sala);
  if (!lugar) return { ok: false, error: `No queda lugar libre para ${item.nombre.toLowerCase()} en la ${item.zona === "suelo" ? "sala" : "pared"}.` };
  const nuevo: ObjetoColocado = { id, tipo, x: redondear(lugar.x), y: redondear(lugar.y), sala, giro: false, escala: 1, oculto: false, capa: 0, variante: 0 };
  const motivo = validarObjeto(nuevo, d.objetos);
  if (motivo) return { ok: false, error: motivo };
  return { ok: true, diseno: { ...d, objetos: [...d.objetos, nuevo] } };
}

export function moverObjeto(d: DisenoSala, id: string, x: number, y: number): ResultadoEdicion {
  const actual = d.objetos.find((o) => o.id === id);
  if (!actual) return { ok: false, error: "Ese objeto ya no está en la sala." };
  const movido = { ...actual, x: redondear(x), y: redondear(y) };
  const motivo = validarObjeto(movido, d.objetos.filter((o) => o.id !== id));
  if (motivo) return { ok: false, error: motivo };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((o) => (o.id === id ? movido : o)) } };
}

export function girarObjeto(d: DisenoSala, id: string): ResultadoEdicion {
  const o = d.objetos.find((x) => x.id === id);
  const item = o && obtenerItem(o.tipo);
  if (!o || !item) return { ok: false, error: "Ese objeto ya no está en la sala." };
  if (!item.rotable) return { ok: false, error: `${item.nombre} no se puede girar.` };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((x) => (x.id === id ? { ...x, giro: !x.giro } : x)) } };
}

export function cambiarVariante(d: DisenoSala, id: string, variante: number): ResultadoEdicion {
  const o = d.objetos.find((x) => x.id === id);
  const item = o && obtenerItem(o.tipo);
  if (!o || !item) return { ok: false, error: "Ese objeto ya no está en la sala." };
  if (!Number.isInteger(variante) || variante < 0 || variante >= item.variantes.length) return { ok: false, error: "Esa variante no existe." };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((x) => (x.id === id ? { ...x, variante } : x)) } };
}

export function escalarObjeto(d: DisenoSala, id: string, escala: number): ResultadoEdicion {
  const actual = d.objetos.find((o) => o.id === id);
  if (!actual) return { ok: false, error: "Ese objeto ya no está en la sala." };
  if (!Number.isFinite(escala)) return { ok: false, error: "Tamaño no válido." };
  const nuevo = { ...actual, escala: Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala)) * 100) / 100 };
  const motivo = validarObjeto(nuevo, d.objetos.filter((o) => o.id !== id));
  if (motivo) return { ok: false, error: motivo };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((o) => (o.id === id ? nuevo : o)) } };
}

export function alternarOculto(d: DisenoSala, id: string): ResultadoEdicion {
  if (!d.objetos.some((o) => o.id === id)) return { ok: false, error: "Ese objeto ya no está en la sala." };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((o) => (o.id === id ? { ...o, oculto: !o.oculto } : o)) } };
}

/** Sube (+1) o baja (−1) un objeto en el orden de capas. */
export function moverCapa(d: DisenoSala, id: string, paso: 1 | -1): ResultadoEdicion {
  const o = d.objetos.find((x) => x.id === id);
  if (!o) return { ok: false, error: "Ese objeto ya no está en la sala." };
  const capa = o.capa + paso;
  if (capa > CAPA_MAX || capa < -CAPA_MAX) return { ok: false, error: paso > 0 ? "Ya está al frente de todo." : "Ya está al fondo de todo." };
  return { ok: true, diseno: { ...d, objetos: d.objetos.map((x) => (x.id === id ? { ...x, capa } : x)) } };
}

export function eliminarObjeto(d: DisenoSala, id: string): DisenoSala {
  return { ...d, objetos: d.objetos.filter((o) => o.id !== id) };
}

/** Aplica un estilo: borra los ajustes manuales de materiales y luz (los objetos colocados se conservan). */
export function aplicarEstilo(d: DisenoSala, estilo: EstiloSala): DisenoSala {
  return { estilo, objetos: d.objetos };
}

export function tieneAjustesManuales(d: DisenoSala): boolean {
  return Boolean(d.luz || d.paredColor || d.paredTextura || d.piso || d.madera || d.brillo);
}

/** Restablecer: vuelve a la sala original (estilo clásico, sin ajustes y con la decoración de partida). */
export function disenoRestablecido(): DisenoSala {
  return { estilo: "clasica", objetos: DECORACION_INICIAL.map((o) => ({ ...o })) };
}

// ---------------------------------------------------------------------------
// Historial (deshacer / rehacer), inmutable para usarse con useState
// ---------------------------------------------------------------------------

export interface Historial<T> {
  pasado: T[];
  actual: T;
  futuro: T[];
}

const LIMITE_HISTORIAL = 60;

export const nuevoHistorial = <T,>(actual: T): Historial<T> => ({ pasado: [], actual, futuro: [] });

export function registrar<T>(h: Historial<T>, nuevo: T): Historial<T> {
  if (Object.is(nuevo, h.actual)) return h;
  return { pasado: [...h.pasado, h.actual].slice(-LIMITE_HISTORIAL), actual: nuevo, futuro: [] };
}

export function deshacer<T>(h: Historial<T>): Historial<T> {
  if (h.pasado.length === 0) return h;
  return { pasado: h.pasado.slice(0, -1), actual: h.pasado[h.pasado.length - 1], futuro: [h.actual, ...h.futuro] };
}

export function rehacer<T>(h: Historial<T>): Historial<T> {
  if (h.futuro.length === 0) return h;
  return { pasado: [...h.pasado, h.actual], actual: h.futuro[0], futuro: h.futuro.slice(1) };
}

export const CATALOGO_IDS = CATALOGO.map((i) => i.id);
