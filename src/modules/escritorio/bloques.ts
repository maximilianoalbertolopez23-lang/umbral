import { z } from "zod";

/**
 * Contenido del journal: una página es una lista ordenada de bloques. Todo se guarda como JSON validado con estos
 * esquemas y se muestra con componentes React: NUNCA se guarda ni se interpreta HTML, por lo que no hay contenido
 * que pueda ejecutarse. El texto enriquecido usa un subconjunto mínimo del JSON de ProseMirror (párrafos, saltos,
 * negrita, cursiva, subrayado y tachado); cualquier otro nodo o marca se rechaza.
 */

export const MAX_BLOQUES = 200;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaValida = (v: string) => {
  if (!FECHA.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
};

const marca = z.object({ type: z.enum(["bold", "italic", "underline", "strike"]) });
const nodoTexto = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(20000),
  marks: z.array(marca).max(4).optional(),
});
const nodoSalto = z.object({ type: z.literal("hardBreak") });
const parrafo = z.object({
  type: z.literal("paragraph"),
  content: z.array(z.union([nodoTexto, nodoSalto])).max(500).optional(),
});
export const esquemaDocTexto = z.object({
  type: z.literal("doc"),
  content: z.array(parrafo).min(1).max(200),
});
export type DocTexto = z.infer<typeof esquemaDocTexto>;

const id = z.string().uuid();
const texto = (max: number) => z.string().max(max);

const itemLista = z.object({ id, texto: texto(500), hecho: z.boolean().default(false) });

export const esquemaBloque = z.discriminatedUnion("tipo", [
  z.object({ id, tipo: z.literal("titulo"), nivel: z.union([z.literal(1), z.literal(2), z.literal(3)]), texto: texto(200) }),
  z.object({ id, tipo: z.literal("texto"), doc: esquemaDocTexto }),
  z.object({ id, tipo: z.literal("lista"), modo: z.enum(["vinietas", "numerada", "tareas"]), items: z.array(itemLista).max(100) }),
  z.object({ id, tipo: z.literal("cita"), texto: texto(2000), autor: texto(100).default(""), pagina: texto(20).default("") }),
  z.object({ id, tipo: z.literal("momento"), pagina: texto(20).default(""), texto: texto(2000) }),
  z.object({ id, tipo: z.literal("personaje"), nombre: texto(100), descripcion: texto(2000) }),
  z.object({ id, tipo: z.literal("nota"), fecha: z.string().refine(fechaValida, "Fecha inválida"), texto: texto(4000) }),
  z.object({ id, tipo: z.literal("imagen"), imagenId: id, pie: texto(200).default(""), ancho: z.enum(["normal", "completo"]).default("normal") }),
  z.object({ id, tipo: z.literal("separador") }),
  z.object({ id, tipo: z.literal("resumen_lecturas"), anio: z.number().int().min(2000).max(2100) }),
]);

export type Bloque = z.infer<typeof esquemaBloque>;
export type TipoBloque = Bloque["tipo"];

export const esquemaContenido = z.array(esquemaBloque).max(MAX_BLOQUES);

export type ResultadoContenido = { ok: true; bloques: Bloque[] } | { ok: false; error: string };

/** Valida y normaliza lo que llega del navegador (descarta claves desconocidas; rechaza tipos no permitidos). */
export function validarContenido(crudo: unknown): ResultadoContenido {
  const r = esquemaContenido.safeParse(crudo);
  if (!r.success) {
    const primero = r.error.issues[0];
    return { ok: false, error: `Contenido no válido (${primero?.path.join(".") || "formato"}).` };
  }
  return { ok: true, bloques: r.data };
}

export const ETIQUETA_BLOQUE: Record<TipoBloque, string> = {
  titulo: "Título",
  texto: "Texto",
  lista: "Lista",
  cita: "Cita",
  momento: "Momento destacado",
  personaje: "Personaje",
  nota: "Nota con fecha",
  imagen: "Imagen",
  separador: "Separador",
  resumen_lecturas: "Resumen de lecturas",
};

const nuevoId = () => crypto.randomUUID();

export const DOC_VACIO: DocTexto = { type: "doc", content: [{ type: "paragraph" }] };

/** Bloque nuevo y vacío. Las imágenes se crean después de subir el archivo (necesitan imagenId). */
export function crearBloque(tipo: Exclude<TipoBloque, "imagen">, hoy: string, anio = new Date().getFullYear()): Bloque {
  switch (tipo) {
    case "titulo":
      return { id: nuevoId(), tipo, nivel: 2, texto: "" };
    case "texto":
      return { id: nuevoId(), tipo, doc: structuredClone(DOC_VACIO) };
    case "lista":
      return { id: nuevoId(), tipo, modo: "vinietas", items: [{ id: nuevoId(), texto: "", hecho: false }] };
    case "cita":
      return { id: nuevoId(), tipo, texto: "", autor: "", pagina: "" };
    case "momento":
      return { id: nuevoId(), tipo, pagina: "", texto: "" };
    case "personaje":
      return { id: nuevoId(), tipo, nombre: "", descripcion: "" };
    case "nota":
      return { id: nuevoId(), tipo, fecha: hoy, texto: "" };
    case "separador":
      return { id: nuevoId(), tipo };
    case "resumen_lecturas":
      return { id: nuevoId(), tipo, anio };
  }
}

/** Texto plano de un documento enriquecido (para vistas previas y búsquedas). */
export function textoDeDoc(doc: DocTexto): string {
  return doc.content
    .map((p) => (p.content ?? []).map((n) => (n.type === "text" ? n.text : " ")).join(""))
    .join(" ")
    .trim();
}

/** Texto plano de toda la página: sirve para el fragmento del índice. */
export function textoPlano(bloques: Bloque[], max = 160): string {
  const partes: string[] = [];
  for (const b of bloques) {
    if (b.tipo === "titulo") partes.push(b.texto);
    else if (b.tipo === "texto") partes.push(textoDeDoc(b.doc));
    else if (b.tipo === "lista") partes.push(b.items.map((i) => i.texto).join(", "));
    else if (b.tipo === "cita" || b.tipo === "momento" || b.tipo === "nota") partes.push(b.texto);
    else if (b.tipo === "personaje") partes.push(`${b.nombre} ${b.descripcion}`);
    else if (b.tipo === "imagen") partes.push(b.pie);
  }
  const t = partes.map((p) => p.trim()).filter(Boolean).join(" · ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Ids de las imágenes que la página todavía referencia (el resto se considera huérfano). */
export function imagenesReferenciadas(bloques: Bloque[]): string[] {
  return bloques.flatMap((b) => (b.tipo === "imagen" ? [b.imagenId] : []));
}

/** Años usados por bloques de resumen (para pedir sus estadísticas). */
export function aniosDeResumen(bloques: Bloque[]): number[] {
  return [...new Set(bloques.flatMap((b) => (b.tipo === "resumen_lecturas" ? [b.anio] : [])))];
}

/** Mueve un elemento de una posición a otra (devuelve una copia). */
export function mover<T>(lista: T[], desde: number, hasta: number): T[] {
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(desde, 1);
  copia.splice(hasta, 0, item);
  return copia;
}
