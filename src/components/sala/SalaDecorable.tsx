"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { guardarDisenoAction } from "@/app/(mundo)/taller/actions";
import { Aviso } from "@/components/auth/formulario";
import { CapaDecoracion } from "@/components/sala/objetos";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { TiendaTorre } from "@/components/torre/TiendaTorre";
import { ETIQUETA_CATEGORIA, itemsPorCategoria, obtenerItem, type Categoria } from "@/modules/taller/catalogo";
import { SUELO, agregarObjeto, eliminarObjeto, resolverMateriales, type DisenoSala } from "@/modules/taller/sala";
import { puedeUsar } from "@/modules/torre/reglas";

interface Props {
  diseno: DisenoSala;
  version: number;
  inventario: string[];
  esencias: number;
  nivel: number;
}

const GRUPOS = itemsPorCategoria();
const boton = "min-h-11 rounded-full border border-durazno/60 px-5 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-40";

/** Decoración simple: elegís un objeto y tocás la sala. Sin arrastrar, sin escalas ni capas (eso sigue en El Taller). */
export function SalaDecorable({ diseno: inicial, version: versionInicial, inventario, esencias, nivel }: Props) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [diseno, setDiseno] = useState(inicial);
  const [version, setVersion] = useState(versionInicial);
  const [editando, setEditando] = useState(false);
  const [categoria, setCategoria] = useState<Categoria>(GRUPOS[0].categoria);
  const [elegido, setElegido] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "info" | "error"; texto: string } | null>(null);
  const tengo = new Set(inventario);

  async function guardar(nuevo: DisenoSala) {
    const anterior = diseno;
    setDiseno(nuevo);
    const r = await guardarDisenoAction(nuevo, version);
    if (r.ok) {
      setVersion(r.version);
      setMensaje(null);
      refrescar(() => router.refresh());
    } else {
      setDiseno(anterior);
      setMensaje({ tipo: "error", texto: r.error });
    }
  }

  function colocar(pos?: { x: number; y: number }) {
    if (!elegido) return;
    const item = obtenerItem(elegido);
    if (!item) return;
    const lugar = pos && item.zona === "suelo" ? { x: pos.x, y: Math.min(SUELO.yMax, Math.max(SUELO.yMin, pos.y)) } : pos;
    const r = agregarObjeto(diseno, elegido, crypto.randomUUID(), lugar);
    if (!r.ok) return setMensaje({ tipo: "error", texto: r.error });
    void guardar(r.diseno);
  }

  function alTocarSala(e: MouseEvent<HTMLDivElement>) {
    if (!editando || !elegido) return;
    const caja = e.currentTarget.getBoundingClientRect();
    colocar({ x: ((e.clientX - caja.left) / caja.width) * 1600, y: ((e.clientY - caja.top) / caja.height) * 900 });
  }

  const usables = GRUPOS.find((g) => g.categoria === categoria)?.items.filter((i) => puedeUsar(`objeto:${i.id}`, tengo)) ?? [];
  const colocados = diseno.objetos.filter((o) => o.sala === "gran-sala" && !o.oculto);

  return (
    <section aria-labelledby="mi-sala" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="mi-sala" className="font-marca text-3xl text-marfil">Mi sala</h2>
        <button type="button" onClick={() => { setEditando((v) => !v); setElegido(null); setMensaje(null); }} aria-pressed={editando} className={boton}>
          {editando ? "Listo" : "Decorar"}
        </button>
      </div>

      <div
        onClick={alTocarSala}
        className={`relative aspect-video overflow-hidden rounded-3xl border border-durazno/30 ${editando && elegido ? "cursor-crosshair ring-2 ring-durazno" : ""}`}
      >
        <SceneBackground id="05_gran_sala" />
        <CapaDecoracion objetos={diseno.objetos} sala="gran-sala" filtro={resolverMateriales(diseno).filtroDecoracion} />
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      {editando && (
        <div className="marco-ornato space-y-5 rounded-2xl p-5">
          <p className="text-sm text-texto-suave">
            {elegido ? `Tocá la sala para colocar «${obtenerItem(elegido)?.nombre}», o dejá que lo ubique solo.` : "Elegí un objeto de la lista."}
          </p>

          <div role="tablist" aria-label="Categorías" className="flex flex-wrap gap-2">
            {GRUPOS.map((g) => (
              <button
                key={g.categoria}
                type="button"
                role="tab"
                aria-selected={g.categoria === categoria}
                onClick={() => setCategoria(g.categoria)}
                className={`min-h-11 rounded-full border px-4 text-sm ${g.categoria === categoria ? "border-durazno bg-durazno/15 text-durazno" : "border-malva/40 text-texto-suave"}`}
              >
                {ETIQUETA_CATEGORIA[g.categoria]}
              </button>
            ))}
          </div>

          {usables.length === 0 ? (
            <p className="text-sm text-texto-suave">Acá no tenés objetos todavía: mirá la tienda más abajo.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {usables.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => { setElegido(i.id); setMensaje(null); }}
                    aria-pressed={elegido === i.id}
                    aria-label={i.nombre}
                    className={`flex aspect-square w-full items-center justify-center rounded-xl border bg-noche/60 p-1 ${elegido === i.id ? "border-durazno" : "border-malva/30"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.variantes[0]} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!elegido} onClick={() => colocar()} className={boton}>Ubicar solo</button>
          </div>

          <div>
            <h3 className="mb-2 text-xs uppercase tracking-[0.14em] text-malva">Colocados ({colocados.length})</h3>
            {colocados.length === 0 ? (
              <p className="text-sm text-texto-suave">La sala está vacía.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {colocados.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => void guardar(eliminarObjeto(diseno, o.id))} aria-label={`Quitar ${obtenerItem(o.tipo)?.nombre ?? o.tipo}`} className="min-h-11 rounded-full border border-malva/40 px-4 text-sm text-marfil hover:border-durazno">
                      {obtenerItem(o.tipo)?.nombre ?? o.tipo} <span aria-hidden="true">✕</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <details className="rounded-xl border border-malva/30 p-4">
            <summary className="cursor-pointer text-marfil">Tienda · ✦ {esencias} Esencias</summary>
            <div className="mt-4">
              <TiendaTorre esencias={esencias} nivel={nivel} inventario={inventario} />
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
