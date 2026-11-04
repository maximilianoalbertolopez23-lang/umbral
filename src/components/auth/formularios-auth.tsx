"use client";

import Link from "next/link";
import { ingresar, recuperar, registrar, restablecer } from "@/app/(auth)/actions";
import { esquemaIngreso, esquemaRecuperar, esquemaRegistro, esquemaRestablecer } from "@/lib/validacion";
import { Aviso, BotonEnvio, Campo, useFormularioValidado } from "./formulario";

const enlace = "text-durazno underline-offset-4 hover:underline";

export function FormularioIngreso({ siguiente, deshabilitado }: { siguiente?: string; deshabilitado?: boolean }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaIngreso, ingresar);
  return (
    <form {...formProps} className="space-y-5">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <input type="hidden" name="siguiente" value={siguiente ?? ""} />
      <fieldset disabled={deshabilitado} className="space-y-5">
        <Campo nombre="correo" etiqueta="Correo" tipo="email" autoComplete="email" error={errores.correo} valorInicial={estado.valores?.correo} />
        <Campo nombre="contrasena" etiqueta="Contraseña" tipo="password" autoComplete="current-password" error={errores.contrasena} />
        <BotonEnvio pendiente={pendiente} pendienteTexto="Abriendo la puerta…">
          Ingresar
        </BotonEnvio>
      </fieldset>
      <p className="flex flex-wrap justify-between gap-2 text-sm text-texto-suave">
        <Link href="/recuperar" className={enlace}>
          Olvidé mi contraseña
        </Link>
        <span>
          ¿Primera vez?{" "}
          <Link href="/registro" className={enlace}>
            Crear cuenta
          </Link>
        </span>
      </p>
    </form>
  );
}

export function FormularioRegistro({ deshabilitado }: { deshabilitado?: boolean }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaRegistro, registrar);
  if (estado.ok) {
    return (
      <div className="space-y-5">
        <Aviso tipo="info">{estado.info}</Aviso>
        <p className="text-sm text-texto-suave">
          ¿Ya confirmaste?{" "}
          <Link href="/ingresar" className={enlace}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    );
  }
  return (
    <form {...formProps} className="space-y-5">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <fieldset disabled={deshabilitado} className="space-y-5">
        <Campo nombre="correo" etiqueta="Correo" tipo="email" autoComplete="email" error={errores.correo} valorInicial={estado.valores?.correo} />
        <Campo
          nombre="contrasena"
          etiqueta="Contraseña"
          tipo="password"
          autoComplete="new-password"
          error={errores.contrasena}
          ayuda="Al menos 8 caracteres."
        />
        <Campo nombre="confirmacion" etiqueta="Repetí la contraseña" tipo="password" autoComplete="new-password" error={errores.confirmacion} />
        <BotonEnvio pendiente={pendiente} pendienteTexto="Forjando tu llave…">
          Crear cuenta
        </BotonEnvio>
      </fieldset>
      <p className="text-sm text-texto-suave">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className={enlace}>
          Ingresar
        </Link>
      </p>
    </form>
  );
}

export function FormularioRecuperar({ deshabilitado }: { deshabilitado?: boolean }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaRecuperar, recuperar);
  if (estado.ok) {
    return (
      <div className="space-y-5">
        <Aviso tipo="info">{estado.info}</Aviso>
        <Link href="/ingresar" className={`${enlace} text-sm`}>
          Volver a ingresar
        </Link>
      </div>
    );
  }
  return (
    <form {...formProps} className="space-y-5">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <fieldset disabled={deshabilitado} className="space-y-5">
        <Campo nombre="correo" etiqueta="Correo de tu cuenta" tipo="email" autoComplete="email" error={errores.correo} valorInicial={estado.valores?.correo} />
        <BotonEnvio pendiente={pendiente} pendienteTexto="Enviando…">
          Enviar enlace
        </BotonEnvio>
      </fieldset>
      <Link href="/ingresar" className={`${enlace} text-sm`}>
        Volver a ingresar
      </Link>
    </form>
  );
}

export function FormularioRestablecer({ token }: { token: string }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaRestablecer, restablecer);
  return (
    <form {...formProps} className="space-y-5">
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <input type="hidden" name="token" value={token} />
      <Campo nombre="contrasena" etiqueta="Contraseña nueva" tipo="password" autoComplete="new-password" error={errores.contrasena} ayuda="Al menos 8 caracteres." />
      <Campo nombre="confirmacion" etiqueta="Repetila" tipo="password" autoComplete="new-password" error={errores.confirmacion} />
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Guardar contraseña
      </BotonEnvio>
    </form>
  );
}
