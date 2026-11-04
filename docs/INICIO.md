# La bienvenida animada

La portada (`/`) usa «Castillo al atardecer entre cascadas y montañas» con movimiento, aparición mágica de texto y logo, y música tranquila opcional.

## Qué se mueve
Es una sola ilustración (no hay capas separadas), así que el movimiento es un **shader WebGL** sobre la imagen (`src/components/inicio/shader.ts`), con máscaras suaves dibujadas a mano sobre cada zona:
- **Nubes:** derivan despacio hacia la derecha.
- **Cascadas:** caída continua, destellos de espuma y neblina en la base.
- **Río:** corriente hacia el frente y destellos del atardecer.
- **Luces:** parpadean las ventanas del castillo, los faroles del puente y el farol grande de la izquierda; el sol detrás del castillo «respira».
- **Follaje:** viento muy leve en las enredaderas, las flores y los árboles del borde.
- **Motas de luz** doradas que suben (CSS).

Detalles técnicos: 30 cuadros por segundo, resolución limitada a 1,5× y pausa con la pestaña oculta. La imagen estática queda debajo como respaldo: si no hay WebGL, si el dispositivo pide **menos movimiento** (`prefers-reduced-motion`) o si algo falla, se ve la imagen quieta y todo lo demás funciona.

## Aparición mágica
- Telón oscuro que se disipa (2,2 s), logo que emerge de la bruma con resplandor y un halo que respira, palabras del lema una a una (blur → nítido, con brillo durazno y un destello que las recorre), y después el párrafo y los botones. Todo con CSS; con movimiento reducido aparece directo.

## Música
`src/lib/audio/ambiente.ts` genera la música **en el momento** con Web Audio (sin archivos ni derechos de terceros): acordes lentos (Dm9 → Bbmaj7 → Fmaj7 → Cadd9, 15 s cada uno), notas sueltas tipo arpa con eco largo y un soplo de viento muy suave.
- Los navegadores **no permiten sonido sin un toque**: arranca con el primer toque en cualquier lugar de la portada, y hay un botón «Música / Sin música» (abajo a la derecha). Se recuerda la elección (`localStorage`, clave `umbral-musica`).
- Solo suena en la portada; al cruzar el umbral se apaga con un fundido.
- No pude **escucharla** durante el desarrollo: se comprobó que arranca y se detiene sin errores, pero el gusto (volumen, notas, ritmo) hay que ajustarlo oyéndola. Los parámetros están al principio del archivo.
- Si preferís una pista propia (mp3 con licencia), se puede reemplazar el motor por un `<audio>` con la misma interfaz.

## Pruebas
`cobertura.test.ts` (alineación entre el lienzo animado y la imagen) y `ambiente.test.ts` (acordes y notas). El resultado visual se comprobó en el navegador de la aplicación: el movimiento se midió comparando dos capturas (cielo, cascadas y río cambian; el texto no).
