# Identidad de marca

Fuente principal: `brand/source/umbral_logo-01.svg` (lámina de Illustrator). También están `umbral_logo.svg` y `umbral_logo.ai` (sin usar por ahora). Nada se redibujó: los recursos se **recortan** de grupos existentes de la lámina.

## Paleta oficial
| Nombre | Hex | Token Tailwind |
|---|---|---|
| Ciruela oscuro | `#2E182F` | `ciruela` |
| Morado | `#512D47` | `morado` |
| Durazno | `#F2C7A2` | `durazno` |
| Malva | `#AE7A7E` | `malva` |
| Marfil | `#FCF8F2` | `marfil` |

Derivados (mezclas, no colores nuevos): `noche`, `velo`, `texto-suave` en `globals.css`. Malva sobre ciruela da ~4,4:1: usarlo solo en texto pequeño de apoyo o decorativo; el cuerpo de texto usa `texto-suave`/`marfil`.

## Tipografía
EB Garamond (marca, títulos) · Inter (interfaz). Nota: la lámina rotula el ejemplo «EB Garamount»; se asumió que es un typo de EB Garamond. El logotipo UMBRAL es un lettering propio (curvas): no se compone con fuente.

## Recursos (`public/brand/`)
| Archivo | Origen en la lámina (líneas) | Uso |
|---|---|---|
| `umbral-logo-vertical.svg` | 363–412 | Hero, logo principal |
| `umbral-logo-horizontal.svg` | 424–471 | Cabeceras y pies |
| `umbral-marca.svg` | 364–402 | Solo isotipo (arco, dragón, luna, libro) |
| `umbral-logotipo.svg` | 403–411 | Solo letras |
| `umbral-icono-app.svg` | 298–310 + 312–361 | Ícono de app |
| `icon-192.png`, `icon-512.png`, `src/app/icon.png`, `apple-icon.png` | Render del ícono de app sobre ciruela | Favicon / PWA |

Regenerar los SVG: `npm run brand`. Los viewBox salen de `getBBox()` medido en Edge (ver comentario en el script).

## Reglas de uso
- Los logos llevan logotipo durazno: **solo sobre ciruela/morado/noche**. La lámina no define versión para fondo claro.
- No recolorear, deformar ni recombinar. Acceder siempre vía `components/brand/Logo.tsx`.

## Pendiente de exportación manual (Illustrator)
No existen en la lámina y **no se inventaron**:
1. Versión monocromática (1 tinta) y versión para fondo marfil.
2. Ícono maskable con zona segura (el ícono de app actual tiene esquinas redondeadas y se renderizó sobre ciruela).
3. Favicon pequeño optimizado (16–32 px): a ese tamaño el detalle del dragón no se lee.
4. SVG optimizados: cada logo pesa ~360 KB por la textura de la luna y los degradados. Optimizar con SVGO requiere validación visual contra el original.
5. Imagen Open Graph (1200×630).
