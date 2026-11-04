"use client";

/* La vista previa usa URLs locales (blob:) y la portada sugerida viene de covers.openlibrary.org. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Aviso, BotonEnvio, Campo, useFormularioValidado } from "@/components/auth/formulario";
import { reducirImagen } from "@/lib/imagen";
import type { ResultadoBusqueda } from "@/lib/openlibrary";
import { esquemaLibro } from "@/modules/archivo/esquemas";
import type { Sugerencias } from "@/modules/archivo/repositorio";
import { ESTADOS, ETIQUETA_ESTADO, type Estado, type LibroDetalle } from "@/modules/archivo/tipos";
import { VALORES_VACIOS, type ValoresLibro } from "@/modules/archivo/valores";
import { PortadaLibro } from "./PortadaLibro";

type Accion = (previo: EstadoForm, datos: FormData) => Promise<EstadoForm>;

const selector = "mt-1.5 block min-h-12 w-full rounded-xl border border-malva/50 bg-noche/70 px-4 text-base text-marfil focus:border-durazno";
const areaTexto = "mt-1.5 block w-full rounded-xl border border-malva/50 bg-noche/70 px-4 py-3 text-base text-marfil placeholder:text-malva focus:border-durazno";
const seccion = "space-y-5 rounded-2xl border border-malva/30 bg-noche/50 p-5 sm:p-6";
const titSeccion = "font-marca text-2xl text-marfil";

function CampoLista({ nombre, etiqueta, ayuda, inicial, error, sugerencias }: { nombre: string; etiqueta: string; ayuda: string; inicial: string; error?: string; sugerencias: string[] }) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const agregar = (valor: string) => {
    const el = ref.current;
    if (!el) return;
    const actuales = el.value.split(/[,;\n]/).map((x) => x.trim().toLowerCase());
    if (actuales.includes(valor.toLowerCase())) return;
    el.value = el.value.trim() ? `${el.value.trim().replace(/[,;]$/, "")}, ${valor}` : valor;
  };
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-marfil">
        {etiqueta}
      </label>
      <input
        id={id}
        ref={ref}
        name={nombre}
        defaultValue={inicial}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-ayuda`}
        className="mt-1.5 block min-h-12 w-full rounded-xl border border-malva/50 bg-noche/70 px-4 text-base text-marfil focus:border-durazno aria-[invalid=true]:border-[#f0a3a3]"
      />
      <p id={`${id}-ayuda`} className="mt-1.5 text-sm text-texto-suave">
        {ayuda}
      </p>
      {sugerencias.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5" aria-label={`Sugerencias de ${etiqueta.toLowerCase()}`}>
          {sugerencias.slice(0, 12).map((s) => (
            <button key={s} type="button" onClick={() => agregar(s)} className="rounded-full border border-malva/40 px-2.5 py-0.5 text-xs text-texto-suave hover:border-durazno hover:text-durazno">
              + {s}
            </button>
          ))}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-[#f5b5b5]">
          {error}
        </p>
      )}
    </div>
  );
}

function BuscadorOpenLibrary({ alElegir }: { alElegir: (r: ResultadoBusqueda) => void }) {
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [error, setError] = useState("");

  async function buscar() {
    if (q.trim().length < 3) return setError("Escribí al menos 3 caracteres.");
    setCargando(true);
    setError("");
    try {
      const r = await fetch(`/api/libros/buscar?q=${encodeURIComponent(q.trim())}`);
      const json = (await r.json()) as { resultados?: ResultadoBusqueda[]; error?: string };
      if (!r.ok) throw new Error(json.error ?? "No pudimos buscar ahora.");
      setResultados(json.resultados ?? []);
    } catch (e) {
      setResultados(null);
      setError(e instanceof Error ? e.message : "No pudimos buscar ahora. Podés cargar el libro a mano.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section aria-labelledby="busq" className={seccion}>
      <h2 id="busq" className={titSeccion}>
        Buscar para completar los datos
      </h2>
      <p className="text-sm leading-relaxed text-texto-suave">
        Opcional. Busca en Open Library por título, autor o ISBN. Después podés corregir cualquier dato; si no encuentra tu libro, cargalo a mano más abajo.
      </p>
      <div className="flex gap-2">
        <label htmlFor="q-ol" className="sr-only">
          Título, autor o ISBN
        </label>
        <input
          id="q-ol"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void buscar();
            }
          }}
          placeholder="Ej.: Dune Herbert, o 9780441013593"
          className="block min-h-12 min-w-0 flex-1 rounded-xl border border-malva/50 bg-noche/70 px-4 text-base text-marfil placeholder:text-malva focus:border-durazno"
        />
        <button type="button" onClick={() => void buscar()} disabled={cargando} className="min-h-12 shrink-0 rounded-full border border-durazno/60 px-5 text-sm text-durazno hover:bg-durazno/10 disabled:opacity-60">
          {cargando ? "Buscando…" : "Buscar"}
        </button>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {resultados && resultados.length === 0 && <p className="text-sm text-texto-suave">No encontramos resultados. Probá con otras palabras o cargalo a mano.</p>}
      {resultados && resultados.length > 0 && (
        <ul className="divide-y divide-malva/25 rounded-xl border border-malva/30">
          {resultados.map((r, i) => (
            <li key={`${r.clave}-${i}`} className="flex items-center gap-3 p-3">
              {r.coverId ? <img src={`https://covers.openlibrary.org/b/id/${r.coverId}-S.jpg`} alt="" width={40} height={60} className="h-15 w-10 shrink-0 rounded-[2px] bg-velo object-cover" /> : <span aria-hidden="true" className="h-15 w-10 shrink-0 rounded-[2px] bg-velo" />}
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-marca text-lg text-marfil">{r.titulo}</span>
                <span className="block truncate text-texto-suave">
                  {r.autores.join(", ") || "Autor desconocido"}
                  {r.anio ? ` · ${r.anio}` : ""}
                  {r.paginas ? ` · ${r.paginas} pág.` : ""}
                </span>
              </span>
              <button type="button" onClick={() => alElegir(r)} className="min-h-10 shrink-0 rounded-full bg-durazno px-4 text-sm font-medium text-ciruela hover:bg-marfil">
                Usar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface Props {
  accion: Accion;
  textoBoton: string;
  /** Valores del libro al editar. */
  inicial?: ValoresLibro;
  /** Libro que se edita (muestra su portada actual). */
  libro?: LibroDetalle;
  sugerencias: Sugerencias;
  cancelarHref: string;
  conBuscador?: boolean;
}


