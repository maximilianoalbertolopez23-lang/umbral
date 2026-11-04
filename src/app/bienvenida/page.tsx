import type { Metadata } from "next";
import { Suspense } from "react";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { FondoPortal } from "@/components/escena/FondoPortal";
import { requerirOnboardingPendiente } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Bienvenida, Guardiana" };

async function Contenido() {
  const estado = await requerirOnboardingPendiente();
  return (
    <Onboarding
      pasoInicial={estado.paso === "completo" ? "guardiana" : estado.paso}
      guardiana={estado.guardianaNombre ?? ""}
      biblioteca={estado.bibliotecaNombre ?? ""}
      apariencia={estado.apariencia ?? ""}
    />
  );
}

export default function Page() {
  return (
    <FondoPortal imagen="03_invitacion_identidad">
      <main id="contenido" className="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center px-5 py-12">
        <Suspense fallback={<p className="font-marca text-2xl text-texto-suave">Abriendo el portal…</p>}>
          <Contenido />
        </Suspense>
      </main>
    </FondoPortal>
  );
}
