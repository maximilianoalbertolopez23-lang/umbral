# El Archivo — estructuras de datos y cómo probarlo

El Archivo es la biblioteca personal: libros, lecturas (con relecturas), historial de progreso y portadas. Todo se guarda en Postgres y cada persona solo accede a lo suyo (RLS).

## Rutas
| Ruta | Qué hace |
|---|---|
| `/archivo` | Estantería o Catálogo (misma lista), búsqueda, filtros y orden |
| `/archivo/nuevo` | Alta de libro (carga manual + búsqueda opcional en Open Library) |
| `/archivo/[id]` | Ficha: datos, estado, progreso, calificación, lecturas, historial, journal, eliminar |
| `/archivo/[id]/editar` | Edición de todos los datos y de la portada |
| `/api/portadas/[id]` | Sirve la portada solo a su dueña (401 sin sesión) |
| `/api/libros/buscar?q=` | Proxy autenticado a Open Library (opcional) |

## Modelo de datos (`db/migrations/0003_archivo.sql`)
```
libros            id, user_id, biblioteca_id, titulo, autores[], isbn, saga, saga_numero, generos[], etiquetas[],
                  paginas_total, sinopsis, estado, calificacion(1-5), portada_version, origen, openlibrary_key
lecturas          id, libro_id, user_id, numero, estado, fecha_inicio, fecha_fin, pagina_actual
sesiones_lectura  id, lectura_id, user_id, fecha, pagina_inicio, pagina_fin, minutos, nota
portadas          libro_id, user_id, mime, datos(bytea ≤ 500 KB)
preferencias      + vista_archivo ('estanteria' | 'catalogo')
```
- **`libros.estado` es el estado actual**: espejo del estado de la última lectura (`quiero_leer` si todavía no hay lecturas).
- **Relecturas:** cada vez que se lee el libro hay una fila en `lecturas` (`numero` 1, 2, 3…). Una relectura suma una fila; nunca se pisa la anterior ni su historial.
- **Historial de progreso:** cada avance registrado es una fila de `sesiones_lectura` (de qué página a cuál, minutos y nota opcionales). Corregir una página hacia atrás también queda registrado.
- **Fechas:** son `date` (sin hora). En la app se leen como texto `YYYY-MM-DD` para evitar corrimientos de zona horaria; «hoy» se calcula en horario de Argentina.
- **Portadas:** se reducen en el navegador (máx. 600 px, 400 KB, WebP/JPEG) y se guardan en la base (`bytea`). El servidor vuelve a validar tamaño y formato real por los primeros bytes (JPG/PNG/WebP; se rechaza SVG y todo lo demás). `portada_version` cambia al reemplazarla y se usa en la URL (`?v=`) para cachear sin riesgo.
- **Eliminar** un libro borra en cascada lecturas, sesiones y portada.

### Reglas que impone la base (aunque el código fallara)
- Rango de calificación, páginas (1–20000), ISBN con formato, estados válidos, largos de texto.
- `pagina_actual`, y las páginas de cada sesión, no pueden superar `paginas_total` (trigger `verificar_progreso`).
- No se puede bajar `paginas_total` por debajo del progreso ya registrado (trigger `verificar_total_paginas`).
- `fecha_fin` solo en lecturas terminadas/abandonadas y nunca anterior a `fecha_inicio`.
- FK compuestas `(id, user_id)`: ninguna fila puede apuntar a datos de otra persona.
- RLS con `user_id = app_user_id()` en las cuatro tablas; el rol de la app no puede modificar `id`, `user_id` ni `biblioteca_id`.

## Reglas de negocio (`src/modules/archivo/repositorio.ts`)
- Crear/editar con estado ≠ «quiero leer» crea la lectura n.º 1 (o modifica la más reciente). Con estado «terminado» y total conocido, el progreso se completa y queda en el historial.
- Registrar progreso en un libro «quiero leer» inicia la lectura; en uno pausado lo retoma; al llegar a la última página (con total conocido) la lectura pasa a «terminado» con la fecha del registro.
- Una lectura terminada o abandonada no recibe más progreso: se usa «Empezar una relectura».
- No se vuelve a «quiero leer» un libro que ya tiene lecturas.

## Búsqueda en Open Library
`src/lib/openlibrary.ts`. Es opcional y siempre corregible: rellena título, autores, ISBN (válido), páginas, géneros y la portada sugerida. Si el servicio falla, el formulario lo dice y se puede cargar a mano. La portada se descarga en el servidor desde `covers.openlibrary.org` (host fijo, id numérico validado) y se guarda como cualquier otra.
Nota: los «géneros» de Open Library vienen en inglés y con mucho ruido; están pensados para corregirse.

## Cómo probar cada funcionalidad
**Automáticas** (`npm test`):
| Qué | Dónde |
|---|---|
| Validación del formulario, ISBN, páginas, fechas, listas | `src/modules/archivo/archivo.test.ts` |
| Búsqueda (sin tildes/mayúsculas), filtros por estado/autor/género/saga/etiqueta/calificación, orden | `src/modules/archivo/archivo.test.ts` |
| Open Library (normalización, URL, errores, tope de portada) | `src/lib/openlibrary.test.ts` |
| Crear, leer, actualizar, eliminar; progreso; relecturas; fechas; portadas; tope de páginas; aislamiento entre usuarios; restricciones de la base | `db/tests/archivo.test.ts` (Postgres real con PGlite, mismo código que la app) |

**Manuales** (con la app conectada a una base; ver `docs/CONFIGURACION.md`):
1. **Alta manual:** `/archivo/nuevo` → completar solo el título → «Guardar libro» → aparece la ficha. Probar errores: ISBN `9780306406158` (dígito verificador mal) o páginas `0`.
2. **Alta con búsqueda:** escribir «Dune Frank Herbert» → «Buscar» → «Usar» → corregir datos → guardar. Debe verse la portada.
3. **Portada propia:** subir una foto grande (varios MB): se reduce sola antes de guardar.
4. **Seguimiento:** en la ficha, «Registrar progreso» con una página menor al total → cambia el %; con una mayor → error; con el total exacto → pasa a «Terminado».
5. **Relectura:** en un libro terminado, «Empezar una relectura» → aparecen «Lectura n.º 2» y la 1 intacta con su historial. «Modificar fechas» edita cada lectura.
6. **Vistas y filtros:** `/archivo` → alternar Estantería/Catálogo (se recuerda la elección), buscar «garcia» (encuentra «García»), usar los filtros y el orden.
7. **Eliminar:** «Eliminar libro» → «Cancelar» no hace nada; confirmar borra el libro y su historial.
8. **Aislamiento:** crear una segunda cuenta y comprobar que no ve nada de la primera; `/api/portadas/<id>` de otra persona devuelve 404 y sin sesión 401.

## Pendiente / límites conocidos
- El «journal del libro» enlaza a El Escritorio, que todavía no existe (la ficha lo dice).
- Los «lomos» de la estantería muestran la portada de frente, no el canto del libro.
- Las portadas viven en Postgres: sirve para bibliotecas personales (unos 60 KB cada una); si el volumen crece conviene moverlas a un almacenamiento de archivos.
- No se puede borrar una sesión suelta del historial (sí corregir la página registrando una nueva).
- Las etiquetas y géneros son texto libre con sugerencias de lo ya usado; no hay pantalla para renombrarlos en bloque.
