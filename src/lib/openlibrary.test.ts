import { describe, expect, it } from "vitest";
import { buscarEnOpenLibrary, construirUrlBusqueda, descargarPortadaOpenLibrary, normalizarResultado } from "./openlibrary";

describe("Open Library", () => {
  it("normaliza un resultado y elige un ISBN válido de 13 dígitos", () => {
    const r = normalizarResultado({
      key: "/works/OL1W",
      title: "Dune",
      author_name: ["Frank Herbert"],
      first_publish_year: 1965,
      isbn: ["123", "0441013597", "9780441013593"],
      number_of_pages_median: 604,
      cover_i: 42,
      subject: ["Fantasy", "ab", "Science fiction"],
    });
    expect(r).toEqual({
      clave: "/works/OL1W",
      titulo: "Dune",
      autores: ["Frank Herbert"],
      anio: 1965,
      isbn: "9780441013593",
      paginas: 604,
      generos: ["Fantasy", "Science fiction"],
      coverId: 42,
    });
  });

  it("descarta resultados sin título y tolera campos ausentes", () => {
    expect(normalizarResultado({ key: "/works/X" })).toBeNull();
    expect(normalizarResultado({ key: "/works/X", title: "Solo título" })).toMatchObject({
      autores: [],
      isbn: null,
      paginas: null,
      coverId: null,
    });
  });

  it("busca por ISBN si el texto es un ISBN válido y por texto en otro caso", () => {
    expect(construirUrlBusqueda("978-0-441-01359-3")).toContain("isbn=9780441013593");
    expect(construirUrlBusqueda("dune herbert")).toContain("q=dune+herbert");
  });

  it("devuelve resultados normalizados y falla de forma clara si el servicio falla", async () => {
    const ok = (async () => new Response(JSON.stringify({ docs: [{ key: "/works/1", title: "A" }, { key: "/works/2" }] }))) as typeof fetch;
    expect(await buscarEnOpenLibrary("abc", ok)).toHaveLength(1);
    const caido = (async () => new Response("", { status: 503 })) as typeof fetch;
    await expect(buscarEnOpenLibrary("abc", caido)).rejects.toThrow(/503/);
  });

  it("la portada solo se descarga si el id es numérico y respeta el tamaño máximo", async () => {
    const grande = (async () => new Response(new Uint8Array(500))) as typeof fetch;
    expect(await descargarPortadaOpenLibrary(7, 100, grande)).toBeNull();
    expect((await descargarPortadaOpenLibrary(7, 1000, grande))?.length).toBe(500);
    expect(await descargarPortadaOpenLibrary(-1, 1000, grande)).toBeNull();
    expect(await descargarPortadaOpenLibrary(1.5, 1000, grande)).toBeNull();
  });
});
