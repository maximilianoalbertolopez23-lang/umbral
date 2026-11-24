"use client";

import { usePathname } from "next/navigation";

/** Efecto de entrada según la ruta de destino (T04–T08 del storyboard). Solo CSS: no bloquea teclado ni guardado. */
export function claseTransicionJuego(ruta: string): string {
  if (ruta === "/sala") return "t-retorno";
  if (ruta === "/archivo") return "t-zoom";
  if (/^\/archivo\/[^/]+$/.test(ruta)) return "t-elevar";
  if (ruta.startsWith("/escritorio/libro/") || ruta.startsWith("/escritorio/pagina/")) return "t-libro";
  if (ruta.startsWith("/taller")) return "t-panel";
  if (ruta === "/torre") return "t-zoom";
  return "animate-aparecer";
}

/** Sin transiciones: las pantallas cambian de golpe (decisión de diseño de la Biblioteca Viva). */
export function claseTransicion(): string {
  return "";
}

export function TransicionRuta({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return (
    <div key={ruta} className={claseTransicion()}>
      {children}
    </div>
  );
}
