import type { Metadata } from "next";
import { HabitacionPendiente } from "@/components/mundo/HabitacionPendiente";
import { getModulo } from "@/modules/registry";

const modulo = getModulo("portales");
export const metadata: Metadata = { title: modulo.titulo };

export default function Page() {
  return <HabitacionPendiente modulo={modulo} />;
}
