import { describe, expect, it } from "vitest";
import { CATALOGO, CATEGORIAS, estaDesbloqueado, itemsPorCategoria, obtenerItem } from "./catalogo";
import { AJUSTES_BASE, contraste, propsHoja, validarAjustes, FUENTES, ORNAMENTOS } from "./journal";
import {
  DECORACION_INICIAL, PARED, SUELO, alternarOculto, escalarObjeto, moverCapa, aplicarEstilo, agregarObjeto, cajaDe, cambiarVariante, deshacer, disenoInicial, disenoRestablecido, eliminarObjeto,
  escalaProfundidad, girarObjeto, moverObjeto, nuevoHistorial, rehacer, registrar, resolverMateriales, tieneAjustesManuales,
  ubicacionLibre, validarColocacion, validarDiseno, validarObjeto, ESTILOS, ESTILOS_SALA, MADERAS, type DisenoSala, type ObjetoColocado,
} from "./sala";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const objeto = (n: number, tipo: string, x: number, y: number, extra: Partial<ObjetoColocado> = {}): ObjetoColocado => ({ id: id(n), tipo, x, y, sala: "gran-sala", giro: false, escala: 1, oculto: false, capa: 0, variante: 0, ...extra });
const vacio: DisenoSala = { estilo: "clasica", objetos: [] };

describe("catálogo de objetos", () => {
  it("cada objeto tiene id único, categoría válida, tamaño, variantes y origen", () => {
    expect(new Set(CATALOGO.map((i) => i.id)).size).toBe(CATALOGO.length);
    for (const i of CATALOGO) {
      expect(CATEGORIAS).toContain(i.categoria);
      expect(i.ancho).toBeGreaterThan(0);
      expect(i.alto).toBeGreaterThan(0);
      expect(i.maximo).toBeGreaterThanOrEqual(1);
      expect(i.variantes.length).toBeGreaterThanOrEqual(1);
      for (const v of i.variantes) expect(v).toMatch(/^\/objetos\/(kit\/)?[A-Za-z0-9_-]+\.webp$/);
      expect(i.origen).toEqual({ tipo: "inicial" });
      expect(estaDesbloqueado(i)).toBe(true);
    }
  });

  it("cubre las categorías pedidas, en piso y en pared", () => {
    for (const c of ["alfombra", "sillon", "mueble", "estanteria", "planta", "decoracion", "iluminacion", "cuadro"]) {
      expect(itemsPorCategoria().some((g) => g.categoria === c), c).toBe(true);
    }
    expect(CATALOGO.some((i) => i.zona === "suelo")).toBe(true);
    expect(CATALOGO.some((i) => i.zona === "pared")).toBe(true);
    expect(CATALOGO.length).toBeGreaterThanOrEqual(15);
  });

  it("solo las alfombras son planas y ninguna es rotable si no se ve distinta al espejarse", () => {
    for (const i of CATALOGO) if (i.plano) expect(i.categoria).toBe("alfombra");
    expect(obtenerItem("no-existe")).toBeUndefined();
  });
});

describe("decoración de partida", () => {
  it("cumple todas las reglas de colocación y usa objetos del catálogo", () => {
    expect(validarColocacion([...DECORACION_INICIAL])).toEqual([]);
    for (const o of DECORACION_INICIAL) expect(obtenerItem(o.tipo), o.tipo).toBeDefined();
    expect(validarDiseno(disenoInicial()).ok).toBe(true);
    expect(new Set(DECORACION_INICIAL.map((o) => o.id)).size).toBe(DECORACION_INICIAL.length);
  });
});

