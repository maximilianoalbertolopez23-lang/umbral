import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerAuth } from "@/lib/auth/auth";
import { rutaSegura } from "@/lib/auth/redireccion";
import { backendConfigurado } from "@/lib/config";

const PRIVADAS = ["/sala", "/archivo", "/escritorio", "/taller", "/torre", "/portales", "/bienvenida"];
const SOLO_INVITADAS = ["/ingresar", "/registro", "/recuperar"];

const coincide = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/**
 * Redirige antes de que empiece a transmitirse la página. Con cookie presente se valida la sesión contra la base:
 * una cookie vencida o revocada no cuenta como sesión (si no, quedaría colgada y sin salida).
 * La autorización de cada dato sigue en src/lib/auth/dal.ts y la última barrera es RLS.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const privada = PRIVADAS.some((p) => coincide(pathname, p));
  const invitada = SOLO_INVITADAS.some((p) => coincide(pathname, p));
  if (!privada && !invitada) return NextResponse.next();

  let conSesion = false;
  if (getSessionCookie(request) && backendConfigurado()) {
    try {
      const sesion = await obtenerAuth().api.getSession({ headers: request.headers });
      conSesion = Boolean(sesion);
    } catch {
      conSesion = false;
    }
  }

  if (!conSesion && privada) {
    const siguiente = rutaSegura(pathname + search, "/sala");
    return NextResponse.redirect(new URL(`/ingresar?siguiente=${encodeURIComponent(siguiente)}`, request.url));
  }
  if (conSesion && invitada) {
    return NextResponse.redirect(new URL("/sala", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|brand/|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
