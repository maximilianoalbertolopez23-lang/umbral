/**
 * Equivalente a `object-fit: cover` centrado: devuelve cuánto de la imagen (0..1 en cada eje) queda visible, para
 * convertir la coordenada de pantalla en coordenada de imagen. Así el lienzo animado coincide con la imagen estática.
 */
export function coberturaUV(aspectoPantalla: number, aspectoImagen: number): [number, number] {
  if (!(aspectoPantalla > 0) || !(aspectoImagen > 0)) return [1, 1];
  return aspectoPantalla > aspectoImagen ? [1, aspectoImagen / aspectoPantalla] : [aspectoPantalla / aspectoImagen, 1];
}
