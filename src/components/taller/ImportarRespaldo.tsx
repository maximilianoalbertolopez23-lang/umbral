"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROTULOS: Record<string, string> = {
  libros: "libros", lecturas: "lecturas", sesiones_lectura: "sesiones de lectura", portadas: "portadas",
  diario_paginas: "páginas del journal", diario_imagenes: "imágenes", plantillas_journal: "plantillas", disenos_sala: "diseño de la sala",
};

interface Resumen { nuevos: Record<string, number>; yaEstaban: Record<string, number>; omitidos: string[] }

/** Importación de un respaldo propio: solo suma lo que falta, nunca borra ni pisa. */
export function ImportarRespaldo() {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const archivo = entrada.current?.files?.[0];
    if (!archivo) return setError("Elegí un archivo de respaldo.");
    setTrabajando(true);
    setError(null);
    setResumen(null);
    try {
      const datos = new FormData();
      datos.set("respaldo", archivo);
      const r = await fetch("/api/importar", { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "No pudimos importar el respaldo.");
      else {
        setResumen(j);
        router.refresh();
      }
    } catch {
      setError("No pudimos importar el respaldo. Probá de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  const agregados = resumen ? Object.entries(resumen.nuevos).filter(([, n]) => n > 0) : [];

  return (
    <form onSubmit={enviar} className="mt-6 max-w-2xl">
      <label htmlFor="respaldo" className="block text-texto-suave">Recuperar desde un respaldo (solo agrega lo que falta; no borra ni pisa nada)</label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input id="respaldo" ref={entrada} type="file" accept="application/json,.json" className="min-h-11 text-sm text-texto-suave file:mr-3 file:min-h-11 file:rounded-full file:border file:border-malva file:bg-transparent file:px-4 file:text-marfil" />
        <button type="submit" disabled={trabajando} className="min-h-11 rounded-full border border-durazno px-5 text-durazno transition hover:bg-durazno hover:text-ciruela disabled:opacity-50">
          {trabajando ? "Importando…" : "Importar respaldo"}
        </button>
      </div>
      <div role="status" aria-live="polite" className="mt-3 text-sm">
        {error && <p className="text-durazno">{error}</p>}
        {resumen && (
          <div className="text-marfil">
            <p>{agregados.length ? `Se agregó: ${agregados.map(([k, n]) => `${n} ${ROTULOS[k] ?? k}`).join(", ")}.` : "No había nada nuevo para agregar: ya tenías todo."}</p>
            {resumen.omitidos.map((o) => <p key={o} className="text-texto-suave">{o}</p>)}
          </div>
        )}
      </div>
    </form>
  );
}
