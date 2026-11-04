import { NextResponse } from "next/server";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { detectarImagen } from "@/modules/archivo/utiles";
import { MAX_BYTES_IMAGEN } from "@/modules/escritorio/paginas";
import { ErrorEscritorio, guardarImagen } from "@/modules/escritorio/repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Subida de una imagen para una página del journal. Valida sesión, dueña de la página, tamaño y formato real. */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return NextResponse.json({ error: "Tu sesión venció. Volvé a ingresar." }, { status: 401 });

  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return NextResponse.json({ error: "No pudimos leer la imagen." }, { status: 400 });
  }
  const paginaId = datos.get("paginaId");
  const archivo = datos.get("imagen");
  if (typeof paginaId !== "string" || !UUID.test(paginaId) || !(archivo instanceof File)) {
    return NextResponse.json({ error: "Faltan datos de la imagen." }, { status: 400 });
  }
  if (archivo.size === 0 || archivo.size > MAX_BYTES_IMAGEN) {
    return NextResponse.json({ error: "La imagen pesa demasiado (máximo 600 KB; se reduce sola al elegirla)." }, { status: 413 });
  }
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const mime = detectarImagen(bytes);
  if (!mime) return NextResponse.json({ error: "Solo se aceptan imágenes JPG, PNG o WebP." }, { status: 415 });

  try {
    const id = await conUsuario(usuario.id, (db) => guardarImagen(db, usuario.id, paginaId, { mime, datos: bytes }));
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof ErrorEscritorio) {
      return NextResponse.json({ error: e.message }, { status: e.codigo === "no_encontrada" ? 404 : 409 });
    }
    console.error("[escritorio] error al guardar imagen", e);
    return NextResponse.json({ error: "No pudimos guardar la imagen. Probá de nuevo." }, { status: 500 });
  }
}
