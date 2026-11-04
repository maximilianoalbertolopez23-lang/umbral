import { z } from "zod";
import type { Plantilla } from "@/modules/escritorio/paginas";

/**
 * Personalización del journal. Una plantilla propia es una plantilla base más estos ajustes visuales. Es solo
 * PRESENTACIÓN: no toca nunca el contenido de las páginas, y borrar o cambiar una plantilla nunca elimina notas.
 * Los colores se eligen de listas curadas (paleta oficial y tonos derivados) y se verifica el contraste para que el
 * texto siempre sea legible.
 */

export const FUENTES = {
  garamond: { nombre: "EB Garamond", muestra: "var(--font-eb-garamond), 'EB Garamond', Georgia, serif" },
  lora: { nombre: "Lora (lectura)", muestra: "var(--font-lora), Georgia, serif" },
  inter: { nombre: "Inter (sin serif)", muestra: "var(--font-inter), system-ui, sans-serif" },
  caveat: { nombre: "Caveat (manuscrita)", muestra: "var(--font-caveat), 'Segoe Script', cursive" },
} as const;
export type Fuente = keyof typeof FUENTES;

export const TAMANOS = { chico: { nombre: "Chico", rem: 1.05 }, normal: { nombre: "Normal", rem: 1.2 }, grande: { nombre: "Grande", rem: 1.4 } } as const;
export type Tamano = keyof typeof TAMANOS;

export const INTERLINEADOS = { compacto: { nombre: "Compacto", valor: 1.45 }, normal: { nombre: "Normal", valor: 1.7 }, amplio: { nombre: "Amplio", valor: 2 } } as const;
export type Interlineado = keyof typeof INTERLINEADOS;

export const PAPELES = {
  marfil: { nombre: "Marfil", hex: "#fcf8f2" },
  crema: { nombre: "Crema", hex: "#f6e7d2" },
  durazno: { nombre: "Durazno", hex: "#f2c7a2" },
  "malva-claro": { nombre: "Malva claro", hex: "#e8cfd0" },
  morado: { nombre: "Morado", hex: "#512d47" },
  ciruela: { nombre: "Ciruela", hex: "#2e182f" },
} as const;
export type Papel = keyof typeof PAPELES;

export const TINTAS = {
  ciruela: { nombre: "Ciruela", hex: "#2e182f" },
  morado: { nombre: "Morado", hex: "#512d47" },
  marfil: { nombre: "Marfil", hex: "#fcf8f2" },
  durazno: { nombre: "Durazno", hex: "#f2c7a2" },
  vino: { nombre: "Vino", hex: "#4a1f33" },
} as const;
export type Tinta = keyof typeof TINTAS;

export const ACENTOS = {
  morado: { nombre: "Morado", hex: "#512d47" },
  malva: { nombre: "Malva", hex: "#8a5a62" },
  durazno: { nombre: "Durazno", hex: "#f2c7a2" },
  marfil: { nombre: "Marfil", hex: "#fcf8f2" },
  vino: { nombre: "Vino", hex: "#7a3b4c" },
} as const;
export type Acento = keyof typeof ACENTOS;

export const FONDOS = { base: "Los de la plantilla", liso: "Liso", grano: "Papel con grano", rayado: "Rayado", cuadriculado: "Cuadriculado", puntos: "Punteado" } as const;
export type Fondo = keyof typeof FONDOS;

export const BORDES = { base: "Los de la plantilla", ninguno: "Sin borde", fino: "Línea fina", doble: "Doble línea", ornamental: "Ornamental" } as const;
export type Borde = keyof typeof BORDES;

export const ORNAMENTOS = { estrellas: { nombre: "Estrellas", texto: "✦  ✦  ✦" }, flores: { nombre: "Flores", texto: "❦  ❦  ❦" }, lineas: { nombre: "Líneas", texto: "───  ◆  ───" }, puntos: { nombre: "Puntos", texto: "•  •  •" } } as const;
export type Ornamento = keyof typeof ORNAMENTOS;

export const ANCHOS = { angosto: { nombre: "Angosto", max: "36rem" }, normal: { nombre: "Normal", max: "none" }, amplio: { nombre: "Amplio", max: "none" } } as const;
export type Ancho = keyof typeof ANCHOS;

