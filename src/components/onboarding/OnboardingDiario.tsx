"use client";

import { useActionState } from "react";
import { comenzarDiario } from "@/app/bienvenida/actions";
import { Aviso, BotonEnvio, Campo, type EstadoForm } from "@/components/auth/formulario";

/** Bienvenida del diario de lectura: dos datos y a leer. */
export function OnboardingDiario({ nombre, biblioteca }: { nombre: string; biblioteca: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(comenzarDiario, {});
  return (
    <form action={accion} className="w-full space-y-6">
      <header className="text-center">
        <h1 className="font-marca text-3xl leading-tight text-marfil sm:text-4xl">Bienvenida a tu diario de lectura</h1>
        <p className="mt-3 text-texto-suave">Dos datos y empezás a cargar tus libros.</p>
      </header>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Campo nombre="nombre" etiqueta="¿Cómo te llamamos?" error={estado.campos?.nombre} valorInicial={estado.valores?.nombre ?? nombre} maxLength={40} autoComplete="given-name" autoFocus />
      <Campo nombre="biblioteca" etiqueta="Nombre de tu biblioteca" error={estado.campos?.biblioteca} valorInicial={estado.valores?.biblioteca ?? biblioteca} maxLength={60} />
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Empezar
      </BotonEnvio>
    </form>
  );
}
