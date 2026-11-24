"use client";

import Link from "next/link";
import { useState } from "react";
import { SalaDecorable } from "@/components/sala/SalaDecorable";
import { MusicaSala } from "@/components/sala/MusicaSala";
import { Tinta } from "@/components/sala/Tinta";
import { animoDe, frasesDe } from "@/modules/sala/companera";
import type { DisenoSala } from "@/modules/taller/sala";

interface Props {
  nombreGuardiana: string;
  nombreBiblioteca: string;
  libroEnCurso: { id: string; titulo: string; paginaActual: number | null; paginasTotal: number | null } | null;
  totalLibros: number;
  paginasJournal: number;
  esencias: number;
  piso: { nivel: number; titulo: string; progreso: number };
  recompensasNuevas: number;
  diseno: DisenoSala;
  versionDiseno: number;
  inventario: string[];
}

const tarjeta = "marco-ornato flex min-h-24 flex-col justify-center rounded-2xl p-5 transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-durazno";

export function BibliotecaViva(p: Props) {
  const animo = animoDe({ recompensasNuevas: p.recompensasNuevas, libroEnCurso: p.libroEnCurso?.titulo ?? null });
  const frases = frasesDe(animo, p.libroEnCurso?.titulo ?? null);
  const [i, setI] = useState(0);
  const pct =
    p.libroEnCurso?.paginasTotal && p.libroEnCurso.paginaActual != null
      ? Math.min(100, Math.round((p.libroEnCurso.paginaActual / p.libroEnCurso.paginasTotal) * 100))
      : null;
  const pctPiso = Math.round(p.piso.progreso * 100);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-durazno">{p.nombreBiblioteca}</p>
        <h1 className="mt-1 font-marca text-4xl leading-tight text-marfil sm:text-5xl">Hola, {p.nombreGuardiana}</h1>
        <div className="mt-3"><MusicaSala /></div>
      </header>

      <section aria-label="Tinta, tu compañera" className="relative overflow-hidden rounded-3xl border border-durazno/30">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/escenas/05_gran_sala.webp)" }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ciruela/80 via-ciruela/30 to-transparent" />
        <div className="relative flex flex-col items-center gap-4 px-5 pb-6 pt-24 sm:flex-row sm:items-end sm:justify-center sm:gap-8 sm:pt-32">
          <button type="button" onClick={() => setI((n) => (n + 1) % frases.length)} aria-label="Tocar a Tinta para que te hable" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-durazno">
            <Tinta animo={animo} />
          </button>
          <p role="status" className="max-w-sm rounded-2xl border border-malva/40 bg-noche/90 p-4 text-marfil">
            <span className="block text-xs uppercase tracking-[0.18em] text-durazno">Tinta</span>
            {frases[i % frases.length]}
          </p>
        </div>
      </section>

      <SalaDecorable diseno={p.diseno} version={p.versionDiseno} inventario={p.inventario} esencias={p.esencias} nivel={p.piso.nivel} />

      <nav aria-label="Tu biblioteca" className="grid gap-4 sm:grid-cols-3">
        <Link href="/archivo" className={tarjeta}>
          <span className="font-marca text-2xl text-marfil">Mis libros</span>
          <span className="text-sm text-texto-suave">{p.totalLibros === 0 ? "Cargá el primero" : `${p.totalLibros} ${p.totalLibros === 1 ? "libro" : "libros"}`}</span>
        </Link>
        <Link href="/escritorio" className={tarjeta}>
          <span className="font-marca text-2xl text-marfil">Mi diario</span>
          <span className="text-sm text-texto-suave">{p.paginasJournal === 0 ? "Escribí la primera página" : `${p.paginasJournal} ${p.paginasJournal === 1 ? "página" : "páginas"}`}</span>
        </Link>
        <Link href="/torre" className={tarjeta}>
          <span className="font-marca text-2xl text-marfil">La Torre</span>
          <span className="text-sm text-texto-suave">Misiones y logros</span>
        </Link>
      </nav>

      <section aria-label="Tu avance" className="grid gap-4 sm:grid-cols-2">
        <div className="marco-ornato rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-durazno">Leyendo ahora</p>
          {p.libroEnCurso ? (
            <>
              <Link href={`/archivo/${p.libroEnCurso.id}`} className="mt-1 block font-marca text-2xl text-marfil underline-offset-4 hover:underline">
                {p.libroEnCurso.titulo}
              </Link>
              {pct !== null && (
                <div role="progressbar" aria-label="Avance del libro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-3 h-2.5 overflow-hidden rounded-full bg-noche">
                  <div className="h-full rounded-full bg-durazno" style={{ width: `${pct}%` }} />
                </div>
              )}
            </>
          ) : (
            <p className="mt-1 text-texto-suave">Ningún libro en curso.</p>
          )}
        </div>
        <div className="marco-ornato rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-durazno">
            Piso {p.piso.nivel} · {p.piso.titulo}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span aria-hidden="true" className="text-2xl text-durazno">✦</span>
            <span className="font-marca text-3xl text-marfil">{p.esencias}</span>
            <span className="text-texto-suave">Esencias</span>
          </p>
          <div role="progressbar" aria-label="Avance hacia el próximo piso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctPiso} className="mt-3 h-2.5 overflow-hidden rounded-full bg-noche">
            <div className="h-full rounded-full bg-durazno" style={{ width: `${pctPiso}%` }} />
          </div>
        </div>
      </section>
    </div>
  );
}
