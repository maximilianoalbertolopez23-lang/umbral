/**
 * Catálogo de objetos de El Taller. Cada objeto tiene un identificador estable, una categoría, propiedades visuales
 * (tamaño base, ilustraciones pintadas de `public/objetos`) y reglas de colocación. Los identificadores se conservan
 * entre versiones: lo guardado y las claves de La Torre (`objeto:<id>`) siguen valiendo aunque cambie la ilustración.
 *
 * Ampliable: para sumar un objeto basta una entrada aquí y su dibujo. `origen` está preparado para asociar objetos a
 * recompensas, misiones o monedas en el futuro; hoy todos son iniciales y no existe ninguna compra.
 */

import { OBJETOS_KIT } from "./catalogo-kit";

export const CATEGORIAS = ["alfombra", "sillon", "mueble", "estanteria", "planta", "decoracion", "iluminacion", "cuadro", "libros"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  alfombra: "Alfombras",
  sillon: "Sillones",
  mueble: "Muebles",
  estanteria: "Estanterías",
  planta: "Plantas",
  decoracion: "Decoración",
  iluminacion: "Iluminación",
  cuadro: "Cuadros y paredes",
  libros: "Libros y papeles",
};

/** Dónde se puede apoyar un objeto: en el piso (con profundidad) o colgado en la pared. */
export type Zona = "suelo" | "pared";

export type OrigenObjeto = { tipo: "inicial" };

export interface ItemCatalogo {
  id: string;
  categoria: Categoria;
  nombre: string;
  descripcion: string;
  zona: Zona;
  /** Tamaño base en unidades de la escena (1600 × 900), a escala 1. */
  ancho: number;
  alto: number;
  /** Las alfombras se apoyan planas en el piso: se dibujan debajo de todo y pueden superponerse con otros objetos. */
  plano?: boolean;
  /** «Girar» en 2.5D es espejar horizontalmente (no hay rotación libre). */
  rotable: boolean;
  /** Cuántos de este objeto admite una sala. */
  maximo: number;
  /** Ilustraciones pintadas del objeto (PNG/WebP con fondo transparente), una por color o modelo. */
  variantes: readonly string[];
  /** Si aporta un resplandor cálido a la escena. */
  emiteLuz?: boolean;
  origen: OrigenObjeto;
}

const inicial: OrigenObjeto = { tipo: "inicial" };

