import { validarIsbn } from "@/modules/archivo/utiles";

/**
 * Búsqueda de libros en Open Library (API pública, sin clave). Es opcional: la carga manual nunca depende de ella.
 * Los resultados son sugerencias que la persona puede corregir antes de guardar.
 */
export interface ResultadoBusqueda {
  clave: string;
  titulo: string;
  autores: string[];
  anio: number | null;
  isbn: string | null;
  paginas: number | null;
  generos: string[];
  coverId: number | null;
}

interface DocOpenLibrary {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  cover_i?: number;
}

const CAMPOS = "key,title,author_name,first_publish_year,isbn,number_of_pages_median,cover_i,subject";

export function normalizarResultado(doc: DocOpenLibrary): ResultadoBusqueda | null {
  if (!doc.key || !doc.title) return null;
  const isbn = (doc.isbn ?? []).map((i) => validarIsbn(i)).find((i): i is string => i !== null && i.length === 13) ??
    (doc.isbn ?? []).map((i) => validarIsbn(i)).find((i): i is string => i !== null) ?? null;
  const generos = (doc.subject ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 40)
    .slice(0, 4);
  return {
    clave: doc.key.slice(0, 40),
    titulo: doc.title.slice(0, 200),
    autores: (doc.author_name ?? []).slice(0, 5).map((a) => a.slice(0, 100)),
    anio: doc.first_publish_year ?? null,
    isbn,
    paginas: doc.number_of_pages_median && doc.number_of_pages_median <= 20000 ? doc.number_of_pages_median : null,
    generos,
    coverId: Number.isInteger(doc.cover_i) && (doc.cover_i as number) > 0 ? (doc.cover_i as number) : null,
  };
}

/** Un texto de 10/13 dígitos válido se busca como ISBN; cualquier otro, como título/autor. */
export function construirUrlBusqueda(consulta: string): string {
  const q = consulta.trim();
  const isbn = validarIsbn(q);
  const params = new URLSearchParams({ fields: CAMPOS, limit: "8" });
  if (isbn) params.set("isbn", isbn);
  else params.set("q", q);
  return `https://openlibrary.org/search.json?${params}`;
}

export async function buscarEnOpenLibrary(consulta: string, fetchImpl: typeof fetch = fetch): Promise<ResultadoBusqueda[]> {
  const respuesta = await fetchImpl(construirUrlBusqueda(consulta), {
    headers: { "User-Agent": "UMBRAL/0.1 (journal de lectura personal)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!respuesta.ok) throw new Error(`Open Library respondió ${respuesta.status}`);
  const json = (await respuesta.json()) as { docs?: DocOpenLibrary[] };
  return (json.docs ?? []).map(normalizarResultado).filter((r): r is ResultadoBusqueda => r !== null);
}

/**
 * Descarga la portada desde covers.openlibrary.org (host fijo; el id es numérico validado: no hay SSRF).
 * Devuelve null si no existe o es demasiado pesada.
 */
export async function descargarPortadaOpenLibrary(coverId: number, maxBytes: number, fetchImpl: typeof fetch = fetch) {
  if (!Number.isInteger(coverId) || coverId <= 0) return null;
  for (const tamano of ["L", "M"]) {
    const r = await fetchImpl(`https://covers.openlibrary.org/b/id/${coverId}-${tamano}.jpg`, {
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    if (!r?.ok) continue;
    const datos = new Uint8Array(await r.arrayBuffer());
    if (datos.length > 0 && datos.length <= maxBytes) return datos;
  }
  return null;
}
