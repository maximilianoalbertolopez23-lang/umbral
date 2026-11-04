// Extrae los recursos de marca de la lámina original (brand/source/umbral_logo-01.svg)
// sin redibujar nada: recorta grupos existentes por rango de líneas y les asigna un viewBox.
// Uso: node scripts/extract-brand.mjs
import fs from "node:fs";
import path from "node:path";

const SOURCE = "brand/source/umbral_logo-01.svg";
const OUT = "public/brand";
const lines = fs.readFileSync(SOURCE, "utf8").split("\n");
const L = (a, b) => lines.slice(a - 1, b).join("\n"); // rangos 1-based inclusivos

// <defs> de la lámina (estilos, gradientes, clipPaths): líneas 3-290.
const defs = L(3, 290);

// viewBox = bounding box geométrico medido con getBBox() en Edge (sin los clipPaths de la luna).
// [x, y, ancho, alto] + margen
const pad = 6;
const assets = {
  "umbral-logo-vertical.svg": { body: L(363, 412), box: [829.41, 60.07, 378.95, 361.25] },
  "umbral-logo-horizontal.svg": { body: L(424, 471), box: [85.68, 771.34, 678.3, 194.15] },
  "umbral-marca.svg": { body: L(364, 402), box: [882.21, 60.07, 268.37, 275.48] },
  "umbral-logotipo.svg": { body: L(403, 411), box: [829.41, 344.16, 378.95, 77.15] },
  // Ícono de app: fondo redondeado (rects 298-310) + marca y logotipo (312-361)
  "umbral-icono-app.svg": { body: L(298, 310) + "\n" + L(312, 361), box: [176, 99.95, 489.75, 489.75], noPad: true },
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, { body, box, noPad }] of Object.entries(assets)) {
  const p = noPad ? 0 : pad;
  const [x, y, w, h] = box;
  const vb = [x - p, y - p, w + 2 * p, h + 2 * p].map((n) => +n.toFixed(2)).join(" ");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb}">
<defs>${defs.replace(/<\/?defs>/g, "")}</defs>
${body}
</svg>
`;
  fs.writeFileSync(path.join(OUT, name), svg);
  console.log(name, (svg.length / 1024).toFixed(0) + " KB", vb);
}
