"use client";

import { useRef } from "react";

/**
 * Contenedor de escena por capas (base de la experiencia 2.5D).
 * Publica la posición del puntero como --mx / --my (-0.5…0.5); cada <Capa> se desplaza
 * proporcionalmente a su profundidad. Con prefers-reduced-motion el desplazamiento se anula (globals.css).
 */
export function Escena({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function alMover(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    ref.current.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }

  function alSalir() {
    ref.current?.style.setProperty("--mx", "0");
    ref.current?.style.setProperty("--my", "0");
  }

  return (
    <div ref={ref} onPointerMove={alMover} onPointerLeave={alSalir} className={className}>
      {children}
    </div>
  );
}

/** Capa de profundidad: `profundidad` en px de desplazamiento máximo (negativo = se mueve al revés). */
export function Capa({
  profundidad,
  className,
  children,
  decorativa = true,
}: {
  profundidad: number;
  className?: string;
  children?: React.ReactNode;
  /** false = la capa contiene elementos interactivos y no debe ocultarse a lectores de pantalla. */
  decorativa?: boolean;
}) {
  return (
    <div
      data-parallax
      aria-hidden={decorativa ? "true" : undefined}
      className={`transition-transform duration-300 ease-out will-change-transform ${className ?? ""}`}
      style={{
        transform: `translate3d(calc(var(--mx, 0) * ${profundidad}px), calc(var(--my, 0) * ${profundidad}px), 0)`,
      }}
    >
      {children}
    </div>
  );
}
