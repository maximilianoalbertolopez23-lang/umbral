"use client";

import Link from "next/link";
import { startTransition, useMemo, useState } from "react";
import { guardarVistaAction } from "@/app/(mundo)/archivo/actions";
import {
  aplicarFiltros,
  ETIQUETA_ORDEN,
  FILTROS_VACIOS,
  hayFiltros,
  opcionesFiltro,
  type Filtros,
  type Orden,
} from "@/modules/archivo/filtros";
import { ESTADOS, ETIQUETA_ESTADO, type Estado, type LibroResumen, type VistaArchivo } from "@/modules/archivo/tipos";
import { Catalogo } from "./Catalogo";
import { Estanteria } from "./Estanteria";

const boton =
  "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition";
const selector =
  "mt-1 block min-h-11 w-full rounded-xl border border-malva/50 bg-noche/70 px-3 text-sm text-marfil focus:border-durazno";

function Selector({ etiqueta, valor, alCambiar, opciones, vacio }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; opciones: string[]; vacio: string }) {
  return (
    <label className="block text-xs text-texto-suave">
      {etiqueta}
      <select value={valor} onChange={(e) => alCambiar(e.target.value)} className={selector} disabled={opciones.length === 0}>
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ArchivoCliente({ libros, vistaInicial }: { libros: LibroResumen[]; vistaInicial: VistaArchivo }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [vista, setVista] = useState<VistaArchivo>(vistaInicial);
  const [abierto, setAbierto] = useState(false);

  const opciones = useMemo(() => opcionesFiltro(libros), [libros]);
  const visibles = useMemo(() => aplicarFiltros(libros, filtros), [libros, filtros]);
  const conteos = useMemo(() => {
    const c = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>;
    for (const l of libros) c[l.estado]++;
    return c;
  }, [libros]);

  const cambiar = (parcial: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...parcial }));
  const alternarEstado = (e: Estado) =>
    setFiltros((f) => ({ ...f, estados: f.estados.includes(e) ? f.estados.filter((x) => x !== e) : [...f.estados, e] }));
  const elegirVista = (v: VistaArchivo) => {
    setVista(v);
    startTransition(() => void guardarVistaAction(v));
  };

  if (libros.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-malva/50 bg-noche/50 px-6 py-16 text-center">
        <p className="font-marca text-3xl text-marfil">Los estantes están vacíos</p>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-texto-suave">
          Cada libro que registres se convierte en un objeto de esta biblioteca. Empezá por el que tengas más cerca.
        </p>
        <Link href="/archivo/nuevo" className={`${boton} mt-8 bg-durazno text-ciruela hover:bg-marfil`}>
          Agregar el primer libro
        </Link>
      </div>
    );
  }

  const activos = hayFiltros(filtros);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <label htmlFor="busqueda" className="sr-only">
            Buscar en el Archivo
          </label>
          <input
            id="busqueda"
            type="search"
            value={filtros.q}
            onChange={(e) => cambiar({ q: e.target.value })}
            placeholder="Buscar por título, autor, saga, ISBN o etiqueta…"
            className="block min-h-11 w-full rounded-full border border-malva/50 bg-noche/70 px-5 text-base text-marfil placeholder:text-malva focus:border-durazno"
          />
        </div>
        <div role="group" aria-label="Modo de vista" className="inline-flex rounded-full border border-malva/50 p-0.5">
          {(["estanteria", "catalogo"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => elegirVista(v)}
              className={`${boton} min-h-10 px-4 ${vista === v ? "bg-durazno text-ciruela" : "text-texto-suave hover:text-marfil"}`}
            >
              {v === "estanteria" ? "Estantería" : "Catálogo"}
            </button>
          ))}
        </div>
        <Link href="/archivo/nuevo" className={`${boton} bg-durazno text-ciruela hover:bg-marfil`}>
          Agregar libro
        </Link>
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => {
          const activo = filtros.estados.includes(e);
          return (
            <button
              key={e}
              type="button"
              aria-pressed={activo}
              onClick={() => alternarEstado(e)}
              className={`min-h-9 rounded-full border px-3.5 text-sm transition ${activo ? "border-durazno bg-durazno/20 text-durazno" : "border-malva/40 text-texto-suave hover:border-malva hover:text-marfil"}`}
            >
              {ETIQUETA_ESTADO[e]} <span className="text-xs opacity-70">{conteos[e]}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="filtros-avanzados"
          onClick={() => setAbierto((a) => !a)}
          className="min-h-9 rounded-full border border-malva/40 px-3.5 text-sm text-texto-suave hover:border-malva hover:text-marfil"
        >
          {abierto ? "Menos filtros" : "Más filtros y orden"}
        </button>
      </div>

      {abierto && (
        <div id="filtros-avanzados" className="grid gap-3 rounded-2xl border border-malva/30 bg-noche/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Autor" valor={filtros.autor} alCambiar={(autor) => cambiar({ autor })} opciones={opciones.autores} vacio="Todos los autores" />
          <Selector etiqueta="Género" valor={filtros.genero} alCambiar={(genero) => cambiar({ genero })} opciones={opciones.generos} vacio="Todos los géneros" />
          <Selector etiqueta="Saga" valor={filtros.saga} alCambiar={(saga) => cambiar({ saga })} opciones={opciones.sagas} vacio="Todas las sagas" />
          <Selector etiqueta="Etiqueta" valor={filtros.etiqueta} alCambiar={(etiqueta) => cambiar({ etiqueta })} opciones={opciones.etiquetas} vacio="Todas las etiquetas" />
          <label className="block text-xs text-texto-suave">
            Calificación mínima
            <select value={filtros.calificacionMin} onChange={(e) => cambiar({ calificacionMin: Number(e.target.value) })} className={selector}>
              <option value={0}>Cualquiera</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "estrella o más" : "estrellas o más"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-texto-suave">
            Ordenar por
            <select value={filtros.orden} onChange={(e) => cambiar({ orden: e.target.value as Orden })} className={selector}>
              {(Object.keys(ETIQUETA_ORDEN) as Orden[]).map((o) => (
                <option key={o} value={o}>
                  {ETIQUETA_ORDEN[o]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p aria-live="polite" className="flex flex-wrap items-center gap-3 text-sm text-texto-suave">
        {visibles.length === libros.length ? `${libros.length} ${libros.length === 1 ? "libro" : "libros"}` : `${visibles.length} de ${libros.length} libros`}
        {activos && (
          <button type="button" onClick={() => setFiltros({ ...FILTROS_VACIOS, orden: filtros.orden })} className="text-durazno underline-offset-4 hover:underline">
            Quitar filtros
          </button>
        )}
      </p>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-malva/50 px-6 py-12 text-center">
          <p className="font-marca text-2xl text-marfil">Ningún libro coincide</p>
          <p className="mt-2 text-texto-suave">Probá con otras palabras o quitá algún filtro.</p>
          <button type="button" onClick={() => setFiltros({ ...FILTROS_VACIOS, orden: filtros.orden })} className={`${boton} mt-5 border border-durazno/60 text-durazno hover:bg-durazno/10`}>
            Quitar filtros
          </button>
        </div>
      ) : vista === "estanteria" ? (
        <Estanteria libros={visibles} />
      ) : (
        <Catalogo libros={visibles} />
      )}
    </div>
  );
}
