import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Aviso } from "@/components/auth/formulario";
import { FormularioIngreso } from "@/components/auth/formularios-auth";
import { AvisoConfiguracion, TarjetaAuth } from "@/components/auth/TarjetaAuth";
import { rutaSegura } from "@/lib/auth/redireccion";
import { backendConfigurado } from "@/lib/config";

export const metadata: Metadata = { title: "Ingresar" };

async function Contenido({ searchParams }: { searchParams: PageProps<"/ingresar">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const siguiente = typeof params.siguiente === "string" ? rutaSegura(params.siguiente, "") : "";
  return (
    <TarjetaAuth titulo="Cruzar el umbral" subtitulo="Ingresá para volver a tu biblioteca.">
      <AvisoConfiguracion />
      {params.restablecida === "1" && (
        <div className="mb-5">
          <Aviso tipo="info">Listo: tu contraseña se actualizó. Ingresá con la nueva.</Aviso>
        </div>
      )}
      <FormularioIngreso siguiente={siguiente} deshabilitado={!backendConfigurado()} />
    </TarjetaAuth>
  );
}

export default function Page(props: PageProps<"/ingresar">) {
  return (
    <Suspense fallback={<TarjetaAuth titulo="Cruzar el umbral">{null}</TarjetaAuth>}>
      <Contenido searchParams={props.searchParams} />
    </Suspense>
  );
}
