"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Capa, Escena } from "@/components/escena/Escena";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { MODULOS } from "@/modules/registry";
import { ALTO_ESCENA, ANCHO_ESCENA, OBJETOS, pct, type ObjetoSala } from "@/modules/sala/objetos";
import type { LibroResumen } from "@/modules/archivo/tipos";
import type { Apariencia } from "@/modules/onboarding/apariencias";
import { resolverMateriales, type DisenoSala } from "@/modules/taller/sala";
import { CapaDecoracion } from "./objetos";

type LibroSala = Pick<LibroResumen, "id" | "titulo" | "autores" | "portadaVersion" | "estado" | "fechaInicio" | "creadoAt" | "paginaActual" | "paginasTotal">;

interface Props {
  libros: LibroSala[];
  paginasJournal: number;
  apariencia: Apariencia;
  /** Materiales y objetos colocados desde El Taller. */
  diseno: DisenoSala;
}

const CLAVE_VELAS = "umbral-velas";

function suscribirVelas(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(CLAVE_VELAS, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(CLAVE_VELAS, aviso);
  };
}

function leerVelas(): boolean {
  try {
    return localStorage.getItem(CLAVE_VELAS) !== "off";
  } catch {
    return true;
  }
}

function alternarVelas() {
  try {
    localStorage.setItem(CLAVE_VELAS, leerVelas() ? "off" : "on");
  } catch {
    /* sin almacenamiento: el cambio no se recuerda */
  }
  window.dispatchEvent(new Event(CLAVE_VELAS));
}

function movimientoReducido(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector('[data-movimiento="si"]') !== null;
}

function Panel({ referencia, id, titulo, children }: { referencia: RefObject<HTMLDialogElement | null>; id: string; titulo: string; children: ReactNode }) {
  return (
    <dialog ref={referencia} aria-labelledby={id} className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70">
      <h2 id={id} className="font-marca text-3xl">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-texto-suave">{children}</div>
      <form method="dialog" className="mt-5 text-right">
        <button className="min-h-11 rounded-full border border-durazno/60 px-6 text-sm text-durazno hover:bg-durazno/10">Cerrar</button>
      </form>
    </dialog>
  );
}

