# Publicación

> **Estado (2026-11-04):** UMBRAL **está publicada** en https://umbral-topaz.vercel.app (Vercel, proyecto `umbral`, desplegada desde `main` de GitHub) con la base en Neon.
> Verificado desde afuera: la portada, el ingreso y el registro cargan, `/sala` sin sesión redirige al ingreso, `/api/exportar` responde 401 y llegan las cabeceras de seguridad. **Todavía no se probó** un registro real con el correo de confirmación: hacerlo antes de pasar el enlace.
> Se publica en **modo diario** (solo Archivo y Escritorio; el juego está apagado, ver `docs/MODO_DIARIO.md`).
> Ojo: `BETTER_AUTH_URL` debe ser exactamente esa dirección. La otra (`umbral-maxi-8648.vercel.app`) queda detrás del login de Vercel y no sirve para compartir.

## Qué se necesita (y quién lo hace)
Cuatro servicios gratuitos alcanzan para uso personal. **Los pasos de crear cuenta, copiar claves y pulsar «Deploy» los hacés vos**: requieren tus datos y no se delegan.

| Para qué | Servicio sugerido | Costo |
|---|---|---|
| Guardar el código | GitHub (repositorio **privado**) | gratis |
| Base de datos | Neon (Postgres) | gratis, 0,5 GB |
| Servidor de la app | Vercel | gratis (uso personal) |
| Correo de confirmación y recuperación | Gmail con «contraseña de aplicación», o Resend / Brevo | gratis |

La app **exige confirmar el correo** al registrarse en producción, así que sin correo funcionando nadie puede crear cuenta.

## Plataforma
Next.js 16 corre en Vercel (o cualquier host Node 22+). La base es **Postgres estándar**. Supabase también sirve como Postgres (cadena *pooler*), pero la app **no usa** Supabase Auth ni Storage: las cuentas las maneja Better Auth y las imágenes viven en Postgres (`bytea`, máx. 600 KB cada una).

## Variables de entorno
| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | sí | Cadena Postgres **con pooler** y `sslmode=require` |
| `BETTER_AUTH_SECRET` | sí | ≥ 32 caracteres aleatorios: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BETTER_AUTH_URL` | sí | URL pública con `https://`, sin barra final |
| `SMTP_URL` | sí | Ver «Correo» más abajo |
| `MAIL_FROM` | recomendada | Ej.: `UMBRAL <tu-correo@gmail.com>` |

Nunca subas `.env.local` (está ignorado por Git). Ver `docs/CONFIGURACION.md`.

## Antes de empezar: revisión automática
```bash
npm run preflight -- --produccion
```
Revisa variables, conexión a la base, migraciones, el rol `umbral_app` (sin BYPASSRLS) y el correo, sin mostrar secretos. Se puede correr con las variables en `.env.local` o definidas en la terminal. Si dice «Todo listo», podés publicar.

## Pasos
### 1. Código en GitHub
El proyecto ya es un repositorio Git pero **casi todo el trabajo está sin confirmar** (solo existe el commit inicial de Create Next App). Pedime que haga el commit, o corré:
```bash
git add -A
git commit -m "UMBRAL: primera versión"
```
Después creá un repositorio **privado** en GitHub y seguí las instrucciones que te muestra («push an existing repository»). `.env*` y `.claude/` están ignorados.

### 2. Base de datos (Neon)
1. En neon.tech creá un proyecto nuevo **solo para producción** (no uses el de desarrollo: tiene cuentas de prueba). Elegí una región cercana a la de Vercel (por defecto `iad1`, Washington).
2. Copiá la cadena de conexión **con pooler** (`-pooler` en el host).
3. Migrá, definiendo la variable solo en esa terminal:
   - PowerShell: `$env:DATABASE_URL="postgres://…"; npm run db:migrar`
   - Bash: `DATABASE_URL="postgres://…" npm run db:migrar`
   Debe imprimir `+ 0001…` hasta `+ 0006…`. Es idempotente y **nunca borra datos**.
4. Si Node avisa algo sobre `sslmode`, es solo una advertencia de la librería: la conexión funciona.

