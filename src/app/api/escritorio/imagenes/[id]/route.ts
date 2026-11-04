import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerImagen } from "@/modules/escritorio/repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sirve una imagen del journal solo a su dueña. Las imágenes no cambian nunca (id nuevo por subida): se pueden cachear. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("No encontrada", { status: 404 });
  const usuario = await obtenerUsuario();
  if (!usuario) return new Response("No autorizada", { status: 401, headers: { "Cache-Control": "no-store" } });

  const imagen = await conUsuario(usuario.id, (db) => obtenerImagen(db, usuario.id, id));
  if (!imagen) return new Response("No encontrada", { status: 404 });

  return new Response(Buffer.from(imagen.datos), {
    headers: {
      "Content-Type": imagen.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