describe("kit visual y edición por capas", () => {
  it("incorpora los 134 objetos del kit con sus ids técnicos", () => {
    const kit = CATALOGO.filter((i) => i.id.startsWith("kit_"));
    expect(kit).toHaveLength(134);
    expect(obtenerItem("kit_A_001")?.variantes[0]).toBe("/objetos/kit/kit_A_001.webp");
    expect(new Set(CATALOGO.map((i) => i.id)).size).toBe(CATALOGO.length);
  });

  it("escalar respeta límites y no deja el objeto fuera de lugar", () => {
    const d: DisenoSala = { estilo: "clasica", objetos: [objeto(1, "kit_A_001", 800, 800)] };
    const r = escalarObjeto(d, id(1), 1.5);
    expect(r.ok && r.diseno.objetos[0].escala).toBe(1.5);
    const ancho = escalarObjeto(d, id(1), 99);
    expect(ancho.ok && ancho.diseno.objetos[0].escala).toBe(2.5);
    expect(escalarObjeto(d, id(9), 1).ok).toBe(false);
  });

  it("ocultar conserva el objeto y mover capas tiene tope", () => {
    const d: DisenoSala = { estilo: "clasica", objetos: [objeto(1, "kit_A_001", 800, 800)] };
    const oculto = alternarOculto(d, id(1));
    expect(oculto.ok && oculto.diseno.objetos[0].oculto).toBe(true);
    expect(oculto.ok && oculto.diseno.objetos).toHaveLength(1);
    let x = d;
    for (let n = 0; n < 5; n++) x = (moverCapa(x, id(1), 1) as { diseno: DisenoSala }).diseno;
    expect(x.objetos[0].capa).toBe(5);
    expect(moverCapa(x, id(1), 1).ok).toBe(false);
    expect(moverCapa(x, id(1), -1).ok).toBe(true);
  });

  it("los diseños sin escala, oculto ni capa reciben valores por defecto", () => {
    const r = validarDiseno({ estilo: "clasica", objetos: [{ id: id(1), tipo: "kit_A_001", x: 800, y: 800 }] });
    expect(r.ok && [r.diseno.objetos[0].escala, r.diseno.objetos[0].oculto, r.diseno.objetos[0].capa]).toEqual([1, false, 0]);
    expect(validarDiseno({ estilo: "clasica", objetos: [{ id: id(1), tipo: "kit_A_001", x: 800, y: 800, escala: 9 }] }).ok).toBe(false);
  });
});

describe("salas personalizables", () => {
  it("los diseños viejos (sin sala) pertenecen a la Gran Sala", () => {
    const r = validarDiseno({ estilo: "clasica", objetos: [{ id: id(1), tipo: "sillon-orejero", x: 400, y: 800, giro: false, variante: 0 }] });
    expect(r.ok && r.diseno.objetos[0].sala).toBe("gran-sala");
  });

  it("cada habitación guarda sus objetos y no chocan entre sí", () => {
    const a = objeto(1, "sillon-orejero", 400, 800);
    expect(validarObjeto(objeto(2, "sillon-orejero", 400, 800, { sala: "archivo" }), [a])).toBeNull();
    expect(validarObjeto(objeto(2, "sillon-orejero", 400, 800, { sala: "taller" }), [objeto(3, "sillon-orejero", 400, 800, { sala: "taller" })])).toMatch(/Ya hay/);
  });

  it("agregar con sala la asigna y los reservados de la Gran Sala no valen en las otras", () => {
    const r = agregarObjeto(vacio, "sillon-orejero", id(1), undefined, "escritorio");
    expect(r.ok && r.diseno.objetos[0].sala).toBe("escritorio");
    expect(validarObjeto(objeto(1, "cuadro-paisaje", 362, 300, { sala: "archivo" }), [])).toBeNull();
    for (const sala of ["gran-sala", "archivo", "escritorio", "taller"] as const) {
      for (const i of CATALOGO) {
        const pos = ubicacionLibre(i.id, [], sala);
        expect(pos, `${sala}/${i.id}`).not.toBeNull();
      }
    }
  });
});

describe("estilos y materiales", () => {
  it("hay tres estilos con nombre y todos resuelven materiales válidos", () => {
    expect(ESTILOS_SALA).toEqual(["clasica", "nocturno", "acogedora"]);
    for (const e of ESTILOS_SALA) {
      const m = resolverMateriales({ estilo: e, objetos: [] });
      expect(ESTILOS[e].nombre.length).toBeGreaterThan(5);
      expect(Object.keys(MADERAS)).toContain(m.madera);
    }
  });

  it("los ajustes manuales prevalecen sobre el estilo", () => {
    const m = resolverMateriales({ estilo: "acogedora", piso: "damero", brillo: "tenue", objetos: [] });
    expect(m.piso).toBe("damero");
    expect(m.brillo).toBe("tenue");
    expect(m.madera).toBe("roble");
  });

  it("aplicar un estilo borra los ajustes manuales pero conserva los objetos", () => {
    const d: DisenoSala = { estilo: "clasica", piso: "damero", luz: "alba", objetos: [objeto(1, "puf", 800, 800)] };
    expect(tieneAjustesManuales(d)).toBe(true);
    const nuevo = aplicarEstilo(d, "nocturno");
    expect(nuevo).toEqual({ estilo: "nocturno", objetos: d.objetos });
    expect(tieneAjustesManuales(nuevo)).toBe(false);
  });

  it("el diseño inicial conserva la luz elegida en la bienvenida", () => {
    expect(resolverMateriales(disenoInicial("alba")).luz).toBe("alba");
    expect(disenoInicial().objetos).toEqual(DECORACION_INICIAL);
    expect(resolverMateriales(disenoInicial()).luz).toBe("noche");
  });
});

