# Modo diario (sin juego)

UMBRAL se publica primero como **diario de lectura**: cargar libros (Archivo) y escribir el journal (Escritorio). El juego (Gran Sala, Taller, Torre, Portales, animaciones y música) está **apagado** y se enciende después, sin rehacer nada.

## El interruptor
`src/lib/juego.ts`: `JUEGO_ACTIVO = process.env.NEXT_PUBLIC_JUEGO === "1"`. Sin esa variable (el caso de Vercel hoy) el juego está apagado. Para encenderlo: definir `NEXT_PUBLIC_JUEGO=1` (en `.env.local` o en Vercel → Environment Variables) y volver a compilar/desplegar (es una variable de compilación).

## Qué cambia con el juego apagado
| Área | Con juego apagado |
|---|---|
| Navegación | Solo **Archivo**, **Escritorio** y **Ajustes** |
| Rutas `/sala`, `/taller`, `/torre`, `/portales` | Redirigen a `/archivo` |
| Después de ingresar | Va directo a **El Archivo** |
| Portada | Quieta (sin movimiento, texto mágico ni música), con «Ingresar» y «Crear mi cuenta» |
| Bienvenida | Un solo paso: nombre y nombre de la biblioteca (sin relato ni elección de luz) |
| Cabeceras ilustradas de Archivo y Escritorio | No se muestran |
| Transiciones entre pantallas | No hay: las pantallas cambian de golpe |
| Copia de seguridad | En **Ajustes** (en el juego sigue en El Taller) |

Se conserva todo: la pantalla de carga (aparece solo si algo tarda más de 250 ms) y las frases con las citas del journal.

## Qué no se toca
Los datos del juego (diseño de sala, inventario, XP, Esencias) y su código siguen en la base y el repositorio. Cuando se encienda el juego, la Torre recalcula el progreso a partir de los libros y páginas ya cargados.

## Notas
- Las bibliotecas creadas sin juego reciben la luz «noche» por defecto (la elección de luz es del juego).
- El modo sin correo (`CORREO_OPCIONAL=1`) es independiente de este interruptor.
