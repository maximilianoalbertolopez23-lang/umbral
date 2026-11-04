import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListaPapelera } from "@/components/escritorio/IndiceEscritorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarPapelera } from "@/modules/escritorio/repositorio";

export const metadata: Metadata = { title: "Papelera del Escritorio" };

async function Contenido() {
  const g = await requerirGuardiana();
  const paginas = await conUsuario(g.userId, (db) => listarPapelera(db, g.userId));
  return <ListaPapelera paginas={paginas} />;
}

export default function PapeleraPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/escritorio" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver a El Escritorio
      </Link>
      <h1 className="mb-3 mt-4 font-marca text-5xl leading-tight text-marfil">Papelera</h1>
      <p className="mb-6 max-w-2xl text-texto-suave">
        Las páginas eliminadas esperan acá. Podés restaurarlas con todo su contenido o borrarlas para siempre.
      </p>
      <Suspense fallback={<div role="status" aria-label="Cargando la papelera" className="h-40 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
