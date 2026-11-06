"use client";

import { JUEGO_ACTIVO, RUTA_INICIO } from "@/lib/juego";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { FONDOS_CARGA } from "@/config/sceneRegistry";
import { CLAVE_FRASES, FRASES_GENERALES, frasesGuardadas, mezclar, type Frase } from "@/modules/frases/frases";

const ROTACION_MS = 6000;
const LENTO_MS = 12000;

function leerPropias(): Frase[] {
  try {
    const crudo = localStorage.getItem(CLAVE_FRASES);
    return crudo ? frasesGuardadas(JSON.parse(crudo)) : [];
  } catch {
    return [];
  }
}

/**
 * Pantalla de carga: fondo ilustrado (uno distinto cada vez), logo oficial, barra indeterminada (no hay un porcentaje
 * real que mostrar, así que no se inventa) y frases sobre leer, sobre todo las citas del journal de la persona.
 * Aparece recién a los 250 ms (CSS), así que una carga rápida no deja ningún destello.
 */
export function PantallaCarga({ mensaje = "Preparando la biblioteca…" }: { mensaje?: string }) {
  const [fondo, setFondo] = useState(0);
  const [frases, setFrases] = useState<Frase[]>(() => [...FRASES_GENERALES]);
  const [i, setI] = useState(0);
  const [lento, setLento] = useState(false);

  // Se elige después de montar (no durante el render) para que servidor y navegador coincidan.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const lista = mezclar(leerPropias());
      setFondo(Math.floor(Math.random() * FONDOS_CARGA.length));
      setFrases(lista);
      setI(Math.floor(Math.random() * lista.length));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const rota = window.setInterval(() => setI((n) => n + 1), ROTACION_MS);
    const tarda = window.setTimeout(() => setLento(true), LENTO_MS);
    return () => {
      window.clearInterval(rota);
      window.clearTimeout(tarda);
    };
  }, []);

  const frase = frases[i % frases.length];

  return (
    <div role="status" aria-label="Cargando" className="carga-pantalla fixed inset-0 z-[60] overflow-hidden bg-ciruela">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FONDOS_CARGA[fondo]} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ciruela via-ciruela/55 to-ciruela/10" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-[7svh] text-center">
        <Logo variante="marca" alto={78} decorativo />
        <div className="carga-barra mt-5 h-3.5 w-[min(34rem,80vw)] overflow-hidden rounded-full border border-durazno/70 bg-black/45" aria-hidden="true">
          <span className="block h-full w-1/3 rounded-full bg-gradient-to-r from-durazno/70 via-durazno to-durazno/70" />
        </div>
        <p className="mt-3 text-sm text-marfil/90">{mensaje}</p>
        <figure key={i} className="carga-frase mt-5 max-w-2xl" aria-hidden="true">
          <blockquote className="font-marca text-xl italic leading-snug text-marfil sm:text-2xl">«{frase.texto}»</blockquote>
          {(frase.autor || frase.propia) && (
            <figcaption className="mt-1.5 text-xs uppercase tracking-[0.16em] text-durazno">
              {frase.autor ? `— ${frase.autor}` : "De tu journal"}
            </figcaption>
          )}
        </figure>
        {lento && (
          <div className="mt-6 space-y-3 rounded-2xl border border-malva/40 bg-noche/80 px-5 py-4">
            <p className="text-sm text-marfil">Está tardando más de lo normal. Tus datos están a salvo.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-durazno px-5 text-sm font-medium text-ciruela hover:bg-marfil">
                Reintentar
              </button>
              <a href={RUTA_INICIO} className="inline-flex min-h-11 items-center rounded-full border border-durazno/60 px-5 text-sm text-durazno hover:bg-durazno/10">
                {JUEGO_ACTIVO ? "Ir a la Gran Sala" : "Ir al inicio"}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
