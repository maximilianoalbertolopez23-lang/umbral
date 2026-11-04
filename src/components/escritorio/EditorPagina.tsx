"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { eliminarPaginaAction, estadisticasAnioAction, guardarPaginaAction } from "@/app/(mundo)/escritorio/actions";
import { Aviso } from "@/components/auth/formulario";
import { reducirImagen } from "@/lib/imagen";
import { fechaHoy } from "@/modules/archivo/utiles";
import { Autoguardado, type EstadoGuardado } from "@/modules/escritorio/autoguardado";
import { crearBloque, ETIQUETA_BLOQUE, mover, type Bloque, type TipoBloque } from "@/modules/escritorio/bloques";
import { ESTADOS_PAGINA, ETIQUETA_ESTADO_PAGINA, INFO_PLANTILLA, INFO_TIPO, PLANTILLAS, type EstadoPagina, type Plantilla, type TipoPagina } from "@/modules/escritorio/paginas";
import type { EstadisticasAnio } from "@/modules/escritorio/repositorio";
import { propsHoja } from "@/modules/taller/journal";
import type { PlantillaPropia } from "@/modules/taller/repositorio";
import { EditorBloque } from "./EditorBloque";
import { RenderBloques } from "./RenderBloques";

interface DocPagina {
  titulo: string;
  bloques: Bloque[];
  plantilla: Plantilla;
  /** Plantilla propia (de El Taller) aplicada sobre la base; null = solo la base. */
  plantillaCustomId: string | null;
  estado: EstadoPagina;
}

interface Props {
  id: string;
  tipo: TipoPagina;
  libroId: string | null;
  inicial: DocPagina;
  version: number;
  estadisticas: Record<number, EstadisticasAnio>;
  plantillasPropias: PlantillaPropia[];
  volverHref: string;
  volverTexto: string;
  anterior: { id: string; titulo: string } | null;
  siguiente: { id: string; titulo: string } | null;
}

const TEXTO_ESTADO: Record<EstadoGuardado, string> = {
  guardado: "Guardado",
  pendiente: "Cambios sin guardar…",
  guardando: "Guardando…",
  reintentando: "Sin conexión, reintentando…",
  error: "No se pudo guardar",
  conflicto: "Conflicto de versiones",
};

const TIPOS_AGREGABLES: Exclude<TipoBloque, "imagen">[] = ["texto", "titulo", "lista", "cita", "momento", "personaje", "nota", "separador", "resumen_lecturas"];

