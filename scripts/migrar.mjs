// Aplica db/migrations/*.sql en orden, una sola vez cada una (registro en _migraciones).
// Uso: npm run db:migrar   (lee DATABASE_URL de .env.local)
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Definila en .env.local (ver docs/CONFIGURACION.md).");
  process.exit(1);
}

const dir = "db/migrations";
const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const cliente = new pg.Client({ connectionString: url });
await cliente.connect();

try {
  await cliente.query(
    "create table if not exists _migraciones (nombre text primary key, aplicada_at timestamptz not null default now())",
  );
  const hechas = new Set((await cliente.query("select nombre from _migraciones")).rows.map((r) => r.nombre));

  for (const archivo of archivos) {
    if (hechas.has(archivo)) {
      console.log(`= ${archivo} (ya aplicada)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, archivo), "utf8");
    await cliente.query("begin");
    try {
      await cliente.query(sql);
      await cliente.query("insert into _migraciones (nombre) values ($1)", [archivo]);
      await cliente.query("commit");
      console.log(`+ ${archivo}`);
    } catch (error) {
      await cliente.query("rollback");
      throw new Error(`Falló ${archivo}: ${error.message}`);
    }
  }
} finally {
  await cliente.end();
}
