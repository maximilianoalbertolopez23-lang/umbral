import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioRecuperar } from "@/components/auth/formularios-auth";
import { AvisoConfiguracion, TarjetaAuth } from "@/components/auth/TarjetaAuth";
import { backendConfigurado } from "@/lib/config";

export const metadata: Metadata = { title: "Recuperar contraseña" };

async function Contenido() {
  await connection();
  return (
    <TarjetaAuth titulo="Recuperar el acceso" subtitulo="Te enviamos un enlace para elegir una contraseña nueva.">
      <AvisoConfiguracion />
      <FormularioRecuperar deshabilitado={!backendConfigurado()} />
    </TarjetaAuth>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<TarjetaAuth titulo="Recuperar el acceso">{null}</TarjetaAuth>}>
      <Contenido />
    </Suspense>
  );
}
