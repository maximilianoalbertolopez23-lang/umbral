import type { Metadata } from "next";
import { HabitacionPendiente } from "@/components/mundo/HabitacionPendiente";
import { getModulo } from "@/modules/registry";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

const modulo = getModulo("portales");
export const metadata: Metadata = { title: modulo.titulo };

export default function Page() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return <HabitacionPendiente modulo={modulo} />;
}
