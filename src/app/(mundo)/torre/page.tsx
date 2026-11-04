import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SceneBackground } from "@/components/scene/SceneBackground";
import { AvisoLogro } from "@/components/torre/AvisoLogro";
import { TiendaTorre } from "@/components/torre/TiendaTorre";
import { requerirGuardiana } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { estadisticasAnio } from "@/modules/escritorio/repositorio";
import { obtenerArticulo } from "@/modules/torre/reglas";
import { obtenerProgreso, sincronizarProgreso } from "@/modules/torre/repositorio";

export const metadata: Metadata = { title: "La Torre" };

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const seccion = "marco-ornato rounded-2xl p-6 sm:p-7";
const titulo = "font-marca text-2xl text-marfil";

const ICONOS: Record<string, string> = {
  libro: "📖", dragon: "🐉", pluma: "🪶", saga: "📚", cita: "❝", sala: "🕯️", estanteria: "🏛️", pergamino: "📜", plantilla: "🖋️",
};

async function Contenido() {
  const g = await requerirGuardiana();
  const anio = new Date().getFullYear();
  const d = await conUsuario(g.userId, async (db) => {
    const nuevos = await sincronizarProgreso(db, g.userId);
    return { nuevos, p: await obtenerProgreso(db, g.userId), est: await estadisticasAnio(db, g.userId, anio) };
  });
  const { p, est, nuevos } = d;
  const pct = Math.round(p.nivel.progreso * 100);

  return (
    <div className="space-y-8">
      <AvisoLogro recompensas={nuevos} />
      <div className="relative h-44 overflow-hidden rounded-2xl border border-durazno/40 sm:h-64">
        <SceneBackground id="09_torre" decorativo={false} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ciruela/60 to-transparent" />
      </div>

      <section aria-labelledby="piso" className={seccion}>
        <p className="text-xs uppercase tracking-[0.2em] text-durazno">Piso {p.nivel.nivel}</p>
        <h2 id="piso" className="mt-1 font-marca text-4xl text-marfil">{p.nivel.titulo}</h2>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2 text-sm text-texto-suave">
          <span>{p.xp} XP en total</span>
          <span>{p.nivel.xpEnNivel} / {p.nivel.xpHastaSiguiente} para el piso {p.nivel.nivel + 1}</span>
        </div>
        <div role="progressbar" aria-label="Avance hacia el próximo piso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-2 h-3 overflow-hidden rounded-full bg-noche">
          <div className="h-full rounded-full bg-durazno" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <span aria-hidden="true" className="text-2xl text-durazno">✦</span>
          <span className="font-marca text-3xl text-marfil">{p.esencias}</span>
          <span className="text-texto-suave">Esencias</span>
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-texto-suave">
          La Torre es opcional y no tiene prisa: nada vence ni se pierde si pasás días sin leer. Las Esencias salen de lo que
          ya hacés en tu biblioteca y sirven para adornarla.
        </p>
      </section>

      <section aria-labelledby="misiones" className={seccion}>
        <h2 id="misiones" className={titulo}>Misiones</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.misiones.map(({ def, actual, cumplida, fecha: f }) => (
            <li key={def.id} className={`rounded-xl border p-4 ${cumplida ? "border-durazno/50 bg-durazno/5" : "border-malva/30 bg-noche/50"}`}>
              <p className="flex items-center gap-2 text-marfil"><span aria-hidden="true">{ICONOS[def.icono]}</span>{def.nombre}</p>
              <p className="mt-1 text-sm text-texto-suave">{def.descripcion}</p>
              <p className="mt-2 text-xs text-malva">
                {cumplida ? `Cumplida el ${fecha(f!)}` : `${actual} / ${def.meta.objetivo}`} · +{def.recompensa.xp} XP · +{def.recompensa.esencias} ✦
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="logros" className={seccion}>
        <h2 id="logros" className={titulo}>Logros</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.logros.map(({ def, actual, obtenido, fecha: f }) => (
            <li key={def.id} className={`rounded-xl border p-4 ${obtenido ? "border-durazno/50 bg-durazno/5" : "border-malva/30 bg-noche/50 opacity-80"}`}>
              <p className="flex items-center gap-2 text-marfil"><span aria-hidden="true">{ICONOS[def.icono]}</span>{def.nombre}</p>
              <p className="mt-1 text-sm text-texto-suave">{def.descripcion}</p>
              <p className="mt-2 text-xs text-malva">
                {obtenido ? `Obtenido el ${fecha(f!)}` : `${actual} / ${def.meta.objetivo}`}
                {def.recompensa && ` · Recompensa: ${def.recompensa.xp} XP, ${def.recompensa.esencias} ✦${def.recompensa.items?.length ? `, ${def.recompensa.items.map((i) => obtenerArticulo(i)?.nombre).join(", ")}` : ""}`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tienda" className={seccion}>
        <h2 id="tienda" className={titulo}>Canjear Esencias</h2>
        <p className="mb-4 mt-1 text-sm text-texto-suave">
          Lo que obtengas pasa a tu inventario y se usa desde <Link href="/taller" className="text-durazno underline underline-offset-4">El Taller</Link>.
        </p>
        <TiendaTorre esencias={p.esencias} nivel={p.nivel.nivel} inventario={p.inventario} />
      </section>

      <section aria-labelledby="inventario" className={seccion}>
        <h2 id="inventario" className={titulo}>Inventario</h2>
        {p.inventario.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Todavía no tenés objetos de la Torre. Los de El Taller que ya viste son libres de usar.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.inventario.map((c) => (
              <li key={c} className="rounded-full border border-malva/40 px-3 py-1 text-sm text-marfil">{obtenerArticulo(c)?.nombre ?? c}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial" className={seccion}>
        <h2 id="historial" className={titulo}>Historial de recompensas</h2>
        {p.historial.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Cuando termines un libro, escribas una reseña o registres una reflexión, aparecerá acá.</p>
        ) : (
          <ul className="mt-3 divide-y divide-malva/20 text-sm">
            {p.historial.map((e) => (
              <li key={e.clave} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-marfil">{e.titulo}</span>
                <span className="text-texto-suave">
                  {e.xp > 0 && `+${e.xp} XP `}{e.esencias !== 0 && `${e.esencias > 0 ? "+" : ""}${e.esencias} ✦ `}· {fecha(e.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="estadisticas" className={seccion}>
        <h2 id="estadisticas" className={titulo}>Estadísticas de lectura</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Libros terminados", p.metricas.librosTerminados],
            [`Terminados en ${est.anio}`, est.librosTerminados],
            ["Páginas leídas", p.metricas.paginasLeidas],
            [`Minutos en ${est.anio}`, est.minutosLeidos],
            ["Reseñas", p.metricas.resenas],
            ["Reflexiones", p.metricas.reflexiones],
            ["Citas guardadas", p.metricas.citas],
            ["Sagas completas", p.metricas.sagasCompletas],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-[0.14em] text-malva">{k}</dt>
              <dd className="font-marca text-3xl text-marfil">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default function TorrePage() {
  return (
    <article>
      <p className="font-marca text-3xl text-durazno">V</p>
      <h1 className="mt-1 font-marca text-5xl leading-tight text-marfil sm:text-6xl">La Torre</h1>
      <p className="mb-8 mt-4 max-w-2xl text-lg leading-relaxed text-texto-suave">
        Cada libro que habitás suma luz a la Torre. Subí a tu ritmo y canjeá lo que encuentres por cosas bellas para tu biblioteca.
      </p>
      <Suspense fallback={<div role="status" aria-label="Subiendo a la Torre" className="h-96 animate-titilar rounded-2xl bg-velo/50" />}>
        <Contenido />
      </Suspense>
    </article>
  );
}
