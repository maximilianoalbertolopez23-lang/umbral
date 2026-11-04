"use client";

import { startTransition, useActionState, useId, useState, type FormEvent, type ReactNode } from "react";
import type { ZodType } from "zod";
import { erroresPorCampo } from "@/lib/validacion";

import type { EstadoForm } from "@/app/(auth)/actions";
export type { EstadoForm };

type Accion = (previo: EstadoForm, datos: FormData) => Promise<EstadoForm>;

/**
 * Valida en el cliente con el mismo esquema que usa el servidor (mensajes inmediatos),
 * y delega en la Server Action, que vuelve a validar: el cliente nunca es la barrera.
 */
export function useFormularioValidado(esquema: ZodType, accion: Accion, opciones: { conservar?: boolean } = {}) {
  const [estado, enviar, pendiente] = useActionState(accion, {} as EstadoForm);
  const [local, setLocal] = useState<Record<string, string>>({});

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    const resultado = esquema.safeParse(Object.fromEntries(datos));
    if (!resultado.success) {
      e.preventDefault();
      return setLocal(erroresPorCampo(resultado.error));
    }
    setLocal({});
    // "conservar": se envía sin que React vacíe el formulario (mantiene lo escrito y el archivo elegido si hay un error).
    if (opciones.conservar) {
      e.preventDefault();
      startTransition(() => enviar(datos));
    }
  }

  const errores = Object.keys(local).length ? local : (estado.campos ?? {});
  const formProps = opciones.conservar
    ? { onSubmit: alEnviar, noValidate: true }
    : { action: enviar, onSubmit: alEnviar, noValidate: true };
  return { estado, errores, pendiente, formProps };
}

interface CampoProps {
  nombre: string;
  etiqueta: string;
  tipo?: "text" | "email" | "password" | "date";
  autoComplete?: string;
  error?: string;
  valorInicial?: string;
  ayuda?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

export function Campo({ nombre, etiqueta, tipo = "text", error, valorInicial, ayuda, ...resto }: CampoProps) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-marfil">
        {etiqueta}
      </label>
      <input
        id={id}
        name={nombre}
        type={tipo}
        defaultValue={valorInicial}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? idError : "", ayuda ? idAyuda : ""].filter(Boolean).join(" ") || undefined}
        className="mt-1.5 block min-h-12 w-full rounded-xl border border-malva/50 bg-noche/70 px-4 text-base text-marfil placeholder:text-malva focus:border-durazno aria-[invalid=true]:border-[#f0a3a3]"
        {...resto}
      />
      {ayuda && !error && (
        <p id={idAyuda} className="mt-1.5 text-sm text-texto-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="mt-1.5 text-sm text-[#f5b5b5]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "error" | "info"; children: ReactNode }) {
  const estilos =
    tipo === "error"
      ? "border-[#f0a3a3]/50 bg-[#f0a3a3]/10 text-[#f8d0d0]"
      : "border-durazno/40 bg-durazno/10 text-marfil";
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${estilos}`}>
      {children}
    </p>
  );
}

export function BotonEnvio({ pendiente, children, pendienteTexto }: { pendiente: boolean; children: ReactNode; pendienteTexto: string }) {
  return (
    <button
      type="submit"
      disabled={pendiente}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-durazno px-7 text-[0.95rem] font-medium text-ciruela transition hover:bg-marfil disabled:cursor-wait disabled:opacity-70"
    >
      {pendiente ? pendienteTexto : children}
    </button>
  );
}
