import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Autoguardado, type EstadoGuardado, type ResultadoGuardado } from "./autoguardado";
import {
  aniosDeResumen, crearBloque, imagenesReferenciadas, mover, textoPlano, validarContenido, type Bloque,
} from "./bloques";
import { INFO_TIPO, TIPOS_GENERAL, TIPOS_LIBRO, TIPOS_PAGINA } from "./paginas";

const HOY = "2026-11-02";
const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

describe("bloques y validación", () => {
  it("cada tipo de bloque nuevo es válido", () => {
    for (const tipo of ["titulo", "texto", "lista", "cita", "momento", "personaje", "nota", "separador", "resumen_lecturas"] as const) {
      const r = validarContenido([crearBloque(tipo, HOY, 2026)]);
      expect(r.ok, tipo).toBe(true);
    }
  });

  it("todos los tipos de página generan contenido válido", () => {
    for (const tipo of TIPOS_PAGINA) expect(validarContenido(INFO_TIPO[tipo].bloques(HOY)).ok, tipo).toBe(true);
    expect(TIPOS_LIBRO.every((t) => TIPOS_PAGINA.includes(t))).toBe(true);
    expect(TIPOS_GENERAL.every((t) => TIPOS_PAGINA.includes(t))).toBe(true);
  });

  it("el HTML se trata como texto: se conserva literal y nunca se interpreta", () => {
    const veneno = `<img src=x onerror="alert(1)"><script>alert(2)</script>`;
    const b: Bloque = { id: ID1, tipo: "cita", texto: veneno, autor: "<b>x</b>", pagina: "" };
    const r = validarContenido([b]);
    expect(r.ok).toBe(true);
    // Renderizado seguro: se escapa; no aparece ninguna etiqueta real.
    const html = renderToStaticMarkup(createElement("p", null, veneno));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rechaza tipos de bloque desconocidos, nodos y marcas no permitidos", () => {
    const malos: unknown[] = [
      [{ id: ID1, tipo: "html", html: "<script>alert(1)</script>" }],
      [{ id: ID1, tipo: "texto", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] } }],
      [{ id: ID1, tipo: "texto", doc: { type: "doc", content: [{ type: "heading", content: [] }] } }],
      [{ id: ID1, tipo: "texto", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "image", attrs: { src: "x" } }] }] } }],
      [{ id: "no-es-uuid", tipo: "separador" }],
      [{ id: ID1, tipo: "imagen", imagenId: "../../etc/passwd", pie: "", ancho: "normal" }],
      [{ id: ID1, tipo: "nota", fecha: "2026-02-31", texto: "x" }],
      [{ id: ID1, tipo: "titulo", nivel: 9, texto: "x" }],
      "no es una lista",
    ];
    for (const m of malos) expect(validarContenido(m).ok, JSON.stringify(m).slice(0, 80)).toBe(false);
  });

  it("descarta claves desconocidas (no se guarda nada fuera del esquema)", () => {
    const r = validarContenido([{ id: ID1, tipo: "cita", texto: "x", autor: "", pagina: "", onclick: "evil()", extra: { a: 1 } }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.bloques[0]).sort()).toEqual(["autor", "id", "pagina", "texto", "tipo"]);
  });

  it("impone límites de tamaño", () => {
    expect(validarContenido(Array.from({ length: 201 }, () => ({ id: ID1, tipo: "separador" }))).ok).toBe(false);
    expect(validarContenido([{ id: ID1, tipo: "cita", texto: "x".repeat(2001), autor: "", pagina: "" }]).ok).toBe(false);
    expect(validarContenido([{ id: ID1, tipo: "lista", modo: "vinietas", items: Array.from({ length: 101 }, () => ({ id: ID1, texto: "", hecho: false })) }]).ok).toBe(false);
  });

  it("texto enriquecido válido (negrita, cursiva, saltos) pasa", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hola ", marks: [{ type: "bold" }, { type: "italic" }] }, { type: "hardBreak" }, { type: "text", text: "mundo" }] }],
    };
    expect(validarContenido([{ id: ID1, tipo: "texto", doc }]).ok).toBe(true);
  });

  it("textoPlano arma el fragmento del índice y lo recorta", () => {
    const bloques: Bloque[] = [
      { id: ID1, tipo: "titulo", nivel: 2, texto: "Reseña" },
      { id: ID2, tipo: "texto", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Un libro enorme." }] }] } },
    ];
    expect(textoPlano(bloques)).toBe("Reseña · Un libro enorme.");
    expect(textoPlano(bloques, 8)).toHaveLength(8);
  });

  it("imagenesReferenciadas y aniosDeResumen", () => {
    const bloques: Bloque[] = [
      { id: ID1, tipo: "imagen", imagenId: ID2, pie: "", ancho: "normal" },
      { id: ID2, tipo: "resumen_lecturas", anio: 2026 },
      { id: ID1, tipo: "resumen_lecturas", anio: 2026 },
    ];
    expect(imagenesReferenciadas(bloques)).toEqual([ID2]);
    expect(aniosDeResumen(bloques)).toEqual([2026]);
  });

  it("mover reordena sin perder elementos", () => {
    expect(mover(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(mover(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(mover(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(mover(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});

describe("autoguardado controlado", () => {
  let estados: EstadoGuardado[];
  let guardados: number[];
  let respuestas: ResultadoGuardado[];
  let ctl: Autoguardado<number>;

  beforeEach(() => {
    vi.useFakeTimers();
    estados = [];
    guardados = [];
    respuestas = [];
    ctl = new Autoguardado<number>({
      demoraMs: 1000,
      esperasReintento: [100, 200],
      guardar: async (v) => {
        guardados.push(v);
        return respuestas.shift() ?? { ok: true };
      },
      alCambiarEstado: (e) => estados.push(e),
    });
  });
  afterEach(() => vi.useRealTimers());

  it("espera a que dejen de llegar cambios y guarda solo el último valor", async () => {
    ctl.cambiar(1);
    ctl.cambiar(2);
    await vi.advanceTimersByTimeAsync(900);
    ctl.cambiar(3);
    await vi.advanceTimersByTimeAsync(900);
    expect(guardados).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(guardados).toEqual([3]);
    expect(estados.at(-1)).toBe("guardado");
    expect(ctl.haySinGuardar()).toBe(false);
  });

  it("guardarYa fuerza el guardado inmediato (para navegar sin perder cambios)", async () => {
    ctl.cambiar(7);
    expect(ctl.haySinGuardar()).toBe(true);
    expect(await ctl.guardarYa()).toBe(true);
    expect(guardados).toEqual([7]);
  });

  it("nunca guarda en paralelo: lo escrito durante un guardado se envía después", async () => {
    let liberar!: () => void;
    const lento = new Autoguardado<number>({
      demoraMs: 10,
      guardar: (v) => {
        guardados.push(v);
        return new Promise((ok) => { liberar = () => ok({ ok: true }); });
      },
      alCambiarEstado: (e) => estados.push(e),
    });
    lento.cambiar(1);
    await vi.advanceTimersByTimeAsync(20);
    lento.cambiar(2);
    await vi.advanceTimersByTimeAsync(50);
    expect(guardados).toEqual([1]);
    liberar();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(guardados).toEqual([1, 2]);
  });

  it("reintenta con espera creciente y no descarta los cambios si falla", async () => {
    respuestas = [{ ok: false, mensaje: "red" }, { ok: false, mensaje: "red" }, { ok: true }];
    ctl.cambiar(5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(estados).toContain("reintentando");
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    expect(guardados).toEqual([5, 5, 5]);
    expect(estados.at(-1)).toBe("guardado");
  });

  it("agotados los reintentos queda en 'error' con el cambio intacto y se puede reintentar", async () => {
    respuestas = [{ ok: false }, { ok: false }, { ok: false }];
    ctl.cambiar(9);
    await vi.advanceTimersByTimeAsync(1000 + 100 + 200 + 10);
    expect(estados.at(-1)).toBe("error");
    expect(ctl.haySinGuardar()).toBe(true);
    expect(await ctl.reintentar()).toBe(true);
    expect(estados.at(-1)).toBe("guardado");
  });

  it("un conflicto detiene el guardado automático", async () => {
    respuestas = [{ ok: false, conflicto: true, mensaje: "otra pestaña" }];
    ctl.cambiar(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(estados.at(-1)).toBe("conflicto");
    ctl.cambiar(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(guardados).toEqual([1]);
    expect(ctl.haySinGuardar()).toBe(true);
  });

  it("si guardar lanza una excepción lo trata como error de red", async () => {
    const roto = new Autoguardado<number>({
      demoraMs: 10,
      esperasReintento: [],
      guardar: async () => { throw new Error("caída"); },
      alCambiarEstado: (e) => estados.push(e),
    });
    roto.cambiar(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(estados.at(-1)).toBe("error");
    expect(roto.haySinGuardar()).toBe(true);
  });
});
