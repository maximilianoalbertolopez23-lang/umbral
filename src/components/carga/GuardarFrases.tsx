"use client";

import { useEffect } from "react";
import { CLAVE_FRASES, type Frase } from "@/modules/frases/frases";

/** Deja las citas de la persona en el navegador para que cualquier pantalla de carga las muestre al instante. */
export function GuardarFrases({ frases }: { frases: Frase[] }) {
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_FRASES, JSON.stringify(frases.map(({ texto, autor }) => ({ texto, autor }))));
    } catch {
      /* sin almacenamiento: las pantallas de carga usan las frases generales */
    }
  }, [frases]);
  return null;
}
