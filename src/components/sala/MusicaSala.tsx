"use client";

import { useEffect, useRef, useState } from "react";
import { MotorAmbiente } from "@/lib/audio/ambiente";

const CLAVE = "umbral-musica-sala";

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "on";
  } catch {
    return false;
  }
}
function guardar(v: "on" | "off") {
  try {
    localStorage.setItem(CLAVE, v);
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
}

/** Música ambiente opcional de la sala: apagada por defecto. Si la dejaste prendida, vuelve con tu primer toque (el navegador no permite sonido antes). */
export function MusicaSala() {
  const motor = useRef<MotorAmbiente | null>(null);
  const [sonando, setSonando] = useState(false);

  useEffect(() => {
    const m = new MotorAmbiente();
    motor.current = m;
    let activo = true;
    const arrancar = async () => {
      try {
        await m.iniciar();
        if (activo) setSonando(true);
      } catch {
        if (activo) setSonando(false);
      }
    };
    const alToque = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest("[data-musica]")) return;
      quitar();
      void arrancar();
    };
    const quitar = () => {
      window.removeEventListener("pointerdown", alToque);
      window.removeEventListener("keydown", alToque);
    };
    const t = window.setTimeout(() => {
      if (leer()) {
        window.addEventListener("pointerdown", alToque);
        window.addEventListener("keydown", alToque);
      }
    }, 0);
    return () => {
      activo = false;
      window.clearTimeout(t);
      quitar();
      m.detener();
    };
  }, []);

  async function alternar() {
    const m = motor.current;
    if (!m) return;
    if (m.sonando) {
      m.detener();
      guardar("off");
      setSonando(false);
      return;
    }
    guardar("on");
    try {
      await m.iniciar();
      setSonando(true);
    } catch {
      setSonando(false);
    }
  }

  return (
    <button
      type="button"
      data-musica
      onClick={() => void alternar()}
      aria-pressed={sonando}
      className="min-h-11 rounded-full border border-durazno/60 px-5 text-sm text-durazno transition hover:bg-durazno/10"
    >
      {sonando ? "♪ Música: sí" : "♪ Música: no"}
    </button>
  );
}
