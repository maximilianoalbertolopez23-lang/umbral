# Personalización por capas (kit visual)

Estado al integrar el kit (`UMBRAL_Kit_Produccion_Separado`). Complementa `docs/TALLER.md`.

## Auditoría previa (lo que ya existía)
Mover (arrastre y teclado), reflejar (`rotable`), quitar, deshacer/rehacer, restablecer, guardado versionado en `disenos_sala` (RLS, Zod, conflicto entre pestañas), bloqueo de objetos de la tienda de La Torre y cuatro habitaciones. Faltaba: escala, ocultar, orden de capas, vista previa antes de confirmar y el catálogo completo del kit.

## Qué se agregó
| Pedido | Resultado |
|---|---|
| 134 objetos del kit | `public/objetos/kit/*.webp` (conversión de los PNG originales con alfa), catálogo en `src/modules/taller/catalogo-kit.ts` generado desde `manifest.json` con los ids técnicos (`kit_A_001` …). Se conservan los 22 objetos anteriores y sus ids |
| Escalar | `escala` 0,4–2,5 por objeto (deslizador); respeta la relación de aspecto |
| Reflejar | Solo si el objeto es compatible (`rotable`); estandartes, cuadros, alfombras y similares no se espejan para no invertir emblemas |
| Ordenar capas | `capa` −5…+5 («Traer al frente» / «Enviar atrás») sobre el orden natural por profundidad |
| Ocultar | `oculto`: se conserva en el diseño, no se dibuja en la habitación (en el editor se ve atenuado) |
| Previsualizar | El objeto aparece semitransparente sobre la escena (mouse, toque o flechas) y no se guarda hasta «Colocar»; «Cancelar»/Esc lo descarta |
| Eliminar, deshacer, restablecer | Ya existían y siguen |
| Guardar en el perfil | Igual que antes: JSON versionado en la base, nunca aplanado sobre el fondo |
| Separación en capas | fondo (imagen) → decoraciones (`CapaDecoracion`) → luz/efectos (`sala-luz*`) → hotspots (solo Gran Sala) → UI |

Los diseños viejos siguen válidos: los campos nuevos tienen valores por defecto (`escala: 1`, `oculto: false`, `capa: 0`, `sala: "gran-sala"`).

## Coordenadas
Se guardan en unidades de una escena fija de 1600 × 900 (16:9) y se dibujan en porcentajes sobre un lienzo que conserva la relación de aspecto: equivale a un sistema relativo y no se rompe en móvil (en pantallas angostas la escena se desliza). No se migró a 0..1 literal para no tocar datos guardados.

## Fondos
- **Gran Sala:** ahora usa la escena 05 (ver `docs/ESCENAS.md`), que trae muebles pintados fijos; los objetos se colocan encima. La base vacía del kit ya no se usa.
- **Archivo, Escritorio y Taller:** siguen con las ilustraciones anteriores, que **traen decoración fija** (estanterías, sillón, mesa). Para personalización total necesitan fondos de habitación vacía. Lo mismo vale para el valle, la puerta y la Torre (no son habitaciones editables).

## Límites
- Los recortes del kit salen de planchas de 1536 × 1024: son pequeños (≈ 150–220 px) y se ven suaves al agrandar; no se usaron los «Ampliados_2x» porque son interpolaciones.
- Algunas piezas pueden conservar sombra o borde de la plancha.
- No se probó el arrastre táctil en un celular físico.
