"use client";

import { useEffect, useRef, useState } from "react";
import { MotorAmbiente } from "@/lib/audio/ambiente";

const CLAVE = "umbral-musica";
type Estado = "espera" | "sonando" | "silencio";

function guardar(v: "on" | "off") {
  try {
    localStorage.setItem(CLAVE, v);
  } catch {
    /* sin almacenamiento: no se recuerda la preferencia */
  }
}

/**
 * Música tranquila de la bienvenida. El navegador no deja sonar nada hasta que la persona toca algo, así que arranca
 * con el primer toque en cualquier lugar (salvo que la haya silenciado antes) y hay un botón para apagarla o prenderla.
 */
export function MusicaAmbiente() {
  const motor = useRef<MotorAmbiente | null>(null);
  const arrancar = useRef<() => Promise<void>>(async () => {});
  const [estado, setEstado] = useState<Estado>("espera");

  useEffect(() => {
    const m = new MotorAmbiente();
    motor.current = m;
    let activo = true;

    arrancar.current = async () => {
      try {
        await m.iniciar();
        if (activo) setEstado("sonando");
      } catch {
        if (activo) setEstado("silencio");
      }
    };

    function quitarEscucha() {
      window.removeEventListener("pointerdown", alToque);
      window.removeEventListener("keydown", alToque);
    }
    function alToque(e: Event) {
      if ((e.target as HTMLElement | null)?.closest("[data-musica]")) return;
      quitarEscucha();
      guardar("on");
      void arrancar.current();
    }

    const t = window.setTimeout(() => {
      let pref: string | null = null;
      try {
        pref = localStorage.getItem(CLAVE);
      } catch {
        /* sin almacenamiento */
      }
      if (pref === "off") {
        setEstado("silencio");
        return;
      }
      window.addEventListener("pointerdown", alToque);
      window.addEventListener("keydown", alToque);
    }, 0);

    return () => {
      activo = false;
      window.clearTimeout(t);
      quitarEscucha();
      m.detener();
    };
  }, []);

  function alternar() {
    const m = motor.current;
    if (!m) return;
    if (m.sonando) {
      m.detener();
      guardar("off");
      setEstado("silencio");
    } else {
      guardar("on");
      void arrancar.current();
    }
  }

  const sonando = estado === "sonando";
  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-3" data-musica>
      {estado === "espera" && <p className="hidden rounded-full bg-noche/80 px-3 py-1.5 text-xs text-texto-suave backdrop-blur sm:block">Tocá en cualquier lugar para escuchar música</p>}
      <button
        type="button"
        onClick={alternar}
        aria-pressed={sonando}
        aria-label={sonando ? "Silenciar la música" : "Activar la música"}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-durazno/60 bg-noche/80 px-4 text-sm text-durazno backdrop-blur transition hover:bg-durazno/15"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4z" />
          {sonando ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
        </svg>
        <span>{sonando ? "Música" : "Sin música"}</span>
      </button>
    </div>
  );
}
