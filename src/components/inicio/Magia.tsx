import type { CSSProperties } from "react";

/** Las palabras aparecen una a una, desde la bruma, con un resplandor durazno (y un destello que las recorre al final). */
export function TextoMagico({ texto, retrasoMs = 0, pasoMs = 150, className }: { texto: string; retrasoMs?: number; pasoMs?: number; className?: string }) {
  const palabras = texto.split(" ");
  return (
    <span className={className}>
      {palabras.map((p, i) => (
        <span key={i}>
          <span className="m-palabra" style={{ "--d": `${retrasoMs + i * pasoMs}ms`, "--p": `${retrasoMs + palabras.length * pasoMs + 900 + i * 170}ms` } as CSSProperties}>
            {p}
          </span>
          {i < palabras.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

// Posiciones fijas (sin azar: el servidor y el navegador deben coincidir).
const CHISPAS = Array.from({ length: 34 }, (_, i) => {
  const a = (i * 37) % 100;
  const b = (i * 53 + 17) % 100;
  return {
    left: `${a}%`,
    top: `${30 + (b % 65)}%`,
    s: `${2 + ((i * 7) % 4)}px`,
    d: `${((i * 13) % 90) / 10}s`,
    t: `${6 + ((i * 11) % 7)}s`,
    dx: `${((i * 19) % 40) - 20}px`,
    dy: `${-(50 + ((i * 23) % 70))}px`,
    o: 0.5 + ((i * 29) % 5) / 10,
  };
});

/** Motas de luz doradas que suben despacio, como polvo en un rayo de sol. */
export function ChispasMagicas() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden">
      {CHISPAS.map((c, i) => (
        <span key={i} className="m-chispa" style={{ left: c.left, top: c.top, "--s": c.s, "--d": c.d, "--t": c.t, "--dx": c.dx, "--dy": c.dy, "--o": c.o } as CSSProperties} />
      ))}
    </div>
  );
}
