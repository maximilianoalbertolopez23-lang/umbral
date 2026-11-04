import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioLibro } from "@/components/archivo/FormularioLibro";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerSugerencias } from "@/modules/archivo/repositorio";
import { crearLibroAction } from "../actions";

export const metadata: Metadata = { title: "Agregar un libro" };

async function Contenido() {
  const g = await requerirGuardiana();
  const sugerencias = await conUsuario(g.userId, (db) => obtenerSugerencias(db, g.userId));
  return <FormularioLibro accion={crearLibroAction} textoBoton="Guardar libro" sugerencias={sugerencias} cancelarHref="/archivo" conBuscador />;
}

export default function NuevoLibroPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/archivo" className="text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline">
        ← Volver al Archivo
      </Link>
      <h1 className="mb-8 mt-4 font-marca text-5xl leading-tight text-marfil">Agregar un libro</h1>
      <Suspense fallback={<div role="status" aria-label="Cargando formulario" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </div>
  );
}
