import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonEliminar, BotonReleer, ControlCalificacion, ControlEstado, ControlProgreso, FechasLectura } from "@/components/archivo/FichaControles";
import { PortadaLibro } from "@/components/archivo/PortadaLibro";
import { BarraProgreso, formatearFecha, InsigniaEstado } from "@/components/archivo/Visuales";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerLibro } from "@/modules/archivo/repositorio";
import { listarPaginas } from "@/modules/escritorio/repositorio";
import { ETIQUETA_ESTADO } from "@/modules/archivo/tipos";
import { porcentaje } from "@/modules/archivo/utiles";
import {
  calificarAction,
  cambiarEstadoAction,
  eliminarLibroAction,
  fechasLecturaAction,
  registrarProgresoAction,
  releerAction,
} from "../actions";

export const metadata: Metadata = { title: "Ficha del libro" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const panel = "rounded-2xl border border-malva/30 bg-noche/50 p-5 sm:p-6";
const tituloPanel = "font-marca text-2xl text-marfil";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-malva">{etiqueta}</dt>
      <dd className="mt-0.5 text-marfil">{children}</dd>
    </div>
  );
}

async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const g = await requerirGuardiana();
  const datos = await conUsuario(g.userId, async (db) => ({
    libro: await obtenerLibro(db, g.userId, id),
    paginasJournal: await listarPaginas(db, g.userId, id),
  }));
  if (!datos.libro) notFound();
  const { libro, paginasJournal } = datos;

  const actual = libro.lecturas[0] ?? null;
  const pct = porcentaje(actual?.paginaActual ?? 0, libro.paginasTotal);
  const cerrada = actual?.estado === "terminado" || actual?.estado === "abandonado";

  return (
    <div className="space-y-6">
      <Link href="/archivo" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver al Archivo
      </Link>

      <div className="grid gap-8 md:grid-cols-[13rem_1fr]">
        <div className="mx-auto w-44 space-y-3 md:mx-0 md:w-full">
          <PortadaLibro libro={libro} className="shadow-[4px_6px_16px_rgba(0,0,0,0.55)]" />
          <Link href={`/archivo/${id}/editar`} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-durazno px-5 text-sm font-medium text-ciruela transition hover:bg-marfil">
            Editar
          </Link>
        </div>

        <div className="min-w-0 space-y-5">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <InsigniaEstado estado={libro.estado} />
              {libro.nLecturas > 1 && <span className="text-xs text-texto-suave">{libro.nLecturas} lecturas</span>}
            </div>
            <h1 className="mt-3 font-marca text-4xl leading-tight text-marfil sm:text-5xl">{libro.titulo}</h1>
            <p className="mt-2 text-lg text-texto-suave">{libro.autores.join(", ") || "Autor desconocido"}</p>
            {libro.saga && (
              <p className="mt-1 text-malva">
                {libro.saga}
                {libro.sagaNumero !== null ? ` · Volumen ${libro.sagaNumero}` : ""}
              </p>
            )}
          </header>

          <ControlCalificacion accion={calificarAction.bind(null, id)} calificacion={libro.calificacion} />

          {(libro.generos.length > 0 || libro.etiquetas.length > 0) && (
            <ul className="flex flex-wrap gap-2" aria-label="Géneros y etiquetas">
              {libro.generos.map((x) => (
                <li key={`g-${x}`} className="rounded-full border border-malva/50 px-3 py-0.5 text-sm text-marfil">
                  {x}
                </li>
              ))}
              {libro.etiquetas.map((x) => (
                <li key={`e-${x}`} className="rounded-full bg-morado/60 px-3 py-0.5 text-sm text-durazno">
                  # {x}
                </li>
              ))}
            </ul>
          )}

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Dato etiqueta="Páginas">{libro.paginasTotal ?? "—"}</Dato>
            <Dato etiqueta="ISBN">{libro.isbn ?? "—"}</Dato>
            <Dato etiqueta="Inicio">{formatearFecha(actual?.fechaInicio ?? null)}</Dato>
            <Dato etiqueta="Finalización">{formatearFecha(actual?.fechaFin ?? null)}</Dato>
          </dl>
        </div>
      </div>

      <section aria-labelledby="progreso" className={panel}>
        <h2 id="progreso" className={tituloPanel}>
          Progreso
        </h2>
        <div className="mt-4 space-y-2">
          <p className="text-marfil">
            {libro.paginasTotal
              ? `Página ${actual?.paginaActual ?? 0} de ${libro.paginasTotal}${pct !== null ? ` · ${pct} % leído` : ""}`
              : `Página ${actual?.paginaActual ?? 0} · cargá el total de páginas (en «Editar») para ver el porcentaje`}
          </p>
          <BarraProgreso porcentaje={pct} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm text-malva">Estado de lectura</h3>
            <ControlEstado accion={cambiarEstadoAction.bind(null, id)} estadoActual={libro.estado} />
          </div>
          <div>
            {cerrada ? (
              <>
                <h3 className="mb-3 text-sm text-malva">¿Querés volver a leerlo?</h3>
                <p className="mb-3 text-sm leading-relaxed text-texto-suave">La lectura anterior queda guardada con sus fechas y su historial.</p>
                <BotonReleer accion={releerAction.bind(null, id)} />
              </>
            ) : (
              <>
                <h3 className="mb-3 text-sm text-malva">Registrar una sesión de lectura</h3>
                <ControlProgreso accion={registrarProgresoAction.bind(null, id)} paginaActual={actual?.paginaActual ?? 0} paginasTotal={libro.paginasTotal} />
              </>
            )}
          </div>
        </div>
      </section>

      {libro.sinopsis && (
        <section aria-labelledby="sinopsis" className={panel}>
          <h2 id="sinopsis" className={tituloPanel}>
            Sinopsis
          </h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-texto-suave">{libro.sinopsis}</p>
        </section>
      )}

      {libro.lecturas.length > 0 && (
        <section aria-labelledby="lecturas" className={panel}>
          <h2 id="lecturas" className={tituloPanel}>
            Lecturas
          </h2>
          <ol className="mt-4 divide-y divide-malva/25">
            {libro.lecturas.map((l) => (
              <li key={l.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <p className="flex flex-wrap items-baseline gap-x-3 text-marfil">
                  <span className="font-marca text-xl">Lectura n.º {l.numero}</span>
                  <span className="text-sm text-texto-suave">{ETIQUETA_ESTADO[l.estado]}</span>
                </p>
                <p className="text-sm text-texto-suave">
                  {formatearFecha(l.fechaInicio)} → {formatearFecha(l.fechaFin)}
                  {libro.paginasTotal ? ` · ${l.paginaActual} / ${libro.paginasTotal} páginas` : ` · página ${l.paginaActual}`}
                </p>
                <FechasLectura accion={fechasLecturaAction.bind(null, l.id, id)} inicio={l.fechaInicio} fin={l.fechaFin} conFin={l.estado === "terminado" || l.estado === "abandonado"} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="historial" className={panel}>
        <h2 id="historial" className={tituloPanel}>
          Historial de progreso
        </h2>
        {libro.sesiones.length === 0 ? (
          <p className="mt-3 text-texto-suave">Todavía no registraste sesiones de lectura de este libro.</p>
        ) : (
          <ul className="mt-4 divide-y divide-malva/25">
            {libro.sesiones.map((s) => {
              const lectura = libro.lecturas.find((l) => l.id === s.lecturaId);
              return (
                <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <span className="text-marfil">
                    {formatearFecha(s.fecha)}
                    {libro.lecturas.length > 1 && lectura && <span className="ml-2 text-xs text-malva">lectura n.º {lectura.numero}</span>}
                  </span>
                  <span className="text-sm text-texto-suave">
                    pág. {s.paginaInicio} → {s.paginaFin}
                    {s.minutos ? ` · ${s.minutos} min` : ""}
                    {s.nota ? ` · ${s.nota}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="journal" className={panel}>
        <h2 id="journal" className={tituloPanel}>
          Journal del libro
        </h2>
        <p className="mt-3 leading-relaxed text-texto-suave">
          {paginasJournal.length === 0
            ? "Reseña, reflexiones, citas, personajes, momentos y notas con fecha: todo lo que escribas sobre este libro vive en su cuaderno de El Escritorio."
            : `Este libro tiene ${paginasJournal.length} ${paginasJournal.length === 1 ? "página" : "páginas"} en su cuaderno: ${paginasJournal.slice(0, 3).map((p) => p.titulo || "sin título").join(", ")}${paginasJournal.length > 3 ? "…" : ""}.`}
        </p>
        <Link href={`/escritorio/libro/${id}`} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-durazno/60 px-5 text-sm text-durazno hover:bg-durazno/10">
          {paginasJournal.length === 0 ? "Empezar el journal" : "Abrir el journal"}
        </Link>
      </section>

      <section aria-labelledby="peligro" className="rounded-2xl border border-[#f0a3a3]/30 p-5 sm:p-6">
        <h2 id="peligro" className="font-marca text-2xl text-[#f5b5b5]">
          Zona delicada
        </h2>
        <p className="mb-4 mt-2 text-sm leading-relaxed text-texto-suave">Eliminar el libro borra también su portada, sus lecturas, su historial y las páginas de su journal.</p>
        <BotonEliminar accion={eliminarLibroAction.bind(null, id)} titulo={libro.titulo} />
      </section>
    </div>
  );
}

export default function FichaPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div role="status" aria-label="Cargando la ficha" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
      <Ficha params={props.params} />
    </Suspense>
  );
}