export const ESPACIADOS = { ajustado: { nombre: "Ajustado", em: 0.35 }, normal: { nombre: "Normal", em: 0.8 }, holgado: { nombre: "Holgado", em: 1.3 } } as const;
export type Espaciado = keyof typeof ESPACIADOS;

const claves = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** `base` en un ajuste significa «dejar el de la plantilla base». */
export const esquemaAjustes = z.object({
  fuente: z.enum(claves(FUENTES)).default("garamond"),
  tamano: z.enum(claves(TAMANOS)).default("normal"),
  interlineado: z.enum(claves(INTERLINEADOS)).default("normal"),
  papel: z.union([z.literal("base"), z.enum(claves(PAPELES))]).default("base"),
  tinta: z.union([z.literal("base"), z.enum(claves(TINTAS))]).default("base"),
  acento: z.union([z.literal("base"), z.enum(claves(ACENTOS))]).default("base"),
  fondo: z.enum(claves(FONDOS)).default("base"),
  borde: z.enum(claves(BORDES)).default("base"),
  ornamento: z.enum(claves(ORNAMENTOS)).default("estrellas"),
  ancho: z.enum(claves(ANCHOS)).default("normal"),
  espaciado: z.enum(claves(ESPACIADOS)).default("normal"),
  columnas: z.union([z.literal(1), z.literal(2)]).default(1),
  titulos: z.enum(["izquierda", "centro"]).default("izquierda"),
});
export type AjustesJournal = z.infer<typeof esquemaAjustes>;

/** Ajustes que dejan la hoja idéntica a su plantilla base. */
export const AJUSTES_BASE: AjustesJournal = esquemaAjustes.parse({});

export const esquemaNombrePlantilla = z.string().trim().min(1, "Poné un nombre a la plantilla.").max(60, "El nombre puede tener hasta 60 caracteres.");

export const MAX_PLANTILLAS = 20;

/** Colores efectivos de las plantillas base (aproximan el CSS de src/app/hojas.css). */
const COLORES_BASE: Record<Plantilla, { papel: string; tinta: string; acento: string }> = {
  pergamino: { papel: "#faeee2", tinta: "#2e182f", acento: "#512d47" },
  archivo: { papel: "#2e182f", tinta: "#fcf8f2", acento: "#f2c7a2" },
  editorial: { papel: "#fcf8f2", tinta: "#2e182f", acento: "#512d47" },
};

