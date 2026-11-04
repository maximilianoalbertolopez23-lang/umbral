import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioLibro } from "@/components/archivo/FormularioLibro";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerLibro, obtenerSugerencias } from "@/modules/archivo/repositorio";
import { valoresDesdeLibro } from "@/modules/archivo/valores";
import { actualizarLibroAction } from "../../actions";

export const metadata: Metadata = { title: "Editar libro" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const g = await requerirGuardiana();
  const datos = await conUsuario(g.userId, async (db) => ({
    libro: await obtenerLibro(db, g.userId, id),
    sugerencias: await obtenerSugerencias(db, g.userId),
  }));
  if (!datos.libro) notFound();
  return (
    <>
      <Link href={`/archivo/${id}`} className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver a la ficha
      </Link>
      <h1 className="mb-8 mt-4 font-marca text-5xl leading-tight text-marfil">Editar libro</h1>
      <FormularioLibro
        accion={actualizarLibroAction.bind(null, id)}
        textoBoton="Guardar cambios"
        inicial={valoresDesdeLibro(datos.libro)}
        libro={datos.libro}
        sugerencias={datos.sugerencias}
        cancelarHref={`/archivo/${id}`}
      />
    </>
  );
}

export default function EditarLibroPage(props: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<div role="status" aria-label="Cargando libro" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido params={props.params} />
      </Suspense>
    </div>
  );
}
