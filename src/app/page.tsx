import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Escena } from "@/components/escena/Escena";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { ListaHabitaciones } from "@/components/mundo/ListaHabitaciones";

const botonPrimario =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-durazno px-7 text-[0.95rem] font-medium text-ciruela transition hover:bg-marfil";
const botonSecundario =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-durazno/50 px-7 text-[0.95rem] text-durazno transition hover:border-durazno hover:bg-durazno/10";

export default function Landing() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="UMBRAL, inicio">
            <Logo variante="horizontal" alto={34} priority />
          </Link>
          <Link href="/sala" className="text-sm text-durazno underline-offset-4 hover:underline">
            Cruzar el umbral
          </Link>
        </div>
      </header>

      <main id="contenido">
        <Escena className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 pb-28 pt-28 text-center">
          <SceneBackground id="01_bienvenida_castillo" priority className="-z-20" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(46,24,47,0.55),rgba(46,24,47,0.35)_40%,rgba(46,24,47,0.88))]" />

          <div className="animate-aparecer">
            <Logo variante="vertical" alto={420} priority className="mx-auto h-auto w-[min(76vw,400px)]" />
          </div>

          <h1 className="mt-8 max-w-2xl animate-aparecer font-marca text-3xl italic leading-tight text-marfil [animation-delay:200ms] sm:text-5xl">
            Los libros no se guardan. Se habitan.
          </h1>
          <p className="mt-4 max-w-xl animate-aparecer text-base leading-relaxed text-texto-suave [animation-delay:350ms] sm:text-lg">
            UMBRAL es un journal de lectura que se vive como un mundo: una biblioteca antigua que cambia con cada libro
            que registrás.
          </p>
          <div className="mt-9 flex animate-aparecer flex-col gap-3 [animation-delay:500ms] sm:flex-row">
            <Link href="/sala" className={botonPrimario}>
              Cruzar el umbral
            </Link>
            <a href="#guardiana" className={botonSecundario}>
              Conocer el archivo
            </a>
          </div>
        </Escena>

        <section id="guardiana" className="mx-auto max-w-3xl scroll-mt-8 px-5 py-24 sm:px-8">
          <p className="text-xs uppercase tracking-[0.2em] text-malva">La Guardiana</p>
          <h2 className="mt-3 font-marca text-4xl leading-tight text-marfil sm:text-5xl">
            Una biblioteca escondida entre los mundos de las historias
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-texto-suave">
            <p>
              Al entrar por primera vez recibís las llaves del lugar. Está antiguo, silencioso, a medio recordar: te
              toca reconstruirlo, libro a libro.
            </p>
            <p>
              Cada lectura que registrás se incorpora a la colección. Tus reseñas, tus citas y tus reflexiones cambian
              el aspecto de las salas y guardan la memoria de cada historia.
            </p>
          </div>
        </section>

        <section aria-labelledby="habitaciones" className="mx-auto max-w-4xl px-5 pb-24 sm:px-8">
          <p className="text-xs uppercase tracking-[0.2em] text-malva">Las habitaciones</p>
          <h2 id="habitaciones" className="mt-3 font-marca text-4xl leading-tight text-marfil sm:text-5xl">
            Seis puertas, cuatro abiertas al comienzo
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-texto-suave">
            Las primeras cuatro forman el núcleo inicial. La Torre y los Portales llegarán después, sin rehacer lo
            construido.
          </p>
          <ListaHabitaciones className="mt-10" />
        </section>

        <section className="border-t border-malva/25 bg-noche px-5 py-14 sm:px-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-malva">Estado del proyecto</p>
            <p className="max-w-2xl leading-relaxed text-texto-suave">
              Etapa 1 · Fundamentos. La identidad y la navegación ya están construidas. Las cuentas, el registro de
              libros y el resto de las funciones todavía no existen: cada habitación lo indica con claridad.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-noche px-5 pb-12 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 border-t border-malva/25 pt-8 sm:flex-row sm:items-center">
          <Logo variante="horizontal" alto={30} />
          <p className="text-sm text-texto-suave">UMBRAL — El Archivo de los Mundos</p>
        </div>
      </footer>
    </>
  );
}