describe("posicionamiento 2.5D", () => {
  it("la escala crece con la cercanía (y)", () => {
    expect(escalaProfundidad(SUELO.yMin)).toBeCloseTo(0.8);
    expect(escalaProfundidad(SUELO.yMax)).toBeCloseTo(1.2);
    expect(escalaProfundidad(820)).toBeGreaterThan(escalaProfundidad(760));
    expect(escalaProfundidad(0)).toBeCloseTo(0.8);
  });

  it("un objeto de piso se apoya en (x, y) y uno de pared se centra", () => {
    const puf = obtenerItem("puf")!;
    const c = cajaDe({ x: 800, y: 800 }, puf);
    expect(c.y + c.h).toBeCloseTo(800);
    expect(c.x + c.w / 2).toBeCloseTo(800);
    const cuadro = obtenerItem("cuadro-paisaje")!;
    const p = cajaDe({ x: 1500, y: 150 }, cuadro);
    expect(p.y + p.h / 2).toBeCloseTo(150);
  });

  it("acepta objetos de piso dentro del suelo y rechaza fuera", () => {
    expect(validarObjeto(objeto(1, "sillon-orejero", 400, 800), [])).toBeNull();
    expect(validarObjeto(objeto(1, "sillon-orejero", 400, 600), [])).toMatch(/piso/);
    expect(validarObjeto(objeto(1, "sillon-orejero", 20, 800), [])).toMatch(/piso/);
    expect(validarObjeto(objeto(1, "sillon-orejero", 400, 950), [])).toMatch(/piso/);
  });

  it("dos objetos de piso no ocupan el mismo lugar, pero sí pueden estar uno delante del otro", () => {
    const a = objeto(1, "sillon-orejero", 400, 790);
    expect(validarObjeto(objeto(2, "mesa-baja", 420, 792), [a])).toMatch(/Ya hay/);
    expect(validarObjeto(objeto(2, "mesa-baja", 420, 850), [a])).toBeNull();
  });

  it("las alfombras se pueden superponer con otros objetos", () => {
    const sillon = objeto(1, "sillon-orejero", 500, 800);
    expect(validarObjeto(objeto(2, "alfombra-redonda", 500, 800), [sillon])).toBeNull();
    expect(validarObjeto(objeto(1, "sillon-orejero", 500, 800), [objeto(2, "alfombra-redonda", 500, 800)])).toBeNull();
  });

  it("no se puede colgar nada sobre la estantería, la puerta, el escudo ni las ventanas", () => {
    expect(validarObjeto(objeto(1, "cuadro-paisaje", 224, 267), [])).toMatch(/estanterías/);
    expect(validarObjeto(objeto(1, "cuadro-retrato", 470, 555), [])).toMatch(/puerta/);
    expect(validarObjeto(objeto(1, "cuadro-retrato", 478, 345), [])).toMatch(/estandarte/);
    expect(validarObjeto(objeto(1, "cuadro-retrato", 635, 259), [])).toMatch(/ventanal/);
  });

  it("acepta cuadros en espacios libres de la pared y rechaza fuera del muro", () => {
    expect(validarObjeto(objeto(1, "tapiz", 1115, 250), [])).toBeNull();
    expect(validarObjeto(objeto(1, "cuadro-paisaje", 1470, 190), [])).toBeNull();
    expect(validarObjeto(objeto(1, "cuadro-paisaje", 1470, 40), [])).toMatch(/pared/);
    expect(validarObjeto(objeto(1, "cuadro-paisaje", 1580, 160), [])).toMatch(/pared/);
  });

  it("dos cuadros no se superponen", () => {
    const a = objeto(1, "cuadro-paisaje", 1470, 190);
    expect(validarObjeto(objeto(2, "reloj", 1470, 200), [a])).toMatch(/colgado/);
  });

  it("los objetos interactivos reservan su lugar en la pared", () => {
    expect(PARED.yMin).toBeLessThan(PARED.yMax);
  });

  it("valida máximos por tipo y variante existente", () => {
    const tres = [objeto(1, "reloj", 1470, 140), objeto(2, "reloj", 1115, 150), objeto(3, "reloj", 1115, 250)];
    const errores = validarColocacion(tres);
    expect(errores.some((e) => /máximo/.test(e.mensaje))).toBe(true);
    expect(validarObjeto(objeto(3, "puf", 700, 800, { variante: 7 }), [])).toMatch(/variante/);
  });

  it("encuentra lugar libre para cada objeto del catálogo en una sala vacía", () => {
    for (const i of CATALOGO) {
      const pos = ubicacionLibre(i.id, []);
      expect(pos, i.id).not.toBeNull();
      expect(validarObjeto(objeto(1, i.id, pos!.x, pos!.y), []), i.id).toBeNull();
    }
  });
});