export function coloresEfectivos(base: Plantilla, a: AjustesJournal) {
  const b = COLORES_BASE[base];
  return {
    papel: a.papel === "base" ? b.papel : PAPELES[a.papel].hex,
    tinta: a.tinta === "base" ? b.tinta : TINTAS[a.tinta].hex,
    // Con acento «base» y papel o tinta cambiados, el acento acompaña a la tinta para no perder contraste.
    acento: a.acento !== "base" ? ACENTOS[a.acento].hex : a.papel !== "base" || a.tinta !== "base" ? (a.tinta === "base" ? b.tinta : TINTAS[a.tinta].hex) : b.acento,
  };
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Relación de contraste WCAG entre dos colores #rrggbb (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export const CONTRASTE_MINIMO = 4.5;

export type ResultadoAjustes = { ok: true; ajustes: AjustesJournal } | { ok: false; error: string };

/** Valida los ajustes y exige que el texto se pueda leer: contraste papel/tinta y papel/acento (títulos) suficientes. */
export function validarAjustes(base: Plantilla, crudo: unknown): ResultadoAjustes {
  const r = esquemaAjustes.safeParse(crudo);
  if (!r.success) return { ok: false, error: `Ajustes no válidos (${r.error.issues[0]?.path.join(".") || "formato"}).` };
  const c = coloresEfectivos(base, r.data);
  if (contraste(c.papel, c.tinta) < CONTRASTE_MINIMO) return { ok: false, error: "El color del texto casi no se distingue del papel. Elegí una combinación con más contraste." };
  if (contraste(c.papel, c.acento) < 3) return { ok: false, error: "El color de acento casi no se distingue del papel. Elegí otro." };
  return { ok: true, ajustes: r.data };
}

const FONDOS_CSS: Record<Exclude<Fondo, "base">, (linea: string) => string> = {
  liso: () => "none",
  grano:
    () =>
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .18 0 0 0 0 .09 0 0 0 0 .18 0 0 0 .08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  rayado: (l) => `repeating-linear-gradient(to bottom, transparent 0, transparent 1.9rem, ${l} 1.9rem, ${l} calc(1.9rem + 1px))`,
  cuadriculado: (l) => `linear-gradient(${l} 1px, transparent 1px), linear-gradient(90deg, ${l} 1px, transparent 1px)`,
  puntos: (l) => `radial-gradient(${l} 1.2px, transparent 1.4px)`,
};

export interface PropsHoja {
  /** Plantilla base (atributo data-plantilla). */
  plantilla: Plantilla;
  /** Atributos data-* que activa la personalización. */
  datos: Record<string, string>;
  /** Estilos en línea (variables CSS y colores): solo los que la persona cambió. */
  estilo: Record<string, string>;
}

/** Convierte una plantilla propia en propiedades de la hoja. Con los ajustes base no cambia nada de la plantilla. */
export function propsHoja(base: Plantilla, ajustes: AjustesJournal | null): PropsHoja {
  if (!ajustes) return { plantilla: base, datos: {}, estilo: {} };
  const c = coloresEfectivos(base, ajustes);
  const linea = `color-mix(in srgb, ${c.tinta} 22%, transparent)`;
  const estilo: Record<string, string> = {
    "--fuente-cuerpo": FUENTES[ajustes.fuente].muestra,
    "--tam-cuerpo": `${TAMANOS[ajustes.tamano].rem}rem`,
    "--interlineado": String(INTERLINEADOS[ajustes.interlineado].valor),
    "--espacio-bloque": `${ESPACIADOS[ajustes.espaciado].em}em`,
    "--orn-sep": `"${ORNAMENTOS[ajustes.ornamento].texto}"`,
  };
  const datos: Record<string, string> = { "data-columnas": String(ajustes.columnas), "data-titulos": ajustes.titulos, "data-borde": ajustes.borde };

  if (ajustes.papel !== "base") estilo.backgroundColor = c.papel;
  if (ajustes.tinta !== "base") {
    estilo["--tinta"] = c.tinta;
    estilo["--tinta-suave"] = `color-mix(in srgb, ${c.tinta} 72%, ${c.papel})`;
    estilo["--linea"] = linea;
  }
  if (ajustes.papel !== "base" || ajustes.tinta !== "base") estilo.color = c.tinta;
  if (ajustes.acento !== "base" || ajustes.papel !== "base" || ajustes.tinta !== "base") estilo["--acento"] = c.acento;
  if (ajustes.papel !== "base" || ajustes.tinta !== "base") estilo["--fondo-campo"] = `color-mix(in srgb, ${c.tinta} 8%, transparent)`;
  if (ajustes.fondo !== "base") {
    estilo.backgroundImage = FONDOS_CSS[ajustes.fondo](linea);
    if (ajustes.fondo === "cuadriculado") estilo.backgroundSize = "1.7rem 1.7rem";
    if (ajustes.fondo === "puntos") estilo.backgroundSize = "1.4rem 1.4rem";
  }
  if (ajustes.borde === "ninguno") estilo.boxShadow = "0 18px 36px -18px rgba(0,0,0,0.55)";
  else if (ajustes.borde === "fino") estilo.boxShadow = `inset 0 0 0 2px ${c.acento}, 0 18px 36px -18px rgba(0,0,0,0.55)`;
  else if (ajustes.borde === "doble" || ajustes.borde === "ornamental") {
    estilo.boxShadow = `inset 0 0 0 6px ${c.papel}, inset 0 0 0 7px ${c.acento}, inset 0 0 0 10px ${c.papel}, inset 0 0 0 11px color-mix(in srgb, ${c.acento} 45%, transparent), 0 18px 36px -18px rgba(0,0,0,0.6)`;
  }
  if (ajustes.ancho === "angosto") {
    estilo.maxWidth = ANCHOS.angosto.max;
    estilo.marginInline = "auto";
  }
  return { plantilla: base, datos, estilo };
}

/** Bloques de muestra para la vista previa de una plantilla (contenido ficticio y claramente identificado). */
export const FRAGMENTOS_MUESTRA = [
  "Título de muestra",
  "Así se ve un párrafo de tu journal con esta plantilla: la tipografía, el color del papel y el espacio entre bloques.",
  "Una cita de muestra, para ver su estilo.",
  "Primer elemento de una lista",
  "Segundo elemento de una lista",
] as const;
