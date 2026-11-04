import { NextResponse, type NextRequest } from "next/server";
import { obtenerUsuario } from "@/lib/auth/dal";
import { buscarEnOpenLibrary } from "@/lib/openlibrary";

/** Búsqueda opcional en Open Library (título, autor o ISBN). Requiere sesión para no ser un proxy abierto. */
export async function GET(request: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) return NextResponse.json({ error: "No autorizada" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3 || q.length > 100) {
    return NextResponse.json({ error: "Escribí entre 3 y 100 caracteres." }, { status: 400 });
  }

  try {
    return NextResponse.json({ resultados: await buscarEnOpenLibrary(q) });
  } catch {
    return NextResponse.json(
      { error: "No pudimos consultar Open Library ahora. Podés cargar el libro a mano." },
      { status: 502 },
    );
  }
}
