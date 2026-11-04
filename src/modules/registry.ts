/**
 * Registro de habitaciones (módulos) de UMBRAL.
 * Única fuente de verdad para la navegación, la landing y las páginas de cada habitación.
 * Para sumar un módulo futuro: agregar una entrada aquí y una carpeta en src/app/(mundo)/<ruta>.
 */

export type ModuloId = "sala" | "archivo" | "escritorio" | "taller" | "torre" | "portales";

/** nucleo = parte de la versión inicial; futuro = se desarrolla progresivamente. */
export type FaseModulo = "nucleo" | "futuro";

/** Solo "disponible" puede presentarse como operativo: se marca cuando el módulo está implementado y probado. */
export type EstadoModulo = "planificado" | "disponible";

export interface Modulo {
  id: ModuloId;
  nombre: string;
  /** Título completo con artículo, para encabezados. */
  titulo: string;
  ruta: `/${string}`;
  numeral: string;
  resumen: string;
  /** Lo que la habitación va a contener. Es intención de producto, no funcionalidad presente. */
  contendra: readonly string[];
  fase: FaseModulo;
  estado: EstadoModulo;
}

export const MODULOS: readonly Modulo[] = [
  {
    id: "sala",
    nombre: "Gran Sala",
    titulo: "La Gran Sala",
    ruta: "/sala",
    numeral: "I",
    resumen: "El espacio principal desde donde se accede a todas las habitaciones.",
    contendra: [
      "Escenario 2.5D con objetos que abren cada habitación",
      "Acceso a cada habitación desde el propio espacio",
      "Tu colección y tu libro actual a la vista",
    ],
    fase: "nucleo",
    estado: "disponible",
  },
  {
    id: "archivo",
    nombre: "Archivo",
    titulo: "El Archivo",
    ruta: "/archivo",
    numeral: "II",
    resumen: "Tu biblioteca personal: libros, estanterías, categorías y colecciones.",
    contendra: [
      "Registro de libros con estado de lectura",
      "Estanterías y colecciones propias",
      "Búsqueda y filtros por categoría",
    ],
    fase: "nucleo",
    estado: "disponible",
  },
  {
    id: "escritorio",
    nombre: "Escritorio",
    titulo: "El Escritorio",
    ruta: "/escritorio",
    numeral: "III",
    resumen: "El journal digital: reseñas, citas, reflexiones e imágenes de cada lectura.",
    contendra: [
      "Reseñas y reflexiones por libro",
      "Citas guardadas con su página",
      "Imágenes y recuerdos de lectura",
    ],
    fase: "nucleo",
    estado: "disponible",
  },
  {
    id: "taller",
    nombre: "Taller",
    titulo: "El Taller",
    ruta: "/taller",
    numeral: "IV",
    resumen: "Personalización de ambientes, muebles, fondos y apariencia del journal.",
    contendra: [
      "Luz y apariencia de la biblioteca (disponible)",
      "Preferencia de movimiento (disponible)",
      "Muebles, fondos y objetos del mundo (pendiente)",
    ],
    fase: "nucleo",
    estado: "disponible",
  },
  {
    id: "torre",
    nombre: "Torre",
    titulo: "La Torre",
    ruta: "/torre",
    numeral: "V",
    resumen: "Niveles, Esencias, misiones, logros, inventario y estadísticas de lectura.",
    contendra: ["Niveles y experiencia (disponible)", "Esencias y canje de objetos (disponible)", "Misiones y logros (disponible)", "Inventario e historial de recompensas (disponible)"],
    fase: "nucleo",
    estado: "disponible",
  },
  {
    id: "portales",
    nombre: "Portales",
    titulo: "Los Portales",
    ruta: "/portales",
    numeral: "VI",
    resumen: "Futuras experiencias narrativas y desafíos especiales.",
    contendra: ["Experiencias narrativas", "Desafíos especiales"],
    fase: "futuro",
    estado: "planificado",
  },
];

export function getModulo(id: ModuloId): Modulo {
  const modulo = MODULOS.find((m) => m.id === id);
  if (!modulo) throw new Error(`Módulo desconocido: ${id}`);
  return modulo;
}

export const MODULOS_NUCLEO = MODULOS.filter((m) => m.fase === "nucleo");
