import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { variablesFaltantes } from "@/lib/config";

export function TarjetaAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-5 py-12">
      <Link href="/" aria-label="UMBRAL, inicio" className="animate-aparecer">
        <Logo variante="marca" alto={150} priority className="h-auto w-32" />
      </Link>
      <div className="t-pergamino mt-6 w-full rounded-3xl border border-malva/30 bg-noche/80 p-6 shadow-2xl shadow-black/30 backdrop-blur [animation-delay:150ms] sm:p-8">
        <h1 className="font-marca text-3xl text-marfil">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-[0.95rem] leading-relaxed text-texto-suave">{subtitulo}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

async function AvisoSinConfigurar() {
  const faltan = variablesFaltantes();
  if (!faltan.length) return null;
  return (
    <div role="alert" className="mb-5 rounded-xl border border-durazno/50 bg-durazno/10 p-4 text-sm leading-relaxed text-marfil">
      <p className="font-medium text-durazno">El servicio de cuentas no está conectado.</p>
      <p className="mt-1">
        Faltan en <code>.env.local</code>: <code>{faltan.join(", ")}</code>. Los pasos están en{" "}
        <code>docs/CONFIGURACION.md</code>. Mientras tanto, los formularios están deshabilitados.
      </p>
    </div>
  );
}

/** Se lee la config en tiempo de petición (no se congela en el build). */
export function AvisoConfiguracion() {
  return (
    <Suspense fallback={null}>
      <AvisoSinConfigurar />
    </Suspense>
  );
}
