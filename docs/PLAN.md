# Plan de implementación

Desarrollo por etapas. Cada una termina con informe y **espera la indicación de la siguiente**.

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Fundamentos visuales y técnicos: marca, tokens, landing, navegación, registro de módulos, docs, pruebas | ✅ Hecha |
| 2 | Cuentas y persistencia: Postgres + Better Auth, RLS, onboarding, pruebas de acceso por usuario | ✅ Hecha y probada contra Postgres local; falta la prueba en Neon y con SMTP real (docs/CONFIGURACION.md) |
| 3 | El Archivo: alta/edición/eliminación de libros, seguimiento, relecturas, portadas, estantería y catálogo | ✅ Hecha y probada (docs/ARCHIVO.md) |
| 4 | El Escritorio: journal por libro y diario general, editor de bloques, plantillas, imágenes, papelera | ✅ Hecha y probada (docs/ESCRITORIO.md) |
| 5 | La Gran Sala: escenario 2.5D con objetos que abren cada habitación, estancias, El Taller (luz y movimiento) | ✅ Hecha y probada (docs/SALA.md) |
| 6 | El Taller: decorar la sala, plantillas del journal, movimiento (docs/TALLER.md) | ✅ Hecha y probada con tests; la prueba manual en celular y de plantillas quedó parcial |
| 7 | La Torre: XP, Esencias, misiones, logros, tienda e inventario (docs/TORRE.md) | ✅ Hecha y probada |
| — | Auditoría integral: seguridad, exportación, despliegue (docs/AUDITORIA.md, docs/DESPLIEGUE.md) | ✅ Primera pasada hecha |
| 8+ | Los Portales; rediseño de jugabilidad | Futuro |

## Criterios de salida por etapa
Compila sin errores · lint limpio · pruebas verdes · funciona en celular (375 px sin scroll horizontal) · accesible con teclado · ninguna función simulada.
