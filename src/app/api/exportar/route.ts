import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { exportarDatos } from "@/modules/respaldo/exportar";

/** Descarga todos los datos personales en JSON. Solo la dueña, con sesión válida; nunca se cachea. */
export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("No autorizada", { status: 401, headers: { "Cache-Control": "no-store" } });

  const cuerpo = JSON.stringify(await conUsuario(usuario.id, exportarDatos), null, 2);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(cuerpo, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="umbral-respaldo-${fecha}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
