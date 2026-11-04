"use client";

import { useEffect, useState } from "react";

export interface Recompensa {
  titulo: string;
  xp: number;
  esencias: number;
}

/** Aviso suave y descartable (T09). Solo recibe recompensas ya registradas en la base; nunca inventa ninguna. */
export function AvisoLogro({ recompensas }: { recompensas: Recompensa[] }) {
  const [estado, setEstado] = useState<"visible" | "saliendo" | "cerrado">("visible");

  function cerrar() {
    setEstado("saliendo");
    window.setTimeout(() => setEstado("cerrado"), 250);
  }

  useEffect(() => {
    const t = window.setTimeout(cerrar, 9000);
    return () => window.clearTimeout(t);
  }, []);

  if (recompensas.length === 0 || estado === "cerrado") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-durazno/50 bg-noche p-4 text-marfil shadow-2xl shadow-black/50 lg:bottom-6 ${estado === "saliendo" ? "t-aviso-sale" : "t-aviso-entra"}`}
    >
      <p className="font-marca text-lg text-durazno">Algo se encendió en la Torre</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {recompensas.map((n) => (
          <li key={n.titulo}>
            {n.titulo} · +{n.xp} XP{n.esencias ? ` · +${n.esencias} Esencias` : ""}
          </li>
        ))}
      </ul>
      <button type="button" onClick={cerrar} className="mt-3 min-h-11 rounded-full border border-durazno/60 px-5 text-sm text-durazno hover:bg-durazno/10">
        Cerrar
      </button>
    </div>
  );
}
