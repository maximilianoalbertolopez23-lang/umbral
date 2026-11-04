"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import {
  actualizarPlantillaAction, aplicarPlantillaATodasAction, crearPlantillaAction, eliminarPlantillaAction, plantillaPredeterminadaAction,
} from "@/app/(mundo)/taller/actions";
import { Aviso } from "@/components/auth/formulario";
import { puedeUsar } from "@/modules/torre/reglas";
import { INFO_PLANTILLA, PLANTILLAS, type Plantilla } from "@/modules/escritorio/paginas";
import {
  ACENTOS, ANCHOS, AJUSTES_BASE, BORDES, ESPACIADOS, FONDOS, FRAGMENTOS_MUESTRA, FUENTES, INTERLINEADOS, MAX_PLANTILLAS, ORNAMENTOS, PAPELES, TAMANOS, TINTAS,
  coloresEfectivos, contraste, propsHoja, validarAjustes, type AjustesJournal,
} from "@/modules/taller/journal";
import type { PlantillaPropia, PreferenciaPlantilla } from "@/modules/taller/repositorio";
import { deshacer, nuevoHistorial, rehacer, registrar, type Historial } from "@/modules/taller/sala";

const boton = "inline-flex min-h-11 items-center justify-center rounded-full border border-durazno/60 px-4 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-40";
const botonPrimario = "inline-flex min-h-11 items-center justify-center rounded-full bg-durazno px-5 text-sm font-medium text-ciruela transition hover:bg-marfil disabled:opacity-50";
const chip = "min-h-10 rounded-full border px-3.5 text-sm transition aria-pressed:border-durazno aria-pressed:bg-durazno/20 aria-pressed:text-durazno border-malva/40 text-texto-suave hover:border-malva hover:text-marfil";
const campoSel = "mt-1 block min-h-11 w-full rounded-xl border border-malva/50 bg-noche/70 px-3 text-sm text-marfil focus:border-durazno";

/** Hoja de muestra: contenido ficticio y claramente identificado, con la plantilla que se está diseñando. */
export function HojaMuestra({ base, ajustes }: { base: Plantilla; ajustes: AjustesJournal | null }) {
  const p = propsHoja(base, ajustes);
  return (
    <article className="hoja" data-plantilla={p.plantilla} {...p.datos} style={p.estilo as CSSProperties} aria-label="Vista previa de la plantilla">
      <p className="etiqueta-hoja">Vista previa</p>
      <h1 className="hoja-titulo" style={{ fontSize: "2.2rem", margin: "0 0 0.4em" }}>{FRAGMENTOS_MUESTRA[0]}</h1>
      <p>{FRAGMENTOS_MUESTRA[1]}</p>
      <blockquote>
        <p style={{ marginBottom: "0.2em" }}>{FRAGMENTOS_MUESTRA[2]}</p>
        <footer className="etiqueta-hoja">Autor · p. 12</footer>
      </blockquote>
      <hr />
      <ul>
        <li>{FRAGMENTOS_MUESTRA[3]}</li>
        <li>{FRAGMENTOS_MUESTRA[4]}</li>
      </ul>
    </article>
  );
}

interface Edicion {
  id: string | null;
  nombre: string;
  base: Plantilla;
  historial: Historial<AjustesJournal>;
}

function Confirmar({ referencia, id, titulo, confirmar, alConfirmar, children, peligro }: { referencia: React.RefObject<HTMLDialogElement | null>; id: string; titulo: string; confirmar: string; alConfirmar: () => void; children: React.ReactNode; peligro?: boolean }) {
  return (
    <dialog ref={referencia} aria-labelledby={id} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70">
      <h2 id={id} className="font-marca text-2xl">{titulo}</h2>
      <p className="mt-3 leading-relaxed text-texto-suave">{children}</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => referencia.current?.close()} className="min-h-11 rounded-full border border-malva/60 px-5 text-sm text-texto-suave hover:text-marfil">Cancelar</button>
        <button type="button" onClick={() => { referencia.current?.close(); alConfirmar(); }} className={`min-h-11 rounded-full px-5 text-sm font-medium ${peligro ? "bg-[#f0a3a3] text-ciruela hover:bg-[#f8c4c4]" : "bg-durazno text-ciruela hover:bg-marfil"}`}>{confirmar}</button>
      </div>
    </dialog>
  );
}

