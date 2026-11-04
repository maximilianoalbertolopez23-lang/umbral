import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchivoCliente } from "@/components/archivo/ArchivoCliente";
import { VistaEstancia } from "@/components/sala/VistaEstancia";
import { obtenerDisenoSala } from "@/modules/taller/repositorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarLibros, obtenerVistaArchivo } from "@/modules/archivo/repositorio";
import { getModulo } from "@/modules/registry";

const modulo = getModulo("archivo");
export const metadata: Metadata = { title: modulo.titulo };

async function Contenido() {
  const g = await requerirGuardiana();
  const { libros, vista, diseno } = await conUsuario(g.userId, async (db) => ({
    libros: await listarLibros(db, g.userId),
    vista: await obtenerVistaArchivo(db, g.userId),
    diseno: (await obtenerDisenoSala(db, g.userId)).diseno,
  }));
  return (
    <>
      <VistaEstancia estancia="archivo" libros={libros} diseno={diseno} />
      <ArchivoCliente libros={libros} vistaInicial={vista} />
    </>
  );
}

function EsqueletoArchivo() {
  return (
    <div role="status" aria-label="Cargando el Archivo" className="space-y-4">
      <div className="h-11 animate-titilar rounded-full bg-velo/60" />
      <div className="h-9 w-2/3 animate-titilar rounded-full bg-velo/40" />
      <div className="grid animate-titilar grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="aspect-[2/3] rounded-[3px] bg-velo/50" />
        ))}
      </div>
    </div>
  );
}

export default function ArchivoPage() {
  return (
    <>
      <header className="mb-8">
        <p className="font-marca text-3xl text-durazno">{modulo.numeral}</p>
        <h1 className="mt-1 font-marca text-5xl leading-tight text-marfil sm:text-6xl">{modulo.titulo}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-texto-suave">{modulo.resumen}</p>
      </header>
      <Suspense fallback={<EsqueletoArchivo />}>
        <Contenido />
      </Suspense>
    </>
  );
}
