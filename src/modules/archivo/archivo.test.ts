import { describe, expect, it } from "vitest";
import { esquemaFechasLectura, esquemaLibro, esquemaProgreso } from "./esquemas";
import { aplicarFiltros, FILTROS_VACIOS, filtrarLibros, opcionesFiltro, ordenarLibros } from "./filtros";
import type { LibroResumen } from "./tipos";
import { detectarImagen, fechaHoy, normalizarTexto, parsearLista, porcentaje, validarIsbn } from "./utiles";

function libro(p: Partial<LibroResumen> & { titulo: string }): LibroResumen {
  return {
    id: p.titulo,
    autores: [],
    isbn: null,
    saga: null,
    sagaNumero: null,
    generos: [],
    etiquetas: [],
    paginasTotal: null,
    estado: "quiero_leer",
    calificacion: null,
    portadaVersion: 0,
    paginaActual: null,
    fechaInicio: null,
    fechaFin: null,
    nLecturas: 0,
    creadoAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

describe("utilidades", () => {
  it("parsearLista separa, recorta y quita duplicados", () => {
    expect(parsearLista(" Fantasía, fantasía ;Épica\n  Misterio  ,, ")).toEqual(["Fantasía", "Épica", "Misterio"]);
    expect(parsearLista("")).toEqual([]);
    expect(parsearLista(undefined)).toEqual([]);
  });

  it("normalizarTexto ignora tildes y mayúsculas", () => {
    expect(normalizarTexto("Cien Años de SOLEDAD, García Márquez")).toBe("cien anos de soledad, garcia marquez");
  });

  it("validarIsbn comprueba el dígito verificador", () => {
    expect(validarIsbn("978-0-306-40615-7")).toBe("9780306406157");
    expect(validarIsbn("0-306-40615-2")).toBe("0306406152");
    expect(validarIsbn("080442957X")).toBe("080442957X");
    expect(validarIsbn("9780306406158")).toBeNull();
    expect(validarIsbn("123")).toBeNull();
  });

  it("porcentaje se acota a 0–100 y es null sin total", () => {
    expect(porcentaje(150, 300)).toBe(50);
    expect(porcentaje(400, 300)).toBe(100);
    expect(porcentaje(-5, 300)).toBe(0);
    expect(porcentaje(10, null)).toBeNull();
    expect(porcentaje(null, 300)).toBe(0);
  });

  it("fechaHoy usa el día de Argentina", () => {
    expect(fechaHoy(new Date("2026-05-10T02:30:00Z"))).toBe("2026-05-09");
    expect(fechaHoy(new Date("2026-05-10T12:00:00Z"))).toBe("2026-05-10");
  });

  it("detectarImagen reconoce el formato por los bytes y rechaza el resto", () => {
    expect(detectarImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(detectarImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(detectarImagen(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(detectarImagen(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectarImagen(new TextEncoder().encode("GIF89a......"))).toBeNull();
  });
});

describe("esquemaLibro", () => {
  const base = { titulo: "  El nombre del viento ", estado: "quiero_leer" };

  it("normaliza un libro mínimo", () => {
    const r = esquemaLibro.parse(base);
    expect(r).toMatchObject({ titulo: "El nombre del viento", autores: [], isbn: null, estado: "quiero_leer", paginasTotal: null });
  });

  it("normaliza todos los campos", () => {
    const r = esquemaLibro.parse({
      ...base,
      autores: "Patrick Rothfuss; Otro",
      isbn: "978-0-7564-0407-9",
      saga: "Crónica del asesino de reyes",
      sagaNumero: "1,5",
      generos: "Fantasía, Épica",
      etiquetas: "favorito,  releer",
      paginas: "662",
      estado: "terminado",
      fechaInicio: "2026-01-02",
      fechaFin: "2026-02-03",
      calificacion: "5",
    });
    expect(r).toMatchObject({
      autores: ["Patrick Rothfuss", "Otro"],
      isbn: "9780756404079",
      sagaNumero: 1.5,
      generos: ["Fantasía", "Épica"],
      etiquetas: ["favorito", "releer"],
      paginasTotal: 662,
      calificacion: 5,
    });
  });

  it("rechaza datos inválidos con mensajes por campo", () => {
    const casos: [Record<string, string>, string][] = [
      [{ ...base, titulo: "   " }, "titulo"],
      [{ ...base, isbn: "9780306406158" }, "isbn"],
      [{ ...base, paginas: "0" }, "paginas"],
      [{ ...base, paginas: "abc" }, "paginas"],
      [{ ...base, estado: "leyendo", calificacion: "9" }, "calificacion"],
      [{ ...base, sagaNumero: "2" }, "saga"],
      [{ ...base, estado: "terminado", fechaInicio: "2026-03-01", fechaFin: "2026-02-01" }, "fechaFin"],
      [{ ...base, estado: "leyendo", fechaFin: "2026-02-01" }, "fechaFin"],
      [{ ...base, estado: "leyendo", fechaInicio: "2026-02-31" }, "fechaInicio"],
      [{ ...base, fechaInicio: "2026-02-01" }, "estado"],
      [{ ...base, calificacion: "4" }, "calificacion"],
      [{ ...base, estado: "inventado" }, "estado"],
    ];
    for (const [entrada, campo] of casos) {
      const r = esquemaLibro.safeParse(entrada);
      expect(r.success, JSON.stringify(entrada)).toBe(false);
      if (!r.success) expect(r.error.issues.some((i) => i.path[0] === campo), campo).toBe(true);
    }
  });
});

describe("esquemas de seguimiento", () => {
  it("progreso: página entera, minutos y fecha opcionales válidos", () => {
    expect(esquemaProgreso.safeParse({ pagina: "120", minutos: "45", fecha: "2026-03-01" }).success).toBe(true);
    expect(esquemaProgreso.safeParse({ pagina: "-3" }).success).toBe(false);
    expect(esquemaProgreso.safeParse({ pagina: "1.5" }).success).toBe(false);
    expect(esquemaProgreso.safeParse({ pagina: "10", minutos: "0" }).success).toBe(false);
    expect(esquemaProgreso.safeParse({ pagina: "10", fecha: "ayer" }).success).toBe(false);
  });

  it("fechas de lectura: el fin no puede ser anterior al inicio", () => {
    expect(esquemaFechasLectura.safeParse({ fechaInicio: "2026-01-01", fechaFin: "2026-01-02" }).success).toBe(true);
    expect(esquemaFechasLectura.safeParse({ fechaInicio: "2026-01-05", fechaFin: "2026-01-02" }).success).toBe(false);
  });
});

describe("filtros y orden", () => {
  const libros = [
    libro({ titulo: "Dune", autores: ["Frank Herbert"], generos: ["Ciencia ficción"], saga: "Dune", sagaNumero: 1, estado: "terminado", calificacion: 5, paginasTotal: 500, paginaActual: 500, fechaFin: "2026-03-01", creadoAt: "2026-01-03T00:00:00Z", etiquetas: ["clásico"] }),
    libro({ titulo: "El Mesías de Dune", autores: ["Frank Herbert"], generos: ["Ciencia ficción"], saga: "Dune", sagaNumero: 2, estado: "leyendo", calificacion: 4, paginasTotal: 400, paginaActual: 100, creadoAt: "2026-01-02T00:00:00Z" }),
    libro({ titulo: "Cien años de soledad", autores: ["Gabriel García Márquez"], generos: ["Realismo mágico"], estado: "pausado", calificacion: 3, creadoAt: "2026-01-01T00:00:00Z", etiquetas: ["Clásico", "regalo"] }),
    libro({ titulo: "Rayuela", autores: ["Julio Cortázar"], estado: "quiero_leer", creadoAt: "2026-01-04T00:00:00Z" }),
  ];
  const titulos = (ls: LibroResumen[]) => ls.map((l) => l.titulo);

  it("sin filtros devuelve todo", () => {
    expect(filtrarLibros(libros, FILTROS_VACIOS)).toHaveLength(4);
  });

  it("busca sin importar tildes ni mayúsculas, por título, autor, saga, etiqueta o ISBN", () => {
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, q: "garcia marquez" }))).toEqual(["Cien años de soledad"]);
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, q: "MESIAS" }))).toEqual(["El Mesías de Dune"]);
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, q: "herbert dune" }))).toHaveLength(2);
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, q: "regalo" }))).toEqual(["Cien años de soledad"]);
    expect(filtrarLibros(libros, { ...FILTROS_VACIOS, q: "zzz" })).toEqual([]);
  });

  it("filtra por estado (varios), autor, género, saga, etiqueta y calificación mínima", () => {
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, estados: ["leyendo", "pausado"] }))).toEqual(["El Mesías de Dune", "Cien años de soledad"]);
    expect(filtrarLibros(libros, { ...FILTROS_VACIOS, autor: "frank herbert" })).toHaveLength(2);
    expect(filtrarLibros(libros, { ...FILTROS_VACIOS, genero: "Realismo mágico" })).toHaveLength(1);
    expect(filtrarLibros(libros, { ...FILTROS_VACIOS, saga: "dune" })).toHaveLength(2);
    expect(filtrarLibros(libros, { ...FILTROS_VACIOS, etiqueta: "clásico" })).toHaveLength(2);
    expect(titulos(filtrarLibros(libros, { ...FILTROS_VACIOS, calificacionMin: 4 }))).toEqual(["Dune", "El Mesías de Dune"]);
  });

  it("combina filtros (Y lógico)", () => {
    const r = filtrarLibros(libros, { ...FILTROS_VACIOS, saga: "Dune", estados: ["leyendo"], q: "mesias" });
    expect(titulos(r)).toEqual(["El Mesías de Dune"]);
  });

  it("ordena por distintos criterios dejando los vacíos al final", () => {
    expect(titulos(ordenarLibros(libros, "recientes"))).toEqual(["Rayuela", "Dune", "El Mesías de Dune", "Cien años de soledad"]);
    expect(titulos(ordenarLibros(libros, "titulo"))).toEqual(["Cien años de soledad", "Dune", "El Mesías de Dune", "Rayuela"]);
    expect(titulos(ordenarLibros(libros, "autor"))).toEqual(["Dune", "El Mesías de Dune", "Cien años de soledad", "Rayuela"]);
    expect(titulos(ordenarLibros(libros, "calificacion"))).toEqual(["Dune", "El Mesías de Dune", "Cien años de soledad", "Rayuela"]);
    expect(titulos(ordenarLibros(libros, "progreso"))).toEqual(["Dune", "El Mesías de Dune", "Cien años de soledad", "Rayuela"]);
    expect(titulos(ordenarLibros(libros, "finalizacion"))[0]).toBe("Dune");
  });

  it("ordenar por autor agrupa por autor y respeta el volumen de la saga", () => {
    const r = titulos(aplicarFiltros(libros, { ...FILTROS_VACIOS, orden: "autor" }));
    expect(r.indexOf("Dune")).toBeLessThan(r.indexOf("El Mesías de Dune"));
    expect(r[0]).toBe("Dune");
    expect(r.at(-1)).toBe("Rayuela");
  });

  it("opcionesFiltro devuelve valores únicos y ordenados de los libros reales", () => {
    const o = opcionesFiltro(libros);
    expect(o.autores).toEqual(["Frank Herbert", "Gabriel García Márquez", "Julio Cortázar"]);
    expect(o.sagas).toEqual(["Dune"]);
    expect(o.etiquetas).toEqual(["clásico", "regalo"]);
  });
});
