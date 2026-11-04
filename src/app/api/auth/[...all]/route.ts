import { toNextJsHandler } from "better-auth/next-js";
import { backendConfigurado } from "@/lib/config";
import { obtenerAuth } from "@/lib/auth/auth";

/** Endpoints de Better Auth (verificación de correo, restablecimiento, etc.). */
export async function GET(request: Request) {
  if (!backendConfigurado()) return new Response("Backend no configurado", { status: 503 });
  return toNextJsHandler(obtenerAuth()).GET(request);
}

export async function POST(request: Request) {
  if (!backendConfigurado()) return new Response("Backend no configurado", { status: 503 });
  return toNextJsHandler(obtenerAuth()).POST(request);
}
