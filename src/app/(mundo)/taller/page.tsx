import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ImportarRespaldo } from "@/components/taller/ImportarRespaldo";
import { MovimientoPanel } from "@/components/taller/MovimientoPanel";
import { VistaEstancia } from "@/components/sala/VistaEstancia";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { obtenerDisenoSala } from "@/modules/taller/repositorio";
import { getModulo } from "@/modules/registry";
import { redirect } from "next/navigation";
import { JUEGO_ACTIVO } from "@/lib/juego";

const modulo = getModulo("taller");
export const metadata: Metadata = { title: modulo.titulo };

const tarjeta = "marco-ornato group block rounded-3xl p-7 transition hover:brightness-125";

async function Movimiento() {
  const g = await requerirGuardiana();
  return <MovimientoPanel movimiento={g.movimiento} />;
}

async function Banner() {
  const g = await requerirGuardiana();
  const { diseno } = await conUsuario(g.userId, async (db) => ({ diseno: (await obtenerDisenoSala(db, g.userId)).diseno }));
  return <VistaEstancia estancia="taller" diseno={diseno} />;
}

export default function TallerPage() {
  if (!JUEGO_ACTIVO) redirect("/archivo"); // el juego está apagado (src/lib/juego.ts)
  return (
    <>
      <header className="mb-8">
        <p className="font-marca text-3xl text-durazno">{modulo.numeral}</p>
        <h1 className="mt-1 font-marca text-5xl leading-tight text-marfil sm:text-6xl">{modulo.titulo}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-texto-suave">{modulo.resumen}</p>
      </header>

      <Suspense fallback={<div role="status" aria-label="Cargando" className="estancia mb-8 animate-titilar bg-velo/50" />}>
        <Banner />
      </Suspense>

      <div className="grid gap-5 md:grid-cols-2">
        <Link href="/taller/sala" className={tarjeta}>
          <h2 className="font-marca text-3xl text-marfil">Decorar la sala</h2>
          <p className="mt-2 leading-relaxed text-texto-suave">Elegí la luz y colocá sillones, alfombras, estandartes, faroles, cuadros y más. Todo se guarda y vuelve cuando regreses.</p>
          <span className="mt-4 inline-block text-sm text-durazno group-hover:underline">Abrir el editor →</span>
        </Link>
        <Link href="/taller/journal" className={tarjeta}>
          <h2 className="font-marca text-3xl text-marfil">Personalizar el journal</h2>
          <p className="mt-2 leading-relaxed text-texto-suave">Tipografías, colores, fondos, bordes y distribución: creá tus propias plantillas sin tocar lo que escribiste.</p>
          <span className="mt-4 inline-block text-sm text-durazno group-hover:underline">Diseñar plantillas →</span>
        </Link>
      </div>

      <section aria-labelledby="mov" className="mt-12">
        <h2 id="mov" className="font-marca text-3xl text-marfil">Movimiento</h2>
        <p className="mb-4 mt-1 max-w-2xl text-texto-suave">Las velas, los rayos de luna y las transiciones se pueden calmar. Si tu dispositivo ya pide reducir el movimiento, siempre se respeta.</p>
        <Suspense fallback={<div role="status" aria-label="Cargando" className="h-32 animate-titilar rounded-2xl bg-velo/50" />}>
          <Movimiento />
        </Suspense>
      </section>

      <section aria-labelledby="datos" className="mt-12">
        <h2 id="datos" className="font-marca text-3xl text-marfil">Tus datos</h2>
        <p className="mb-4 mt-1 max-w-2xl text-texto-suave">
          Descargá una copia completa de tu biblioteca, journal, personalizaciones y progreso en un archivo JSON. Es tuyo: guardalo donde quieras.
        </p>
        <a href="/api/exportar" download className="inline-flex min-h-11 items-center rounded-full border border-durazno px-5 text-durazno transition hover:bg-durazno hover:text-ciruela">
          Descargar mi respaldo
        </a>
        <ImportarRespaldo />
      </section>
    </>
  );
}