function Opciones<T extends string>({ rotulo, valor, opciones, alElegir, libre }: { rotulo: string; valor: T; opciones: [T, string][]; alElegir: (v: T) => void; libre?: (v: T) => boolean }) {
  return (
    <div role="group" aria-label={rotulo}>
      <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-malva">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {opciones.map(([v, nombre]) => (
          <button key={v} type="button" aria-pressed={valor === v} disabled={libre ? !libre(v) && valor !== v : false} onClick={() => alElegir(v)} className={`${chip} disabled:opacity-50`}>{nombre}{libre && !libre(v) ? " · en La Torre" : ""}</button>
        ))}
      </div>
    </div>
  );
}

function Colores<T extends string>({ rotulo, valor, opciones, alElegir }: { rotulo: string; valor: T | "base"; opciones: Record<T, { nombre: string; hex: string }>; alElegir: (v: T | "base") => void }) {
  return (
    <div role="group" aria-label={rotulo}>
      <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-malva">{rotulo}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={valor === "base"} onClick={() => alElegir("base")} className={chip}>De la plantilla</button>
        {(Object.keys(opciones) as T[]).map((c) => (
          <button key={c} type="button" aria-pressed={valor === c} aria-label={`${rotulo}: ${opciones[c].nombre}`} title={opciones[c].nombre} onClick={() => alElegir(c)} className="size-10 rounded-full border border-malva/50 aria-pressed:border-durazno aria-pressed:ring-2 aria-pressed:ring-durazno/60" style={{ background: opciones[c].hex }} />
        ))}
      </div>
    </div>
  );
}

