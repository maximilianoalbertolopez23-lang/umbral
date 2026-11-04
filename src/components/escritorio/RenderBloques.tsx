import Link from "next/link";
import type { ReactNode } from "react";
import { formatearFecha } from "@/components/archivo/Visuales";
import type { Bloque, DocTexto } from "@/modules/escritorio/bloques";
import type { EstadisticasAnio } from "@/modules/escritorio/repositorio";

/**
 * Presentación de solo lectura. Todo el contenido es TEXTO que React escapa; el único "formato" posible son los
 * elementos que este archivo decide (negrita, cursiva…). No existe ningún camino que inserte HTML del usuario.
 */

export function TextoRico({ doc }: { doc: DocTexto }) {
  return (
    <>
      {doc.content.map((p, i) => (
        <p key={i}>
          {(p.content ?? []).length === 0 && <br />}
          {(p.content ?? []).map((n, j) => {
            if (n.type === "hardBreak") return <br key={j} />;
            let nodo: ReactNode = n.text;
            for (const m of n.marks ?? []) {
              if (m.type === "bold") nodo = <strong>{nodo}</strong>;
              else if (m.type === "italic") nodo = <em>{nodo}</em>;
              else if (m.type === "underline") nodo = <u>{nodo}</u>;
              else if (m.type === "strike") nodo = <s>{nodo}</s>;
            }
            return <span key={j}>{nodo}</span>;
          })}
        </p>
      ))}
    </>
  );
}

export function ResumenLecturas({ datos, anio }: { datos: EstadisticasAnio | null | undefined; anio: number }) {
  if (!datos) {
    return (
      <div className="my-4 rounded border border-dashed p-4" style={{ borderColor: "var(--linea)" }}>
        <p className="etiqueta-hoja">Resumen de lecturas {anio}</p>
        <p className="mb-0 mt-1">Cargando datos de El Archivo…</p>
      </div>
    );
  }
  return (
    <section aria-label={`Resumen de lecturas ${anio}`} className="my-4 rounded border p-4" style={{ borderColor: "var(--linea)" }}>
      <p className="etiqueta-hoja">Resumen de lecturas · {anio}</p>
      {datos.librosTerminados === 0 ? (
        <p className="mb-0 mt-2">Todavía no terminaste libros en {anio}. Cuando lo hagas, este resumen se completa solo con los datos de El Archivo.</p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              ["Libros terminados", String(datos.librosTerminados)],
              ["Páginas", datos.paginasLeidas.toLocaleString("es-AR")],
              ["Calificación media", datos.calificacionMedia === null ? "—" : `${String(datos.calificacionMedia).replace(".", ",")} / 5`],
              ["Tiempo registrado", datos.minutosLeidos ? `${Math.floor(datos.minutosLeidos / 60)} h ${datos.minutosLeidos % 60} min` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="etiqueta-hoja">{k}</dt>
                <dd className="m-0 text-2xl" style={{ fontFamily: "var(--font-marca)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <ol className="mb-0 mt-3 pl-5">
            {datos.libros.map((l) => (
              <li key={`${l.id}-${l.fechaFin}`}>
                <Link href={`/archivo/${l.id}`} className="underline underline-offset-4">{l.titulo}</Link>
                <span style={{ color: "var(--tinta-suave)" }}>
                  {l.autores.length ? ` · ${l.autores.join(", ")}` : ""} · {formatearFecha(l.fechaFin)}
                  {l.calificacion ? ` · ${"★".repeat(l.calificacion)}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export function RenderBloque({ bloque, estadisticas }: { bloque: Bloque; estadisticas?: Record<number, EstadisticasAnio> }) {
  switch (bloque.tipo) {
    case "titulo": {
      const Etiqueta = (["h2", "h3", "h4"] as const)[bloque.nivel - 1];
      return <Etiqueta>{bloque.texto}</Etiqueta>;
    }
    case "texto":
      return <TextoRico doc={bloque.doc} />;
    case "lista": {
      if (bloque.items.length === 0) return null;
      if (bloque.modo === "tareas") {
        return (
          <ul className="tareas">
            {bloque.items.map((i) => (
              <li key={i.id}>
                <span aria-hidden="true">{i.hecho ? "☑" : "☐"} </span>
                <span className="sr-only">{i.hecho ? "Hecho: " : "Pendiente: "}</span>
                <span style={i.hecho ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>{i.texto}</span>
              </li>
            ))}
          </ul>
        );
      }
      const Lista = bloque.modo === "numerada" ? "ol" : "ul";
      return (
        <Lista>
          {bloque.items.map((i) => (
            <li key={i.id}>{i.texto}</li>
          ))}
        </Lista>
      );
    }
    case "cita":
      return (
        <blockquote>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.2em" }}>{bloque.texto}</p>
          {(bloque.autor || bloque.pagina) && (
            <footer className="etiqueta-hoja">
              {bloque.autor}
              {bloque.autor && bloque.pagina ? " · " : ""}
              {bloque.pagina && `p. ${bloque.pagina}`}
            </footer>
          )}
        </blockquote>
      );
    case "momento":
      return (
        <div className="my-3">
          {bloque.pagina && <p className="etiqueta-hoja mb-0">Página {bloque.pagina}</p>}
          <p style={{ whiteSpace: "pre-wrap" }}>{bloque.texto}</p>
        </div>
      );
    case "personaje":
      return (
        <div className="my-3">
          <h4 className="mb-0">{bloque.nombre}</h4>
          <p style={{ whiteSpace: "pre-wrap" }}>{bloque.descripcion}</p>
        </div>
      );
    case "nota":
      return (
        <div className="my-3">
          <p className="etiqueta-hoja mb-0">{formatearFecha(bloque.fecha)}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{bloque.texto}</p>
        </div>
      );
    case "imagen":
      return (
        <figure className={bloque.ancho === "completo" ? "" : "mx-auto max-w-md"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/escritorio/imagenes/${bloque.imagenId}`} alt={bloque.pie || "Imagen del diario"} loading="lazy" decoding="async" />
          {bloque.pie && <figcaption>{bloque.pie}</figcaption>}
        </figure>
      );
    case "separador":
      return <hr />;
    case "resumen_lecturas":
      return <ResumenLecturas datos={estadisticas?.[bloque.anio]} anio={bloque.anio} />;
  }
}

export function RenderBloques({ bloques, estadisticas }: { bloques: Bloque[]; estadisticas?: Record<number, EstadisticasAnio> }) {
  if (bloques.length === 0) return <p style={{ color: "var(--tinta-suave)" }}>Esta página todavía está en blanco.</p>;
  return (
    <>
      {bloques.map((b) => (
        <RenderBloque key={b.id} bloque={b} estadisticas={estadisticas} />
      ))}
    </>
  );
}
