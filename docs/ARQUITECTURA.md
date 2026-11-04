# Arquitectura

## Stack
| Pieza | Elección | Estado |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `cacheComponents`) + React 19 | En uso |
| Lenguaje | TypeScript estricto | En uso |
| Estilos | Tailwind CSS v4, tokens en `src/app/globals.css` (`@theme`) | En uso |
| Tipografías | EB Garamond (marca) e Inter (interfaz) vía `next/font/google` | En uso |
| Pruebas | Vitest | En uso (único agregado fuera del scaffold; ver Decisiones) |
| Base de datos | PostgreSQL (Neon en la nube; PGlite en local) vía `pg`, con RLS | En uso (Etapa 2) |
| Cuentas y sesiones | Better Auth (correo y contraseña, cookies httpOnly) | En uso (Etapa 2) |
| Correo | SMTP con `nodemailer` | En uso (Etapa 2) |
| Archivos (imágenes del journal) | Por definir (Etapa 4) | Pendiente |
| Validación | zod (esquemas compartidos cliente/servidor) | En uso |

## Estructura
```
src/
  app/
    layout.tsx            fuentes, metadatos, viewport
    page.tsx              landing pública
    (mundo)/              grupo de rutas con el shell de navegación
      layout.tsx          barra lateral (escritorio) / barra inferior (celular)
      sala|archivo|escritorio|taller|torre|portales/page.tsx
  components/
    brand/Logo.tsx        único punto de acceso a los SVG oficiales
    escena/               Escena + Capa (parallax por capas), Cielo (estrellas, montañas)
    mundo/                navegación, lista de habitaciones, estado "en preparación"
    ui/Iconos.tsx         iconos de línea de la navegación
  modules/registry.ts     registro tipado de habitaciones
public/brand/             recursos de marca extraídos del SVG original
brand/source/             archivos originales (lámina .svg, .ai) — no tocar
scripts/extract-brand.mjs reproduce public/brand/ desde brand/source/
```

## Modularidad
- **Un registro, muchos consumidores.** `registry.ts` alimenta la navegación, la landing y cada página de habitación. Sumar un módulo = una entrada + una carpeta en `(mundo)/`.
- **Futuros sistemas** (mascotas, compañeros, multijugador, chat, competencia) deberán entrar como módulos nuevos en `src/modules/<sistema>/` con su propio esquema de datos, sin modificar los existentes. No hay código ni tablas para ellos hoy.
- **2.5D:** `Escena`/`Capa` ya modelan una escena por profundidad. Hoy mueven capas CSS con el puntero; la Gran Sala podrá reemplazar su contenido por una escena interactiva sin cambiar el contrato.

## Decisiones
- **SVG de marca como `<img>`**, no inline: los gradientes del original usan ids que colisionarían entre instancias.
- **Solo tema oscuro** en Etapa 1: la identidad (logotipo durazno) está diseñada para fondos ciruela/morado. Un modo «papel» marfil para el journal queda por definir (ver `brand/README.md`).
- **Vitest** se agrega porque el brief exige pruebas y el scaffold no trae runner. Se subió `@types/node` a 24 por su peer dependency.
- **Sin librerías de iconos ni de animación:** iconos SVG propios y animaciones CSS.

## Cuentas y datos (Etapa 2)
```
src/proxy.ts                  redirige antes de transmitir: valida la sesión contra la base
src/lib/config.ts             variables de entorno requeridas (se leen en cada petición)
src/lib/db.ts                 pool de pg y conUsuario(): transacción como rol umbral_app + app.user_id
src/lib/auth/auth.ts          configuración de Better Auth (instancia perezosa)
src/lib/auth/dal.ts           autorización real y lectura del estado de la Guardiana
src/lib/correo.ts             envío SMTP y plantillas de correo
src/lib/validacion.ts         esquemas zod compartidos cliente/servidor
src/app/api/auth/[...all]/    endpoints de Better Auth (verificar correo, restablecer)
src/app/(auth)/               ingresar, registro, recuperar, restablecer + actions.ts
src/app/bienvenida/           onboarding (page + actions)
src/modules/onboarding/       apariencias y derivación del paso pendiente
db/migrations/                SQL versionado (0001 Better Auth, 0002 UMBRAL + RLS)
db/tests/rls.test.ts          pruebas de aislamiento entre usuarios (Postgres real)
scripts/migrar.mjs            aplica las migraciones (npm run db:migrar)
```
- **Capas de acceso:** proxy (valida sesión antes de transmitir) → DAL en el servidor (autoriza cada lectura) → RLS en la base (última barrera, aun si el código fallara).
- **RLS sin Supabase:** Neon no ofrece `auth.uid()`. `conUsuario()` abre una transacción, baja al rol `umbral_app` (sin `BYPASSRLS`, sin acceso a las tablas de Better Auth) y fija `app.user_id`; las políticas usan `app_user_id()`. Todo acceso a tablas de UMBRAL debe pasar por `conUsuario()`.
- **El onboarding no guarda un contador de pasos:** el paso pendiente se deduce de lo ya guardado (`derivarPaso`), por eso puede retomarse siempre.
- **Sin acceso a la base desde el navegador:** todo pasa por Server Actions; la sesión vive en una cookie httpOnly.
- **Next 16 + `cacheComponents`:** las partes que leen cookies o `searchParams` van dentro de `<Suspense>` en la propia página (el caparazón es estático, el contenido se transmite).
- **Decisiones nuevas:** `better-auth` (cuentas sobre Postgres propio, sin proveedor de pago), `pg`, `nodemailer`, `zod` (esquema único cliente/servidor) y `@electric-sql/pglite` solo en desarrollo (Postgres real para pruebas y desarrollo local sin cuenta ni Docker).
- **Pendiente de endurecer:** límite de intentos en memoria (mover a la base con varias instancias); la sesión se valida con una consulta por navegación privada (aceptable hoy, cacheable más adelante).

