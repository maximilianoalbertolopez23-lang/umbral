import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JournalTaller } from "@/components/taller/JournalTaller";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerInventario, sincronizarProgreso } from "@/modules/torre/repositorio";
import { listarPlantillas, obtenerPreferenciaPlantilla } from "@/modules/taller/repositorio";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

export const metadata: Metadata = { title: "Personalizar el journal" };

async function Contenido() {
  const g = await requerirGuardiana();
  const d = await conUsuario(g.userId, async (db) => {
    await sincronizarProgreso(db, g.userId);
    return {
    inventario: await obtenerInventario(db, g.userId),
    plantillas: await listarPlantillas(db, g.userId),
    predeterminada: await obtenerPreferenciaPlantilla(db, g.userId),
    paginas: (await db.query<{ n: number }>("select count(*)::int as n from diario_paginas where user_id = $1 and eliminada_at is null", [g.userId])).rows[0].n,
  };
  });
  return <JournalTaller plantillas={d.plantillas} predeterminada={d.predeterminada} nPaginas={d.paginas} inventario={d.inventario} />;
}

export default function TallerJournalPage() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return (
    <>
      <Link href="/taller" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver a El Taller
      </Link>
      <h1 className="mb-3 mt-3 font-marca text-5xl leading-tight text-marfil">Personalizar el journal</h1>
      <p className="mb-8 max-w-2xl text-lg leading-relaxed text-texto-suave">
        Tu diseño se guarda aparte de lo que escribís: podés cambiarlo o borrarlo cuando quieras y tus notas siguen intactas.
      </p>
      <Suspense fallback={<div role="status" aria-label="Cargando las plantillas" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </>
  );
}
