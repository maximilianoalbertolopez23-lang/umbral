/**
 * Frases para las pantallas de carga. Las propias salen de las citas que la persona guardó en su journal; las generales
 * son frases cortas sobre leer, escritas para UMBRAL (no son citas de ningún autor).
 */

export interface Frase {
  texto: string;
  autor?: string;
  /** Viene del journal de la persona. */
  propia?: boolean;
}

export const CLAVE_FRASES = "umbral-frases-v1";
const MAX_CARACTERES = 240;

export const FRASES_GENERALES: readonly Frase[] = [
  { texto: "Los libros no se guardan. Se habitan." },
  { texto: "Cada libro que cerrás deja una puerta abierta." },
  { texto: "Leer es la forma más tranquila de viajar." },
  { texto: "Una buena lectura no termina cuando se acaba el libro." },
  { texto: "Hoy alcanza con una página." },
  { texto: "Anotar lo que te conmueve es leer dos veces." },
  { texto: "Tu biblioteca crece con cada historia que atravesás." },
  { texto: "Subrayar es una manera de conversar con quien escribió." },
  { texto: "No hay apuro: el próximo capítulo te espera." },
  { texto: "Una vela, un libro y nada más." },
  { texto: "Cada reseña es una carta para tu yo del futuro." },
  { texto: "Leer despacio también es leer bien." },
  { texto: "Un marcapáginas es una promesa de volver." },
  { texto: "Detrás de cada lomo hay un mundo que todavía no visitaste." },
  { texto: "Las citas que guardás son mapas de lo que te importa." },
  { texto: "Un libro prestado es un viaje compartido." },
];

/** Saca las citas de los bloques de journal (los que no tienen forma de cita se ignoran). */
export function extraerCitas(contenidos: readonly unknown[], max = 12): Frase[] {
  const vistas = new Set<string>();
  const salida: Frase[] = [];
  for (const contenido of contenidos) {
    if (!Array.isArray(contenido)) continue;
    for (const b of contenido) {
      if (!b || typeof b !== "object") continue;
      const { tipo, texto, autor } = b as { tipo?: unknown; texto?: unknown; autor?: unknown };
      if (tipo !== "cita" || typeof texto !== "string") continue;
      const limpio = texto.replace(/\s+/g, " ").trim();
      if (limpio.length < 12 || vistas.has(limpio)) continue;
      vistas.add(limpio);
      salida.push({
        texto: limpio.length > MAX_CARACTERES ? `${limpio.slice(0, MAX_CARACTERES - 1).trimEnd()}…` : limpio,
        autor: typeof autor === "string" && autor.trim() ? autor.trim().slice(0, 100) : undefined,
        propia: true,
      });
      if (salida.length >= max) return salida;
    }
  }
  return salida;
}

/** Intercala: por cada frase general, dos propias (si hay), para que la persona vea sobre todo lo suyo. */
export function mezclar(propias: readonly Frase[], generales: readonly Frase[] = FRASES_GENERALES): Frase[] {
  if (propias.length === 0) return [...generales];
  const salida: Frase[] = [];
  let g = 0;
  for (const [i, p] of propias.entries()) {
    salida.push(p);
    if (i % 2 === 1 && generales.length > 0) salida.push(generales[g++ % generales.length]);
  }
  if (propias.length % 2 === 1 && generales.length > 0) salida.push(generales[g++ % generales.length]);
  return salida;
}

/** Valida lo leído del almacenamiento del navegador (puede estar vacío, viejo o alterado). */
export function frasesGuardadas(crudo: unknown): Frase[] {
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter((x): x is { texto: string; autor?: string } => !!x && typeof x === "object" && typeof (x as { texto?: unknown }).texto === "string" && (x as { texto: string }).texto.length > 0 && (x as { texto: string }).texto.length <= MAX_CARACTERES + 2)
    .slice(0, 30)
    .map((x) => ({ texto: x.texto, autor: typeof x.autor === "string" ? x.autor.slice(0, 100) : undefined, propia: true }));
}