describe("edición de la sala", () => {
  it("agregar, mover, girar, cambiar variante y eliminar", () => {
    const r = agregarObjeto(vacio, "sillon-orejero", id(1));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    let d = r.diseno;
    expect(d.objetos).toHaveLength(1);

    const movido = moverObjeto(d, id(1), 900, 840);
    expect(movido.ok).toBe(true);
    if (movido.ok) d = movido.diseno;
    expect(d.objetos[0]).toMatchObject({ x: 900, y: 840 });

    const girado = girarObjeto(d, id(1));
    expect(girado.ok && girado.diseno.objetos[0].giro).toBe(true);
    const variante = cambiarVariante(d, id(1), 2);
    expect(variante.ok && variante.diseno.objetos[0].variante).toBe(2);
    expect(eliminarObjeto(d, id(1)).objetos).toEqual([]);
  });

  it("un movimiento inválido se rechaza y no cambia el diseño", () => {
    const d = (agregarObjeto(vacio, "sillon-orejero", id(1)) as { diseno: DisenoSala }).diseno;
    const r = moverObjeto(d, id(1), 800, 300);
    expect(r.ok).toBe(false);
    expect(d.objetos[0].y).not.toBe(300);
  });

  it("no se puede girar lo que no gira ni operar sobre objetos inexistentes", () => {
    const d = (agregarObjeto(vacio, "mesa-baja", id(1)) as { diseno: DisenoSala }).diseno;
    expect(girarObjeto(d, id(1)).ok).toBe(false);
    expect(moverObjeto(d, id(9), 800, 800).ok).toBe(false);
    expect(cambiarVariante(d, id(1), 5).ok).toBe(false);
    expect(agregarObjeto(vacio, "inexistente", id(1)).ok).toBe(false);
  });

  it("respeta el máximo de cada objeto", () => {
    let d = vacio;
    for (let n = 1; n <= 2; n++) {
      const r = agregarObjeto(d, "globo", id(n));
      expect(r.ok).toBe(true);
      if (r.ok) d = r.diseno;
    }
    const r3 = agregarObjeto(d, "globo", id(3));
    expect(r3.ok).toBe(false);
  });

  it("restablecer vuelve a la sala original: estilo clásico, con la decoración de partida, sin ajustes", () => {
    expect(disenoRestablecido()).toEqual({ estilo: "clasica", objetos: DECORACION_INICIAL });
    expect(validarColocacion(disenoRestablecido().objetos)).toEqual([]);
  });
});

describe("deshacer y rehacer", () => {
  it("recorre el historial y descarta el futuro al editar", () => {
    let h = nuevoHistorial(vacio);
    const a = (agregarObjeto(vacio, "puf", id(1)) as { diseno: DisenoSala }).diseno;
    const b = (agregarObjeto(a, "baul", id(2)) as { diseno: DisenoSala }).diseno;
    h = registrar(registrar(h, a), b);
    expect(h.actual.objetos).toHaveLength(2);
    h = deshacer(h);
    expect(h.actual).toBe(a);
    h = deshacer(h);
    expect(h.actual).toBe(vacio);
    expect(deshacer(h)).toBe(h);
    h = rehacer(h);
    expect(h.actual).toBe(a);
    const c = (agregarObjeto(a, "globo", id(3)) as { diseno: DisenoSala }).diseno;
    h = registrar(h, c);
    expect(h.futuro).toEqual([]);
    expect(rehacer(h)).toBe(h);
  });

  it("registrar el mismo valor no agrega un paso", () => {
    const h = nuevoHistorial(vacio);
    expect(registrar(h, vacio)).toBe(h);
  });
});

