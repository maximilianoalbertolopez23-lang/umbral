import type { Metadata } from "next";
import { Suspense } from "react";
import { BibliotecaViva } from "@/components/sala/BibliotecaViva";
import { AvisoLogro } from "@/components/torre/AvisoLogro";
import { obtenerProgreso, sincronizarProgreso } from "@/modules/torre/repositorio";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { listarLibros } from "@/modules/archivo/repositorio";
import { getModulo } from "@/modules/registry";
import { contarPaginasJournal } from "@/modules/sala/repositorio";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

const modulo = getModulo("sala");
export const metadata: Metadata = { title: modulo.titulo };

async function Contenido() {
  const g = await requerirGuardiana();
  const { libros, paginas, nuevos, progreso } = await conUsuario(g.userId, async (db) => {
    // Registra lo ganado desde la última visita; el aviso solo muestra lo que de verdad quedó registrado.
    const nuevos = await sincronizarProgreso(db, g.userId);
    return {
      libros: await listarLibros(db, g.userId),
      paginas: await contarPaginasJournal(db, g.userId),
      progreso: await obtenerProgreso(db, g.userId),
      nuevos,
    };
  });
  const enCurso = libros.find((l) => l.estado === "leyendo") ?? null;

  return (
    <>
      <AvisoLogro recompensas={nuevos} />
      <BibliotecaViva
        nombreGuardiana={g.guardianaNombre ?? "lectora"}
        nombreBiblioteca={g.bibliotecaNombre ?? "Tu biblioteca"}
        libroEnCurso={enCurso && { id: enCurso.id, titulo: enCurso.titulo, paginaActual: enCurso.paginaActual, paginasTotal: enCurso.paginasTotal }}
        totalLibros={libros.length}
        paginasJournal={paginas}
        esencias={progreso.esencias}
        piso={{ nivel: progreso.nivel.nivel, titulo: progreso.nivel.titulo, progreso: progreso.nivel.progreso }}
        recompensasNuevas={nuevos.length}
      />
    </>
  );
}

export default function SalaPage() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return (
    <Suspense fallback={<div role="status" aria-label="Abriendo la Gran Sala" className="h-96 animate-titilar rounded-3xl bg-velo/50" />}>
      <Contenido />
    </Suspense>
  );
}