export function FormularioLibro({ accion, textoBoton, inicial = VALORES_VACIOS, libro, sugerencias, cancelarHref, conBuscador }: Props) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaLibro, accion, { conservar: true });
  const formulario = useRef<HTMLFormElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const [estadoLectura, setEstadoLectura] = useState<Estado>(inicial.estado);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorPortada, setErrorPortada] = useState("");
  const [coverOL, setCoverOL] = useState<number | null>(null);
  const [claveOL, setClaveOL] = useState("");

  const empezado = estadoLectura !== "quiero_leer";
  const conFin = estadoLectura === "terminado" || estadoLectura === "abandonado";

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    setErrorPortada("");
    if (!original) return setVistaPrevia(null);
    try {
      const reducida = await reducirImagen(original);
      const dt = new DataTransfer();
      dt.items.add(reducida);
      if (archivo.current) archivo.current.files = dt.files;
      setVistaPrevia((previa) => {
        if (previa) URL.revokeObjectURL(previa);
        return URL.createObjectURL(reducida);
      });
      setCoverOL(null);
    } catch (err) {
      if (archivo.current) archivo.current.value = "";
      setVistaPrevia(null);
      setErrorPortada(err instanceof Error ? err.message : "No pudimos procesar la imagen.");
    }
  }

  function usarResultado(r: ResultadoBusqueda) {
    const el = formulario.current?.elements;
    if (!el) return;
    const poner = (nombre: string, valor: string) => {
      const campo = el.namedItem(nombre);
      if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) campo.value = valor;
    };
    poner("titulo", r.titulo);
    poner("autores", r.autores.join(", "));
    poner("isbn", r.isbn ?? "");
    poner("paginas", r.paginas ? String(r.paginas) : "");
    if (r.generos.length) poner("generos", r.generos.join(", "));
    setClaveOL(r.clave);
    setCoverOL(r.coverId);
    if (archivo.current) archivo.current.value = "";
    setVistaPrevia(null);
  }

  return (
    <form ref={formulario} {...formProps} className="space-y-6">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {conBuscador && <BuscadorOpenLibrary alElegir={usarResultado} />}

      <section aria-labelledby="datos" className={seccion}>
        <h2 id="datos" className={titSeccion}>
          El libro
        </h2>
        <Campo nombre="titulo" etiqueta="Título" valorInicial={inicial.titulo} error={errores.titulo} maxLength={200} autoFocus={!conBuscador} />
        <CampoLista nombre="autores" etiqueta="Autor o autores" ayuda="Separalos con comas." inicial={inicial.autores} error={errores.autores} sugerencias={sugerencias.autores} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo nombre="isbn" etiqueta="ISBN (opcional)" valorInicial={inicial.isbn} error={errores.isbn} ayuda="10 o 13 dígitos; se valida el dígito verificador." maxLength={20} />
          <Campo nombre="paginas" etiqueta="Cantidad de páginas" valorInicial={inicial.paginas} error={errores.paginas} ayuda="Con el total se calcula el porcentaje leído." maxLength={5} />
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
          <Campo nombre="saga" etiqueta="Saga (opcional)" valorInicial={inicial.saga} error={errores.saga} maxLength={120} />
          <Campo nombre="sagaNumero" etiqueta="Volumen" valorInicial={inicial.sagaNumero} error={errores.sagaNumero} maxLength={5} />
        </div>
        <CampoLista nombre="generos" etiqueta="Género o géneros" ayuda="Separalos con comas. Ej.: Fantasía, Épica." inicial={inicial.generos} error={errores.generos} sugerencias={sugerencias.generos} />
        <div>
          <label htmlFor="sinopsis" className="block text-sm text-marfil">
            Sinopsis (opcional)
          </label>
          <textarea id="sinopsis" name="sinopsis" rows={5} maxLength={4000} defaultValue={inicial.sinopsis} className={areaTexto} />
          {errores.sinopsis && (
            <p role="alert" className="mt-1.5 text-sm text-[#f5b5b5]">
              {errores.sinopsis}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="portada" className={seccion}>
        <h2 id="portada" className={titSeccion}>
          Portada
        </h2>
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-28 shrink-0">
            {vistaPrevia ? (
              <img src={vistaPrevia} alt="Vista previa de la portada" className="aspect-[2/3] w-full rounded-[3px] object-cover" />
            ) : coverOL ? (
              <img src={`https://covers.openlibrary.org/b/id/${coverOL}-M.jpg`} alt="Portada sugerida por Open Library" className="aspect-[2/3] w-full rounded-[3px] object-cover" />
            ) : libro ? (
              <PortadaLibro libro={libro} />
            ) : (
              <div aria-hidden="true" className="grid aspect-[2/3] w-full place-items-center rounded-[3px] border border-dashed border-malva/60 text-xs text-malva">
                Sin portada
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 basis-56 space-y-3">
            <label htmlFor="portada-archivo" className="block text-sm text-marfil">
              Subir una imagen
            </label>
            <input
              id="portada-archivo"
              ref={archivo}
              name="portada"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={alElegirArchivo}
              className="block w-full text-sm text-texto-suave file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-durazno file:px-4 file:text-sm file:font-medium file:text-ciruela"
            />
            <p className="text-sm text-texto-suave">JPG, PNG o WebP. Se reduce automáticamente (máx. 600 px, 400 KB) antes de guardarla.</p>
            {coverOL && <p className="text-sm text-durazno">Se guardará la portada sugerida por Open Library, salvo que subas la tuya.</p>}
            {libro && libro.portadaVersion > 0 && (
              <label className="flex items-center gap-2 text-sm text-texto-suave">
                <input type="checkbox" name="quitarPortada" className="size-4 accent-[#f2c7a2]" />
                Quitar la portada actual
              </label>
            )}
            {(errorPortada || errores.portada) && (
              <p role="alert" className="text-sm text-[#f5b5b5]">
                {errorPortada || errores.portada}
              </p>
            )}
          </div>
        </div>
        <input type="hidden" name="portadaOpenLibrary" value={coverOL ?? ""} />
        <input type="hidden" name="openlibraryKey" value={claveOL} />
      </section>

      <section aria-labelledby="lectura" className={seccion}>
        <h2 id="lectura" className={titSeccion}>
          Tu lectura
        </h2>
        <div>
          <label htmlFor="estado" className="block text-sm text-marfil">
            Estado de lectura
          </label>
          <select id="estado" name="estado" value={estadoLectura} onChange={(e) => setEstadoLectura(e.target.value as Estado)} className={selector}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
          {errores.estado && (
            <p role="alert" className="mt-1.5 text-sm text-[#f5b5b5]">
              {errores.estado}
            </p>
          )}
          {libro && libro.nLecturas > 1 && <p className="mt-1.5 text-sm text-texto-suave">Estado y fechas corresponden a la lectura más reciente (n.º {libro.nLecturas}).</p>}
        </div>
        {empezado && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo nombre="fechaInicio" etiqueta="Fecha de inicio" tipo="date" valorInicial={inicial.fechaInicio} error={errores.fechaInicio} />
            {conFin && <Campo nombre="fechaFin" etiqueta="Fecha de finalización" tipo="date" valorInicial={inicial.fechaFin} error={errores.fechaFin} />}
          </div>
        )}
        {empezado && (
          <div>
            <label htmlFor="calificacion" className="block text-sm text-marfil">
              Calificación personal
            </label>
            <select id="calificacion" name="calificacion" defaultValue={inicial.calificacion} className={selector}>
              <option value="">Sin calificar</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                  {"☆".repeat(5 - n)} ({n})
                </option>
              ))}
            </select>
            {errores.calificacion && (
              <p role="alert" className="mt-1.5 text-sm text-[#f5b5b5]">
                {errores.calificacion}
              </p>
            )}
          </div>
        )}
        <CampoLista nombre="etiquetas" etiqueta="Etiquetas personalizadas" ayuda="Separalas con comas. Ej.: favorito, regalo, releer." inicial={inicial.etiquetas} error={errores.etiquetas} sugerencias={sugerencias.etiquetas} />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelarHref} className="inline-flex min-h-12 items-center justify-center rounded-full border border-malva/60 px-7 text-[0.95rem] text-texto-suave hover:text-marfil">
          Cancelar
        </Link>
        <div className="sm:w-56">
          <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
            {textoBoton}
          </BotonEnvio>
        </div>
      </div>
    </form>
  );
}