const CATALOGO_BASE: readonly ItemCatalogo[] = [
  {
    id: "alfombra-redonda", categoria: "alfombra", nombre: "Alfombra redonda", descripcion: "Con el dragón bordado.",
    zona: "suelo", ancho: 520, alto: 120, plano: true, rotable: false, maximo: 3, origen: inicial,
    variantes: ["/objetos/alfombra-redonda-1.webp"],
  },
  {
    id: "alfombra-larga", categoria: "alfombra", nombre: "Alfombra de pasillo", descripcion: "Tejida, con guarda dorada.",
    zona: "suelo", ancho: 230, alto: 248, plano: true, rotable: true, maximo: 3, origen: inicial,
    variantes: ["/objetos/alfombra-larga-1.webp", "/objetos/alfombra-larga-2.webp", "/objetos/alfombra-larga-3.webp", "/objetos/alfombra-larga-4.webp", "/objetos/alfombra-larga-5.webp", "/objetos/alfombra-larga-6.webp"],
  },
  {
    id: "puf", categoria: "alfombra", nombre: "Piel de oso", descripcion: "Una piel suave para los pies.",
    zona: "suelo", ancho: 230, alto: 81, plano: true, rotable: true, maximo: 2, origen: inicial,
    variantes: ["/objetos/puf-1.webp"],
  },
  {
    id: "sillon-orejero", categoria: "sillon", nombre: "Sillón orejero", descripcion: "Respaldo alto para leer horas.",
    zona: "suelo", ancho: 181, alto: 190, rotable: true, maximo: 4, origen: inicial,
    variantes: ["/objetos/sillon-orejero-1.webp", "/objetos/sillon-orejero-2.webp", "/objetos/sillon-orejero-3.webp", "/objetos/sillon-orejero-4.webp", "/objetos/sillon-orejero-5.webp"],
  },
  {
    id: "escritorio-nogal", categoria: "mueble", nombre: "Escritorio de nogal", descripcion: "Madera tallada con cajones.",
    zona: "suelo", ancho: 303, alto: 150, rotable: true, maximo: 2, origen: inicial,
    variantes: ["/objetos/escritorio-nogal-1.webp", "/objetos/escritorio-nogal-2.webp", "/objetos/escritorio-nogal-3.webp"],
  },
  {
    id: "mesa-baja", categoria: "mueble", nombre: "Mesa redonda", descripcion: "Tallada, de una sola pata.",
    zona: "suelo", ancho: 119, alto: 100, rotable: false, maximo: 3, origen: inicial,
    variantes: ["/objetos/mesa-baja-1.webp"],
  },
  {
    id: "librero-bajo", categoria: "estanteria", nombre: "Librero", descripcion: "Una estantería de piso.",
    zona: "suelo", ancho: 147, alto: 250, rotable: true, maximo: 3, origen: inicial,
    variantes: ["/objetos/librero-bajo-1.webp", "/objetos/librero-bajo-2.webp", "/objetos/librero-bajo-3.webp", "/objetos/librero-bajo-4.webp", "/objetos/librero-bajo-5.webp"],
  },
  {
    id: "planta-helecho", categoria: "planta", nombre: "Lavanda", descripcion: "En maceta de bronce.",
    zona: "suelo", ancho: 80, alto: 130, rotable: true, maximo: 6, origen: inicial,
    variantes: ["/objetos/planta-helecho-1.webp", "/objetos/planta-helecho-2.webp"],
  },
  {
    id: "planta-alta", categoria: "planta", nombre: "Glicina", descripcion: "Flores que cuelgan en cascada.",
    zona: "suelo", ancho: 164, alto: 220, rotable: true, maximo: 4, origen: inicial,
    variantes: ["/objetos/planta-alta-1.webp", "/objetos/planta-alta-2.webp"],
  },
  {
    id: "globo", categoria: "decoracion", nombre: "Globo terráqueo", descripcion: "Con pie de bronce.",
    zona: "suelo", ancho: 93, alto: 150, rotable: false, maximo: 2, origen: inicial,
    variantes: ["/objetos/globo-1.webp", "/objetos/globo-2.webp", "/objetos/globo-3.webp"],
  },
  {
    id: "telescopio", categoria: "decoracion", nombre: "Telescopio", descripcion: "Para mirar la luna.",
    zona: "suelo", ancho: 162, alto: 230, rotable: true, maximo: 1, origen: inicial,
    variantes: ["/objetos/telescopio-1.webp"],
  },
  {
    id: "baul", categoria: "decoracion", nombre: "Baúl", descripcion: "Madera y herrajes dorados.",
    zona: "suelo", ancho: 104, alto: 100, rotable: true, maximo: 3, origen: inicial,
    variantes: ["/objetos/baul-1.webp", "/objetos/baul-2.webp", "/objetos/baul-3.webp"],
  },
  {
    id: "cristal", categoria: "decoracion", nombre: "Cristal de amatista", descripcion: "Brilla suave en la penumbra.",
    zona: "suelo", ancho: 81, alto: 90, rotable: false, maximo: 3, emiteLuz: true, origen: inicial,
    variantes: ["/objetos/cristal-1.webp", "/objetos/cristal-2.webp"],
  },
  {
    id: "pila-libros", categoria: "decoracion", nombre: "Pila de libros", descripcion: "Lecturas pendientes.",
    zona: "suelo", ancho: 113, alto: 90, rotable: true, maximo: 6, origen: inicial,
    variantes: ["/objetos/pila-libros-1.webp", "/objetos/pila-libros-2.webp"],
  },
  {
    id: "lampara-pie", categoria: "iluminacion", nombre: "Candelabro de piso", descripcion: "Una luz cálida para leer.",
    zona: "suelo", ancho: 115, alto: 170, rotable: false, maximo: 3, emiteLuz: true, origen: inicial,
    variantes: ["/objetos/lampara-pie-1.webp", "/objetos/lampara-pie-2.webp", "/objetos/lampara-pie-3.webp"],
  },
  {
    id: "cuadro-paisaje", categoria: "cuadro", nombre: "Cuadro de paisaje", descripcion: "Paisajes pintados en marco dorado.",
    zona: "pared", ancho: 130, alto: 143, rotable: false, maximo: 4, origen: inicial,
    variantes: ["/objetos/cuadro-paisaje-1.webp", "/objetos/cuadro-paisaje-2.webp", "/objetos/cuadro-paisaje-3.webp"],
  },
  {
    id: "cuadro-retrato", categoria: "cuadro", nombre: "Marco ovalado", descripcion: "Marcos y espejos de bronce.",
    zona: "pared", ancho: 96, alto: 120, rotable: false, maximo: 4, origen: inicial,
    variantes: ["/objetos/cuadro-retrato-1.webp", "/objetos/cuadro-retrato-2.webp", "/objetos/cuadro-retrato-3.webp"],
  },
  {
    id: "mapa", categoria: "cuadro", nombre: "Pergamino", descripcion: "Un rollo antiguo.",
    zona: "pared", ancho: 130, alto: 65, rotable: false, maximo: 3, origen: inicial,
    variantes: ["/objetos/mapa-1.webp"],
  },
  {
    id: "tapiz", categoria: "cuadro", nombre: "Estandarte", descripcion: "Tela colgante con el emblema de la casa.",
    zona: "pared", ancho: 108, alto: 200, rotable: false, maximo: 3, origen: inicial,
    variantes: ["/objetos/tapiz-1.webp", "/objetos/tapiz-2.webp"],
  },
  {
    id: "vitral", categoria: "cuadro", nombre: "Vitral", descripcion: "Ventanas de vidrio pintado.",
    zona: "pared", ancho: 258, alto: 190, rotable: false, maximo: 3, origen: inicial,
    variantes: ["/objetos/vitral-1.webp", "/objetos/vitral-2.webp", "/objetos/vitral-3.webp", "/objetos/vitral-4.webp"],
  },
  {
    id: "candelabro-pared", categoria: "iluminacion", nombre: "Farol de pared", descripcion: "Un farol de bronce encendido.",
    zona: "pared", ancho: 48, alto: 100, rotable: true, maximo: 4, emiteLuz: true, origen: inicial,
    variantes: ["/objetos/candelabro-pared-1.webp", "/objetos/candelabro-pared-2.webp", "/objetos/candelabro-pared-3.webp"],
  },
  {
    id: "reloj", categoria: "decoracion", nombre: "Astrolabio", descripcion: "Marca las horas de lectura.",
    zona: "pared", ancho: 91, alto: 100, rotable: false, maximo: 2, origen: inicial,
    variantes: ["/objetos/reloj-1.webp"],
  },
];

/** Objetos de siempre (ids estables) más los 134 del kit visual. */
export const CATALOGO: readonly ItemCatalogo[] = [...CATALOGO_BASE, ...OBJETOS_KIT];

const POR_ID = new Map(CATALOGO.map((i) => [i.id, i]));

export function obtenerItem(id: string): ItemCatalogo | undefined {
  return POR_ID.get(id);
}

/** Hoy todos los objetos son iniciales. Punto de extensión para recompensas, misiones o monedas (sin implementar). */
export function estaDesbloqueado(item: ItemCatalogo): boolean {
  return item.origen.tipo === "inicial";
}

export function itemsPorCategoria(): { categoria: Categoria; items: ItemCatalogo[] }[] {
  return CATEGORIAS.map((categoria) => ({ categoria, items: CATALOGO.filter((i) => i.categoria === categoria) })).filter((g) => g.items.length > 0);
}
