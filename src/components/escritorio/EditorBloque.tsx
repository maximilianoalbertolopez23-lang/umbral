"use client";

import { ResumenLecturas } from "./RenderBloques";
import { TextoEnriquecido } from "./TextoEnriquecido";
import type { Bloque } from "@/modules/escritorio/bloques";
import type { EstadisticasAnio } from "@/modules/escritorio/repositorio";

interface Props {
  bloque: Bloque;
  alCambiar: (nuevo: Bloque) => void;
  estadisticas: Record<number, EstadisticasAnio>;
  alCambiarAnio: (anio: number) => void;
  autoFocus?: boolean;
}

const etiqueta = "etiqueta-hoja block mb-0.5";

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label htmlFor={id} className={etiqueta}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}

/** Edición de cada tipo de bloque. Todo son campos de texto planos salvo «Texto», que usa Tiptap. */
export function EditorBloque({ bloque: b, alCambiar, estadisticas, alCambiarAnio, autoFocus }: Props) {
  const id = (s: string) => `${b.id}-${s}`;
  switch (b.tipo) {
    case "titulo":
      return (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Campo id={id("t")} rotulo="Título">
              <input id={id("t")} className="campo" style={{ fontFamily: "var(--font-marca)", fontSize: `${[1.9, 1.5, 1.2][b.nivel - 1]}rem` }} value={b.texto} maxLength={200} placeholder="Escribí un título…" autoFocus={autoFocus} onChange={(e) => alCambiar({ ...b, texto: e.target.value })} />
            </Campo>
          </div>
          <div className="mb-2">
            <label htmlFor={id("n")} className={etiqueta}>
              Tamaño
            </label>
            <select id={id("n")} className="campo" style={{ width: "auto" }} value={b.nivel} onChange={(e) => alCambiar({ ...b, nivel: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value={1}>Grande</option>
              <option value={2}>Mediano</option>
              <option value={3}>Chico</option>
            </select>
          </div>
        </div>
      );

    case "texto":
      return <TextoEnriquecido doc={b.doc} etiqueta="Texto" autoFocus={autoFocus} alCambiar={(doc) => alCambiar({ ...b, doc })} />;

    case "lista": {
      const nuevoItem = () => ({ id: crypto.randomUUID(), texto: "", hecho: false });
      return (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label htmlFor={id("m")} className={etiqueta}>
              Tipo de lista
            </label>
            <select id={id("m")} className="campo" style={{ width: "auto" }} value={b.modo} onChange={(e) => alCambiar({ ...b, modo: e.target.value as typeof b.modo })}>
              <option value="vinietas">Con viñetas</option>
              <option value="numerada">Numerada</option>
              <option value="tareas">Tareas (casillas)</option>
            </select>
          </div>
          <ul className="m-0 list-none p-0">
            {b.items.map((it, i) => (
              <li key={it.id} className="mb-1 flex items-center gap-2">
                {b.modo === "tareas" ? (
                  <input type="checkbox" className="size-5 shrink-0" aria-label={`Elemento ${i + 1} hecho`} checked={it.hecho} onChange={(e) => alCambiar({ ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, hecho: e.target.checked } : x)) })} />
                ) : (
                  <span aria-hidden="true" className="w-5 shrink-0 text-center" style={{ color: "var(--tinta-suave)" }}>
                    {b.modo === "numerada" ? `${i + 1}.` : "•"}
                  </span>
                )}
                <input
                  className="campo"
                  aria-label={`Elemento ${i + 1}`}
                  value={it.texto}
                  maxLength={500}
                  placeholder="Escribí un elemento…"
                  autoFocus={autoFocus && i === 0}
                  style={it.hecho ? { textDecoration: "line-through", opacity: 0.75 } : undefined}
                  onChange={(e) => alCambiar({ ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, texto: e.target.value } : x)) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const nuevo = nuevoItem();
                      alCambiar({ ...b, items: [...b.items.slice(0, i + 1), nuevo, ...b.items.slice(i + 1)] });
                      requestAnimationFrame(() => document.getElementById(`${b.id}-item-${nuevo.id}`)?.focus());
                    }
                  }}
                  id={`${b.id}-item-${it.id}`}
                />
                <button type="button" className="boton-hoja" aria-label={`Quitar elemento ${i + 1}`} onClick={() => alCambiar({ ...b, items: b.items.filter((x) => x.id !== it.id) })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {b.items.length < 100 && (
            <button type="button" className="boton-hoja mt-1" onClick={() => alCambiar({ ...b, items: [...b.items, nuevoItem()] })}>
              + Agregar elemento
            </button>
          )}
        </div>
      );
    }

    case "cita":
      return (
        <div>
          <Campo id={id("t")} rotulo="Cita">
            <textarea id={id("t")} className="campo" rows={2} maxLength={2000} value={b.texto} placeholder="La frase que querés conservar…" autoFocus={autoFocus} onChange={(e) => alCambiar({ ...b, texto: e.target.value })} />
          </Campo>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <Campo id={id("a")} rotulo="Quién la dice (opcional)">
              <input id={id("a")} className="campo" maxLength={100} value={b.autor} onChange={(e) => alCambiar({ ...b, autor: e.target.value })} />
            </Campo>
            <Campo id={id("p")} rotulo="Página">
              <input id={id("p")} className="campo" maxLength={20} value={b.pagina} onChange={(e) => alCambiar({ ...b, pagina: e.target.value })} />
            </Campo>
          </div>
        </div>
      );

    case "momento":
      return (
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <Campo id={id("p")} rotulo="Página">
            <input id={id("p")} className="campo" maxLength={20} value={b.pagina} onChange={(e) => alCambiar({ ...b, pagina: e.target.value })} />
          </Campo>
          <Campo id={id("t")} rotulo="Momento destacado">
            <textarea id={id("t")} className="campo" rows={2} maxLength={2000} value={b.texto} placeholder="¿Qué pasó? ¿Por qué te marcó?" autoFocus={autoFocus} onChange={(e) => alCambiar({ ...b, texto: e.target.value })} />
          </Campo>
        </div>
      );

    case "personaje":
      return (
        <div>
          <Campo id={id("n")} rotulo="Personaje">
            <input id={id("n")} className="campo" maxLength={100} value={b.nombre} placeholder="Nombre" autoFocus={autoFocus} onChange={(e) => alCambiar({ ...b, nombre: e.target.value })} />
          </Campo>
          <Campo id={id("d")} rotulo="Por qué te gusta">
            <textarea id={id("d")} className="campo" rows={2} maxLength={2000} value={b.descripcion} onChange={(e) => alCambiar({ ...b, descripcion: e.target.value })} />
          </Campo>
        </div>
      );

    case "nota":
      return (
        <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
          <Campo id={id("f")} rotulo="Fecha">
            <input id={id("f")} type="date" className="campo" value={b.fecha} onChange={(e) => e.target.value && alCambiar({ ...b, fecha: e.target.value })} />
          </Campo>
          <Campo id={id("t")} rotulo="Nota">
            <textarea id={id("t")} className="campo" rows={2} maxLength={4000} value={b.texto} placeholder="Apuntá lo que quieras recordar…" autoFocus={autoFocus} onChange={(e) => alCambiar({ ...b, texto: e.target.value })} />
          </Campo>
        </div>
      );

    case "imagen":
      return (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/escritorio/imagenes/${b.imagenId}`} alt={b.pie || "Imagen del diario"} loading="lazy" className="mb-2 max-h-72 rounded" style={{ maxWidth: "100%" }} />
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
            <Campo id={id("c")} rotulo="Pie de foto (opcional)">
              <input id={id("c")} className="campo" maxLength={200} value={b.pie} onChange={(e) => alCambiar({ ...b, pie: e.target.value })} />
            </Campo>
            <Campo id={id("w")} rotulo="Tamaño">
              <select id={id("w")} className="campo" value={b.ancho} onChange={(e) => alCambiar({ ...b, ancho: e.target.value as "normal" | "completo" })}>
                <option value="normal">Normal</option>
                <option value="completo">Ancho completo</option>
              </select>
            </Campo>
          </div>
        </div>
      );

    case "separador":
      return <hr />;

    case "resumen_lecturas": {
      const actual = new Date().getFullYear();
      const anios = Array.from({ length: 8 }, (_, i) => actual + 1 - i);
      if (!anios.includes(b.anio)) anios.push(b.anio);
      return (
        <div>
          <Campo id={id("y")} rotulo="Año del resumen">
            <select id={id("y")} className="campo" style={{ width: "auto" }} value={b.anio} onChange={(e) => { const anio = Number(e.target.value); alCambiar({ ...b, anio }); alCambiarAnio(anio); }}>
              {anios.sort((x, y) => y - x).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Campo>
          <ResumenLecturas datos={estadisticas[b.anio]} anio={b.anio} />
        </div>
      );
    }
  }
}
