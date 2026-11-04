# La Gran Sala — la navegación como escenario

La Gran Sala (`/sala`) es el punto de entrada del mundo: una ilustración 2.5D de la biblioteca cuyos objetos abren las habitaciones reales de la app. **No hay un sistema paralelo**: la escena lee los datos que ya existen (libros del Archivo, páginas del Escritorio, apariencia elegida) y sus objetos llevan a las mismas rutas que la barra de navegación y la lista alternativa.

> **Actualización:** la Gran Sala usa ahora una ilustración pintada (`public/escenas/05_gran_sala.webp`, ver `docs/ESCENAS.md`) con los objetos interactivos encima (`src/modules/sala/objetos.ts`). El arte vectorial descrito abajo ya no se muestra en la Sala; los lomos por libro ya no se dibujan. La decoración del Taller se dibuja encima con objetos pintados (`public/objetos/`).

## Dirección artística
- Arte **original en SVG vectorial**, dibujado para UMBRAL: sin imágenes externas, sin enlaces que puedan romperse y sin licencias de terceros. Pesa unos pocos KB.
- Arquitectura medieval fantástica: muro de piedra, ventanales góticos con luna y montañas, estantería y muebles de madera, velas, piso de madera con alfombra.
- Colores: ciruela, morado, durazno, malva y marfil, más mezclas derivadas (maderas, piedra, sombras).
- El dragón aparece solo como **alas talladas en el escudo** de la pared (inspeccionable). No es un personaje ni se mueve.
- Tres capas con el mismo sistema de coordenadas (1600 × 900): fondo, muebles (con los objetos interactivos) y primer plano. Con el mouse hay un parallax suave entre capas.

## Objetos y qué hace cada uno
| Objeto | Acción real |
|---|---|
| Estantería | Abre **El Archivo** (`/archivo`). Muestra **un lomo por cada libro real** de tu colección (forma y color estables por libro); sin libros, los estantes están vacíos |
| Escritorio | Abre **El Escritorio** (`/escritorio`); su rótulo cuenta tus páginas del journal |
| Mesa de trabajo | Abre **El Taller** (`/taller`) |
| Puerta | Abre un panel para **cambiar de estancia** (Sala, Archivo, Escritorio, Taller; Torre y Portales figuran como «Próximamente», sin enlace) y salir al inicio |
| Atril | Abre la **ficha del libro destacado**: el que estás leyendo (el de inicio más reciente); si no hay, el último agregado; sin libros, lleva a «Agregar libro». Muestra su portada real |
| Ventana de la torre | Abre **La Torre** (`/torre`); la ventana derecha del muro muestra la torre |
| Escudo | Panel de **inspección** del emblema |
| Ventanal | Panel de **inspección**: cuenta qué luz tiene hoy la biblioteca y enlaza a El Taller para cambiarla |
| Candelabro | **Enciende o apaga las velas** (luz y parpadeo); se recuerda en el navegador |

No existen objetos «decorativos clickeables» sin acción. Lo que no tiene función (ladrillos, alfombra, columnas) no responde al cursor.

## Estancias
- **Gran Sala:** `/sala`.
- **Archivo:** la representación visual de la colección es la **vista Estantería** de `/archivo` (los mismos libros que el Catálogo), más una «cámara» sobre la estantería de la Sala.
- **Escritorio:** `/escritorio` con una cámara sobre el escritorio.
- **Taller:** `/taller` con una cámara sobre la mesa de trabajo. Hoy permite cambiar **la luz de la biblioteca** (Noche de luna, Ocaso malva, Alba durazno; es el mismo dato que se elige en la bienvenida) y **reducir el movimiento**. Desde la etapa 6 también permite decorar la sala y personalizar el journal (ver `docs/TALLER.md`).
- Las «cámaras» son recortes (`viewBox`) de la misma ilustración, no arte duplicado. Cada una trae «← Gran Sala».

## Luz y apariencia
La apariencia cambia variables CSS de la escena (`src/app/sala.css`): color del cielo, intensidad de la luna, color de los rayos y tinte general. Cambiarla en El Taller muestra una **vista previa inmediata** y se guarda al confirmar; la Sala la refleja.

## Exploración y accesibilidad
- **Ratón:** pasar el cursor ilumina el objeto y muestra su rótulo con datos reales.
- **Teclado:** `Tab` recorre los objetos; las flechas ← → (y Inicio/Fin) también, de izquierda a derecha; `Enter`/`Espacio` activan; `Esc` cierra los paneles.
- **Táctil:** en celular la sala es más ancha que la pantalla y se recorre **deslizando** (empieza centrada en la puerta); los objetos miden 44 px o más y los rótulos quedan siempre visibles.
- **Sin la escena:** un enlace «Saltar la escena» (visible con el teclado) y la sección **Navegación en lista**, con las mismas puertas. Cada objeto tiene nombre accesible con sus datos (p. ej. «La estantería: abre El Archivo (2 libros)»).
- **Volver a la Gran Sala** desde cualquier sección: primer ítem de la barra lateral y de la barra inferior, y «← Gran Sala» en las cámaras.
- **Transición entre habitaciones:** al tocar un objeto la cámara se acerca a él y se abre la habitación; al volver, la escena aparece restablecida.

## Rendimiento y movimiento
- Solo se animan `transform` y `opacity`; no hay imágenes ni vídeo en la escena. La única imagen es la portada del libro destacado (cargada de tu biblioteca).
- **Movimiento reducido:** se respeta `prefers-reduced-motion` del dispositivo y, además, la preferencia «Reducir siempre» de El Taller (guardada en tu cuenta). Con ella se desactivan parpadeo de velas, respiración de la luz, parallax y transición de zoom (se navega directo).
- La escena se renderiza en el servidor (HTML/SVG) y es interactiva al hidratar.

## Cómo probarlo
**Automáticas** (`npm test`): `src/modules/sala/sala.test.ts` (objetos dentro de la escena, sin superposiciones, con acción definida y rutas reales; libro destacado; lomos de la colección real) y `db/tests/sala.test.ts` (Postgres real: cambiar la apariencia solo la propia y solo valores válidos, preferencia de movimiento, conteo de páginas del journal).

**Manuales** (con la app conectada; ver `docs/CONFIGURACION.md`):
1. Entrá a `/sala`: debe verse la escena con tu libro actual sobre el atril y un lomo por libro en la estantería.
2. Tocá cada objeto: estantería → Archivo; escritorio → Escritorio; mesa → Taller; atril → ficha del libro; puerta/escudo/ventanal → paneles; candelabro → velas.
3. Con teclado: `Tab` y ← →; con `Enter` abrí un objeto.
4. En `/taller` elegí otra luz: la vista previa cambia; guardá; volvé a la Sala.
5. Activá «Reducir siempre» y comprobá que ya no hay animaciones.
6. En un celular (o a 375 px): deslizá la sala, tocá objetos, verificá que no hay scroll horizontal de la página.
7. Desde cualquier sección, volvé con «Gran Sala».

## Límites conocidos y próximos pasos
- La escena es una ilustración fija: no se «camina» por ella ni hay otras estancias navegables dentro del escenario (no hay exploración 3D).
- Las estancias de Archivo, Escritorio y Taller son vistas de la misma sala, no escenarios propios.
- Con pocos libros la estantería se ve vacía (es la representación honesta de la colección).
- Torre y Portales no tienen objeto en la escena hasta que existan.
- Más adelante: más luces y objetos según el progreso, muebles elegibles en El Taller, accesorios del escudo.
