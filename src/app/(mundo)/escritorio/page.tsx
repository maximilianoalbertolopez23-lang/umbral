import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PortadaLibro } from "@/components/archivo/PortadaLibro";
import { VistaEstancia } from "@/components/sala/VistaEstancia";
import { obtenerDisenoSala } from "@/modules/taller/repositorio";
import { IndicePaginas, NuevaPagina, SelectorPlantilla } from "@/components/escritorio/IndiceEscritorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarLibros } from "@/modules/archivo/repositorio";
import { contarPaginasPorLibro, listarPaginas, listarPapelera, obtenerPlantillaPreferida } from "@/modules/escritorio/repositorio";
import { getModulo } from "@/modules/registry";
import { JUEGO_ACTIVO } from "@/lib/juego";

const modulo = getModulo("escritorio");
export const metadata: Metadata = { title: modulo.titulo };

async function Contenido() {
  const g = await requerirGuardiana();
  const d = await conUsuario(g.userId, async (db) => ({
    general: await listarPaginas(db, g.userId, null),
    libros: await listarLibros(db, g.userId),
    cuentas: await contarPaginasPorLibro(db, g.userId),
    papelera: (await listarPapelera(db, g.userId)).length,
    plantilla: await obtenerPlantillaPreferida(db, g.userId),
    diseno: JUEGO_ACTIVO ? (await obtenerDisenoSala(db, g.userId)).diseno : undefined,
  }));

  return (
    <div className="space-y-12">
      {JUEGO_ACTIVO && <VistaEstancia estancia="escritorio" libros={d.libros} diseno={d.diseno} />}
      <section aria-labelledby="general">
        <h2 id="general" className="font-marca text-3xl text-marfil">Diario general</h2>
        <p className="mb-4 mt-1 max-w-2xl text-texto-suave">
          Objetivos, reflexiones libres, listas, recuerdos con fotos y el resumen de tus lecturas. No pertenece a ningún libro.
        </p>
        <IndicePaginas key={d.general.map((p) => `${p.id}${p.actualizadaAt}`).join()} paginas={d.general} libroId={null} />
        <NuevaPagina libroId={null} />
        {d.general.length > 0 && <SelectorPlantilla libroId={null} actual={d.general[0].plantilla ?? d.plantilla} />}
      </section>

      <section aria-labelledby="libros">
        <h2 id="libros" className="font-marca text-3xl text-marfil">Journal por libro</h2>
        <p className="mb-4 mt-1 max-w-2xl text-texto-suave">Cada libro de El Archivo tiene su propio cuaderno: reseña, citas, personajes, momentos y notas.</p>
        {d.libros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-malva/50 px-5 py-10 text-center">
            <p className="font-marca text-2xl text-marfil">Todavía no hay libros</p>
            <p className="mt-2 text-texto-suave">El journal de cada libro aparece acá apenas lo registres en El Archivo.</p>
            <Link href="/archivo/nuevo" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-durazno px-6 text-sm font-medium text-ciruela hover:bg-marfil">
              Agregar un libro
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.libros.map((l) => (
              <li key={l.id}>
                <Link href={`/escritorio/libro/${l.id}`} className="flex items-center gap-4 rounded-2xl border border-malva/30 bg-noche/50 p-3 transition hover:border-durazno hover:bg-morado/30">
                  <span className="w-12 shrink-0">
                    <PortadaLibro libro={l} compacta className="shadow-md" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-marca text-xl text-marfil">{l.titulo}</span>
                    <span className="block truncate text-sm text-texto-suave">{l.autores.join(", ") || "Autor desconocido"}</span>
                    <span className="block text-xs text-durazno">
                      {d.cuentas[l.id] ? `${d.cuentas[l.id]} ${d.cuentas[l.id] === 1 ? "página" : "páginas"}` : "Sin páginas todavía"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>
        <Link href="/escritorio/papelera" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
          Papelera{d.papelera > 0 ? ` (${d.papelera})` : ""}
        </Link>
      </p>
    </div>
  );
}

export default function EscritorioPage() {
  return (
    <>
      <header className="mb-10">
        <p className="font-marca text-3xl text-durazno">{modulo.numeral}</p>
        <h1 className="mt-1 font-marca text-5xl leading-tight text-marfil sm:text-6xl">{modulo.titulo}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-texto-suave">{modulo.resumen}</p>
      </header>
      <Suspense fallback={<div role="status" aria-label="Cargando El Escritorio" className="h-80 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
