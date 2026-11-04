import Link from "next/link";
import { CapaDecoracion } from "@/components/sala/objetos";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { ZONAS_SALA, resolverMateriales, type DisenoSala, type Sala } from "@/modules/taller/sala";

export type Estancia = Exclude<Sala, "gran-sala">;

/** Cada estancia lleva su ilustración pintada y los objetos que la persona colocó allí. Es decorativa: la navegación real es el enlace a la Sala. */
export function VistaEstancia({ estancia, diseno }: { estancia: Estancia; libros?: { id: string }[]; diseno?: DisenoSala }) {
  const { escena, nombre } = ZONAS_SALA[estancia];
  return (
    <div className="estancia mb-8">
      <SceneBackground id={escena} />
      {diseno && <CapaDecoracion objetos={diseno.objetos} sala={estancia} filtro={resolverMateriales(diseno).filtroDecoracion} />}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ciruela/70 via-transparent to-transparent" />
      <p className="sr-only">{nombre}, ilustración</p>
      <Link
        href="/sala"
        className="absolute right-3 top-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-durazno/50 bg-noche/85 px-4 text-sm text-durazno backdrop-blur transition hover:border-durazno hover:bg-noche"
      >
        <span aria-hidden="true">←</span> Gran Sala
      </Link>
    </div>
  );
}
