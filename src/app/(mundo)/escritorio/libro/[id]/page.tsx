import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ControlCalificacion } from "@/components/archivo/FichaControles";
import { PortadaLibro } from "@/components/archivo/PortadaLibro";
import { IndicePaginas, NuevaPagina, SelectorPlantilla } from "@/components/escritorio/IndiceEscritorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerLibro } from "@/modules/archivo/repositorio";
import { listarPaginas, obtenerPlantillaPreferida } from "@/modules/escritorio/repositorio";
import { calificarAction } from "../../../archivo/actions";

export const metadata: Metadata = { title: "Journal del libro" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const g = await requerirGuardiana();
  const datos = await conUsuario(g.userId, async (db) => ({
    libro: await obtenerLibro(db, g.userId, id),
    paginas: await listarPaginas(db, g.userId, id),
    plantilla: await obtenerPlantillaPreferida(db, g.userId),
  }));
  if (!datos.libro) notFound();
  const { libro, paginas, plantilla } = datos;

  return (
    <div className="space-y-8">
      <Link href="/escritorio" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver a El Escritorio
      </Link>
      <header className="grid gap-6 sm:grid-cols-[8rem_1fr]">
        <div className="w-28 sm:w-full">
          <PortadaLibro libro={libro} className="shadow-[3px_5px_14px_rgba(0,0,0,0.55)]" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-malva">Journal del libro</p>
          <h1 className="mt-1 font-marca text-4xl leading-tight text-marfil sm:text-5xl">{libro.titulo}</h1>
          <p className="mt-1 text-texto-suave">{libro.autores.join(", ") || "Autor desconocido"}</p>
          <div className="mt-3">
            <p className="text-sm text-malva">Tu calificación</p>
            <ControlCalificacion accion={calificarAction.bind(null, id)} calificacion={libro.calificacion} />
          </div>
          <Link href={`/archivo/${id}`} className="mt-3 inline-block text-sm text-durazno underline-offset-4 hover:underline">
            Ver la ficha en El Archivo
          </Link>
        </div>
      </header>

      <section aria-labelledby="paginas">
        <h2 id="paginas" className="mb-4 font-marca text-3xl text-marfil">
          Páginas
        </h2>
        <p className="mb-4 max-w-2xl text-texto-suave">
          Reseña, reflexiones, citas, personajes, momentos y notas con fecha: creá solo lo que quieras. Ninguna es obligatoria.
        </p>
        <IndicePaginas key={paginas.map((p) => `${p.id}${p.actualizadaAt}`).join()} paginas={paginas} libroId={id} />
        <NuevaPagina libroId={id} />
        {paginas.length > 0 && <SelectorPlantilla libroId={id} actual={paginas[0].plantilla ?? plantilla} />}
      </section>
    </div>
  );
}

export default function JournalLibroPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div role="status" aria-label="Cargando el journal" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
      <Contenido params={props.params} />
    </Suspense>
  );
}
