# Escenas ilustradas — Fases A y B

Origen: `UMBRAL_CLAUDE_CODE_ESCENAS_CARGA_Y_TRANSICIONES.md`. Se hicieron la **Fase A (diagnóstico)** y la **Fase B (registro y fondos 01–09)**. Las fases C (carga real), D (cinemáticas y primer ingreso) y E (recompensas) **no** se hicieron.

## Fase A — diagnóstico
- La app ya tenía acceso, onboarding, Gran Sala, Archivo, Escritorio/Journal con autoguardado, Taller (personalización en 4 habitaciones), La Torre y exportación/importación. Nada de eso se tocó en datos ni en lógica.
- El paquete `UMBRAL_escenas_individuales/` (WebP Full HD y 4K, `manifest.json`) **no se recibió**: solo las 13 imágenes y la panorámica sueltas. Se usaron esas.
- Esas imágenes traían **barras oscuras difuminadas** (arriba y abajo, algunas a los lados). Se recortaron a mano al contenido y se exportaron a WebP (≈ 1,8 MB las 14). Quedan con su proporción real, entre 1,8:1 y 2,1:1, sin estirar.
- Las imágenes son ampliaciones de recortes del storyboard: no tienen detalle nativo de Full HD.

## Fase B — registro y fondos
`src/config/sceneRegistry.ts` es la única fuente de rutas: `SCENES[id]` con archivo, dimensiones reales, rol, texto alternativo y `objectPosition`. Los componentes piden el fondo por id con `SceneBackground` (fallo de imagen → no se muestra nada y queda el degradado de marca; la interfaz sigue andando).

| Escena | Archivo | Dónde se usa hoy |
|---|---|---|
| 01 bienvenida | `01_bienvenida_castillo` | Landing `/` |
| 02 portal | `02_portal_de_ingreso` | Ingreso, registro y recuperación |
| 03 invitación | `03_invitacion_identidad` | Onboarding `/bienvenida` |
| 04 revelación | `04_revelacion_biblioteca` | Registrada; **sin usar** (Fase D) |
| 05 Gran Sala | `05_gran_sala` | `/sala` y editor del Taller |
| 06 Archivo | `06_archivo` | Cabecera de `/archivo` y editor |
| 07 Escritorio | `07_escritorio_journal` | Cabecera de `/escritorio` y editor |
| 08 Taller | `08_taller` | Cabecera de `/taller` y editor |
| 09 Torre | `09_torre` | Cabecera de `/torre` |
| 10–13 | puerta, libro, carga, recompensa | Registradas; **sin usar** (Fases C–E) |

La panorámica (`05_gran_sala_panorama`, 6,4:1) está en `public/escenas/` pero no se usa como fondo.

### Gran Sala: puntos de acceso nuevos
Cada uno está sobre algo que existe en la imagen (`src/modules/sala/objetos.ts`):
estanterías bajo la escalera → Archivo · escritorio → Escritorio · mesa del astrolabio → Taller · escalera → Torre · puerta bajo el balcón → panel de estancias · gran ventanal y estandarte → paneles de inspección · lámpara → enciende/apaga las velas. Se quitó el acceso al «libro destacado» (ya no hay un atril en la escena); ese libro se abre desde el Archivo. La navegación en lista sigue como alternativa.

## Pendiente
- Fase D: primer ingreso 02→03→04, transiciones de puerta y libro, precarga y cancelación de navegaciones obsoletas.
- Fase E: modal de recompensa con la escena 13.
- Escenas 06, 07 y 08 traen decoración pintada fija; para personalización total harían falta versiones de habitación vacía.
- El Taller (editor de decoración) se retoma más adelante.

## Actualización: inicio, Gran Sala decorada y pantallas de carga
- **Inicio (`/`)**: usa «Castillo al atardecer entre cascadas y montañas» (escena 01, 1672 × 941).
- **Gran Sala**: usa la biblioteca gótica vacía (escena 05, 1672 × 941). La decoración de partida son **objetos normales** del catálogo (`DECORACION_INICIAL` en `src/modules/taller/sala.ts`: escritorio, dos sillones, astrolabio, globo, telescopio, cofre, plantas, libros, velas, cristal y un farol de pared). Quien ya guardó su sala conserva la suya; las cuentas nuevas y «Restablecer la sala» empiezan con esta. Una prueba verifica que cumpla las reglas de colocación.
- **Accesos de la Gran Sala** (sobre la arquitectura de la imagen): estanterías → Archivo · gran ventanal → Torre · bajo el balcón → Escritorio · arcos de la derecha → Taller · chimenea → velas · puerta lateral → estancias · ventanal y estandarte → paneles. El Taller (editor) queda tal como está; se retoma más adelante.
- **Pantallas de carga** (`PantallaCarga`): cuatro fondos (`public/escenas/carga/`; el del libro se limpió del dragón y la barra dibujados), logo oficial, barra **indeterminada** (no se inventa un porcentaje) y frases que rotan cada 6 s. Aparece recién a los 250 ms (una carga rápida no deja destello) y se usa al abrir el mundo y como `loading.tsx` de `(mundo)`. A los 12 s ofrece «Reintentar» e «Ir a la Gran Sala».
- **Frases**: las citas que la persona guardó en su journal (bloques `cita`) se dejan en el navegador (`localStorage`, clave `umbral-frases-v1`) cada vez que abre el mundo; las pantallas de carga las intercalan con frases generales sobre leer (`src/modules/frases/`). Sin citas, solo las generales.