## El Archivo (Etapa 3)
Ver `docs/ARCHIVO.md` (modelo de datos, reglas y pruebas). Piezas: `src/modules/archivo/` (tipos, esquemas zod, filtros puros, repositorio SQL), `src/app/(mundo)/archivo/` (páginas y Server Actions), `src/components/archivo/` (estantería, catálogo, formulario, ficha), `src/lib/openlibrary.ts` e `imagen.ts`.
- **Repositorio sin dependencia de pg:** `repositorio.ts` recibe una interfaz `Db`; la app le pasa la conexión de `conUsuario()` y las pruebas le pasan PGlite, de modo que se prueba el mismo código contra Postgres real.
- **Una lista, dos vistas:** el servidor entrega `LibroResumen[]` y el cliente filtra/ordena con funciones puras (instantáneo); estantería y catálogo consumen exactamente esa lista.
- **Portadas en la base** (bytea, ≤ 500 KB, validadas por bytes): sin servicio externo ni cuenta nueva. Ver límites en docs/ARCHIVO.md.
- **Next 16:** las páginas se conservan ocultas al navegar (Activity); por eso los campos no controlados que dependen de datos del servidor llevan `key`.

## El Escritorio (Etapa 4)
Ver `docs/ESCRITORIO.md`. Piezas: `src/modules/escritorio/` (bloques y esquemas zod, páginas y plantillas, controlador de autoguardado, repositorio SQL), `src/app/(mundo)/escritorio/`, `src/components/escritorio/` y `src/app/hojas.css`.
- **Contenido como JSON validado, nunca HTML:** el servidor valida cada bloque con un esquema estricto y la pantalla es React (escapa todo). El texto enriquecido usa un subconjunto mínimo de Tiptap (única librería nueva de la etapa: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`), cargada solo en el editor.
- **Autoguardado como clase pura** (`Autoguardado`): se prueba con reloj simulado; el componente solo la conecta.
- **Concurrencia optimista** con `version` por página: un guardado viejo nunca pisa uno nuevo.
- **Plantilla = capa de estilo** (`data-plantilla`): cambiarla no toca los datos.

## La Gran Sala (Etapa 5)
Ver `docs/SALA.md`. Piezas: `src/modules/sala/` (objetos interactivos con sus coordenadas, lomos de la colección, libro destacado y datos de El Taller), `src/components/sala/` (arte SVG por capas, escena interactiva, cámaras de las estancias, panel del Taller) y `src/app/sala.css`.
- **Sin sistemas paralelos:** la escena lee `libros`, `diario_paginas` y `personalizaciones`; sus objetos apuntan a las mismas rutas que la navegación. Un test verifica que cada objeto tiene una acción definida y que sus rutas existen en el registro de módulos.
- **Arte y objetos comparten coordenadas** (1600 × 900): los objetos se posicionan en porcentaje sobre el mismo lienzo que el SVG, y el parallax mueve juntos arte y objetos de la capa de muebles.
- **Sin dependencias nuevas:** SVG propio, CSS y las utilidades de escena de la Etapa 1 (`Escena`/`Capa`).
- **Movimiento:** `prefers-reduced-motion` + preferencia guardada (`preferencias.reducir_movimiento`), aplicada con `data-movimiento` en el shell privado.
- **Next 16:** las páginas se conservan ocultas al navegar; los ids de gradientes del SVG llevan un prefijo único (`useId`) para no chocar con copias ocultas de la misma escena.
