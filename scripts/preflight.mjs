// Revisa que el entorno esté listo para publicar: variables, base de datos, migraciones, rol de la app y correo.
// Uso:  npm run preflight                 (con .env.local o con las variables ya definidas en la terminal)
//       npm run preflight -- --produccion (exige también URL pública https y SMTP)
// No imprime secretos.
import fs from "node:fs";
import pg from "pg";
import nodemailer from "nodemailer";

const produccion = process.argv.includes("--produccion") || process.env.NODE_ENV === "production";
let errores = 0;
const ok = (m) => console.log(`✓ ${m}`);
const mal = (m) => { errores++; console.log(`✗ ${m}`); };
const aviso = (m) => console.log(`! ${m}`);

console.log(`Revisión de entorno (${produccion ? "producción" : "desarrollo"})\n`);

// Variables
const url = process.env.DATABASE_URL;
const secreto = process.env.BETTER_AUTH_SECRET;
const publica = process.env.BETTER_AUTH_URL;
const smtp = process.env.SMTP_URL;

if (url) ok("DATABASE_URL definida");
else mal("Falta DATABASE_URL");
if (!secreto) mal("Falta BETTER_AUTH_SECRET");
else if (secreto.length < 32) mal("BETTER_AUTH_SECRET tiene menos de 32 caracteres");
else ok("BETTER_AUTH_SECRET definido (≥ 32 caracteres)");

if (!publica) {
  if (produccion) mal("Falta BETTER_AUTH_URL (la URL pública, p. ej. https://tu-dominio.com)");
  else aviso("BETTER_AUTH_URL sin definir (en desarrollo usa http://localhost:3000)");
} else if (produccion && !publica.startsWith("https://")) mal(`BETTER_AUTH_URL debe empezar con https:// en producción (hoy: ${new URL(publica).origin})`);
else ok(`BETTER_AUTH_URL: ${new URL(publica).origin}`);

if (url) {
  const u = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname);
  if (produccion && local) mal("DATABASE_URL apunta a una base local: usá la de la nube");
  else if (produccion && !/sslmode=(require|verify)/.test(url)) aviso("DATABASE_URL sin sslmode=require: las bases en la nube lo piden");
}

// Base de datos
if (url) {
  const cliente = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  try {
    await cliente.connect();
    ok("Conexión a la base de datos");

    const archivos = fs.readdirSync("db/migrations").filter((f) => f.endsWith(".sql"));
    const existe = (await cliente.query("select to_regclass('public._migraciones') as t")).rows[0].t;
    if (!existe) mal("Faltan las migraciones: ejecutá npm run db:migrar");
    else {
      const hechas = (await cliente.query("select nombre from _migraciones")).rows.map((r) => r.nombre);
      const faltan = archivos.filter((f) => !hechas.includes(f));
      if (faltan.length === 0) ok(`Migraciones al día (${hechas.length})`);
      else mal(`Migraciones pendientes: ${faltan.join(", ")}`);
    }

    const rol = (await cliente.query("select rolbypassrls, rolsuper from pg_roles where rolname = 'umbral_app'")).rows[0];
    if (!rol) mal("No existe el rol umbral_app (lo crea la migración 0002)");
    else if (rol.rolbypassrls || rol.rolsuper) mal("El rol umbral_app puede saltarse RLS: eso no es seguro");
    else ok("Rol umbral_app sin BYPASSRLS");

    try {
      await cliente.query("begin");
      await cliente.query("set local role umbral_app");
      await cliente.query("select count(*) from libros");
      await cliente.query("rollback");
      ok("La conexión puede bajar al rol umbral_app");
    } catch (e) {
      await cliente.query("rollback").catch(() => {});
      mal(`No puede usar el rol umbral_app: ${e.message}`);
    }
  } catch (e) {
    mal(`No se pudo conectar a la base: ${e.message}`);
  } finally {
    await cliente.end().catch(() => {});
  }
}

// Correo
if (!smtp) {
  if (produccion) mal("Falta SMTP_URL: en producción el registro exige confirmar el correo");
  else aviso("SMTP_URL sin definir (en desarrollo los enlaces salen en la consola del servidor)");
} else {
  try {
    await nodemailer.createTransport(smtp).verify();
    ok("El servidor de correo acepta la conexión");
  } catch (e) {
    mal(`El correo no se pudo verificar: ${e.message}`);
  }
  if (!process.env.MAIL_FROM) aviso("MAIL_FROM sin definir: los correos saldrán como «UMBRAL <no-responder@umbral.local>»");
}

console.log(errores === 0 ? "\nTodo listo." : `\n${errores} problema${errores === 1 ? "" : "s"} por resolver.`);
process.exit(errores === 0 ? 0 : 1);
