import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioRegistro } from "@/components/auth/formularios-auth";
import { AvisoConfiguracion, TarjetaAuth } from "@/components/auth/TarjetaAuth";
import { backendConfigurado } from "@/lib/config";

export const metadata: Metadata = { title: "Crear cuenta" };

async function Contenido() {
  await connection();
  return (
    <TarjetaAuth titulo="Recibir las llaves" subtitulo="Creá tu cuenta para empezar a habitar la biblioteca.">
      <AvisoConfiguracion />
      <FormularioRegistro deshabilitado={!backendConfigurado()} />
    </TarjetaAuth>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<TarjetaAuth titulo="Recibir las llaves">{null}</TarjetaAuth>}>
      <Contenido />
    </Suspense>
  );
}
