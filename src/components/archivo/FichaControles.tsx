"use client";

import { useActionState, useRef } from "react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Aviso, BotonEnvio, Campo, useFormularioValidado } from "@/components/auth/formulario";
import { esquemaFechasLectura, esquemaProgreso } from "@/modules/archivo/esquemas";
import { ESTADOS, ETIQUETA_ESTADO, type Estado } from "@/modules/archivo/tipos";

type Accion = (previo: EstadoForm, datos: FormData) => Promise<EstadoForm>;
type AccionSimple = (previo: EstadoForm) => Promise<EstadoForm>;

const selector = "block min-h-11 w-full rounded-xl border border-malva/50 bg-noche/70 px-3 text-base text-marfil focus:border-durazno";
const botonSec = "inline-flex min-h-11 items-center justify-center rounded-full border border-durazno/60 px-5 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-60";

export function ControlEstado({ accion, estadoActual }: { accion: Accion; estadoActual: Estado }) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoForm);
  return (
    <form action={enviar} className="space-y-3">
      <div className="flex gap-2">
        <label htmlFor="cambiar-estado" className="sr-only">
          Estado de lectura
        </label>
        <select key={estadoActual} id="cambiar-estado" name="estado" defaultValue={estadoActual} className={selector}>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pendiente} className={`${botonSec} shrink-0`}>
          {pendiente ? "…" : "Cambiar"}
        </button>
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
    </form>
  );
}

export function ControlProgreso({ accion, paginaActual, paginasTotal }: { accion: Accion; paginaActual: number; paginasTotal: number | null }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaProgreso, accion);
  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          key={paginaActual}
          nombre="pagina"
          etiqueta={paginasTotal ? `Página actual (de ${paginasTotal})` : "Página actual"}
          valorInicial={estado.valores?.pagina ?? String(paginaActual)}
          error={errores.pagina}
          maxLength={5}
        />
        <Campo nombre="minutos" etiqueta="Minutos leídos (opcional)" valorInicial={estado.valores?.minutos} error={errores.minutos} maxLength={4} />
        <Campo nombre="fecha" etiqueta="Fecha (hoy si la dejás vacía)" tipo="date" valorInicial={estado.valores?.fecha} error={errores.fecha} />
        <Campo nombre="nota" etiqueta="Nota (opcional)" valorInicial={estado.valores?.nota} error={errores.nota} maxLength={500} />
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Registrar progreso
      </BotonEnvio>
    </form>
  );
}

export function ControlCalificacion({ accion, calificacion }: { accion: Accion; calificacion: number | null }) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoForm);
  return (
    <form action={enviar}>
      <div role="group" aria-label="Calificación personal" className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="submit"
            name="calificacion"
            value={n}
            disabled={pendiente}
            aria-label={`Calificar con ${n} ${n === 1 ? "estrella" : "estrellas"}`}
            aria-pressed={calificacion === n}
            className="grid size-11 place-items-center rounded-full text-durazno hover:bg-durazno/10 disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-6" fill={calificacion !== null && n <= calificacion ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
              <path d="m10 1.8 2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L10 1.8Z" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
        {calificacion !== null && (
          <button type="submit" name="calificacion" value="0" disabled={pendiente} className="ml-1 min-h-11 px-2 text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
            Quitar
          </button>
        )}
      </div>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
    </form>
  );
}

export function BotonReleer({ accion }: { accion: AccionSimple }) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoForm);
  return (
    <form action={enviar} className="space-y-3">
      <button type="submit" disabled={pendiente} className={botonSec}>
        {pendiente ? "Iniciando…" : "Empezar una relectura"}
      </button>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
    </form>
  );
}

export function FechasLectura({ accion, inicio, fin, conFin }: { accion: Accion; inicio: string | null; fin: string | null; conFin: boolean }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaFechasLectura, accion);
  return (
    <details className="group text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center text-durazno underline-offset-4 hover:underline">Modificar fechas</summary>
      <form {...formProps} className="mt-3 space-y-4 rounded-xl border border-malva/30 bg-noche/60 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo key={inicio ?? ""} nombre="fechaInicio" etiqueta="Inicio" tipo="date" valorInicial={estado.valores?.fechaInicio ?? inicio ?? ""} error={errores.fechaInicio} />
          {conFin && <Campo key={fin ?? ""} nombre="fechaFin" etiqueta="Finalización" tipo="date" valorInicial={estado.valores?.fechaFin ?? fin ?? ""} error={errores.fechaFin} />}
        </div>
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
        <div className="sm:w-48">
          <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
            Guardar fechas
          </BotonEnvio>
        </div>
      </form>
    </details>
  );
}

export function BotonEliminar({ accion, titulo }: { accion: AccionSimple; titulo: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoForm);
  return (
    <>
      <button type="button" onClick={() => dialogo.current?.showModal()} className="inline-flex min-h-11 items-center rounded-full border border-[#f0a3a3]/60 px-5 text-sm text-[#f5b5b5] transition hover:bg-[#f0a3a3]/10">
        Eliminar libro
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby="titulo-eliminar"
        aria-describedby="texto-eliminar"
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70"
      >
        <form action={enviar} className="space-y-4">
          <h2 id="titulo-eliminar" className="font-marca text-2xl">
            ¿Eliminar este libro?
          </h2>
          <p id="texto-eliminar" className="leading-relaxed text-texto-suave">
            Vas a borrar <strong className="font-marca text-lg italic text-marfil">{titulo}</strong> con su portada, sus lecturas, su historial de progreso y todas las páginas de su journal. Esta acción no se puede deshacer.
          </p>
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 rounded-full border border-malva/60 px-5 text-sm text-texto-suave hover:text-marfil">
              Cancelar
            </button>
            <button type="submit" disabled={pendiente} className="min-h-11 rounded-full bg-[#f0a3a3] px-5 text-sm font-medium text-ciruela hover:bg-[#f8c4c4] disabled:opacity-60">
              {pendiente ? "Eliminando…" : "Sí, eliminar para siempre"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
