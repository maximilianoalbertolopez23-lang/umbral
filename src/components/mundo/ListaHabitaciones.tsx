import Link from "next/link";
import { MODULOS_VISIBLES } from "@/modules/registry";

const ETIQUETA_FASE = { nucleo: "Núcleo inicial", futuro: "Más adelante" } as const;

/** Recorrido de habitaciones. Todas figuran como planificadas hasta que un módulo pase a "disponible". */
export function ListaHabitaciones({ className }: { className?: string }) {
  return (
    <ol className={`divide-y divide-malva/25 border-y border-malva/25 ${className ?? ""}`}>
      {MODULOS_VISIBLES.map((m) => (
        <li key={m.id}>
          <Link
            href={m.ruta}
            className="group grid grid-cols-[3rem_1fr] items-baseline gap-x-3 gap-y-1 px-1 py-5 transition-colors hover:bg-morado/30 sm:grid-cols-[4rem_1fr_auto] sm:px-3"
          >
            <span className="font-marca text-2xl text-durazno sm:text-3xl">{m.numeral}</span>
            <span>
              <span className="block font-marca text-2xl text-marfil sm:text-3xl">{m.titulo}</span>
              <span className="mt-1 block max-w-prose text-[0.95rem] leading-relaxed text-texto-suave">
                {m.resumen}
              </span>
            </span>
            <span className="col-start-2 mt-2 text-xs uppercase tracking-[0.14em] text-durazno/80 sm:col-start-3 sm:mt-0">
              {ETIQUETA_FASE[m.fase]} · {m.estado === "disponible" ? "Disponible" : "En preparación"}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
