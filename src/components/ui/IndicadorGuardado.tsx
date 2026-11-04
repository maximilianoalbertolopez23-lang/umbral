import type { EstadoGuardado } from "@/modules/escritorio/autoguardado";

const TEXTO_ESTADO: Record<EstadoGuardado, string> = {
  guardado: "Guardado",
  pendiente: "Cambios sin guardar…",
  guardando: "Guardando…",
  reintentando: "Sin conexión, reintentando…",
  error: "No se pudo guardar",
  conflicto: "Conflicto de versiones",
};

/** Estado del autoguardado, siempre visible y anunciado a lectores de pantalla. */
export function IndicadorGuardado({ estado, detalle, alReintentar }: { estado: EstadoGuardado; detalle: string; alReintentar: () => void }) {
  const color = estado === "guardado" ? "text-texto-suave" : estado === "error" || estado === "conflicto" ? "text-[#f5b5b5]" : "text-durazno";
  return (
    <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${color}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${estado === "guardado" ? "bg-marfil/60" : estado === "error" || estado === "conflicto" ? "bg-[#f0a3a3]" : "animate-titilar bg-durazno"}`} />
      {TEXTO_ESTADO[estado]}
      {estado === "error" && (
        <button type="button" onClick={alReintentar} className="underline underline-offset-4">
          Reintentar
        </button>
      )}
      {detalle && estado !== "guardado" && <span className="sr-only">{detalle}</span>}
    </p>
  );
}