function IndicadorGuardado({ estado, detalle, alReintentar }: { estado: EstadoGuardado; detalle: string; alReintentar: () => void }) {
  const color = estado === "guardado" ? "text-texto-suave" : estado === "error" || estado === "conflicto" ? "text-[#f5b5b5]" : "text-durazno";
  return (
    <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${color}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${estado === "guardado" ? "bg-marfil/60" : estado === "error" || estado === "conflicto" ? "bg-[#f0a3a3]" : "animate-titilar bg-durazno"}`} />
      {TEXTO_ESTADO[estado]}
      {estado === "error" && (
        <button type="button" onClick={alReintentar} className="underline underline-offset-4">
          Reintentar
        </button>
      )}
      {detalle && estado !== "guardado" && <span className="sr-only">{detalle}</span>}
    </p>
  );
}

function BotonEliminarPagina({ id, libroId, titulo }: { id: string; libroId: string | null; titulo: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [estado, enviar, pendiente] = useActionState(eliminarPaginaAction.bind(null, id, libroId) as (p: EstadoForm) => Promise<EstadoForm>, {} as EstadoForm);
  return (
    <>
      <button type="button" onClick={() => dialogo.current?.showModal()} className="min-h-10 rounded-full border border-[#f0a3a3]/60 px-4 text-sm text-[#f5b5b5] hover:bg-[#f0a3a3]/10">
        Eliminar página
      </button>
      <dialog ref={dialogo} aria-labelledby="t-elim-pag" className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-malva/40 bg-noche p-6 text-marfil backdrop:bg-black/70">
        <form action={enviar} className="space-y-4">
          <h2 id="t-elim-pag" className="font-marca text-2xl">¿Eliminar esta página?</h2>
          <p className="leading-relaxed text-texto-suave">
            <strong className="font-marca text-lg italic text-marfil">{titulo || "Página sin título"}</strong> se va a la papelera. Podés recuperarla desde El Escritorio cuando quieras.
          </p>
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogo.current?.close()} className="min-h-11 rounded-full border border-malva/60 px-5 text-sm text-texto-suave hover:text-marfil">Cancelar</button>
            <button type="submit" disabled={pendiente} className="min-h-11 rounded-full bg-[#f0a3a3] px-5 text-sm font-medium text-ciruela hover:bg-[#f8c4c4] disabled:opacity-60">
              {pendiente ? "Eliminando…" : "Mover a la papelera"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function MenuAgregar({ alElegir, alSubirImagen, subiendo, etiqueta }: { alElegir: (t: Exclude<TipoBloque, "imagen">) => void; alSubirImagen: (f: File) => void; subiendo: boolean; etiqueta: string }) {
  const [abierto, setAbierto] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  return (
    <div className="relative my-1">
      <button type="button" className="boton-hoja" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        ＋ {etiqueta}
      </button>
      {abierto && (
        <div role="menu" aria-label="Tipos de bloque" className="mt-1 flex flex-wrap gap-1.5 rounded-lg p-2" style={{ background: "var(--fondo-campo)" }}>
          {TIPOS_AGREGABLES.map((t) => (
            <button key={t} type="button" role="menuitem" className="boton-hoja" onClick={() => { alElegir(t); setAbierto(false); }}>
              {ETIQUETA_BLOQUE[t]}
            </button>
          ))}
          <button type="button" role="menuitem" className="boton-hoja" disabled={subiendo} onClick={() => archivo.current?.click()}>
            {subiendo ? "Subiendo…" : ETIQUETA_BLOQUE.imagen}
          </button>
          <input
            ref={archivo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Elegir una imagen"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) { alSubirImagen(f); setAbierto(false); }
            }}
          />
        </div>
      )}
    </div>
  );
}

export function EditorPagina({ id, tipo, libroId, inicial, version, estadisticas: estadisticasIniciales, plantillasPropias, volverHref, volverTexto, anterior, siguiente }: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState<DocPagina>(inicial);
  const docRef = useRef(doc);
  const [contexto] = useState(() => ({ version }));
  const [guardado, setGuardado] = useState<EstadoGuardado>("guardado");
  const [detalle, setDetalle] = useState("");
  const [modo, setModo] = useState<"editar" | "leer">("editar");
  const [estadisticas, setEstadisticas] = useState(estadisticasIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const [deshacer, setDeshacer] = useState<{ bloque: Bloque; indice: number } | null>(null);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const [nuevoId, setNuevoId] = useState<string | null>(null);

  const [auto] = useState(
    () =>
      new Autoguardado<DocPagina>({
        guardar: async (valor) => {
          const r = await guardarPaginaAction(id, { ...valor, version: contexto.version });
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

  const actualizar = useCallback(
    (parcial: Partial<DocPagina>) => {
      const siguienteDoc = { ...docRef.current, ...parcial };
      docRef.current = siguienteDoc;
      setDoc(siguienteDoc);
      auto.cambiar(siguienteDoc);
    },
    [auto],
  );

  // Evita perder cambios: avisa al cerrar la pestaña, guarda al ocultarse y antes de navegar dentro de la app.
  useEffect(() => {
    const antesDeCerrar = (e: BeforeUnloadEvent) => {
      if (auto.haySinGuardar()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const alOcultar = () => {
      if (document.visibilityState === "hidden" && auto.haySinGuardar()) void auto.guardarYa();
    };
    const alHacerClic = async (e: MouseEvent) => {
      const enlace = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!enlace || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || enlace.target === "_blank") return;
      const url = new URL(enlace.href, location.href);
      if (url.origin !== location.origin || !auto.haySinGuardar()) return;
      e.preventDefault();
      e.stopPropagation();
      const ok = await auto.guardarYa();
      if (ok || window.confirm("No pudimos guardar los últimos cambios. ¿Querés salir igual y perderlos?")) {
        router.push(url.pathname + url.search + url.hash);
      }
    };
    window.addEventListener("beforeunload", antesDeCerrar);
    document.addEventListener("visibilitychange", alOcultar);
    document.addEventListener("click", alHacerClic, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeCerrar);
      document.removeEventListener("visibilitychange", alOcultar);
      document.removeEventListener("click", alHacerClic, true);
      if (auto.haySinGuardar()) void auto.guardarYa(); // navegación con el botón «atrás»: se guarda al salir
    };
  }, [auto, router]);

  const pedirEstadisticas = useCallback(async (anio: number) => {
    const datos = await estadisticasAnioAction(anio);
    if (datos) setEstadisticas((e) => ({ ...e, [anio]: datos }));
  }, []);

  function insertar(despuesDe: number, bloque: Bloque) {
    const copia = [...docRef.current.bloques];
    copia.splice(despuesDe + 1, 0, bloque);
    setNuevoId(bloque.id);
    actualizar({ bloques: copia });
    if (bloque.tipo === "resumen_lecturas") void pedirEstadisticas(bloque.anio);
  }

  function cambiarBloque(indice: number, nuevo: Bloque) {
    actualizar({ bloques: docRef.current.bloques.map((b, i) => (i === indice ? nuevo : b)) });
  }

  function quitarBloque(indice: number) {
    const bloque = docRef.current.bloques[indice];
    setDeshacer({ bloque, indice });
    actualizar({ bloques: docRef.current.bloques.filter((_, i) => i !== indice) });
  }

  function restaurarBloque() {
    if (!deshacer) return;
    const copia = [...docRef.current.bloques];
    copia.splice(Math.min(deshacer.indice, copia.length), 0, deshacer.bloque);
    actualizar({ bloques: copia });
    setDeshacer(null);
  }

  async function subirImagen(archivo: File, despuesDe: number) {
    setSubiendo(true);
    setErrorImagen("");
    try {
      const reducida = await reducirImagen(archivo, 1400, 560_000);
      const datos = new FormData();
      datos.set("paginaId", id);
      datos.set("imagen", reducida);
      const r = await fetch("/api/escritorio/imagenes", { method: "POST", body: datos });
      const json = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !json.id) throw new Error(json.error ?? "No pudimos subir la imagen.");
      insertar(despuesDe, { id: crypto.randomUUID(), tipo: "imagen", imagenId: json.id, pie: "", ancho: "normal" });
    } catch (e) {
      setErrorImagen(e instanceof Error ? e.message : "No pudimos subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  const bloques = doc.bloques;
  const hoy = fechaHoy();
  // La plantilla propia solo cambia la presentación; si se borró, la página se ve con su plantilla base.
  const propia = plantillasPropias.find((p) => p.id === doc.plantillaCustomId) ?? null;
  const hoja = propsHoja(doc.plantilla, propia?.ajustes ?? null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={volverHref} className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
          ← {volverTexto}
        </Link>
        <IndicadorGuardado estado={guardado} detalle={detalle} alReintentar={() => void auto.reintentar()} />
      </div>

      {guardado === "conflicto" && (
        <div className="mb-4">
          <Aviso tipo="error">
            Esta página se modificó en otra pestaña o dispositivo, y para no pisar nada dejamos de guardar. Tus cambios siguen acá:
            copialos si querés y{" "}
            <button type="button" className="underline underline-offset-4" onClick={() => location.reload()}>
              recargá la página
            </button>
            .
          </Aviso>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-malva/30 bg-noche/60 p-3">
        <div role="group" aria-label="Modo" className="inline-flex rounded-full border border-malva/50 p-0.5">
          {(["editar", "leer"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} className={`min-h-10 rounded-full px-4 text-sm ${modo === m ? "bg-durazno text-ciruela" : "text-texto-suave hover:text-marfil"}`}>
              {m === "editar" ? "Editar" : "Leer"}
            </button>
          ))}
        </div>
        <label className="text-xs text-texto-suave">
          Plantilla
          <select
            value={propia ? `c:${propia.id}` : `b:${doc.plantilla}`}
            onChange={(e) => {
              const [tipoPlantilla, valor] = e.target.value.split(":");
              if (tipoPlantilla === "c") {
                const p = plantillasPropias.find((x) => x.id === valor);
                if (p) actualizar({ plantilla: p.base, plantillaCustomId: p.id });
              } else actualizar({ plantilla: valor as Plantilla, plantillaCustomId: null });
            }}
            className="mt-1 block min-h-10 rounded-xl border border-malva/50 bg-noche/70 px-3 text-sm text-marfil focus:border-durazno"
          >
            <optgroup label="Incluidas">
              {PLANTILLAS.map((p) => (
                <option key={p} value={`b:${p}`}>
                  {INFO_PLANTILLA[p].nombre}
                </option>
              ))}
            </optgroup>
            {plantillasPropias.length > 0 && (
              <optgroup label="Mis plantillas">
                {plantillasPropias.map((p) => (
                  <option key={p.id} value={`c:${p.id}`}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <Link href="/taller/journal" className="self-end pb-2 text-xs text-durazno underline underline-offset-4">
          Diseñar plantillas
        </Link>
        <label className="text-xs text-texto-suave">
          Estado
          <select value={doc.estado} onChange={(e) => actualizar({ estado: e.target.value as EstadoPagina })} className="mt-1 block min-h-10 rounded-xl border border-malva/50 bg-noche/70 px-3 text-sm text-marfil focus:border-durazno">
            {ESTADOS_PAGINA.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_ESTADO_PAGINA[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <BotonEliminarPagina id={id} libroId={libroId} titulo={doc.titulo} />
        </div>
      </div>

      <article className="hoja" data-plantilla={hoja.plantilla} {...hoja.datos} style={hoja.estilo as CSSProperties} aria-label={`Página: ${doc.titulo || INFO_TIPO[tipo].etiqueta}`}>
        {modo === "editar" ? (
          <>
            <label htmlFor="titulo-pagina" className="etiqueta-hoja block">
              Título de la página
            </label>
            <input
              id="titulo-pagina"
              className="campo hoja-titulo mb-4"
              style={{ fontFamily: "var(--font-marca)", fontSize: "2.2rem", lineHeight: 1.2 }}
              value={doc.titulo}
              maxLength={120}
              placeholder={INFO_TIPO[tipo].etiqueta}
              onChange={(e) => actualizar({ titulo: e.target.value })}
            />

            {bloques.length === 0 && <p style={{ color: "var(--tinta-suave)" }}>La página está en blanco. Agregá tu primer bloque.</p>}
            <MenuAgregar etiqueta="Agregar bloque arriba" subiendo={subiendo} alElegir={(t) => insertar(-1, crearBloque(t, hoy))} alSubirImagen={(f) => void subirImagen(f, -1)} />

            {bloques.map((b, i) => (
              <div key={b.id}>
                <div
                  className="bloque-editor"
                  data-sobre={sobre === i && arrastrando !== null && arrastrando !== i}
                  onDragOver={(e) => { if (arrastrando !== null) { e.preventDefault(); setSobre(i); } }}
                  onDragLeave={() => setSobre((s) => (s === i ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (arrastrando !== null) actualizar({ bloques: mover(docRef.current.bloques, arrastrando, i) });
                    setArrastrando(null);
                    setSobre(null);
                  }}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="etiqueta-hoja mr-auto">{ETIQUETA_BLOQUE[b.tipo]}</span>
                    <button type="button" className="boton-hoja" aria-label={`Subir bloque ${i + 1}`} disabled={i === 0} onClick={() => actualizar({ bloques: mover(docRef.current.bloques, i, i - 1) })}>↑</button>
                    <button type="button" className="boton-hoja" aria-label={`Bajar bloque ${i + 1}`} disabled={i === bloques.length - 1} onClick={() => actualizar({ bloques: mover(docRef.current.bloques, i, i + 1) })}>↓</button>
                    <button
                      type="button"
                      className="boton-hoja hidden cursor-grab md:inline-block"
                      aria-label={`Arrastrar bloque ${i + 1} para moverlo`}
                      title="Arrastrar para mover"
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); setArrastrando(i); }}
                      onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                    >
                      ⠿
                    </button>
                    <button type="button" className="boton-hoja" aria-label={`Quitar bloque ${i + 1}`} onClick={() => quitarBloque(i)}>✕</button>
                  </div>
                  <EditorBloque bloque={b} alCambiar={(nuevo) => cambiarBloque(i, nuevo)} estadisticas={estadisticas} alCambiarAnio={(a) => void pedirEstadisticas(a)} autoFocus={b.id === nuevoId} />
                </div>
                <MenuAgregar etiqueta="Agregar bloque" subiendo={subiendo} alElegir={(t) => insertar(i, crearBloque(t, hoy))} alSubirImagen={(f) => void subirImagen(f, i)} />
              </div>
            ))}
          </>
        ) : (
          <>
            <h1 className="hoja-titulo" style={{ fontSize: "2.4rem", margin: "0 0 0.6em" }}>
              {doc.titulo || INFO_TIPO[tipo].etiqueta}
            </h1>
            <div className="bloques-leer">
              <RenderBloques bloques={bloques} estadisticas={estadisticas} />
            </div>
          </>
        )}
      </article>

      {errorImagen && (
        <div className="mt-4">
          <Aviso tipo="error">{errorImagen}</Aviso>
        </div>
      )}

      {deshacer && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-full border border-malva/50 bg-noche px-5 py-3 text-sm shadow-xl lg:bottom-6">
          <span>Bloque eliminado</span>
          <span className="flex gap-3">
            <button type="button" className="text-durazno underline underline-offset-4" onClick={restaurarBloque}>Deshacer</button>
            <button type="button" className="text-texto-suave" aria-label="Cerrar aviso" onClick={() => setDeshacer(null)}>✕</button>
          </span>
        </div>
      )}

      <nav aria-label="Páginas vecinas" className="mt-6 flex justify-between gap-3 text-sm">
        {anterior ? (
          <Link href={`/escritorio/pagina/${anterior.id}`} className="text-durazno underline-offset-4 hover:underline">← {anterior.titulo || "Página anterior"}</Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link href={`/escritorio/pagina/${siguiente.id}`} className="text-durazno underline-offset-4 hover:underline">{siguiente.titulo || "Página siguiente"} →</Link>
        )}
      </nav>
    </div>
  );
}
