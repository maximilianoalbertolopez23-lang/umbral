"use client";

import { useActionState, useState } from "react";
import { entrarEnLaSala, guardarApariencia, guardarBiblioteca, guardarGuardiana } from "@/app/bienvenida/actions";
import { Aviso, BotonEnvio, Campo, useFormularioValidado, type EstadoForm } from "@/components/auth/formulario";
import { Logo } from "@/components/brand/Logo";
import { esquemaApariencia, esquemaBiblioteca, esquemaGuardiana } from "@/lib/validacion";
import { APARIENCIAS } from "@/modules/onboarding/apariencias";

type Paso = "portal" | "relato" | "guardiana" | "biblioteca" | "apariencia" | "llaves";
const PASOS_FORMULARIO: Paso[] = ["guardiana", "biblioteca", "apariencia", "llaves"];

interface Props {
  /** Primer paso pendiente según la base de datos (nunca "completo": ese caso redirige en el servidor). */
  pasoInicial: "guardiana" | "biblioteca" | "apariencia" | "llaves";
  guardiana: string;
  biblioteca: string;
  apariencia: string;
}

const botonSecundario = "text-sm text-texto-suave underline-offset-4 hover:text-durazno hover:underline";
const titulo = "font-marca text-3xl leading-tight text-marfil sm:text-4xl";

