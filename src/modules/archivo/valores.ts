import type { Estado, LibroDetalle } from "./tipos";

/** Valores de formulario (todo texto) de un libro. Módulo neutro: lo usan el servidor (página de edición) y el cliente. */
export interface ValoresLibro {
  titulo: string;
  autores: string;
  isbn: string;
  saga: string;
  sagaNumero: string;
  generos: string;
  paginas: string;
  sinopsis: string;
  estado: Estado;
  fechaInicio: string;
  fechaFin: string;
  calificacion: string;
  etiquetas: string;
}

export const VALORES_VACIOS: ValoresLibro = {
  titulo: "",
  autores: "",
  isbn: "",
  saga: "",
  sagaNumero: "",
  generos: "",
  paginas: "",
  sinopsis: "",
  estado: "quiero_leer",
  fechaInicio: "",
  fechaFin: "",
  calificacion: "",
  etiquetas: "",
};

export function valoresDesdeLibro(l: LibroDetalle): ValoresLibro {
  return {
    titulo: l.titulo,
    autores: l.autores.join(", "),
    isbn: l.isbn ?? "",
    saga: l.saga ?? "",
    sagaNumero: l.sagaNumero === null ? "" : String(l.sagaNumero).replace(".", ","),
    generos: l.generos.join(", "),
    paginas: l.paginasTotal ? String(l.paginasTotal) : "",
    sinopsis: l.sinopsis ?? "",
    estado: l.estado,
    fechaInicio: l.fechaInicio ?? "",
    fechaFin: l.fechaFin ?? "",
    calificacion: l.calificacion ? String(l.calificacion) : "",
    etiquetas: l.etiquetas.join(", "),
  };
}
