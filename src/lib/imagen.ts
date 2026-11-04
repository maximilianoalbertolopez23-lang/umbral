/**
 * Redimensiona y comprime una imagen en el navegador antes de subirla (portadas ≤ 400 KB, lado mayor ≤ 600 px).
 * Así la subida es liviana y la base de datos no se llena de fotos de varios megas.
 */
export async function reducirImagen(archivo: File, maxLado = 600, maxBytes = 400_000): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) throw new Error("Elegí una imagen JPG, PNG o WebP.");
  const imagen = await createImageBitmap(archivo).catch(() => {
    throw new Error("No pudimos leer esa imagen. Probá con otra.");
  });

  let lado = maxLado;
  for (let intento = 0; intento < 4; intento++) {
    const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.max(1, Math.round(imagen.width * escala));
    lienzo.height = Math.max(1, Math.round(imagen.height * escala));
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    for (const calidad of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", calidad));
      const tipo = blob?.type === "image/webp" ? "image/webp" : "image/jpeg";
      const final = tipo === "image/webp" && blob ? blob : await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
      if (final && final.size <= maxBytes) {
        imagen.close();
        return new File([final], `portada.${tipo === "image/webp" ? "webp" : "jpg"}`, { type: final.type });
      }
    }
    lado = Math.round(lado * 0.75);
  }
  imagen.close();
  throw new Error("La imagen es demasiado pesada incluso reducida. Probá con otra.");
}