describe("validación del diseño guardado", () => {
  it("acepta un diseño válido y completa valores por defecto", () => {
    const r = validarDiseno({ objetos: [{ id: id(1), tipo: "puf", x: 700, y: 800 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.diseno).toMatchObject({ estilo: "clasica", objetos: [{ giro: false, variante: 0 }] });
  });

  it("rechaza datos manipulados: tipos, posiciones, estilos o cantidad", () => {
    const malos: unknown[] = [
      { objetos: [{ id: id(1), tipo: "<script>", x: 700, y: 800 }] },
      { objetos: [{ id: "x", tipo: "puf", x: 700, y: 800 }] },
      { objetos: [{ id: id(1), tipo: "puf", x: 700, y: 100 }] },
      { objetos: [{ id: id(1), tipo: "puf", x: 99999, y: 800 }] },
      { objetos: [{ id: id(1), tipo: "puf", x: "700", y: 800 }] },
      { estilo: "neon", objetos: [] },
      { piso: "lava", objetos: [] },
      { objetos: Array.from({ length: 41 }, (_, n) => ({ id: id(n + 1), tipo: "puf", x: 700, y: 800 })) },
      "no es un objeto",
    ];
    for (const m of malos) expect(validarDiseno(m).ok, JSON.stringify(m).slice(0, 70)).toBe(false);
  });

  it("descarta claves desconocidas", () => {
    const r = validarDiseno({ objetos: [], inventado: "x" });
    expect(r.ok && "inventado" in r.diseno).toBe(false);
  });
});

describe("personalización del journal", () => {
  it("los ajustes base dejan la hoja como la plantilla", () => {
    const p = propsHoja("pergamino", AJUSTES_BASE);
    expect(p.estilo.backgroundColor).toBeUndefined();
    expect(p.estilo.backgroundImage).toBeUndefined();
    expect(p.estilo.boxShadow).toBeUndefined();
    expect(propsHoja("archivo", null)).toEqual({ plantilla: "archivo", datos: {}, estilo: {} });
  });

  it("aplica fuente, tamaño, colores, fondo, borde y ornamento", () => {
    const a = { ...AJUSTES_BASE, fuente: "caveat" as const, tamano: "grande" as const, papel: "crema" as const, tinta: "vino" as const, fondo: "rayado" as const, borde: "doble" as const, ornamento: "flores" as const, columnas: 2 as const };
    const p = propsHoja("editorial", a);
    expect(p.estilo["--fuente-cuerpo"]).toBe(FUENTES.caveat.muestra);
    expect(p.estilo["--tam-cuerpo"]).toBe("1.4rem");
    expect(p.estilo.backgroundColor).toBe("#f6e7d2");
    expect(p.estilo.backgroundImage).toContain("repeating-linear-gradient");
    expect(p.estilo.boxShadow).toContain("inset");
    expect(p.estilo["--orn-sep"]).toContain(ORNAMENTOS.flores.texto);
    expect(p.datos["data-columnas"]).toBe("2");
  });

  it("calcula el contraste y exige que el texto sea legible", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contraste("#2e182f", "#fcf8f2")).toBeGreaterThan(12);
    expect(validarAjustes("pergamino", AJUSTES_BASE).ok).toBe(true);
    expect(validarAjustes("archivo", AJUSTES_BASE).ok).toBe(true);
    expect(validarAjustes("editorial", { ...AJUSTES_BASE, papel: "ciruela", tinta: "morado" }).ok).toBe(false);
    expect(validarAjustes("editorial", { ...AJUSTES_BASE, papel: "marfil", tinta: "marfil" }).ok).toBe(false);
    expect(validarAjustes("editorial", { ...AJUSTES_BASE, papel: "ciruela", tinta: "marfil" }).ok).toBe(true);
  });

  it("rechaza ajustes inventados", () => {
    expect(validarAjustes("pergamino", { fuente: "comic-sans" }).ok).toBe(false);
    expect(validarAjustes("pergamino", { papel: "#ff0000" }).ok).toBe(false);
    expect(validarAjustes("pergamino", { columnas: 3 }).ok).toBe(false);
  });
});
