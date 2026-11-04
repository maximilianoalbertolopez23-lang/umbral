"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { EstadoForm } from "@/app/(auth)/actions";
import {
  crearPaginaAction, eliminarDefinitivaAction, plantillaAmbitoAction, reordenarPaginasAction, restaurarPaginaAction,
} from "@/app/(mundo)/escritorio/actions";
import { Aviso } from "@/components/auth/formulario";
import { formatearFecha } from "@/components/archivo/Visuales";
import { mover } from "@/modules/escritorio/bloques";
import {
  ETIQUETA_ESTADO_PAGINA, INFO_PLANTILLA, INFO_TIPO, PLANTILLAS, TIPOS_GENERAL, TIPOS_LIBRO, type Plantilla, type TipoPagina,
} from "@/modules/escritorio/paginas";
import type { PaginaEnPapelera, ResumenPagina } from "@/modules/escritorio/repositorio";

const botonSec = "inline-flex min-h-10 items-center justify-center rounded-full border border-durazno/60 px-4 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-60";

/** Índice ordenable de páginas de un ámbito (un libro o el diario general). */
export function IndicePaginas({ paginas: iniciales, libroId }: { paginas: ResumenPagina[]; libroId: string | null }) {
  const [paginas, setPaginas] = useState(iniciales);
  const [error, setError] = useState("");

  async function moverPagina(desde: number, hasta: number) {
    const anterior = paginas;
    const nuevo = mover(paginas, desde, hasta);
    setPaginas(nuevo);
    setError("");
    const r = await reordenarPaginasAction(libroId, nuevo.map((p) => p.id));
    if (r.error) {
      setPaginas(anterior);
      setError(r.error);
    }
  }

  if (paginas.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-malva/50 px-5 py-8 text-center text-texto-suave">
        Todavía no hay páginas. Creá la primera con el botón de abajo: no hace falta completar nada.
      </p>
    );
  }
  return (
    <div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <ol className="divide-y divide-malva/25 overflow-hidden rounded-2xl border border-malva/30 bg-noche/50">
        {paginas.map((p, i) => (
          <li key={p.id} className="flex items-stretch gap-1 pr-2">
            <Link href={`/escritorio/pagina/${p.id}`} className="min-w-0 flex-1 px-4 py-3 transition-colors hover:bg-morado/30">
              <span className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-marca text-xl text-marfil">{p.titulo || INFO_TIPO[p.tipo].etiqueta}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-malva">{INFO_TIPO[p.tipo].etiqueta}</span>
                {p.estado === "borrador" && <span className="rounded-full border border-malva/50 px-2 text-xs text-texto-suave">{ETIQUETA_ESTADO_PAGINA.borrador}</span>}
              </span>
              {p.fragmento && <span className="mt-0.5 block truncate text-sm text-texto-suave">{p.fragmento}</span>}
              <span className="mt-0.5 block text-xs text-malva">Editada {formatearFecha(p.actualizadaAt.slice(0, 10))}</span>
            </Link>
            <span className="flex items-center gap-1">
              <button type="button" aria-label={`Subir «${p.titulo || INFO_TIPO[p.tipo].etiqueta}»`} disabled={i === 0} onClick={() => void moverPagina(i, i - 1)} className="grid size-10 place-items-center rounded-full text-texto-suave hover:text-durazno disabled:opacity-30">↑</button>
              <button type="button" aria-label={`Bajar «${p.titulo || INFO_TIPO[p.tipo].etiqueta}»`} disabled={i === paginas.length - 1} onClick={() => void moverPagina(i, i + 1)} className="grid size-10 place-items-center rounded-full text-texto-suave hover:text-durazno disabled:opacity-30">↓</button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BotonTipo({ libroId, tipo }: { libroId: string | null; tipo: TipoPagina }) {
  const [estado, enviar, pendiente] = useActionState(crearPaginaAction.bind(null, libroId, tipo), {} as EstadoForm);
  return (
    <form action={enviar}>
      <button type="submit" disabled={pendiente} className="w-full rounded-xl border border-malva/40 bg-noche/60 p-3 text-left transition hover:border-durazno disabled:opacity-60">
        <span className="block font-marca text-lg text-marfil">{INFO_TIPO[tipo].etiqueta}</span>
        <span className="block text-xs text-texto-suave">{pendiente ? "Creando…" : INFO_TIPO[tipo].descripcion}</span>
      </button>
      {estado.error && <p role="alert" className="mt-1 text-sm text-[#f5b5b5]">{estado.error}</p>}
    </form>
  );
}

/** Crear una página: el tipo solo decide con qué bloques arranca; después se edita libremente. */
export function NuevaPagina({ libroId }: { libroId: string | null }) {
  const tipos = libroId ? TIPOS_LIBRO : TIPOS_GENERAL;
  return (
    <details className="group mt-4 rounded-2xl border border-malva/30 bg-noche/40 p-4">
      <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-full bg-durazno px-5 text-sm font-medium text-ciruela hover:bg-marfil">＋ Nueva página</summary>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tipos.map((t) => (
          <BotonTipo key={t} libroId={libroId} tipo={t} />
        ))}
      </div>
    </details>
  );
}

/** Plantilla por defecto y aplicación a todas las páginas de un ámbito. El contenido no se modifica. */
export function SelectorPlantilla({ libroId, actual }: { libroId: string | null; actual: Plantilla }) {
  const [estado, enviar, pendiente] = useActionState(plantillaAmbitoAction.bind(null, libroId), {} as EstadoForm);
  return (
    <form action={enviar} className="mt-4 space-y-3 rounded-2xl border border-malva/30 bg-noche/40 p-4">
      <fieldset>
        <legend className="font-marca text-lg text-marfil">Plantilla del cuaderno</legend>
        <p className="mb-3 text-sm text-texto-suave">Cambia el aspecto de las páginas sin tocar lo que escribiste. También será la de las páginas nuevas.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLANTILLAS.map((p) => (
            <label key={p} className="flex cursor-pointer gap-3 rounded-xl border border-malva/40 p-3 has-[:checked]:border-durazno has-[:checked]:bg-morado/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-durazno">
              <input type="radio" name="plantilla" value={p} defaultChecked={actual === p} className="mt-1 accent-[#f2c7a2]" />
              <span>
                <span className="block text-sm text-marfil">{INFO_PLANTILLA[p].nombre}</span>
                <span className="block text-xs text-texto-suave">{INFO_PLANTILLA[p].descripcion}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pendiente} className={botonSec}>{pendiente ? "Aplicando…" : "Aplicar a todas las páginas"}</button>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
    </form>
  );
}

function FilaPapelera({ p }: { p: PaginaEnPapelera }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [rest, enviarRest, pendRest] = useActionState(restaurarPaginaAction.bind(null, p.id), {} as EstadoForm);
  const [elim, enviarElim, pendElim] = useActionState(eliminarDefinitivaAction.bind(null, p.id), {} as EstadoForm);
  if (rest.ok || elim.ok) {
    return <li className="px-4 py-3 text-sm text-texto-suave" role="status">{rest.ok ? rest.info : elim.info}</li>;
  }
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-marca text-xl text-marfil">{p.titulo || INFO_TIPO[p.tipo].etiqueta}</span>
        <span className="block text-xs text-malva">
          {p.libroTitulo ? `Libro: ${p.libroTitulo}` : "Diario general"} · eliminada {formatearFecha((p.eliminadaAt ?? "").slice(0, 10))}
        </span>
        {(rest.error || elim.error) && <span role="alert" className="block text-sm text-[#f5b5b5]">{rest.error || elim.error}</span>}
      </span>
      <form action={enviarRest}>
        <button type="submit" disabled={pendRest} className={botonSec}>{pendRest ? "Restaurando…" : "Restaurar"}</button>
      </form>
      <button type="button" onClick={() => dialogo.current?.showModal()} className="min-h-10 rounded-full border border-[#f0a3a3]/60 px-4 text-sm text-[#f5b5b5] hover:bg-[#f0a3a3]/10">Eliminar para siempre</button>
      <dialog ref={dialogo} aria-labelledby={`t-${p.id}`} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70">
        <form action={enviarElim} className="space-y-4">
          <h2 id={`t-${p.id}`} className="font-marca text-2xl">¿Eliminar para siempre?</h2>
          <p className="leading-relaxed text-texto-suave">Vas a borrar definitivamente <strong className="font-marca text-lg italic text-marfil">{p.titulo || INFO_TIPO[p.tipo].etiqueta}</strong> con sus imágenes. No se puede deshacer.</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 rounded-full border border-malva/60 px-5 text-sm text-texto-suave hover:text-marfil">Cancelar</button>
            <button type="submit" disabled={pendElim} className="min-h-11 rounded-full bg-[#f0a3a3] px-5 text-sm font-medium text-ciruela hover:bg-[#f8c4c4] disabled:opacity-60">{pendElim ? "Eliminando…" : "Sí, eliminar para siempre"}</button>
          </div>
        </form>
      </dialog>
    </li>
  );
}

export function ListaPapelera({ paginas }: { paginas: PaginaEnPapelera[] }) {
  if (paginas.length === 0) {
    return <p className="rounded-2xl border border-dashed border-malva/50 px-5 py-10 text-center text-texto-suave">La papelera está vacía.</p>;
  }
  return (
    <ul className="divide-y divide-malva/25 overflow-hidden rounded-2xl border border-malva/30 bg-noche/50">
      {paginas.map((p) => (
        <FilaPapelera key={p.id} p={p} />
      ))}
    </ul>
  );
}
