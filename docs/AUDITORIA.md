# Auditoría integral — primera pasada

Fecha: 2026-11-02. Alcance acotado a lo que se pudo **verificar**; lo no verificado figura como tal.

## Resultados de pruebas
- `npx vitest run`: 17 archivos, **217 pruebas pasan** (incluye RLS, aislamiento entre personas, Torre y Taller sobre Postgres real vía PGlite).
- `npx tsc --noEmit`: sin errores. `npm run lint`: 0 errores, 4 warnings (variables sin usar).
- `npm audit --omit=dev`: **0 vulnerabilidades**.
- Navegador (dev): `/sala`, `/archivo`, `/escritorio`, `/taller`, `/taller/sala`, `/taller/journal`, `/torre`, `/portales` responden 200 con sesión; sin errores de consola con la nueva CSP.
- `npm run build`: compila y genera todas las rutas, incluida `/api/exportar`, tras los cambios de esta pasada.

## Correcciones realizadas
1. **Cabeceras de seguridad** (`next.config.ts`): CSP (scripts/estilos propios, imágenes solo propias, `covers.openlibrary.org` y `archive.org` (a donde redirige), `frame-ancestors 'none'`, `object-src 'none'`), HSTS (solo producción), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Verificadas `X-Frame-Options` y CSP en respuesta real.
2. **Exportación de datos** (`/api/exportar`, botón en El Taller): JSON con las 14 tablas de la persona (binarios en base64), solo con sesión (401 sin ella), `no-store`. Probada con la cuenta de prueba.
3. **Navegación móvil:** la barra inferior tenía 4 columnas para 5 módulos desde que la Torre pasó a núcleo; ahora se calcula según el registro (5 columnas de 75 px a 375 px, sin scroll horizontal).
4. **Documentación:** `TALLER.md`, `DESPLIEGUE.md`, PLAN y README actualizados.

## Seguridad: estado
| Área | Estado |
|---|---|
| Autorización | Sesión validada en proxy y en cada lectura; RLS por `user_id` en todas las tablas de UMBRAL (revisado en migraciones 0002–0006) |
| Privilegios de base | Rol `umbral_app` sin `BYPASSRLS`, grants mínimos por columna, libro mayor de Torre solo de agregar |
| Archivos privados | Portadas e imágenes se sirven solo a su dueña (401/404), `nosniff`, `sandbox`; formato por firma real, ≤ 600 KB |
| Inyección SQL | Consultas parametrizadas; en `/api/exportar` el único SQL interpolado usa una lista fija de tablas |
| XSS | Sin `dangerouslySetInnerHTML` en `src`; contenido del editor renderizado por componentes; CSP como segunda barrera |
| Secretos | Solo en `.env.local` (ignorado); no hay claves en el código |
| Sesiones | Cookie httpOnly, 30 días, revocación al cambiar contraseña |
| Dependencias | 0 vulnerabilidades conocidas hoy |

## Funcionalidades
**Completas (con pruebas):** autenticación y onboarding, Archivo (libros, lecturas, portadas, estantería), Escritorio (journal), Gran Sala, Torre (XP, Esencias, misiones, logros, tienda, inventario), personalización de sala y journal en servidor, exportación.

**Parciales:**
- Importación del respaldo (`/api/importar`, `src/modules/respaldo/`): hecha y probada (`db/tests/respaldo.test.ts`, 6 pruebas: restauración fiel, idempotencia, no pisa, ignora `user_id`, rechaza cuentas ajenas, contenido e imágenes falsas). En la app real solo se probó con la cuenta de prueba, que no tiene libros. No importa progreso ni inventario.
- Taller: plantillas del journal, estilos y uso de objetos comprados probados por tests pero **no recorridos a mano** en celular real.
- Persistencia entre dispositivos: garantizada por diseño (todo está en Postgres, nada en `localStorage`), no probada con dos dispositivos reales.
- Rendimiento: **no medido** (sin Lighthouse ni prueba con cientos de libros); las portadas ya van con `loading` perezoso y caché inmutable.
- Diseño vs. archivo de identidad: no se hizo una comparación pantalla por pantalla en esta pasada; paleta y tipografías vienen de los tokens extraídos en la etapa 1.
- Accesibilidad: hay `aria-*`, foco y teclado en editor de sala; no se corrió una auditoría automatizada (axe).

## Riesgos pendientes
1. **Límite de intentos de login en memoria:** con varias instancias serverless no es global; mover a base antes de abrir a más personas.
2. **Farmeo en Torre:** recompensas atadas al id del libro; crear y borrar libros ficticios repite premios (documentado en `TORRE.md`).
3. **Imágenes en Postgres:** simple y respaldable, pero el plan gratuito (0,5 GB) se llena con muchas imágenes.
4. **CSP con `'unsafe-inline'` en scripts:** necesario sin nonce con prerender; endurecer con nonces requiere renderizado dinámico.
5. **Despliegue real no hecho:** ni build de producción final, ni SMTP real, ni Neon con correo verificado.
6. **Supabase:** la app es compatible como Postgres, no usa Supabase Auth/Storage.
7. **Cuenta de prueba** `taller-prueba@example.test` sigue en Neon; borrar antes de uso real (requiere confirmación).
8. **Proyecto sin repositorio Git:** no hay historial ni respaldo del código.

## Recomendaciones
Correr `npm run build` y Lighthouse móvil; probar con 500 libros y paginar la estantería si hace falta; ejecutar axe sobre las pantallas principales; agregar importación del respaldo; mover el rate limit a la base; crear el repositorio y publicar en un entorno de prueba antes del definitivo.
