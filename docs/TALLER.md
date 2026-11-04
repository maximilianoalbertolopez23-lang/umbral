# El Taller

Personalización de la biblioteca. Tres áreas en `/taller`:

- **Decorar las salas** (`/taller/sala`): cuatro habitaciones personalizables — Gran Sala, Archivo, Escritorio y Taller —, cada una con su ilustración y sus propios objetos (`sala` en cada objeto; los diseños anteriores sin `sala` son de la Gran Sala). Luz del cielo, estilo y objetos colocables (sillones, alfombras, librero, estandartes, faroles, cuadros, vitrales…) con ilustraciones pintadas de `public/objetos/` sobre la Gran Sala pintada. El diseño es un JSON versionado en `disenos_sala` y se muestra en `/sala`. Las paredes, el piso y la madera del arte vectorial anterior ya no se editan (los datos guardados se conservan).
- **Personalizar el journal** (`/taller/journal`): plantillas propias (tipografía, colores, fondo, borde, ornamento, distribución) guardadas en `plantillas_journal`. Una página solo referencia la plantilla (`plantilla_custom_id`): borrar la plantilla **no borra lo escrito**, la página vuelve a la plantilla base.
- **Movimiento y luz**: reducir animaciones siempre, o respetar el dispositivo.
- **Tus datos**: descarga de un respaldo JSON completo (`/api/exportar`) e importación que solo suma lo que falta (`/api/importar`).

## Código
`src/modules/taller/{catalogo,sala,journal,repositorio}.ts` (reglas y persistencia), `src/components/taller/*` (editores), `src/components/sala/objetos.tsx` (dibujo de los objetos pintados).

## Seguridad
- Todo guardado pasa por `conUsuario()` (rol `umbral_app` + RLS por `user_id`) y se valida en el servidor con zod; los datos del cliente no se confían.
- **Gating de La Torre:** objetos, estilos, fondos, bordes y ornamentos que están en la tienda (`src/modules/torre/reglas.ts`) solo se aceptan si la persona los tiene en su `inventario`; el servidor responde `bloqueado` si no (probado en `db/tests/torre.test.ts` y `db/tests/taller.test.ts`).
- Control optimista por `version` en el diseño de la sala: dos pestañas no se pisan en silencio.

## Cómo probar
```bash
npx vitest run db/tests/taller.test.ts db/tests/torre.test.ts
```
Manual: `/taller/sala` → colocar objetos, guardar, recargar y mirar `/sala`; `/taller/journal` → crear plantilla, aplicarla a una página, borrar la plantilla y comprobar que el texto sigue.

## Límites conocidos
- Hay un máximo total de objetos (`LIMITE_OBJETOS`) y un máximo por tipo (`sala.ts`); el servidor lo revalida.
- Los objetos se mueven arrastrando o con teclado (flechas, R para girar, Supr para quitar). **El arrastre táctil real no se probó en un celular físico.**
- No se probó manualmente un fondo/ornamento comprado en el journal (solo por tests del servidor).
