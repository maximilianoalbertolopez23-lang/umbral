import type { Modulo } from "@/modules/registry";

/** Estado honesto de una habitación aún sin funciones: dice qué será, no simula que ya existe. */
export function HabitacionPendiente({ modulo, children }: { modulo: Modulo; children?: React.ReactNode }) {
  return (
    <article className="animate-aparecer">
      <p className="font-marca text-3xl text-durazno">{modulo.numeral}</p>
      <h1 className="mt-1 font-marca text-5xl leading-tight text-marfil sm:text-6xl">{modulo.titulo}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-texto-suave">{modulo.resumen}</p>

      <section aria-labelledby="estado" className="mt-10 rounded-2xl border border-malva/30 bg-velo/50 p-6 sm:p-8">
        <h2 id="estado" className="text-xs uppercase tracking-[0.2em] text-durazno">
          En preparación
        </h2>
        <p className="mt-3 leading-relaxed text-marfil/90">
          Esta habitación todavía no tiene funciones. Se construye en una etapa próxima del proyecto; hoy solo existe
          su lugar en el mapa.
        </p>
        <h3 className="mt-6 text-sm text-malva">Va a contener</h3>
        <ul className="mt-2 space-y-1.5 text-texto-suave">
          {modulo.contendra.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-durazno">
                ·
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {children}
    </article>
  );
}
