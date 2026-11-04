import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerPortada } from "@/modules/archivo/repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sirve la portada de un libro solo a su dueña (sesión + RLS). El ?v= de la URL permite cachearla sin riesgo. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("No encontrada", { status: 404 });

  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("No autorizada", { status: 401, headers: { "Cache-Control": "no-store" } });

  const portada = await conUsuario(usuario.id, (db) => obtenerPortada(db, usuario.id, id));
  if (!portada) return new Response("No encontrada", { status: 404 });

  return new Response(Buffer.from(portada.datos), {
    headers: {
      "Content-Type": portada.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
