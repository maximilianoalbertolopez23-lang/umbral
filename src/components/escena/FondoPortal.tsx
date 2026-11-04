import type { SceneId } from "@/config/sceneRegistry";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { Escena } from "./Escena";

/** Fondo pintado compartido por el ingreso y el onboarding (la puerta de la biblioteca), oscurecido para que el texto se lea. */
export function FondoPortal({ children, className, imagen = "02_portal_de_ingreso" }: { children: React.ReactNode; className?: string; imagen?: SceneId }) {
  return (
    <Escena className={`relative isolate min-h-svh overflow-hidden ${className ?? ""}`}>
      <SceneBackground id={imagen} className="-z-20" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_45%,rgba(46,24,47,0.55),rgba(46,24,47,0.82))]" />
      {children}
    </Escena>
  );
}
