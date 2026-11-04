# Configuración: base de datos, cuentas y correo

Sin estas variables la app **no simula** un backend: las páginas de ingreso muestran «El servicio de cuentas no está conectado» (con la lista de variables que faltan), los formularios quedan deshabilitados y las rutas privadas redirigen a `/ingresar`.

Stack: **Postgres** (Neon, plan gratuito) + **Better Auth** (cuentas, sesiones) + **SMTP** (correos de confirmación y recuperación).

## Opción A — Desarrollo local, sin crear ninguna cuenta
Un Postgres real corre en tu máquina (PGlite en modo servidor; los datos quedan en `.pglite/`).

```bash
cp .env.example .env.local
```
En `.env.local` dejá `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres` y generá el secreto:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
pegalo en `BETTER_AUTH_SECRET`. Después, en dos terminales:
```bash
npm run db:local      # deja el Postgres local escuchando en el puerto 5433
```
```bash
npm run db:migrar     # crea las tablas (una sola vez; se puede repetir sin riesgo)
npm run dev
```
Sin `SMTP_URL`, en desarrollo los correos **no se envían**: el enlace de confirmación o de recuperación aparece en la consola del servidor, y el registro no exige confirmar el correo. Esto solo ocurre fuera de producción.

## Opción B — Neon (nube, gratis)
1. Creá una cuenta en https://neon.tech y un proyecto (región `sa-east-1` / São Paulo).
2. En el panel: *Connect* → copiá la cadena de conexión **con pooler** (`...-pooler...neon.tech/...?sslmode=require`).
3. En `.env.local`: `DATABASE_URL=<esa cadena>`.
4. `npm run db:migrar` (aplica `db/migrations/*.sql` a Neon).

Importante: la migración crea el rol `umbral_app` y concede su uso al usuario de la conexión; hay que ejecutarla con el usuario propietario que da Neon por defecto.

## Correo (SMTP)
Better Auth envía los correos con `nodemailer`. Definí `SMTP_URL` y `MAIL_FROM`. Opciones gratuitas:
- **Gmail** (para empezar): activá la verificación en dos pasos y creá una «contraseña de aplicación». `SMTP_URL=smtps://TU_CORREO%40gmail.com:CONTRASENA_APP@smtp.gmail.com:465`, `MAIL_FROM="UMBRAL <TU_CORREO@gmail.com>"`. Límite diario bajo; sirve para pocas personas.
- **Resend / Brevo / Mailjet**: planes gratuitos con SMTP. Con Resend para enviar a cualquier destinatario hay que verificar un dominio propio.

Con `SMTP_URL` definido el registro **exige** confirmar el correo.

## Producción
Cargá las mismas variables en el hosting (p. ej. Vercel). En producción son obligatorias: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (la URL pública, p. ej. `https://umbral.tu-dominio.com`) y `SMTP_URL`. Ejecutá `npm run db:migrar` contra la base de producción antes del primer despliegue y revisá todo con `npm run preflight -- --produccion` (pasos completos en `docs/DESPLIEGUE.md`).

## Probar el recorrido
1. `/registro` → crear cuenta (con SMTP: confirmar el correo; sin SMTP en desarrollo: entrás directo).
2. `/bienvenida`: portal, relato, nombre de la Guardiana, nombre de la biblioteca, apariencia y llaves.
3. Cerrá la pestaña a mitad de camino y volvé a ingresar: retoma en el paso pendiente.
4. Al terminar llegás a `/sala`; `/bienvenida` ya no vuelve a mostrarse.
5. «Cerrar sesión» y `/recuperar` para probar la recuperación de contraseña.

## Seguridad (resumen)
- **Contraseñas:** las gestiona Better Auth (hash scrypt con sal en la tabla `account`); la app nunca las guarda ni las registra.
- **Sesiones:** cookie httpOnly firmada; se validan contra la base en el proxy y en cada lectura de datos. Cerrar sesión o cambiar la contraseña revoca las sesiones.
- **Aislamiento entre personas:** todo el acceso a datos de UMBRAL corre como el rol `umbral_app` (sin `BYPASSRLS`, sin acceso a `user`/`session`/`account`/`verification`) con `app.user_id` fijado por transacción; las políticas RLS filtran por ese valor. Ver `src/lib/db.ts` y `db/tests/rls.test.ts`.
- **Nada privilegiado en el navegador:** el navegador no se conecta a la base ni conoce ninguna credencial; todo pasa por Server Actions con validación (zod).
- `onboarding_completado_at` solo puede fijarse con la función `completar_onboarding()`, que verifica los pasos previos.
- Better Auth aplica límite de intentos por IP en producción (en memoria; en un despliegue con varias instancias conviene moverlo a la base).
