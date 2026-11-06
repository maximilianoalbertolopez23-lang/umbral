import type { Metadata } from "next";
import { ImportarRespaldo } from "@/components/taller/ImportarRespaldo";
import { getModulo } from "@/modules/registry";

const modulo = getModulo("ajustes");
export const metadata: Metadata = { title: modulo.titulo };

export default function AjustesPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="font-marca text-5xl leading-tight text-marfil sm:text-6xl">{modulo.titulo}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-texto-suave">{modulo.resumen}</p>
      </header>

      <section aria-labelledby="datos">
        <h2 id="datos" className="font-marca text-3xl text-marfil">Tus datos</h2>
        <p className="mb-4 mt-1 max-w-2xl text-texto-suave">
          Descargá una copia completa de tus libros, tu journal y tus preferencias en un archivo JSON. Es tuyo: guardalo donde quieras.
          Si algún día lo necesitás, podés volver a cargarlo y solo se suma lo que falte, sin borrar nada.
        </p>
        <a href="/api/exportar" download className="inline-flex min-h-11 items-center rounded-full border border-durazno px-5 text-durazno transition hover:bg-durazno hover:text-ciruela">
          Descargar mi respaldo
        </a>
        <ImportarRespaldo />
      </section>
    </>
  );
}
