import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaHabitaciones } from "@/components/mundo/ListaHabitaciones";
import { EscenaSala } from "@/components/sala/EscenaSala";
import { AvisoLogro } from "@/components/torre/AvisoLogro";
import { sincronizarProgreso } from "@/modules/torre/repositorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarLibros } from "@/modules/archivo/repositorio";
import { getApariencia } from "@/modules/onboarding/apariencias";
import { getModulo } from "@/modules/registry";
import { contarPaginasJournal } from "@/modules/sala/repositorio";
import { obtenerDisenoSala } from "@/modules/taller/repositorio";
import { resolverMateriales } from "@/modules/taller/sala";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

const modulo = getModulo("sala");
export const metadata: Metadata = { title: modulo.titulo };

async function Contenido() {
  const g = await requerirGuardiana();
  const { libros, paginas, diseno, nuevos } = await conUsuario(g.userId, async (db) => {
    // Registra lo ganado desde la última visita; el aviso solo muestra lo que de verdad quedó registrado.
    const nuevos = await sincronizarProgreso(db, g.userId);
    return {
      libros: await listarLibros(db, g.userId),
      paginas: await contarPaginasJournal(db, g.userId),
      diseno: (await obtenerDisenoSala(db, g.userId)).diseno,
      nuevos,
    };
  });
  const apariencia = getApariencia(resolverMateriales(diseno).luz);

  return (
    <>
      <AvisoLogro recompensas={nuevos} />
      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-durazno">{apariencia.nombre}</p>
        <h1 className="mt-1 font-marca text-4xl leading-tight text-marfil sm:text-5xl">La Gran Sala</h1>
        <p className="mt-2 text-texto-suave">
          Bienvenida, {g.guardianaNombre}. Guardiana de <span className="font-marca text-lg italic text-marfil">{g.bibliotecaNombre}</span>.
        </p>
      </header>

      <a
        href="#navegacion-lista"
        className="sr-only focus:not-sr-only focus:mb-3 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-durazno focus:px-5 focus:text-sm focus:font-medium focus:text-ciruela"
      >
        Saltar la escena e ir a la navegación en lista
      </a>

      <EscenaSala
        libros={libros.map((l) => ({
          id: l.id, titulo: l.titulo, autores: l.autores, portadaVersion: l.portadaVersion, estado: l.estado,
          fechaInicio: l.fechaInicio, creadoAt: l.creadoAt, paginaActual: l.paginaActual, paginasTotal: l.paginasTotal,
        }))}
        paginasJournal={paginas}
        apariencia={apariencia}
        diseno={diseno}
      />
      <p className="mt-3 text-sm text-texto-suave">
        <span className="lg:hidden">Deslizá para recorrer la sala y tocá un objeto. </span>
        <span className="hidden lg:inline">Pasá el cursor sobre los objetos, o recorrelos con Tab y las flechas ← →. </span>
        La estantería muestra un lomo por cada libro de tu colección.
      </p>

      <section id="navegacion-lista" aria-labelledby="lista" className="mt-12 scroll-mt-6">
        <h2 id="lista" className="font-marca text-3xl text-marfil">
          Navegación en lista
        </h2>
        <p className="mb-5 mt-1 max-w-2xl text-texto-suave">
          Las mismas puertas de la escena, sin necesidad de usarla. Los objetos de la sala y esta lista llevan a las mismas rutas.
        </p>
        <ListaHabitaciones />
      </section>
    </>
  );
}

export default function SalaPage() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return (
    <Suspense fallback={<div role="status" aria-label="Abriendo la Gran Sala" className="aspect-video animate-titilar rounded-3xl bg-velo/50" />}>
      <Contenido />
    </Suspense>
  );
}
