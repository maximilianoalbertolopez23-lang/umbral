"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { guardarMovimientoAction } from "@/app/(mundo)/taller/actions";
import { Aviso } from "@/components/auth/formulario";
import type { Movimiento } from "@/modules/sala/repositorio";

const OPCIONES = [
  ["sistema", "Seguir a mi dispositivo", "Animaciones normales, salvo que tu sistema pida reducirlas."],
  ["si", "Reducir siempre", "Sin parpadeo de velas, sin parallax y sin transiciones animadas."],
] as const;

export function MovimientoPanel({ movimiento }: { movimiento: Movimiento }) {
  const [estado, enviar, pendiente] = useActionState(guardarMovimientoAction, {} as EstadoForm);
  return (
    <form action={enviar} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Preferencia de movimiento</legend>
        {OPCIONES.map(([valor, titulo, ayuda]) => (
          <label key={valor} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-malva/40 bg-noche/60 p-3 has-[:checked]:border-durazno has-[:checked]:bg-morado/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-durazno">
            <input type="radio" name="movimiento" value={valor} defaultChecked={movimiento === "si" ? valor === "si" : valor === "sistema"} className="mt-1 accent-[#f2c7a2]" />
            <span>
              <span className="block text-marfil">{titulo}</span>
              <span className="block text-sm text-texto-suave">{ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pendiente} className="inline-flex min-h-11 items-center justify-center rounded-full bg-durazno px-6 text-sm font-medium text-ciruela transition hover:bg-marfil disabled:opacity-60">
        {pendiente ? "Guardando…" : "Guardar movimiento"}
      </button>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {estado.ok && estado.info && <Aviso tipo="info">{estado.info}</Aviso>}
    </form>
  );
}
