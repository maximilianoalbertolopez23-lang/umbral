import Link from "next/link";
import { salir } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/Logo";
import { NavInferior, NavLateral } from "@/components/mundo/NavMundo";
import { TransicionRuta } from "@/components/mundo/TransicionRuta";
import { GuardarFrases } from "@/components/carga/GuardarFrases";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerCitasParaCarga } from "@/modules/escritorio/repositorio";

function BotonSalir({ className }: { className?: string }) {
  return (
    <form action={salir}>
      <button type="submit" className={`text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline ${className ?? ""}`}>
        Cerrar sesión
      </button>
    </form>
  );
}

/** Shell del mundo privado. Exige sesión y onboarding completo; si no, redirige (ver dal.ts). */
export async function MundoProtegido({ children }: { children: React.ReactNode }) {
  const guardiana = await requerirGuardiana();
  // Las citas del journal alimentan las pantallas de carga; si algo falla, se usan las frases generales.
  const citas = await conUsuario(guardiana.userId, (db) => obtenerCitasParaCarga(db, guardiana.userId)).catch(() => []);
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[17rem_1fr]" data-movimiento={guardiana.movimiento}>
      <aside className="hidden border-r border-malva/25 bg-noche lg:block">
        <div className="sticky top-0 flex h-svh flex-col gap-8 px-4 py-6">
          <Link href="/" aria-label="UMBRAL, volver a la entrada" className="px-2">
            <Logo variante="vertical" alto={150} priority className="h-auto w-36" />
          </Link>
          <NavLateral />
          <div className="mt-auto space-y-1 px-3">
            <p className="font-marca text-lg leading-tight text-marfil">{guardiana.guardianaNombre}</p>
            <p className="text-xs leading-relaxed text-malva">{guardiana.bibliotecaNombre}</p>
            <BotonSalir className="pt-2" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        <header className="flex items-center justify-between border-b border-malva/25 bg-noche px-5 py-3 lg:hidden">
          <Link href="/" aria-label="UMBRAL, volver a la entrada">
            <Logo variante="horizontal" alto={32} priority />
          </Link>
          <BotonSalir />
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
          <TransicionRuta>{children}</TransicionRuta>
        </main>
      </div>

      <GuardarFrases frases={citas} />
      <NavInferior />
    </div>
  );
}
