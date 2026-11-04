"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { guardarDisenoAction } from "@/app/(mundo)/taller/actions";
import { Aviso } from "@/components/auth/formulario";
import { CapaDecoracion } from "@/components/sala/objetos";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { IndicadorGuardado } from "@/components/ui/IndicadorGuardado";
import { useProtegerSalida } from "@/components/ui/useProtegerSalida";
import { Autoguardado, type EstadoGuardado } from "@/modules/escritorio/autoguardado";
import { APARIENCIAS } from "@/modules/onboarding/apariencias";
import { puedeUsar } from "@/modules/torre/reglas";
import { ALTO_ESCENA, ANCHO_ESCENA, pct } from "@/modules/sala/objetos";
import { ETIQUETA_CATEGORIA, itemsPorCategoria, obtenerItem } from "@/modules/taller/catalogo";
import {
  BRILLOS, ESTILOS, ESTILOS_SALA, RESERVADOS_PARED, SALAS, ZONAS_SALA,
  agregarObjeto, alternarOculto, aplicarEstilo, escalarObjeto, moverCapa, ubicacionLibre, ESCALA_MIN, ESCALA_MAX, cajaDe, cambiarVariante, deshacer, disenoRestablecido, eliminarObjeto, girarObjeto, moverObjeto,
  nuevoHistorial, rehacer, registrar, resolverMateriales, tieneAjustesManuales, validarObjeto,
  type DisenoSala, type EstiloSala, type Historial, type ObjetoColocado, type Sala,
} from "@/modules/taller/sala";

interface Props {
  diseno: DisenoSala;
  version: number;
  libros: { id: string }[];
  /** Claves de lo que la persona tiene en su inventario (se consigue en La Torre). */
  inventario: string[];
}

const boton = "inline-flex min-h-11 items-center justify-center rounded-full border border-durazno/60 px-4 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-40";
const botonPrimario = "inline-flex min-h-11 items-center justify-center rounded-full bg-durazno px-5 text-sm font-medium text-ciruela transition hover:bg-marfil disabled:opacity-50";
const chip = "min-h-10 rounded-full border px-3.5 text-sm transition aria-pressed:border-durazno aria-pressed:bg-durazno/20 aria-pressed:text-durazno border-malva/40 text-texto-suave hover:border-malva hover:text-marfil";

const redondear = (n: number) => Math.round(n * 10) / 10;

interface Arrastre {
  id: string;
  x: number;
  y: number;
  motivo: string | null;
}