export function Onboarding(props: Props) {
  // Quien aún no guardó nada ve el portal y el relato; quien retoma entra directo a su paso pendiente.
  const primeraVez = props.pasoInicial === "guardiana" && !props.guardiana;
  const [paso, setPaso] = useState<Paso>(primeraVez ? "portal" : props.pasoInicial);
  const [guardiana, setGuardiana] = useState(props.guardiana);
  const [biblioteca, setBiblioteca] = useState(props.biblioteca);
  const [apariencia, setApariencia] = useState(props.apariencia);

  const n = PASOS_FORMULARIO.indexOf(paso);
  return (
    <section aria-live="polite" className="w-full">
      {n >= 0 && (
        <p className="mb-6 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-malva">
          <span className="sr-only">Paso {n + 1} de 4</span>
          {PASOS_FORMULARIO.map((p, i) => (
            <span
              key={p}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-500 ${i === n ? "w-8 bg-durazno" : i < n ? "w-3 bg-durazno/70" : "w-3 bg-malva/40"}`}
            />
          ))}
        </p>
      )}

      <div key={paso} className={paso === "portal" || paso === "relato" ? "animate-aparecer" : "t-panel"}>
        {paso === "portal" && <Portal alContinuar={() => setPaso("relato")} />}
        {paso === "relato" && <Relato alContinuar={() => setPaso("guardiana")} />}
        {paso === "guardiana" && (
          <PasoGuardiana
            valor={guardiana}
            alGuardar={(v) => {
              setGuardiana(v);
              setPaso("biblioteca");
            }}
          />
        )}
        {paso === "biblioteca" && (
          <PasoBiblioteca
            guardiana={guardiana}
            valor={biblioteca}
            alVolver={() => setPaso("guardiana")}
            alGuardar={(v) => {
              setBiblioteca(v);
              setPaso("apariencia");
            }}
          />
        )}
        {paso === "apariencia" && (
          <PasoApariencia
            valor={apariencia}
            alVolver={() => setPaso("biblioteca")}
            alGuardar={(v) => {
              setApariencia(v);
              setPaso("llaves");
            }}
          />
        )}
        {paso === "llaves" && <PasoLlaves guardiana={guardiana} biblioteca={biblioteca} alVolver={() => setPaso("apariencia")} />}
      </div>
    </section>
  );
}

function Portal({ alContinuar }: { alContinuar: () => void }) {
  return (
    <div className="text-center">
      <Logo variante="vertical" alto={380} priority className="mx-auto h-auto w-[min(70vw,320px)]" />
      <p className="mt-6 font-marca text-2xl italic text-texto-suave">Hay un lugar entre los mundos de las historias.</p>
      <button
        onClick={alContinuar}
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-durazno px-8 text-[0.95rem] font-medium text-ciruela transition hover:bg-marfil"
      >
        Cruzar el umbral
      </button>
    </div>
  );
}

function Relato({ alContinuar }: { alContinuar: () => void }) {
  const linea = "animate-aparecer font-marca text-2xl leading-snug text-marfil sm:text-3xl";
  return (
    <div className="space-y-6 text-center">
      <p className={linea}>Una biblioteca antigua guarda ahí sus secretos.</p>
      <p className={`${linea} [animation-delay:1200ms]`}>Hace mucho que nadie la cuida. Los estantes aún recuerdan cada libro que alguien habitó.</p>
      <p className={"animate-aparecer font-marca text-2xl leading-snug text-durazno sm:text-3xl [animation-delay:2400ms]"}>Hoy, alguien llegó al umbral.</p>
      <button
        onClick={alContinuar}
        className="mt-4 inline-flex min-h-12 animate-aparecer items-center rounded-full border border-durazno/60 px-8 text-[0.95rem] text-durazno transition [animation-delay:3200ms] hover:bg-durazno/10"
      >
        Soy yo
      </button>
    </div>
  );
}

function PasoGuardiana({ valor, alGuardar }: { valor: string; alGuardar: (v: string) => void }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaGuardiana, async (previo, fd) => {
    const r = await guardarGuardiana(previo, fd);
    if (r.ok) alGuardar(r.valores?.nombre ?? "");
    return r;
  });
  return (
    <form {...formProps} className="space-y-6">
      <header className="text-center">
        <h1 className={titulo}>¿Cómo se llama la Guardiana?</h1>
        <p className="mt-3 text-texto-suave">Es el nombre con el que te va a reconocer la biblioteca.</p>
      </header>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Campo nombre="nombre" etiqueta="Nombre de la Guardiana" error={errores.nombre} valorInicial={estado.valores?.nombre ?? valor} maxLength={40} autoComplete="given-name" autoFocus />
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Continuar
      </BotonEnvio>
    </form>
  );
}

function PasoBiblioteca({ guardiana, valor, alVolver, alGuardar }: { guardiana: string; valor: string; alVolver: () => void; alGuardar: (v: string) => void }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaBiblioteca, async (previo, fd) => {
    const r = await guardarBiblioteca(previo, fd);
    if (r.ok) alGuardar(r.valores?.nombre ?? "");
    return r;
  });
  return (
    <form {...formProps} className="space-y-6">
      <header className="text-center">
        <h1 className={titulo}>Bienvenida, {guardiana}</h1>
        <p className="mt-3 text-texto-suave">Toda biblioteca tiene un nombre. ¿Cuál será el de la tuya?</p>
      </header>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <Campo nombre="nombre" etiqueta="Nombre de la biblioteca" error={errores.nombre} valorInicial={estado.valores?.nombre ?? valor} maxLength={60} autoFocus />
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Continuar
      </BotonEnvio>
      <p className="text-center">
        <button type="button" onClick={alVolver} className={botonSecundario}>
          Volver
        </button>
      </p>
    </form>
  );
}

function PasoApariencia({ valor, alVolver, alGuardar }: { valor: string; alVolver: () => void; alGuardar: (v: string) => void }) {
  const { estado, errores, pendiente, formProps } = useFormularioValidado(esquemaApariencia, async (previo, fd) => {
    const r = await guardarApariencia(previo, fd);
    if (r.ok) alGuardar(r.valores?.apariencia ?? "");
    return r;
  });
  const [elegida, setElegida] = useState(valor);
  return (
    <form {...formProps} className="space-y-6">
      <header className="text-center">
        <h1 className={titulo}>¿Cómo se ve tu biblioteca?</h1>
        <p className="mt-3 text-texto-suave">Es solo el comienzo: más adelante, en el Taller, podrás cambiarla.</p>
      </header>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <fieldset className="space-y-3">
        <legend className="sr-only">Apariencia inicial</legend>
        {APARIENCIAS.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-malva/40 bg-noche/70 p-3 transition has-[:checked]:border-durazno has-[:checked]:bg-morado/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-durazno"
          >
            <input type="radio" name="apariencia" value={a.id} checked={elegida === a.id} onChange={() => setElegida(a.id)} className="sr-only" />
            <span aria-hidden="true" className="size-16 shrink-0 rounded-xl border border-malva/40" style={{ background: a.fondo }} />
            <span>
              <span className="block font-marca text-xl text-marfil">{a.nombre}</span>
              <span className="block text-sm leading-snug text-texto-suave">{a.descripcion}</span>
            </span>
          </label>
        ))}
        {errores.apariencia && (
          <p role="alert" className="text-sm text-[#f5b5b5]">
            {errores.apariencia}
          </p>
        )}
      </fieldset>
      <BotonEnvio pendiente={pendiente} pendienteTexto="Guardando…">
        Continuar
      </BotonEnvio>
      <p className="text-center">
        <button type="button" onClick={alVolver} className={botonSecundario}>
          Volver
        </button>
      </p>
    </form>
  );
}

function IconoLlave() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto size-24 animate-titilar text-durazno [animation-duration:5s]">
      <circle cx="20" cy="20" r="11" />
      <circle cx="20" cy="20" r="4.5" />
      <path d="M28 28 54 54M44 44l6-6M50 50l5-5" />
    </svg>
  );
}

function PasoLlaves({ guardiana, biblioteca, alVolver }: { guardiana: string; biblioteca: string; alVolver: () => void }) {
  const [estado, enviar, pendiente] = useActionState<EstadoForm>(entrarEnLaSala, {});
  return (
    <form action={enviar} className="space-y-6 text-center">
      <IconoLlave />
      <header>
        <h1 className={titulo}>Las llaves son tuyas</h1>
        <p className="mt-4 leading-relaxed text-texto-suave">
          {guardiana}, Guardiana de <span className="font-marca text-lg italic text-marfil">{biblioteca}</span>: la puerta de la Gran Sala te espera.
        </p>
      </header>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <BotonEnvio pendiente={pendiente} pendienteTexto="Abriendo la puerta…">
        Entrar a la Gran Sala
      </BotonEnvio>
      <p>
        <button type="button" onClick={alVolver} className={botonSecundario}>
          Volver
        </button>
      </p>
    </form>
  );
}
