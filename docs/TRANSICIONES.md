# Transiciones y avisos (storyboard V1)

Fuente: `UMBRAL_Guia_Produccion_Codex.md`. Todo es CSS (`src/app/globals.css`, `sala.css`): **no retrasa rutas, teclado ni guardado**. Con `prefers-reduced-motion` o «reducir movimiento» del Taller las animaciones pasan a ser instantáneas.

| ID | Dónde | Efecto | Clase |
|---|---|---|---|
| T01 | Tarjeta de acceso/registro | Pergamino que se despliega, 600 ms | `t-pergamino` |
| T02 | Pasos del onboarding | Panel lateral, 400 ms | `t-panel` |
| T03 | Entrada a la Gran Sala | Travelling y estabilización, 1,4 s | `t-travelling` |
| T04 | Sala → Archivo | Zoom al objeto (ya existía) + zoom de llegada | `t-zoom` |
| T05 | Archivo → ficha | Elevación, 450 ms | `t-elevar` |
| T06 | Ficha → Escritorio (libro/página) | Apertura de libro, 750 ms | `t-libro` |
| T07 | Taller | Panel lateral, 400 ms | `t-panel` |
| T08 | Retorno a la Gran Sala | Fundido, 400 ms | `t-retorno` |
| T09 | Logro | Aviso suave y descartable, 300/250 ms | `AvisoLogro` |

`TransicionRuta` (en `MundoProtegido`) elige el efecto según la ruta (`claseTransicion`, con prueba).

## Aviso de logro
`AvisoLogro` muestra solo lo que `sincronizarProgreso` devolvió como **recién registrado** en la base. Se sincroniza al abrir la Gran Sala y La Torre. Se cierra con el botón o a los 9 s.

## La Torre en la Gran Sala
La ventana derecha del muro muestra la torre y es un objeto real que abre `/torre` (`src/modules/sala/objetos.ts`).

## Logo
`public/brand/*` se recorta de `brand/source/umbral_logo-01.svg`, idéntico (mismo hash) al archivo del paquete de storyboards. No se redibujó.

## Estilo visual (acercamiento a los renders)
- **Placas** (`.hotspot[data-placa]` en `sala.css`): Archivo, Escritorio, Taller, Torre y la puerta muestran su nombre siempre, en placa de bordes dobles durazno.
- **Marco ornamentado** (`.marco-ornato` en `globals.css`): doble filete y esquinas, usado en La Torre y El Taller.
- Los renders del storyboard son pintura; la escena sigue siendo ilustración vectorial. Para pasar a fondo pintado hacen falta imágenes finales sin textos ni logos.