export function JournalTaller({ plantillas, predeterminada, nPaginas, inventario }: { plantillas: PlantillaPropia[]; predeterminada: PreferenciaPlantilla; nPaginas: number; inventario: string[] }) {
  const tengo = new Set(inventario);
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "info" | "error"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const dlgEliminar = useRef<HTMLDialogElement>(null);
  const dlgBase = useRef<HTMLDialogElement>(null);
  const dlgTodas = useRef<HTMLDialogElement>(null);

  const ajustes = edicion?.historial.actual ?? null;
  const validacion = edicion && ajustes ? validarAjustes(edicion.base, ajustes) : null;
  const colores = edicion && ajustes ? coloresEfectivos(edicion.base, ajustes) : null;
  const guardada = edicion?.id ? plantillas.find((p) => p.id === edicion.id) : null;
  const sinGuardar = edicion ? (guardada ? JSON.stringify(guardada.ajustes) !== JSON.stringify(ajustes) || guardada.nombre !== edicion.nombre || guardada.base !== edicion.base : true) : false;

  const cambiar = (parcial: Partial<AjustesJournal>) => setEdicion((e) => (e ? { ...e, historial: registrar(e.historial, { ...e.historial.actual, ...parcial }) } : e));
  const aviso = (tipo: "info" | "error", texto: string) => setMensaje({ tipo, texto });

  function empezar(base: Plantilla, p?: PlantillaPropia) {
    setMensaje(null);
    setEdicion({ id: p?.id ?? null, nombre: p?.nombre ?? `Mi plantilla (${INFO_PLANTILLA[base].nombre})`, base: p?.base ?? base, historial: nuevoHistorial(p?.ajustes ?? AJUSTES_BASE) });
  }

  async function guardar() {
    if (!edicion || !validacion?.ok) return;
    setOcupado(true);
    const datos = { nombre: edicion.nombre, base: edicion.base, ajustes: edicion.historial.actual };
    const r = edicion.id ? await actualizarPlantillaAction(edicion.id, datos) : await crearPlantillaAction(datos);
    setOcupado(false);
    if (!r.ok) return aviso("error", r.error);
    if (!edicion.id && r.id) setEdicion({ ...edicion, id: r.id });
    aviso("info", r.info ?? "Guardado.");
    refrescar(() => router.refresh());
  }

  async function eliminar() {
    if (!edicion?.id) return;
    setOcupado(true);
    const r = await eliminarPlantillaAction(edicion.id);
    setOcupado(false);
    if (!r.ok) return aviso("error", r.error);
    setEdicion(null);
    aviso("info", r.info ?? "Plantilla eliminada.");
    refrescar(() => router.refresh());
  }

  async function predeterminar(base: Plantilla, customId: string | null) {
    setOcupado(true);
    const r = await plantillaPredeterminadaAction(base, customId);
    setOcupado(false);
    aviso(r.ok ? "info" : "error", r.ok ? (r.info ?? "Listo.") : r.error);
    if (r.ok) refrescar(() => router.refresh());
  }

  async function aplicarATodas() {
    if (!edicion?.id) return;
    setOcupado(true);
    const r = await aplicarPlantillaATodasAction(edicion.base, edicion.id);
    setOcupado(false);
    aviso(r.ok ? "info" : "error", r.ok ? (r.info ?? "Listo.") : r.error);
  }

  const esPredeterminada = (id: string | null, base?: Plantilla) => (id ? predeterminada.customId === id : predeterminada.customId === null && predeterminada.base === base);

  return (
    <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="space-y-6">
        <section aria-labelledby="incluidas" className="space-y-2">
          <h2 id="incluidas" className="font-marca text-2xl text-marfil">Incluidas</h2>
          <ul className="space-y-2">
            {PLANTILLAS.map((p) => (
              <li key={p} className="rounded-2xl border border-malva/30 bg-noche/50 p-3">
                <p className="font-marca text-lg text-marfil">{INFO_PLANTILLA[p].nombre}</p>
                <p className="text-xs text-texto-suave">{INFO_PLANTILLA[p].descripcion}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={boton} onClick={() => empezar(p)}>Crear a partir de ésta</button>
                  <button type="button" className={boton} disabled={ocupado || esPredeterminada(null, p)} onClick={() => void predeterminar(p, null)}>
                    {esPredeterminada(null, p) ? "Predeterminada" : "Usar por defecto"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="propias" className="space-y-2">
          <h2 id="propias" className="font-marca text-2xl text-marfil">Mis plantillas</h2>
          {plantillas.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-malva/50 p-4 text-sm text-texto-suave">Todavía no creaste ninguna. Elegí una de las incluidas y adaptala a tu gusto.</p>
          ) : (
            <ul className="space-y-2">
              {plantillas.map((p) => (
                <li key={p.id} className={`rounded-2xl border p-3 ${edicion?.id === p.id ? "border-durazno bg-morado/30" : "border-malva/30 bg-noche/50"}`}>
                  <p className="font-marca text-lg text-marfil">{p.nombre}</p>
                  <p className="text-xs text-texto-suave">Base: {INFO_PLANTILLA[p.base].nombre}{esPredeterminada(p.id) ? " · predeterminada" : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={boton} onClick={() => empezar(p.base, p)}>Editar</button>
                    <button type="button" className={boton} disabled={ocupado || esPredeterminada(p.id)} onClick={() => void predeterminar(p.base, p.id)}>
                      {esPredeterminada(p.id) ? "Predeterminada" : "Usar por defecto"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-malva">{plantillas.length} de {MAX_PLANTILLAS} plantillas propias.</p>
        </section>
      </div>

      <div className="min-w-0 space-y-5">
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        {!edicion ? (
          <div className="rounded-3xl border border-dashed border-malva/50 p-8 text-center">
            <p className="font-marca text-3xl text-marfil">Diseñá tu cuaderno</p>
            <p className="mx-auto mt-3 max-w-lg leading-relaxed text-texto-suave">
              Elegí una plantilla incluida y «Crear a partir de ésta», o editá una propia. Cambiar el diseño nunca borra lo que escribiste: el contenido y la presentación están separados.
            </p>
            <div className="mx-auto mt-6 max-w-md">
              <HojaMuestra base={predeterminada.customId ? (plantillas.find((p) => p.id === predeterminada.customId)?.base ?? predeterminada.base) : predeterminada.base} ajustes={predeterminada.customId ? (plantillas.find((p) => p.id === predeterminada.customId)?.ajustes ?? null) : null} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-56">
                <label htmlFor="nombre-plantilla" className="text-xs uppercase tracking-[0.14em] text-malva">Nombre</label>
                <input id="nombre-plantilla" value={edicion.nombre} maxLength={60} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} className="mt-1 block min-h-11 w-full rounded-xl border border-malva/50 bg-noche/70 px-4 text-base text-marfil focus:border-durazno" />
              </div>
              <div>
                <label htmlFor="base-plantilla" className="text-xs uppercase tracking-[0.14em] text-malva">Base</label>
                <select id="base-plantilla" value={edicion.base} onChange={(e) => setEdicion({ ...edicion, base: e.target.value as Plantilla })} className={campoSel}>
                  {PLANTILLAS.map((p) => <option key={p} value={p}>{INFO_PLANTILLA[p].nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={boton} disabled={edicion.historial.pasado.length === 0} onClick={() => setEdicion({ ...edicion, historial: deshacer(edicion.historial) })}>↶ Deshacer</button>
              <button type="button" className={boton} disabled={edicion.historial.futuro.length === 0} onClick={() => setEdicion({ ...edicion, historial: rehacer(edicion.historial) })}>↷ Rehacer</button>
              <button type="button" className={boton} disabled={JSON.stringify(ajustes) === JSON.stringify(AJUSTES_BASE)} onClick={() => dlgBase.current?.showModal()}>Restablecer ajustes…</button>
              <span className="ml-auto text-sm text-texto-suave" role="status">{sinGuardar ? "Cambios sin guardar" : "Guardada"}</span>
            </div>

            {ajustes && (
              <div className="grid gap-5 rounded-2xl border border-malva/30 bg-noche/40 p-4 lg:grid-cols-2">
                <fieldset className="space-y-4">
                  <legend className="mb-2 font-marca text-xl text-marfil">Lectura</legend>
                  <Opciones rotulo="Tipografía" valor={ajustes.fuente} opciones={(Object.keys(FUENTES) as (keyof typeof FUENTES)[]).map((k) => [k, FUENTES[k].nombre])} alElegir={(fuente) => cambiar({ fuente })} />
                  <Opciones rotulo="Tamaño" valor={ajustes.tamano} opciones={(Object.keys(TAMANOS) as (keyof typeof TAMANOS)[]).map((k) => [k, TAMANOS[k].nombre])} alElegir={(tamano) => cambiar({ tamano })} />
                  <Opciones rotulo="Interlineado" valor={ajustes.interlineado} opciones={(Object.keys(INTERLINEADOS) as (keyof typeof INTERLINEADOS)[]).map((k) => [k, INTERLINEADOS[k].nombre])} alElegir={(interlineado) => cambiar({ interlineado })} />
                </fieldset>
                <fieldset className="space-y-4">
                  <legend className="mb-2 font-marca text-xl text-marfil">Colores</legend>
                  <Colores rotulo="Papel" valor={ajustes.papel} opciones={PAPELES} alElegir={(papel) => cambiar({ papel })} />
                  <Colores rotulo="Tinta" valor={ajustes.tinta} opciones={TINTAS} alElegir={(tinta) => cambiar({ tinta })} />
                  <Colores rotulo="Acento" valor={ajustes.acento} opciones={ACENTOS} alElegir={(acento) => cambiar({ acento })} />
                  {colores && (
                    <p className={`text-xs ${contraste(colores.papel, colores.tinta) >= 4.5 ? "text-texto-suave" : "text-[#f5b5b5]"}`}>
                      Contraste texto/papel: {contraste(colores.papel, colores.tinta).toFixed(1)}:1 {contraste(colores.papel, colores.tinta) >= 4.5 ? "(legible)" : "(muy bajo: elegí otra combinación)"}
                    </p>
                  )}
                </fieldset>
                <fieldset className="space-y-4">
                  <legend className="mb-2 font-marca text-xl text-marfil">Página</legend>
                  <Opciones rotulo="Fondo del papel" valor={ajustes.fondo} opciones={(Object.keys(FONDOS) as (keyof typeof FONDOS)[]).map((k) => [k, FONDOS[k]])} alElegir={(fondo) => cambiar({ fondo })} libre={(k) => puedeUsar(`fondo:${k}`, tengo)} />
                  <Opciones rotulo="Borde" valor={ajustes.borde} opciones={(Object.keys(BORDES) as (keyof typeof BORDES)[]).map((k) => [k, BORDES[k]])} alElegir={(borde) => cambiar({ borde })} libre={(k) => puedeUsar(`borde:${k}`, tengo)} />
                  <Opciones rotulo="Separadores" valor={ajustes.ornamento} opciones={(Object.keys(ORNAMENTOS) as (keyof typeof ORNAMENTOS)[]).map((k) => [k, `${ORNAMENTOS[k].nombre} ${ORNAMENTOS[k].texto.slice(0, 5)}`])} alElegir={(ornamento) => cambiar({ ornamento })} libre={(k) => puedeUsar(`ornamento:${k}`, tengo)} />
                </fieldset>
                <fieldset className="space-y-4">
                  <legend className="mb-2 font-marca text-xl text-marfil">Distribución</legend>
                  <Opciones rotulo="Ancho de la hoja" valor={ajustes.ancho} opciones={(Object.keys(ANCHOS) as (keyof typeof ANCHOS)[]).map((k) => [k, ANCHOS[k].nombre])} alElegir={(ancho) => cambiar({ ancho })} />
                  <Opciones rotulo="Espacio entre bloques" valor={ajustes.espaciado} opciones={(Object.keys(ESPACIADOS) as (keyof typeof ESPACIADOS)[]).map((k) => [k, ESPACIADOS[k].nombre])} alElegir={(espaciado) => cambiar({ espaciado })} />
                  <Opciones rotulo="Columnas al leer" valor={String(ajustes.columnas) as "1" | "2"} opciones={[["1", "Una"], ["2", "Dos"]]} alElegir={(c) => cambiar({ columnas: Number(c) as 1 | 2 })} />
                  <Opciones rotulo="Títulos" valor={ajustes.titulos} opciones={[["izquierda", "A la izquierda"], ["centro", "Centrados"]]} alElegir={(titulos) => cambiar({ titulos })} />
                </fieldset>
              </div>
            )}

            {validacion && !validacion.ok && <Aviso tipo="error">{validacion.error}</Aviso>}

            <div className="flex flex-wrap gap-2">
              <button type="button" className={botonPrimario} disabled={ocupado || !validacion?.ok || !edicion.nombre.trim() || !sinGuardar} onClick={() => void guardar()}>
                {ocupado ? "Guardando…" : edicion.id ? "Guardar cambios" : "Guardar plantilla"}
              </button>
              {edicion.id && (
                <>
                  <button type="button" className={boton} disabled={ocupado || sinGuardar} onClick={() => dlgTodas.current?.showModal()} title={sinGuardar ? "Guardá los cambios primero" : undefined}>
                    Aplicar a todas mis páginas…
                  </button>
                  <button type="button" className="inline-flex min-h-11 items-center rounded-full border border-[#f0a3a3]/60 px-4 text-sm text-[#f5b5b5] hover:bg-[#f0a3a3]/10" disabled={ocupado} onClick={() => dlgEliminar.current?.showModal()}>
                    Eliminar plantilla…
                  </button>
                </>
              )}
              <button type="button" className={boton} onClick={() => setEdicion(null)}>Cerrar</button>
            </div>

            <HojaMuestra base={edicion.base} ajustes={ajustes} />
          </>
        )}
      </div>

      <Confirmar referencia={dlgBase} id="t-base" titulo="¿Restablecer los ajustes?" confirmar="Sí, restablecer" alConfirmar={() => setEdicion((e) => (e ? { ...e, historial: registrar(e.historial, AJUSTES_BASE) } : e))}>
        Los ajustes vuelven a los de la plantilla base. Podés deshacerlo mientras no cierres esta plantilla.
      </Confirmar>
      <Confirmar referencia={dlgTodas} id="t-todas" titulo="¿Aplicar a todas tus páginas?" confirmar="Sí, aplicar" alConfirmar={() => void aplicarATodas()}>
        {nPaginas === 0 ? "Todavía no tenés páginas." : `Se cambia la presentación de tus ${nPaginas} ${nPaginas === 1 ? "página" : "páginas"}, reemplazando la plantilla que usaba cada una. Lo escrito no se modifica.`}
      </Confirmar>
      <Confirmar referencia={dlgEliminar} id="t-eliminar" titulo="¿Eliminar esta plantilla?" confirmar="Sí, eliminar" peligro alConfirmar={() => void eliminar()}>
        {`Las páginas que la usan vuelven a su plantilla base (${edicion ? INFO_PLANTILLA[edicion.base].nombre : ""}). No se pierde ninguna nota ni ningún texto: solo desaparece este diseño.`}
      </Confirmar>
    </div>
  );
}
