import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorPagina } from "@/components/escritorio/EditorPagina";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { aniosDeResumen } from "@/modules/escritorio/bloques";
import { estadisticasAnio, listarPaginas, obtenerPagina, type EstadisticasAnio } from "@/modules/escritorio/repositorio";
import { listarPlantillas } from "@/modules/taller/repositorio";

export const metadata: Metadata = { title: "Página del journal" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Contenido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const g = await requerirGuardiana();
  const datos = await conUsuario(g.userId, async (db) => {
    const pagina = await obtenerPagina(db, g.userId, id);
    if (!pagina) return null;
    const hermanas = await listarPaginas(db, g.userId, pagina.libroId);
    const estadisticas: Record<number, EstadisticasAnio> = {};
    for (const anio of aniosDeResumen(pagina.bloques)) estadisticas[anio] = await estadisticasAnio(db, g.userId, anio);
    return { pagina, hermanas, estadisticas, plantillasPropias: await listarPlantillas(db, g.userId) };
  });
  if (!datos) notFound();
  const { pagina, hermanas, estadisticas, plantillasPropias } = datos;
  const i = hermanas.findIndex((h) => h.id === id);
  const vecina = (h: (typeof hermanas)[number] | undefined) => (h ? { id: h.id, titulo: h.titulo } : null);

  return (
    <EditorPagina
      key={pagina.id}
      id={pagina.id}
      tipo={pagina.tipo}
      libroId={pagina.libroId}
      inicial={{ titulo: pagina.titulo, bloques: pagina.bloques, plantilla: pagina.plantilla, plantillaCustomId: pagina.plantillaCustomId, estado: pagina.estado }}
      plantillasPropias={plantillasPropias}
      version={pagina.version}
      estadisticas={estadisticas}
      volverHref={pagina.libro ? `/escritorio/libro/${pagina.libro.id}` : "/escritorio"}
      volverTexto={pagina.libro ? `Journal de «${pagina.libro.titulo}»` : "Diario general"}
      anterior={vecina(hermanas[i - 1])}
      siguiente={vecina(hermanas[i + 1])}
    />
  );
}

export default function PaginaJournalPage(props: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<div role="status" aria-label="Abriendo la página" className="h-[28rem] animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido params={props.params} />
      </Suspense>
    </div>
  );
}
