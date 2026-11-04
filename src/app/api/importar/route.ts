import { NextResponse } from "next/server";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { ErrorRespaldo, importarRespaldo, MAX_BYTES_RESPALDO } from "@/modules/respaldo/importar";

const sinCache = { "Cache-Control": "no-store" };

/** Importa un respaldo propio. Sesión + mismo origen + tamaño acotado; solo suma datos (ver modules/respaldo/importar.ts). */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return NextResponse.json({ error: "Tu sesión venció. Volvé a ingresar." }, { status: 401, headers: sinCache });

  const origen = request.headers.get("origin");
  if (origen && new URL(origen).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403, headers: sinCache });
  }

  let archivo: FormDataEntryValue | null;
  try {
    archivo = (await request.formData()).get("respaldo");
  } catch {
    return NextResponse.json({ error: "No pudimos leer el archivo." }, { status: 400, headers: sinCache });
  }
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Elegí un archivo de respaldo." }, { status: 400, headers: sinCache });
  }
  if (archivo.size > MAX_BYTES_RESPALDO) {
    return NextResponse.json({ error: "El archivo es demasiado grande (máximo 40 MB)." }, { status: 413, headers: sinCache });
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse(await archivo.text());
  } catch {
    return NextResponse.json({ error: "El archivo no es un JSON válido." }, { status: 400, headers: sinCache });
  }

  try {
    const resumen = await conUsuario(usuario.id, (db) => importarRespaldo(db, usuario.id, crudo));
    return NextResponse.json(resumen, { headers: sinCache });
  } catch (e) {
    if (e instanceof ErrorRespaldo) return NextResponse.json({ error: e.message }, { status: 422, headers: sinCache });
    console.error("[respaldo] error al importar", e);
    return NextResponse.json({ error: "El respaldo tiene datos que no cumplen las reglas de UMBRAL. No se importó nada." }, { status: 422, headers: sinCache });
  }
}
