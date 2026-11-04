import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Aviso } from "@/components/auth/formulario";
import { FormularioRestablecer } from "@/components/auth/formularios-auth";
import { TarjetaAuth } from "@/components/auth/TarjetaAuth";

export const metadata: Metadata = { title: "Nueva contraseña" };

const enlace = "text-durazno underline-offset-4 hover:underline";

/** Llega desde el enlace del correo: /api/auth/reset-password/<token> redirige aquí con ?token= (o ?error=). */
async function Contenido({ searchParams }: { searchParams: PageProps<"/restablecer">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const invalido = !token || params.error === "INVALID_TOKEN";

  return (
    <TarjetaAuth titulo="Elegí tu contraseña nueva" subtitulo="Después vas a poder ingresar con ella.">
      {invalido ? (
        <div className="space-y-4">
          <Aviso tipo="error">El enlace venció o ya se usó. Pedí uno nuevo.</Aviso>
          <Link href="/recuperar" className={`${enlace} text-sm`}>
            Pedir otro enlace
          </Link>
        </div>
      ) : (
        <FormularioRestablecer token={token} />
      )}
    </TarjetaAuth>
  );
}

export default function Page(props: PageProps<"/restablecer">) {
  return (
    <Suspense fallback={<TarjetaAuth titulo="Elegí tu contraseña nueva">{null}</TarjetaAuth>}>
      <Contenido searchParams={props.searchParams} />
    </Suspense>
  );
}
