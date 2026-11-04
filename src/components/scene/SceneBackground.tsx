"use client";

import { useState } from "react";
import { SCENES, type SceneId } from "@/config/sceneRegistry";

/**
 * Fondo ilustrado de una escena. Mantiene la proporción (object-fit: cover con el recorte propio de cada escena) y, si la
 * imagen falla, no muestra nada: el contenedor conserva su degradado de marca y la interfaz sigue funcionando.
 */
export function SceneBackground({ id, className = "", priority = false, decorativo = true }: { id: SceneId; className?: string; priority?: boolean; decorativo?: boolean }) {
  const [fallo, setFallo] = useState(false);
  const s = SCENES[id];
  if (fallo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={s.src}
      alt={decorativo ? "" : s.alt}
      width={s.ancho}
      height={s.alto}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={{ objectPosition: s.objectPosition }}
      onError={() => setFallo(true)}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
