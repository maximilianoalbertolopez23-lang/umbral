# El Escritorio — el journal de lectura

Un cuaderno por libro y un diario general. Todo se guarda en Postgres, es editable en cualquier momento y pertenece solo a su dueña (RLS).

## Rutas
| Ruta | Qué hace |
|---|---|
| `/escritorio` | Diario general (índice de páginas), cuadernos de cada libro, plantilla, papelera |
| `/escritorio/libro/[id]` | Cuaderno de un libro: calificación, índice ordenable de páginas, nueva página, plantilla |
| `/escritorio/pagina/[id]` | Editor de una página (modos Editar / Leer) |
| `/escritorio/papelera` | Páginas eliminadas: restaurar o borrar para siempre |
| `/api/escritorio/imagenes` (POST) y `/[id]` (GET) | Subida y entrega de imágenes (solo a su dueña) |

Integración con El Archivo: la ficha de cada libro enlaza a su cuaderno y muestra cuántas páginas tiene; la calificación se edita en ambos lugares y es el mismo dato (`libros.calificacion`); eliminar un libro borra también las páginas de su cuaderno (la confirmación lo advierte); el «Resumen de lecturas» se calcula en el momento con los datos reales de El Archivo.

## Modelo de datos (`db/migrations/0004_escritorio.sql`)
```
diario_paginas   id, user_id, libro_id (null = diario general), tipo, titulo, contenido (jsonb: lista de bloques),
                 plantilla, estado (borrador|publicada), orden, version, eliminada_at
diario_imagenes  id, user_id, pagina_id, mime, datos (bytea ≤ 800 KB)
preferencias     + plantilla_diario (plantilla de las páginas nuevas)
```
- **Contenido = lista de bloques en JSON.** Nunca se guarda HTML. Cada bloque tiene un `id` (uuid) y un `tipo`.
- **Versión:** cada guardado exige la `version` que se tenía abierta; si cambió en otra pestaña se rechaza (conflicto) y no se pisa nada.
- **Papelera:** eliminar pone `eliminada_at`; las páginas eliminadas no se listan, ni se abren, ni sirven sus imágenes. Se pueden restaurar (vuelven al final de su ámbito) o borrar definitivamente (solo desde la papelera).
- **Límites:** 500 páginas y 300 imágenes por persona, 200 bloques por página, 400 KB de contenido por página (validado en el servidor y en la base).
- **Imágenes:** se reducen en el navegador (máx. 1400 px, ≤ 560 KB), el servidor valida tamaño (≤ 600 KB) y formato real por los primeros bytes (JPG/PNG/WebP; SVG y otros se rechazan). Las que se suben y ya no están en la página se limpian al guardar, con un día de margen.

## Bloques disponibles
| Bloque | Qué es |
|---|---|
| Texto | Párrafos con **negrita**, *cursiva*, subrayado y ~~tachado~~ (editor Tiptap con un subconjunto mínimo) |
| Título | Tres tamaños |
| Lista | Con viñetas, numerada o de tareas (casillas) |
| Cita | Texto, quién la dice, página |
| Momento destacado | Página + texto |
| Personaje | Nombre + por qué te gusta |
| Nota con fecha | Fecha + texto |
| Imagen | Subida propia, pie de foto, ancho normal o completo |
| Separador | Ornamento |
| Resumen de lecturas | Balance de un año (libros terminados, páginas, calificación media, tiempo) calculado desde El Archivo |

Los bloques se agregan en cualquier posición, se mueven con ↑ ↓ (o arrastrando en pantallas grandes) y se quitan con «Deshacer» durante unos segundos. Ningún bloque ni campo es obligatorio.

## Páginas sugeridas
- **De un libro:** Reseña personal, Reflexiones, Citas favoritas, Personajes favoritos, Momentos destacados, Notas con fecha, Página en blanco. El tipo solo decide con qué bloques arranca; después se edita libremente.
- **Diario general:** Objetivos personales (tareas), Reflexiones, Lista, Recuerdos y fotos, Resumen de lecturas, Página en blanco.

## Plantillas
Pergamino clásico, Archivo fantástico, Minimalista editorial. Son una capa de estilo (`data-plantilla` en `src/app/hojas.css`): cambiar de plantilla **no toca el contenido**. Cada página tiene la suya; «Aplicar a todas las páginas» la cambia en todo un cuaderno y deja de ser la de las páginas nuevas. Los colores son los de la paleta oficial.

## Guardado
- **Autosave controlado** (`src/modules/escritorio/autoguardado.ts`): espera 1,5 s sin cambios, nunca guarda en paralelo, reintenta con espera creciente si falla (sin descartar nada) y se detiene ante un conflicto.
- **Indicador siempre visible:** Guardado · Cambios sin guardar… · Guardando… · Sin conexión, reintentando… · No se pudo guardar (con «Reintentar») · Conflicto de versiones.
- **No se pierden cambios al navegar:** al hacer clic en cualquier enlace de la app se guarda antes de salir; también al ocultar la pestaña y al salir con «atrás». Al cerrar la pestaña con cambios sin guardar el navegador avisa.

## Seguridad
- No hay HTML guardado ni interpretado: el servidor valida cada bloque con un esquema estricto (descarta claves desconocidas y rechaza tipos, nodos y marcas no permitidos) y la pantalla se arma con componentes React que escapan todo el texto.
- Cada consulta corre como el rol `umbral_app` con RLS; las FK compuestas impiden colgar páginas o imágenes de otra persona.
- Las imágenes solo se sirven a su dueña, con `nosniff` y una política de seguridad que impide ejecutar nada.

## Cómo probarlo
**Automáticas** (`npm test`): `src/modules/escritorio/escritorio.test.ts` (bloques, validación y contenido malicioso, autoguardado con reloj simulado) y `db/tests/escritorio.test.ts` (Postgres real: crear, guardar con versiones y conflicto, orden, plantillas, papelera, imágenes y limpieza, resumen del año, cascada con El Archivo, aislamiento entre personas, restricciones).

**Manuales:**
1. `/escritorio/libro/<id>` → «Nueva página» → «Reseña personal». Escribí, poné negrita, agregá bloques (cita, lista de tareas, imagen).
2. Mirá el indicador: «Cambios sin guardar…» → «Guardando…» → «Guardado». Recargá: todo sigue ahí.
3. Escribí algo y hacé clic enseguida en «← Journal de…»: al volver, el cambio está guardado.
4. Cambiá la plantilla en la barra de la página: el contenido no se altera. Probá «Leer».
5. Pegá `<img src=x onerror=alert(1)>` en una cita: aparece como texto y no se ejecuta.
6. «Eliminar página» → confirmar → `/escritorio/papelera` → «Restaurar».
7. Abrí la misma página en dos pestañas, editá en una y luego en la otra: aparece el aviso de conflicto sin pisar nada.
8. En el diario general creá «Resumen de lecturas»: debe coincidir con tus libros terminados del año.

## Qué se puede hacer hoy y qué viene después
**Hoy:** todo lo descrito arriba.
**Más adelante (no implementado):** enlaces dentro del texto, listas dentro de un párrafo, tablas, columnas, colores y fuentes a elección, stickers y recortes decorativos, alinear texto, buscar dentro del journal, exportar a PDF/Markdown, historial de versiones de cada página, borrado automático de la papelera, mover páginas entre libros, edición colaborativa y compartir (no habrá funciones sociales por ahora).
