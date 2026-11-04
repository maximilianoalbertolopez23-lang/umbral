import { Suspense } from "react";
import { PantallaCarga } from "@/components/carga/PantallaCarga";
import { MundoProtegido } from "@/components/mundo/MundoProtegido";

export default function MundoLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PantallaCarga mensaje="Abriendo la biblioteca…" />}>
      <MundoProtegido>{children}</MundoProtegido>
    </Suspense>
  );
}