### 3. Correo
La forma más simple con Gmail:
1. En la cuenta de Google activá la verificación en dos pasos y creá una **contraseña de aplicación** (myaccount.google.com → Seguridad).
2. `SMTP_URL=smtps://tu-correo%40gmail.com:LA_CONTRASEÑA_DE_APLICACION@smtp.gmail.com:465` (el `@` del correo va como `%40`).
3. `MAIL_FROM="UMBRAL <tu-correo@gmail.com>"`.

Gmail limita el envío diario; para dos o tres personas sobra. Si más adelante querés un remitente propio, usá Resend o Brevo con tu dominio (SPF/DKIM).

### 4. Vercel
1. En vercel.com → *Add New → Project* → importá el repositorio. Framework: Next.js (se detecta solo).
2. En *Environment Variables* (Production) cargá las 5 variables de arriba. `BETTER_AUTH_URL` es la URL que te da Vercel (`https://nombre.vercel.app`) o tu dominio.
3. *Deploy*. Si cambiás `BETTER_AUTH_URL` después, hay que volver a desplegar.

### 5. Primer uso
1. Abrí la URL, pulsá «Cruzar el umbral» → Registro, creá tu cuenta y confirmá el correo.
2. Recorré la bienvenida (nombre de Guardiana y de biblioteca).
3. Verificá las cabeceras: `curl -I https://tu-url` debe mostrar `Content-Security-Policy`, `Strict-Transport-Security` y `X-Frame-Options`.
4. Pedile a tu novia que se registre con su correo. Cada cuenta ve solo lo suyo (RLS en la base).

### 6. Dominio propio (opcional)
Vercel → Settings → Domains: agregá el dominio, creá el registro `CNAME`/`A` que indica y esperá el certificado. Actualizá `BETTER_AUTH_URL` y volvé a desplegar.

## Qué ya está comprobado
- `npm run build` compila y `npm start` sirve la compilación: probado en local con `NODE_ENV=production` (landing, ingreso, registro, imágenes y logo responden 200; `/sala` sin sesión redirige al ingreso; llegan CSP, HSTS, `X-Frame-Options` y `nosniff`).
- 233 pruebas (incluyen RLS y aislamiento entre personas sobre Postgres real).
- `npm audit --omit=dev`: 0 vulnerabilidades (revisión del 2026-11-02; repetir antes de publicar).

## Qué NO está comprobado
- Un despliegue real en Vercel/Neon, el envío de correo real y el tiempo de carga en producción.
- El comportamiento en un celular físico.

## Riesgos a tener presentes
- **El registro está abierto:** cualquiera con la URL puede crear una cuenta (con correo confirmado). Para uso íntimo conviene no difundir la dirección; si hiciera falta, se puede agregar una lista de correos permitidos.
- **Límite de intentos de acceso en memoria:** con varias instancias de Vercel no es global.
- **Imágenes en la base:** el plan gratis de Neon (0,5 GB) se llena con muchas portadas e imágenes del journal.
- **Respaldo:** cada persona puede descargar su copia en El Taller → «Descargar mi respaldo». Neon además permite restaurar a un punto en el tiempo.

## Comandos
```bash
npm run dev           # desarrollo
npm run db:local      # Postgres local (PGlite) para desarrollo
npm test              # 233 pruebas (incluye RLS sobre Postgres real)
npm run lint
npm run build         # compilación de producción
npm start             # servir la compilación
npm run preflight     # revisión del entorno (agregar -- --produccion para publicar)
npm run db:migrar     # aplicar migraciones en la base de DATABASE_URL
```

## Respaldo y recuperación
- **Desde la app:** El Taller → «Descargar mi respaldo» (JSON con libros, notas, imágenes en base64, personalizaciones y progreso).
- **Desde la base:** Neon ofrece restauración a un punto en el tiempo; además `pg_dump "$DATABASE_URL" -Fc -f umbral.dump` periódico.
- **Importar el JSON:** El Taller → «Importar respaldo». Solo **suma** lo que falta (nunca borra ni pisa), conserva los ids (importar dos veces no duplica), es todo-o-nada y revalida contenido e imágenes con las reglas del editor. No importa progreso ni inventario. El diseño de la sala se importa solo si aún no guardaste uno. Sirve para restaurar en la misma cuenta o en una base nueva; **no** para pasar datos entre dos cuentas de la misma base. Límite: 40 MB.
- **Restaurar la base completa:** `pg_restore` del dump a una base nueva, luego `npm run db:migrar`.