export function EscenaSala({ libros, paginasJournal, apariencia, diseno }: Props) {
  const m = resolverMateriales(diseno);
  const router = useRouter();
  const velas = useSyncExternalStore(suscribirVelas, leerVelas, () => true);
  const [zoom, setZoom] = useState(false);
  const [origen, setOrigen] = useState({ x: 50, y: 50 });
  const [entrando, setEntrando] = useState(true);
  const [pendiente, iniciar] = useTransition();
  const acercando = zoom || pendiente;
  const desplazador = useRef<HTMLDivElement>(null);
  const dlgPuerta = useRef<HTMLDialogElement>(null);
  const dlgEscudo = useRef<HTMLDialogElement>(null);
  const dlgVentanal = useRef<HTMLDialogElement>(null);


  // En pantallas angostas la sala es más ancha que la pantalla: se empieza mirando la puerta, al centro.
  useEffect(() => {
    const el = desplazador.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    const t = window.setTimeout(() => setEntrando(false), 1400); // travelling de entrada (T03); luego la cámara queda quieta
    return () => window.clearTimeout(t);
  }, []);

  function viajar(e: MouseEvent, href: string, o: ObjetoSala) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (movimientoReducido()) return; // sin animación: el enlace navega directamente
    e.preventDefault();
    setOrigen({ x: ((o.x + o.ancho / 2) / ANCHO_ESCENA) * 100, y: ((o.y + o.alto / 2) / ALTO_ESCENA) * 100 });
    setZoom(true);
    window.setTimeout(() => {
      iniciar(() => router.push(href));
      setZoom(false);
    }, 520);
  }

  /** Flechas ← → recorren los objetos de izquierda a derecha (además de Tab). */
  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    const lista = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-hotspot]")].sort((a, b) => Number(a.dataset.x) - Number(b.dataset.x));
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;
    e.preventDefault();
    const siguiente = e.key === "Home" ? 0 : e.key === "End" ? lista.length - 1 : (actual + (e.key === "ArrowRight" ? 1 : -1) + lista.length) % lista.length;
    lista[siguiente].focus();
  }

  const detalle: Record<ObjetoSala["id"], { titulo: string; sub?: string }> = {
    estanteria: { titulo: "El Archivo", sub: libros.length === 0 ? "Estantes vacíos" : `${libros.length} ${libros.length === 1 ? "libro" : "libros"}` },
    escritorio: { titulo: "El Escritorio", sub: paginasJournal === 0 ? "Tu journal te espera" : `${paginasJournal} ${paginasJournal === 1 ? "página" : "páginas"}` },
    taller: { titulo: "El Taller", sub: `Luz: ${apariencia.nombre}` },
    torre: { titulo: "La Torre", sub: "Niveles, misiones y recompensas" },
    puerta: { titulo: "La puerta", sub: "Cambiar de estancia" },
    ventanal: { titulo: "El ventanal", sub: apariencia.nombre },
    escudo: { titulo: "El escudo", sub: "Inspeccionar" },
    candelabro: { titulo: "Las velas", sub: velas ? "Encendidas · tocá para apagar" : "Apagadas · tocá para encender" },
  };

  return (
    <div className="sala-escena" data-apariencia={apariencia.id} data-brillo={m.brillo} data-estilo={m.estilo} data-velas={velas ? "on" : "off"}>
      <div ref={desplazador} className="sala-scroll">
        <Escena className="sala-lienzo">
          <div className={`sala-camara${acercando ? " acercando" : ""}${entrando ? " entrando" : ""}`} style={{ transformOrigin: `${origen.x}% ${origen.y}%` }} onKeyDown={alTeclear}>
            <Capa profundidad={7} className="absolute inset-0" decorativa={false}>
              <div className="absolute inset-0 scale-[1.025]">
              <SceneBackground id="05_gran_sala" priority />
              <CapaDecoracion objetos={diseno.objetos} filtro={m.filtroDecoracion} />
              {OBJETOS.map((o) => {
                const estilo = { left: pct(o.x, ANCHO_ESCENA), top: pct(o.y, ALTO_ESCENA), width: pct(o.ancho, ANCHO_ESCENA), height: pct(o.alto, ALTO_ESCENA) };
                const d = detalle[o.id];
                const rotulo = (
                  <span className="rotulo" aria-hidden="true">
                    {d.titulo}
                    {d.sub && <small>{d.sub}</small>}
                  </span>
                );
                const comunes = {
                  className: "hotspot",
                  style: estilo,
                  "data-hotspot": o.id,
                  "data-x": o.x,
                  "data-placa": ["estanteria", "escritorio", "taller", "torre", "puerta"].includes(o.id) ? "" : undefined,
                  "data-rotulo": o.id === "ventanal" || o.id === "estanteria" || o.id === "torre" ? "centro" : o.id === "puerta" ? "dentro" : o.y < 200 ? "abajo" : undefined,
                } as const;
                const nombreAccesible = `${o.nombre}${d.sub ? ` (${d.sub})` : ""}`;

                if (o.accion.tipo === "ruta") {
                  const href = o.accion.href;
                  return (
                    <Link key={o.id} href={href} aria-label={nombreAccesible} onClick={(e) => viajar(e, href, o)} {...comunes}>
                      {rotulo}
                    </Link>
                  );
                }
                if (o.accion.tipo === "velas") {
                  return (
                    <button key={o.id} type="button" aria-pressed={velas} aria-label={`Las velas: ${velas ? "encendidas, apagar" : "apagadas, encender"}`} onClick={alternarVelas} {...comunes}>
                      {rotulo}
                    </button>
                  );
                }
                const panel = o.accion.tipo === "puerta" ? dlgPuerta : o.accion.panel === "escudo" ? dlgEscudo : dlgVentanal;
                return (
                  <button key={o.id} type="button" aria-haspopup="dialog" aria-label={nombreAccesible} onClick={() => panel.current?.showModal()} {...comunes}>
                    {rotulo}
                  </button>
                );
              })}
              </div>
            </Capa>
            <div className="sala-luz sala-luz-luna" aria-hidden="true" />
            <div className="sala-luz sala-brillo" aria-hidden="true" />
            <div className="sala-luz sala-luz-velas" aria-hidden="true" />
            <div className="sala-sombra" aria-hidden="true" />
            <div className="sala-sombra sala-sombra-velas" aria-hidden="true" />
          </div>
        </Escena>
      </div>

      <Panel referencia={dlgPuerta} id="t-puerta" titulo="Cambiar de estancia">
        <p>La puerta lleva a cada habitación de la biblioteca.</p>
        <ul className="space-y-1.5">
          {MODULOS.map((m) => (
            <li key={m.id}>
              {m.estado === "disponible" ? (
                <Link href={m.ruta} onClick={() => dlgPuerta.current?.close()} className="flex items-baseline gap-3 rounded-xl border border-malva/40 px-3 py-2 text-marfil hover:border-durazno hover:bg-morado/30">
                  <span className="font-marca text-lg text-durazno">{m.numeral}</span>
                  <span>{m.titulo}</span>
                  {m.id === "sala" && <span className="ml-auto text-xs text-malva">estás acá</span>}
                </Link>
              ) : (
                <p className="flex items-baseline gap-3 px-3 py-2 text-malva">
                  <span className="font-marca text-lg">{m.numeral}</span>
                  <span>{m.titulo}</span>
                  <span className="ml-auto text-xs">Próximamente</span>
                </p>
              )}
            </li>
          ))}
        </ul>
        <p>
          <Link href="/" className="text-durazno underline underline-offset-4">
            Salir al umbral (pantalla de inicio)
          </Link>
        </p>
      </Panel>

      <Panel referencia={dlgEscudo} id="t-escudo" titulo="El escudo de la biblioteca">
        <p>Tallado en madera oscura y bordeado de durazno: un par de alas de dragón custodia la luna sobre el libro abierto.</p>
        <p>Es el emblema de UMBRAL. El dragón es solo un símbolo de la casa; no es una criatura de la biblioteca.</p>
      </Panel>

      <Panel referencia={dlgVentanal} id="t-ventanal" titulo="Luz de la biblioteca">
        <p>
          Hoy la sala está en <strong className="font-marca text-lg italic text-marfil">{apariencia.nombre}</strong>. {apariencia.descripcion}
        </p>
        <p>
          <Link href="/taller" className="text-durazno underline underline-offset-4">
            Cambiar la luz en El Taller
          </Link>
        </p>
      </Panel>
    </div>
  );
}
