/* Las portadas son imágenes propias servidas por /api/portadas: next/image no aporta (sin optimizador remoto). */
/* eslint-disable @next/next/no-img-element */
import type { LibroResumen } from "@/modules/archivo/tipos";

type DatosPortada = Pick<LibroResumen, "id" | "titulo" | "autores" | "portadaVersion">;

/** Fondos de las tapas sin imagen. Solo colores de la paleta oficial; se elige por el id del libro (estable). */
const TAPAS = [
  { fondo: "linear-gradient(160deg, #512d47, #2e182f)", texto: "#fcf8f2", borde: "#ae7a7e" },
  { fondo: "linear-gradient(160deg, #ae7a7e, #512d47)", texto: "#fcf8f2", borde: "#f2c7a2" },
  { fondo: "linear-gradient(160deg, #f2c7a2, #ae7a7e)", texto: "#2e182f", borde: "#2e182f" },
  { fondo: "linear-gradient(160deg, #2e182f, #512d47)", texto: "#f2c7a2", borde: "#f2c7a2" },
] as const;

function indiceTapa(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % TAPAS.length;
}

/**
 * Portada real del libro. Si la persona no cargó una, se dibuja una tapa tipográfica con el título y el autor
 * reales (no se inventan ni se sortean portadas ajenas).
 */
export function PortadaLibro({ libro, className = "", compacta = false }: { libro: DatosPortada; className?: string; compacta?: boolean }) {
  if (libro.portadaVersion > 0) {
    return (
      <img
        src={`/api/portadas/${libro.id}?v=${libro.portadaVersion}`}
        alt={`Portada de ${libro.titulo}`}
        loading="lazy"
        decoding="async"
        className={`aspect-[2/3] w-full rounded-[3px] bg-velo object-cover ${className}`}
      />
    );
  }
  const tapa = TAPAS[indiceTapa(libro.id)];
  return (
    <div
      role="img"
      aria-label={`Libro sin portada: ${libro.titulo}`}
      className={`flex aspect-[2/3] w-full flex-col items-center justify-between rounded-[3px] p-[9%] text-center ${className}`}
      style={{ background: tapa.fondo, color: tapa.texto, boxShadow: `inset 0 0 0 1px ${tapa.borde}55` }}
    >
      <span aria-hidden="true" className="h-px w-1/3" style={{ background: tapa.borde }} />
      <span className={`font-marca leading-tight ${compacta ? "line-clamp-4 text-[0.5rem]" : "line-clamp-4 text-[clamp(0.7rem,1.1vw+0.45rem,1.15rem)]"}`}>{libro.titulo}</span>
      {compacta ? (
        <span aria-hidden="true" className="h-px w-1/3" style={{ background: tapa.borde }} />
      ) : (
        <span className="line-clamp-2 text-[clamp(0.55rem,0.6vw+0.4rem,0.75rem)] uppercase tracking-[0.12em] opacity-80">
          {libro.autores[0] ?? ""}
        </span>
      )}
    </div>
  );
}
