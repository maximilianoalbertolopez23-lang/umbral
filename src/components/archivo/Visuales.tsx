import { ETIQUETA_ESTADO, type Estado } from "@/modules/archivo/tipos";

/** Calificación de 1 a 5 (solo lectura). */
export function Estrellas({ valor, className = "" }: { valor: number | null; className?: string }) {
  if (!valor) return <span className={`text-sm text-malva ${className}`}>Sin calificar</span>;
  return (
    <span role="img" aria-label={`${valor} de 5`} className={`inline-flex gap-0.5 text-durazno ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill={n <= valor ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
          <path d="m10 1.8 2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8L10 1.8Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

const COLOR_ESTADO: Record<Estado, string> = {
  quiero_leer: "border-malva/60 text-texto-suave",
  leyendo: "border-durazno bg-durazno/15 text-durazno",
  terminado: "border-marfil/50 bg-marfil/10 text-marfil",
  pausado: "border-malva bg-malva/15 text-marfil",
  abandonado: "border-malva/40 text-malva",
};

export function InsigniaEstado({ estado }: { estado: Estado }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${COLOR_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

/** Barra de progreso accesible. `porcentaje` null = no se conocen las páginas totales. */
export function BarraProgreso({ porcentaje, className = "" }: { porcentaje: number | null; className?: string }) {
  if (porcentaje === null) return null;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      aria-label="Progreso de lectura"
      className={`h-1.5 overflow-hidden rounded-full bg-ciruela/70 ${className}`}
    >
      <div className="h-full rounded-full bg-durazno transition-[width] duration-500" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}
