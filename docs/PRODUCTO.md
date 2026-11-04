# UMBRAL — El Archivo de los Mundos · Documento de producto

> «Los libros no se guardan. Se habitan.»

## Qué es
Un journal digital de lectura que se vive como un videojuego de fantasía medieval realista. La usuaria (la **Guardiana**) recibe una biblioteca mágica antigua y la reconstruye con sus lecturas. Cada libro, reseña y actividad hace evolucionar el mundo.

No es un dashboard de tarjetas disfrazado de juego: es un espacio inmersivo, legible y cómodo de usar todos los días, en computadora y celular, con cuentas personales y datos persistentes.

- Idioma: español de Argentina (voseo: «registrás», «cruzá»).
- Tono: antiguo, misterioso, elegante, realista. Nada infantil, sin exceso de brillo.

## Habitaciones
| # | Habitación | Propósito | Fase |
|---|---|---|---|
| I | La Gran Sala | Espacio principal interactivo; puerta a las demás | Núcleo |
| II | El Archivo | Biblioteca personal: libros, estanterías, categorías, colecciones | Núcleo |
| III | El Escritorio | Journal: reseñas, citas, reflexiones, imágenes, recuerdos | Núcleo |
| IV | El Taller | Personalización de ambientes, muebles, fondos, apariencia | Núcleo |
| V | La Torre | Estadísticas, desafíos, niveles, recompensas, logros | Futuro |
| VI | Los Portales | Experiencias narrativas y desafíos especiales | Futuro |

Fuente de verdad en código: `src/modules/registry.ts`.

## Fuera de alcance (por ahora)
Mascotas, guardianes/compañeros jugables, crianza de criaturas, multijugador, chat público, compras con dinero real, sistemas competitivos. El dragón del logo es **solo identidad visual**; no es una mascota interactiva.

## Principios
1. **Ninguna función falsa.** Si algo no existe, la interfaz lo dice («En preparación»). Un módulo solo puede declararse `disponible` en el registro cuando esté implementado.
2. **Sin datos de ejemplo como sustituto** de funciones reales.
3. **Legibilidad primero.** La decoración nunca compite con leer o navegar.
4. **Fantasía con función.** No se agregan sistemas complejos que no aporten.
5. **Diseñado para crecer.** Los sistemas fuera de alcance deben poder sumarse sin rehacer la app.

## Requisitos transversales
Persistencia real · seguridad por usuario · validación de datos · accesibilidad · buen rendimiento en celular · estados de carga y error · pruebas de las funciones importantes · documentación.
