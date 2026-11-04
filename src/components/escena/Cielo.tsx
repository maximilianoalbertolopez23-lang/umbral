/** Destellos de cuatro puntas, fieles al motivo de las estrellas del logo. Posiciones fijas (sin azar: sin diferencias SSR). */
const ESTRELLAS = [
  { x: 12, y: 14, s: 14, d: 0 },
  { x: 24, y: 32, s: 8, d: 1.2 },
  { x: 38, y: 9, s: 10, d: 2.4 },
  { x: 71, y: 12, s: 12, d: 0.6 },
  { x: 84, y: 28, s: 8, d: 1.8 },
  { x: 91, y: 8, s: 10, d: 3 },
  { x: 6, y: 46, s: 8, d: 2.1 },
  { x: 56, y: 22, s: 7, d: 0.3 },
] as const;

export function Estrellas() {
  return (
    <div className="absolute inset-0">
      {ESTRELLAS.map((e, i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          width={e.s}
          height={e.s}
          className="absolute animate-titilar fill-marfil"
          style={{ left: `${e.x}%`, top: `${e.y}%`, animationDelay: `${e.d}s` }}
        >
          <path d="M5 0c0 2.8-2.2 5-5 5 2.8 0 5 2.2 5 5 0-2.8 2.2-5 5-5-2.8 0-5-2.2-5-5Z" />
        </svg>
      ))}
    </div>
  );
}

/** Siluetas de montañas, solo atmósfera. Dos planos para dar profundidad. */
export function Montanas({ plano }: { plano: "lejano" | "cercano" }) {
  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-full w-full"
      aria-hidden="true"
    >
      {plano === "lejano" ? (
        <path
          d="M0 220 160 150 290 200 430 110 560 190 700 120 840 200 990 100 1130 180 1280 130 1440 200V320H0Z"
          fill="#512d47"
          fillOpacity="0.55"
        />
      ) : (
        <path
          d="M0 270 140 210 260 255 410 180 540 250 690 200 830 262 980 190 1120 255 1270 215 1440 262V320H0Z"
          fill="#2e182f"
        />
      )}
    </svg>
  );
}
