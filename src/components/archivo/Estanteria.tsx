"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ETIQUETA_ESTADO, type LibroResumen } from "@/modules/archivo/tipos";
import { porcentaje } from "@/modules/archivo/utiles";
import { PortadaLibro } from "./PortadaLibro";

/** Libros por estante según el ancho. 5 es el valor del servidor (evita diferencias de hidratación). */
function suscribir(aviso: () => void) {
  const consultas = [window.matchMedia("(min-width: 640px)"), window.matchMedia("(min-width: 1024px)")];
  consultas.forEach((q) => q.addEventListener("change", aviso));
  return () => consultas.forEach((q) => q.removeEventListener("change", aviso));
}
const leerColumnas = () =>
  window.matchMedia("(min-width: 1024px)").matches ? 7 : window.matchMedia("(min-width: 640px)").matches ? 5 : 3;

function useColumnas() {
  return useSyncExternalStore(suscribir, leerColumnas, () => 5);
}

/** Variación estable de ancho (92–100 %) para que los libros no parezcan clonados. */
function anchoNatural(id: string): number {
  let h = 7;
  for (const c of id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return 92 + (h % 9);
}

function dividir<T>(items: T[], tamano: number): T[][] {
  const filas: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) filas.push(items.slice(i, i + tamano));
  return filas;
}

function Libro({ libro }: { libro: LibroResumen }) {
  const pct = porcentaje(libro.paginaActual, libro.paginasTotal);
  const enCurso = libro.estado === "leyendo" || libro.estado === "pausado";
  const descripcion = [libro.titulo, libro.autores.join(", "), ETIQUETA_ESTADO[libro.estado], pct !== null && enCurso ? `${pct} % leído` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-end justify-center">
      <Link
        href={`/archivo/${libro.id}`}
        aria-label={descripcion}
        title={descripcion}
        style={{ width: `${anchoNatural(libro.id)}%` }}
        className="group relative block origin-bottom transition duration-300 ease-out hover:-translate-y-2 hover:rotate-[-1.2deg] focus-visible:-translate-y-2"
      >
        <div className="relative overflow-hidden rounded-[3px] shadow-[3px_4px_10px_rgba(0,0,0,0.55),-1px_0_0_rgba(252,248,242,0.12)_inset]">
          <PortadaLibro libro={libro} />
          {/* lomo: sombra del encuadernado en el borde izquierdo */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/45 via-white/10 to-transparent" />
          {libro.estado === "terminado" && (
            <span aria-hidden="true" className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-durazno text-[10px] font-bold leading-none text-ciruela">
              ✓
            </span>
          )}
          {enCurso && pct !== null && (
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-ciruela/70">
              <span className="block h-full bg-durazno" style={{ width: `${pct}%` }} />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/** Vista inmersiva: los libros reposan sobre estantes de madera. Usa exactamente la misma lista que el catálogo. */
export function Estanteria({ libros }: { libros: LibroResumen[] }) {
  const columnas = useColumnas();
  const filas = dividir(libros, columnas);
  return (
    <div className="rounded-3xl border border-malva/30 bg-[radial-gradient(ellipse_at_50%_0%,var(--color-velo),var(--color-noche)_75%)] px-3 pb-4 pt-6 shadow-inner sm:px-8">
      {filas.map((fila, i) => (
        <section key={i} aria-label={`Estante ${i + 1}`} className="mb-6 last:mb-2">
          <ul className="grid items-end gap-x-3 px-1 sm:gap-x-5" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
            {fila.map((l) => (
              <Libro key={l.id} libro={l} />
            ))}
          </ul>
          <div aria-hidden="true" className="relative mt-[-2px] h-3.5 rounded-[3px] bg-gradient-to-b from-[#7a4666] via-[#4b2943] to-[#2e182f] shadow-[0_10px_16px_-6px_rgba(0,0,0,0.75)]">
            <span className="absolute inset-x-0 top-0 h-px bg-durazno/40" />
          </div>
        </section>
      ))}
    </div>
  );
}
