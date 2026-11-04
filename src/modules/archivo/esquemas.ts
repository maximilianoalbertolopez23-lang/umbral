import { z } from "zod";
import { ESTADOS, type LibroInput } from "./tipos";
import { parsearLista, validarIsbn } from "./utiles";

/**
 * Esquemas del Archivo. Se usan en los formularios (cliente) y en las Server Actions (servidor).
 * Los campos llegan como texto de formulario; la salida ya está normalizada y tipada.
 */

const textoOpcional = z.string().optional();
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(valor: string): boolean {
  if (!FECHA.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(valor);
}

function vacioANull(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export const esquemaLibro = z
  .object({
    titulo: z.string({ error: "Escribí el título." }),
    autores: textoOpcional,
    isbn: textoOpcional,
    saga: textoOpcional,
    sagaNumero: textoOpcional,
    generos: textoOpcional,
    etiquetas: textoOpcional,
    paginas: textoOpcional,
    sinopsis: textoOpcional,
    estado: z.enum(ESTADOS, { error: "Elegí un estado de lectura." }),
    fechaInicio: textoOpcional,
    fechaFin: textoOpcional,
    calificacion: textoOpcional,
  })
  .transform((v, ctx): LibroInput => {
    const error = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    const titulo = v.titulo.trim();
    if (!titulo) error("titulo", "Escribí el título.");
    else if (titulo.length > 200) error("titulo", "El título no puede superar los 200 caracteres.");

    const autores = parsearLista(v.autores);
    if (autores.length > 10) error("autores", "Hasta 10 autores.");
    if (autores.some((a) => a.length > 100)) error("autores", "Cada autor puede tener hasta 100 caracteres.");

    let isbn: string | null = null;
    if (vacioANull(v.isbn)) {
      isbn = validarIsbn(v.isbn!);
      if (!isbn) error("isbn", "El ISBN no es válido. Revisá los dígitos (10 o 13).");
    }

    const saga = vacioANull(v.saga);
    if (saga && saga.length > 120) error("saga", "El nombre de la saga puede tener hasta 120 caracteres.");

    let sagaNumero: number | null = null;
    if (vacioANull(v.sagaNumero)) {
      const t = v.sagaNumero!.trim().replace(",", ".");
      sagaNumero = /^\d{1,3}(\.\d)?$/.test(t) ? Number(t) : NaN;
      if (!(sagaNumero > 0)) {
        error("sagaNumero", "El volumen debe ser un número positivo (por ejemplo 2 o 1,5).");
        sagaNumero = null;
      }
    }
    if (sagaNumero !== null && !saga) error("saga", "Indicá el nombre de la saga para este volumen.");

    const generos = parsearLista(v.generos);
    if (generos.length > 10) error("generos", "Hasta 10 géneros.");
    if (generos.some((g) => g.length > 40)) error("generos", "Cada género puede tener hasta 40 caracteres.");

    const etiquetas = parsearLista(v.etiquetas);
    if (etiquetas.length > 20) error("etiquetas", "Hasta 20 etiquetas.");
    if (etiquetas.some((e) => e.length > 30)) error("etiquetas", "Cada etiqueta puede tener hasta 30 caracteres.");

    let paginasTotal: number | null = null;
    if (vacioANull(v.paginas)) {
      const t = v.paginas!.trim();
      paginasTotal = /^\d+$/.test(t) ? Number(t) : NaN;
      if (!(paginasTotal >= 1 && paginasTotal <= 20000)) {
        error("paginas", "Las páginas deben ser un número entero entre 1 y 20000.");
        paginasTotal = null;
      }
    }

    const sinopsis = vacioANull(v.sinopsis);
    if (sinopsis && sinopsis.length > 4000) error("sinopsis", "La sinopsis puede tener hasta 4000 caracteres.");

    const fechaInicio = vacioANull(v.fechaInicio);
    const fechaFin = vacioANull(v.fechaFin);
    if (fechaInicio && !fechaValida(fechaInicio)) error("fechaInicio", "La fecha de inicio no es válida.");
    if (fechaFin && !fechaValida(fechaFin)) error("fechaFin", "La fecha de finalización no es válida.");
    if (fechaInicio && fechaFin && fechaValida(fechaInicio) && fechaValida(fechaFin) && fechaFin < fechaInicio) {
      error("fechaFin", "La finalización no puede ser anterior al inicio.");
    }
    if (v.estado === "quiero_leer" && (fechaInicio || fechaFin)) {
      error("estado", "Un libro que querés leer todavía no tiene fechas de lectura.");
    }
    if (fechaFin && v.estado !== "terminado" && v.estado !== "abandonado") {
      error("fechaFin", "La fecha de finalización solo aplica a libros terminados o abandonados.");
    }

    let calificacion: number | null = null;
    if (vacioANull(v.calificacion)) {
      calificacion = Number(v.calificacion);
      if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
        error("calificacion", "La calificación va de 1 a 5.");
        calificacion = null;
      }
    }
    if (calificacion !== null && v.estado === "quiero_leer") {
      error("calificacion", "Calificá el libro cuando empieces a leerlo.");
    }

    return {
      titulo,
      autores,
      isbn,
      saga,
      sagaNumero,
      generos,
      etiquetas,
      paginasTotal,
      sinopsis,
      estado: v.estado,
      fechaInicio,
      fechaFin,
      calificacion,
    };
  });

export const esquemaProgreso = z.object({
  pagina: z
    .string({ error: "Indicá la página." })
    .trim()
    .regex(/^\d+$/, "La página debe ser un número entero (0 o más)."),
  minutos: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1440), "Los minutos van de 1 a 1440."),
  fecha: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || fechaValida(v), "La fecha no es válida."),
  nota: z.string().trim().max(500, "La nota puede tener hasta 500 caracteres.").optional(),
});

export const esquemaFechasLectura = z
  .object({
    fechaInicio: z.string().trim().optional(),
    fechaFin: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fechaInicio && !fechaValida(v.fechaInicio)) {
      ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: "La fecha de inicio no es válida." });
    }
    if (v.fechaFin && !fechaValida(v.fechaFin)) {
      ctx.addIssue({ code: "custom", path: ["fechaFin"], message: "La fecha de finalización no es válida." });
    }
    if (v.fechaInicio && v.fechaFin && fechaValida(v.fechaInicio) && fechaValida(v.fechaFin) && v.fechaFin < v.fechaInicio) {
      ctx.addIssue({ code: "custom", path: ["fechaFin"], message: "La finalización no puede ser anterior al inicio." });
    }
  });

export const esquemaCalificacion = z.object({
  calificacion: z.enum(["1", "2", "3", "4", "5", "0"], { error: "La calificación va de 1 a 5." }),
});

export const esquemaEstado = z.object({ estado: z.enum(ESTADOS, { error: "Elegí un estado de lectura." }) });
