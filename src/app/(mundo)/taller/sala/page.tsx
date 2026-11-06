import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EditorSala } from "@/components/taller/EditorSala";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarLibros } from "@/modules/archivo/repositorio";
import { obtenerInventario, sincronizarProgreso } from "@/modules/torre/repositorio";
import { obtenerDisenoSala } from "@/modules/taller/repositorio";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

export const metadata: Metadata = { title: "Decorar la sala" };

async function Contenido() {
  const g = await requerirGuardiana();
  const datos = await conUsuario(g.userId, async (db) => {
    await sincronizarProgreso(db, g.userId);
    return {
    inventario: await obtenerInventario(db, g.userId),
    libros: await listarLibros(db, g.userId),
    guardado: await obtenerDisenoSala(db, g.userId),
  };
  });
  return <EditorSala diseno={datos.guardado.diseno} version={datos.guardado.version} libros={datos.libros.map((l) => ({ id: l.id }))} inventario={datos.inventario} />;
}

export default function TallerSalaPage() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return (
    <>
      <Link href="/taller" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver a El Taller
      </Link>
      <h1 className="mb-6 mt-3 font-marca text-5xl leading-tight text-marfil">Decorar la sala</h1>
      <Suspense fallback={<div role="status" aria-label="Abriendo el editor" className="aspect-video animate-titilar rounded-3xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
