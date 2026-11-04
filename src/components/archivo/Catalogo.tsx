import Link from "next/link";
import type { LibroResumen } from "@/modules/archivo/tipos";
import { porcentaje } from "@/modules/archivo/utiles";
import { PortadaLibro } from "./PortadaLibro";
import { BarraProgreso, Estrellas, InsigniaEstado } from "./Visuales";

/** Vista práctica: una fila por libro, pensada para escanear rápido. Misma lista que la estantería. */
export function Catalogo({ libros }: { libros: LibroResumen[] }) {
  return (
    <ul className="divide-y divide-malva/25 overflow-hidden rounded-2xl border border-malva/30 bg-noche/50">
      {libros.map((l) => {
        const pct = porcentaje(l.paginaActual, l.paginasTotal);
        return (
          <li key={l.id}>
            <Link
              href={`/archivo/${l.id}`}
              className="grid grid-cols-[3.25rem_1fr] items-center gap-x-4 gap-y-2 px-3 py-3 transition-colors hover:bg-morado/30 sm:grid-cols-[3.25rem_minmax(0,1fr)_9.5rem_7rem_5rem] sm:px-4"
            >
              <PortadaLibro libro={l} compacta className="shadow-md" />
              <span className="min-w-0">
                <span className="block truncate font-marca text-xl leading-tight text-marfil">{l.titulo}</span>
                <span className="block truncate text-sm text-texto-suave">
                  {l.autores.join(", ") || "Autor desconocido"}
                  {l.saga && <span className="text-malva"> · {l.saga}{l.sagaNumero !== null ? ` #${l.sagaNumero}` : ""}</span>}
                </span>
              </span>
              <span className="col-start-2 flex flex-col items-start gap-1.5 sm:col-start-3">
                <InsigniaEstado estado={l.estado} />
                {(l.estado === "leyendo" || l.estado === "pausado") && pct !== null && (
                  <span className="flex w-full max-w-36 items-center gap-2 text-xs text-texto-suave">
                    <BarraProgreso porcentaje={pct} className="flex-1" />
                    {pct} %
                  </span>
                )}
              </span>
              <span className="col-start-2 sm:col-start-4">
                <Estrellas valor={l.calificacion} />
              </span>
              <span className="col-start-2 text-sm text-texto-suave sm:col-start-5 sm:text-right">
                {l.paginasTotal ? `${l.paginasTotal} pág.` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