export function EditorSala({ diseno, version, inventario }: Props) {
  const tengo = new Set(inventario);
  const [inicial] = useState(diseno);
  const [hist, setHist] = useState<Historial<DisenoSala>>(() => nuevoHistorial(diseno));
  const [contexto] = useState(() => ({ version }));
  const [guardado, setGuardado] = useState<EstadoGuardado>("guardado");
  const [detalle, setDetalle] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [sala, setSala] = useState<Sala>("gran-sala");
  const [previa, setPrevia] = useState<{ tipo: string; x: number; y: number } | null>(null);
  const [pestana, setPestana] = useState<"objetos" | "ambiente">("objetos");
  const [estiloPendiente, setEstiloPendiente] = useState<EstiloSala | null>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const dlgRestablecer = useRef<HTMLDialogElement>(null);
  const dlgDescartar = useRef<HTMLDialogElement>(null);
  const dlgEstilo = useRef<HTMLDialogElement>(null);

  const [auto] = useState(
    () =>
      new Autoguardado<DisenoSala>({
        guardar: async (valor) => {
          const r = await guardarDisenoAction(valor, contexto.version);
          if (r.ok) {
            contexto.version = r.version;
            return { ok: true };
          }
          return { ok: false, conflicto: r.conflicto, mensaje: r.error };
        },
        alCambiarEstado: (estado, texto) => {
          setGuardado(estado);
          setDetalle(texto ?? "");
        },
      }),
  );
  useProtegerSalida(auto);

  const d = hist.actual;
  const m = resolverMateriales(d);
  const objetoSel = d.objetos.find((o) => o.id === seleccionado) ?? null;
  const itemSel = objetoSel ? obtenerItem(objetoSel.tipo) : null;

  function aplicar(nuevo: DisenoSala, aviso = "") {
    setHist((h) => registrar(h, nuevo));
    auto.cambiar(nuevo);
    setMensaje(aviso);
  }

  function intentar(r: ReturnType<typeof moverObjeto>, aviso = "") {
    if (r.ok) aplicar(r.diseno, aviso);
    else setMensaje(r.error);
    return r.ok;
  }

  function alDeshacer() {
    const h = deshacer(hist);
    setHist(h);
    auto.cambiar(h.actual);
    setMensaje("Deshiciste el último cambio.");
  }
  function alRehacer() {
    const h = rehacer(hist);
    setHist(h);
    auto.cambiar(h.actual);
    setMensaje("Rehiciste el cambio.");
  }

  /** Vista previa: el objeto se ve sobre la escena, semitransparente, y no se guarda hasta confirmar. */
  function iniciarPrevia(tipo: string) {
    const prueba = agregarObjeto(d, tipo, crypto.randomUUID(), undefined, sala);
    if (!prueba.ok) return setMensaje(prueba.error);
    const lugar = ubicacionLibre(tipo, d.objetos, sala);
    if (!lugar) return setMensaje("No queda lugar libre para ese objeto.");
    setSeleccionado(null);
    setPrevia({ tipo, ...lugar });
    setMensaje("Vista previa: movela con el mouse, tocando la escena o con las flechas, y confirmá cuando te guste.");
  }

  function confirmarPrevia() {
    if (!previa) return;
    const r = agregarObjeto(d, previa.tipo, crypto.randomUUID(), { x: previa.x, y: previa.y }, sala);
    if (!r.ok) return setMensaje(r.error);
    const nuevo = r.diseno.objetos.at(-1)!;
    aplicar(r.diseno, `${obtenerItem(previa.tipo)!.nombre} agregado. Podés moverlo, cambiarle el tamaño o quitarlo.`);
    setSeleccionado(nuevo.id);
    setPrevia(null);
  }

  function moverPrevia(dx: number, dy: number) {
    setPrevia((p) => (p ? { ...p, x: redondear(Math.min(1600, Math.max(0, p.x + dx))), y: redondear(Math.min(900, Math.max(0, p.y + dy))) } : p));
  }

  function aEscena(e: PointerEvent) {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * ANCHO_ESCENA) / r.width, y: ((e.clientY - r.top) * ALTO_ESCENA) / r.height };
  }

  function alPresionar(e: PointerEvent<HTMLButtonElement>, o: ObjetoColocado) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = aEscena(e);
    setSeleccionado(o.id);
    dragRef.current = { id: o.id, dx: p.x - o.x, dy: p.y - o.y, moved: false };
  }

  function alArrastrar(e: PointerEvent<HTMLButtonElement>, o: ObjetoColocado) {
    const dr = dragRef.current;
    if (!dr || dr.id !== o.id) return;
    const p = aEscena(e);
    const x = redondear(p.x - dr.dx);
    const y = redondear(p.y - dr.dy);
    if (!dr.moved && Math.hypot(x - o.x, y - o.y) < 5) return;
    dr.moved = true;
    const motivo = validarObjeto({ ...o, x, y }, d.objetos.filter((z) => z.id !== o.id));
    setArrastre({ id: o.id, x, y, motivo });
  }

  function alSoltar(o: ObjetoColocado) {
    const dr = dragRef.current;
    dragRef.current = null;
    const a = arrastre;
    setArrastre(null);
    if (!dr?.moved || !a || a.id !== o.id) return;
    if (a.motivo) return setMensaje(`${a.motivo} El objeto volvió a su lugar.`);
    intentar(moverObjeto(d, o.id, a.x, a.y), "Objeto movido.");
  }

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, o: ObjetoColocado) {
    const paso = e.shiftKey ? 40 : 10;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
    if (delta[e.key]) {
      e.preventDefault();
      intentar(moverObjeto(d, o.id, o.x + delta[e.key][0], o.y + delta[e.key][1]));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      quitar(o.id);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      intentar(girarObjeto(d, o.id), "Objeto girado.");
    } else if (e.key === "Escape") {
      setSeleccionado(null);
    }
  }

  function quitar(id: string) {
    const item = obtenerItem(d.objetos.find((o) => o.id === id)?.tipo ?? "");
    aplicar(eliminarObjeto(d, id), `${item?.nombre ?? "Objeto"} quitado. Podés deshacerlo.`);
    setSeleccionado(null);
  }

  function mover(dx: number, dy: number) {
    if (objetoSel) intentar(moverObjeto(d, objetoSel.id, objetoSel.x + dx, objetoSel.y + dy));
  }

  function elegirEstilo(e: EstiloSala) {
    if (e === d.estilo && !tieneAjustesManuales(d)) return;
    if (tieneAjustesManuales(d)) {
      setEstiloPendiente(e);
      dlgEstilo.current?.showModal();
    } else aplicar(aplicarEstilo(d, e), `Estilo «${ESTILOS[e].nombre}» aplicado.`);
  }

  const suelo = ZONAS_SALA[sala].suelo;
  const previaObj: ObjetoColocado | null = previa ? { id: "previa", tipo: previa.tipo, x: previa.x, y: previa.y, sala, giro: false, escala: 1, oculto: false, capa: 0, variante: 0 } : null;
  const previaMotivo = previaObj ? validarObjeto(previaObj, d.objetos.filter((o) => o.sala === sala)) : null;
  const dibujados = d.objetos.filter((o) => o.sala === sala).map((o) => (arrastre?.id === o.id ? { ...o, x: arrastre.x, y: arrastre.y } : o));
  const itemArrastrado = arrastre ? obtenerItem(d.objetos.find((o) => o.id === arrastre.id)?.tipo ?? "") : null;
  const conteo = (tipo: string) => d.objetos.filter((o) => o.tipo === tipo).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={boton} onClick={alDeshacer} disabled={hist.pasado.length === 0}>
          ↶ Deshacer
        </button>
        <button type="button" className={boton} onClick={alRehacer} disabled={hist.futuro.length === 0}>
          ↷ Rehacer
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <IndicadorGuardado estado={guardado} detalle={detalle} alReintentar={() => void auto.reintentar()} />
          <Link href="/sala" className={botonPrimario}>
            Ver la Gran Sala
          </Link>
        </div>
      </div>

      {guardado === "conflicto" && (
        <Aviso tipo="error">
          La sala se modificó en otra pestaña o dispositivo; para no pisar nada dejamos de guardar. Tus cambios siguen acá:{" "}
          <button type="button" className="underline underline-offset-4" onClick={() => location.reload()}>
            recargá la página
          </button>{" "}
          para ver la última versión.
        </Aviso>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Escena de la sala" className="min-w-0">
          <div role="group" aria-label="Habitación" className="mb-3 flex flex-wrap gap-2">
            {SALAS.map((z) => (
              <button key={z} type="button" aria-pressed={sala === z} onClick={() => { setSala(z); setSeleccionado(null); setPrevia(null); setMensaje(""); }} className={chip}>
                {ZONAS_SALA[z].nombre}
              </button>
            ))}
          </div>
          <div className="sala-escena" data-apariencia={m.luz} data-brillo={m.brillo} data-estilo={m.estilo} data-velas="on">
            <div className="sala-scroll">
              <div ref={lienzo} className="sala-lienzo editor-escena" onPointerMove={(e) => { if (previa && e.pointerType === "mouse") { const p = aEscena(e); setPrevia({ ...previa, x: redondear(p.x), y: redondear(p.y) }); } }} onPointerDown={(e) => { if (e.target !== e.currentTarget) return; if (previa) { const p = aEscena(e); setPrevia({ ...previa, x: redondear(p.x), y: redondear(p.y) }); } else setSeleccionado(null); }}>
                <div className="absolute inset-0 pointer-events-none">
                  <SceneBackground id={ZONAS_SALA[sala].escena} priority />
                  <CapaDecoracion objetos={dibujados} sala={sala} filtro={m.filtroDecoracion} verOcultos previa={previaObj ?? undefined} />
                  <div className="sala-luz sala-luz-luna" />
                  <div className="sala-luz sala-brillo" />
                  <div className="sala-sombra" />
                </div>

                {arrastre && itemArrastrado?.zona === "pared" && sala === "gran-sala" &&
                  RESERVADOS_PARED.map((r) => (
                    <div key={r.nombre} className="editor-zona-pared" style={{ left: pct(r.x, ANCHO_ESCENA), top: pct(r.y, ALTO_ESCENA), width: pct(r.w, ANCHO_ESCENA), height: pct(r.h, ALTO_ESCENA) }} />
                  ))}
                {arrastre && itemArrastrado?.zona === "suelo" && (
                  <div className="editor-franja-suelo" style={{ left: pct(suelo.xMin, ANCHO_ESCENA), top: pct(suelo.yMin, ALTO_ESCENA), width: pct(suelo.xMax - suelo.xMin, ANCHO_ESCENA), height: pct(suelo.yMax - suelo.yMin, ALTO_ESCENA) }} />
                )}

                {dibujados.map((o) => {
                  const item = obtenerItem(o.tipo)!;
                  const caja = cajaDe(o, item);
                  const nombre = `${item.nombre}, ${item.zona === "suelo" ? "en el piso" : "en la pared"}`;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className="editor-objeto"
                      style={{ left: pct(caja.x, ANCHO_ESCENA), top: pct(caja.y, ALTO_ESCENA), width: pct(caja.w, ANCHO_ESCENA), height: pct(caja.h, ALTO_ESCENA) }}
                      data-seleccionado={seleccionado === o.id}
                      data-arrastrando={arrastre?.id === o.id}
                      data-invalido={arrastre?.id === o.id && arrastre.motivo !== null}
                      aria-pressed={seleccionado === o.id}
                      aria-label={`${nombre}. Flechas para mover, R para girar, Supr para quitar.`}
                      onPointerDown={(e) => alPresionar(e, o)}
                      onPointerMove={(e) => alArrastrar(e, o)}
                      onPointerUp={() => alSoltar(o)}
                      onPointerCancel={() => { dragRef.current = null; setArrastre(null); }}
                      onKeyDown={(e) => alTeclear(e, o)}
                      onClick={() => setSeleccionado(o.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
          {previa && (
            <div role="group" aria-label="Vista previa del objeto" className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-durazno/50 bg-morado/30 p-3" onKeyDown={(e) => {
              const paso = e.shiftKey ? 40 : 10;
              const delta: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] };
              if (delta[e.key]) { e.preventDefault(); moverPrevia(...delta[e.key]); }
              else if (e.key === "Escape") { setPrevia(null); setMensaje("Vista previa cancelada."); }
            }}>
              <span className="mr-auto text-sm text-marfil">{obtenerItem(previa.tipo)?.nombre} · vista previa</span>
              <button type="button" className={boton} onClick={() => moverPrevia(-10, 0)} aria-label="Mover a la izquierda">←</button>
              <button type="button" className={boton} onClick={() => moverPrevia(0, -10)} aria-label="Mover hacia arriba">↑</button>
              <button type="button" className={boton} onClick={() => moverPrevia(0, 10)} aria-label="Mover hacia abajo">↓</button>
              <button type="button" className={boton} onClick={() => moverPrevia(10, 0)} aria-label="Mover a la derecha">→</button>
              <button type="button" className={botonPrimario} onClick={confirmarPrevia} disabled={previaMotivo !== null}>Colocar</button>
              <button type="button" className={boton} onClick={() => { setPrevia(null); setMensaje("Vista previa cancelada."); }}>Cancelar</button>
            </div>
          )}
          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-texto-suave">
            {previa && previaMotivo ? <span className="text-[#f5b5b5]">{previaMotivo}</span> : arrastre?.motivo ? <span className="text-[#f5b5b5]">{arrastre.motivo}</span> : mensaje || (d.objetos.filter((o) => o.sala === sala).length === 0 ? "Esta habitación no tiene objetos. Agregá el primero desde el catálogo." : "Tocá un objeto para seleccionarlo y arrastralo para moverlo.")}
          </p>
          <p className="text-xs text-malva lg:hidden">Deslizá la escena para recorrerla. Arrastrar un objeto lo mueve; arrastrar el fondo recorre la sala.</p>
        </section>

        <aside aria-label="Herramientas" className="min-w-0 space-y-4">
          <div role="tablist" aria-label="Herramientas del Taller" className="inline-flex rounded-full border border-malva/50 p-0.5">
            {(["objetos", "ambiente"] as const).map((p) => (
              <button key={p} type="button" role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)} className={`min-h-10 rounded-full px-5 text-sm ${pestana === p ? "bg-durazno text-ciruela" : "text-texto-suave hover:text-marfil"}`}>
                {p === "objetos" ? "Objetos" : "Ambiente"}
              </button>
            ))}
          </div>

          {pestana === "objetos" ? (
            <div className="space-y-5">
              {objetoSel && itemSel ? (
                <section aria-label="Objeto seleccionado" className="space-y-3 rounded-2xl border border-durazno/50 bg-morado/30 p-4">
                  <h2 className="font-marca text-xl text-marfil">{itemSel.nombre}</h2>
                  <div className="flex flex-wrap gap-2">
                    {itemSel.rotable && (
                      <button type="button" className={boton} onClick={() => intentar(girarObjeto(d, objetoSel.id), "Objeto girado.")}>
                        Reflejar
                      </button>
                    )}
                    <button type="button" className="inline-flex min-h-11 items-center rounded-full border border-[#f0a3a3]/60 px-4 text-sm text-[#f5b5b5] hover:bg-[#f0a3a3]/10" onClick={() => quitar(objetoSel.id)}>
                      Quitar de la sala
                    </button>
                  </div>
                  <div>
                    <label htmlFor="escala" className="mb-1.5 block text-xs uppercase tracking-[0.14em] text-malva">Tamaño ({Math.round(objetoSel.escala * 100)} %)</label>
                    <input id="escala" type="range" min={ESCALA_MIN} max={ESCALA_MAX} step={0.05} value={objetoSel.escala} onChange={(e) => intentar(escalarObjeto(d, objetoSel.id, Number(e.target.value)))} className="w-full accent-[var(--color-durazno)]" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={boton} onClick={() => intentar(moverCapa(d, objetoSel.id, 1), "Pasó al frente.")}>Traer al frente</button>
                    <button type="button" className={boton} onClick={() => intentar(moverCapa(d, objetoSel.id, -1), "Pasó hacia atrás.")}>Enviar atrás</button>
                    <button type="button" className={boton} aria-pressed={objetoSel.oculto} onClick={() => intentar(alternarOculto(d, objetoSel.id), objetoSel.oculto ? "Objeto visible otra vez." : "Objeto oculto: se conserva pero no se ve en la habitación.")}>{objetoSel.oculto ? "Mostrar" : "Ocultar"}</button>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-malva">Modelo y color</p>
                    <div className="flex flex-wrap gap-2">
                      {itemSel.variantes.map((v, i) => (
                        <button key={i} type="button" aria-label={`Modelo ${i + 1}`} aria-pressed={objetoSel.variante === i} onClick={() => intentar(cambiarVariante(d, objetoSel.id, i))} className="grid size-12 place-items-center rounded-xl border border-malva/50 bg-noche/60 p-1 aria-pressed:border-durazno aria-pressed:ring-2 aria-pressed:ring-durazno/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v} alt="" className="max-h-full max-w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-malva">Mover (sin arrastrar)</p>
                    <div className="grid w-40 grid-cols-3 gap-1.5">
                      <span />
                      <button type="button" className={boton} aria-label="Mover hacia arriba" onClick={() => mover(0, -10)}>↑</button>
                      <span />
                      <button type="button" className={boton} aria-label="Mover a la izquierda" onClick={() => mover(-10, 0)}>←</button>
                      <button type="button" className={boton} aria-label="Mover hacia abajo" onClick={() => mover(0, 10)}>↓</button>
                      <button type="button" className={boton} aria-label="Mover a la derecha" onClick={() => mover(10, 0)}>→</button>
                    </div>
                  </div>
                </section>
              ) : (
                <p className="rounded-2xl border border-dashed border-malva/50 p-4 text-sm text-texto-suave">Seleccioná un objeto de la sala para moverlo, girarlo, cambiarle el color o quitarlo.</p>
              )}

              <section aria-labelledby="catalogo" className="space-y-4">
                <h2 id="catalogo" className="font-marca text-2xl text-marfil">Catálogo</h2>
                {itemsPorCategoria().map(({ categoria, items }) => (
                  <details key={categoria} open={categoria === "sillon"} className="group">
                    <summary className="mb-2 flex min-h-11 cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.14em] text-malva">{ETIQUETA_CATEGORIA[categoria]} <span className="text-texto-suave normal-case tracking-normal">{items.length}</span></summary>
                    <ul className="grid grid-cols-2 gap-2">
                      {items.map((it) => {
                        const lleno = conteo(it.id) >= it.maximo;
                        return (
                          <li key={it.id}>
                            <button type="button" onClick={() => iniciarPrevia(it.id)} disabled={lleno || !puedeUsar(`objeto:${it.id}`, tengo)} className="flex h-full w-full flex-col items-center gap-1 rounded-xl border border-malva/40 bg-noche/60 p-2 text-center transition hover:border-durazno disabled:opacity-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={it.variantes[0]} alt="" loading="lazy" className="h-16 w-full object-contain" />
                              <span className="text-sm text-marfil">{it.nombre}</span>
                              <span className="text-xs text-texto-suave">{!puedeUsar(`objeto:${it.id}`, tengo) ? "Se consigue en La Torre" : lleno ? `Máximo (${it.maximo})` : it.zona === "pared" ? "Va en la pared" : "Va en el piso"}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
              </section>

              <section aria-labelledby="enSala" className="space-y-2">
                <h2 id="enSala" className="font-marca text-2xl text-marfil">En {ZONAS_SALA[sala].nombre.toLowerCase()} ({d.objetos.filter((o) => o.sala === sala).length})</h2>
                {d.objetos.filter((o) => o.sala === sala).length === 0 ? (
                  <p className="text-sm text-texto-suave">Todavía no hay objetos acá.</p>
                ) : (
                  <ul className="divide-y divide-malva/25 rounded-xl border border-malva/30">
                    {d.objetos.filter((o) => o.sala === sala).map((o) => (
                      <li key={o.id}>
                        <button type="button" aria-pressed={seleccionado === o.id} onClick={() => setSeleccionado(o.id)} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm text-marfil aria-pressed:bg-morado/50">
                          {obtenerItem(o.tipo)?.nombre}
                          <span className="text-xs text-malva">{o.oculto ? "oculto · " : ""}{obtenerItem(o.tipo)?.zona === "pared" ? "pared" : "piso"}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              <section aria-labelledby="estilos" className="space-y-2">
                <h2 id="estilos" className="font-marca text-2xl text-marfil">Estilo</h2>
                <p className="text-sm text-texto-suave">Cambia la luz y el tono de la decoración. Tus objetos se conservan.</p>
                {ESTILOS_SALA.map((e) => (
                  <button key={e} type="button" aria-pressed={d.estilo === e && !tieneAjustesManuales(d)} disabled={!puedeUsar(`estilo:${e}`, tengo) && d.estilo !== e} onClick={() => elegirEstilo(e)} className="block disabled:opacity-50 w-full rounded-2xl border border-malva/40 bg-noche/60 p-3 text-left transition aria-pressed:border-durazno aria-pressed:bg-morado/40 hover:border-malva">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="size-5 rounded-full border border-malva/40" style={{ background: ESTILOS[e].luz === "alba" ? "#f2c7a2" : ESTILOS[e].luz === "ocaso" ? "#ae7a7e" : "#512d47" }} />
                      <span className="font-marca text-lg text-marfil">{ESTILOS[e].nombre}</span>
                    </span>
                    <span className="mt-1 block text-xs text-texto-suave">{puedeUsar(`estilo:${e}`, tengo) ? ESTILOS[e].descripcion : "Se consigue en La Torre"}</span>
                  </button>
                ))}
              </section>

              <section aria-labelledby="luces" className="space-y-2">
                <h2 id="luces" className="font-marca text-2xl text-marfil">Iluminación</h2>
                <p className="text-xs uppercase tracking-[0.14em] text-malva">Luz del cielo</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Luz del cielo">
                  {APARIENCIAS.map((a) => (
                    <button key={a.id} type="button" aria-pressed={m.luz === a.id} onClick={() => aplicar({ ...d, luz: a.id })} className={chip}>{a.nombre}</button>
                  ))}
                </div>
                <p className="pt-1 text-xs uppercase tracking-[0.14em] text-malva">Intensidad</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Intensidad de la luz">
                  {(Object.keys(BRILLOS) as (keyof typeof BRILLOS)[]).map((b) => (
                    <button key={b} type="button" aria-pressed={m.brillo === b} onClick={() => aplicar({ ...d, brillo: b })} className={chip}>{BRILLOS[b]}</button>
                  ))}
                </div>
              </section>
            </div>
          )}

          <section aria-labelledby="restauraciones" className="space-y-2 border-t border-malva/25 pt-4">
            <h2 id="restauraciones" className="text-xs uppercase tracking-[0.14em] text-malva">Volver atrás</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={boton} disabled={hist.pasado.length === 0} onClick={() => dlgDescartar.current?.showModal()}>
                Descartar cambios de esta sesión
              </button>
              <button type="button" className="inline-flex min-h-11 items-center rounded-full border border-[#f0a3a3]/60 px-4 text-sm text-[#f5b5b5] hover:bg-[#f0a3a3]/10" onClick={() => dlgRestablecer.current?.showModal()}>
                Restablecer la sala…
              </button>
            </div>
          </section>
        </aside>
      </div>

      <Confirmar referencia={dlgDescartar} id="t-descartar" titulo="¿Descartar los cambios de esta sesión?" cancelar="Seguir editando" confirmar="Sí, descartar" alConfirmar={() => { const h = nuevoHistorial(inicial); setHist(h); auto.cambiar(inicial); setSeleccionado(null); setMensaje("Volviste a la sala como estaba al abrir el Taller."); }}>
        La sala vuelve a como estaba cuando abriste El Taller. Se pierden todos los cambios hechos desde entonces.
      </Confirmar>
      <Confirmar referencia={dlgRestablecer} id="t-restablecer" titulo="¿Restablecer la sala?" cancelar="Cancelar" confirmar="Sí, restablecer" alConfirmar={() => { aplicar(disenoRestablecido(), "Sala restablecida. Podés deshacerlo."); setSeleccionado(null); }}>
        Se quitan todos los objetos que agregaste y la luz vuelve al estilo clásico, con la alfombra original. Podés deshacerlo mientras no cierres esta pantalla.
      </Confirmar>
      <Confirmar referencia={dlgEstilo} id="t-estilo" titulo="¿Cambiar de estilo?" cancelar="Cancelar" confirmar="Sí, cambiar" alConfirmar={() => { if (estiloPendiente) aplicar(aplicarEstilo(d, estiloPendiente), `Estilo «${ESTILOS[estiloPendiente].nombre}» aplicado.`); setEstiloPendiente(null); }}>
        Hiciste ajustes manuales de luz. Cambiar de estilo los reemplaza por los del estilo (tus objetos se conservan). Podés deshacerlo.
      </Confirmar>
    </div>
  );
}

function Confirmar({ referencia, id, titulo, cancelar, confirmar, alConfirmar, children }: { referencia: React.RefObject<HTMLDialogElement | null>; id: string; titulo: string; cancelar: string; confirmar: string; alConfirmar: () => void; children: React.ReactNode }) {
  return (
    <dialog ref={referencia} aria-labelledby={id} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70">
      <h2 id={id} className="font-marca text-2xl">{titulo}</h2>
      <p className="mt-3 leading-relaxed text-texto-suave">{children}</p>
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => referencia.current?.close()} className="min-h-11 rounded-full border border-malva/60 px-5 text-sm text-texto-suave hover:text-marfil">{cancelar}</button>
        <button type="button" onClick={() => { referencia.current?.close(); alConfirmar(); }} className="min-h-11 rounded-full bg-durazno px-5 text-sm font-medium text-ciruela hover:bg-marfil">{confirmar}</button>
      </div>
    </dialog>
  );
}
