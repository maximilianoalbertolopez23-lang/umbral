"use client";

import Link from "next/link";

export default function ErrorArchivo({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-[#f0a3a3]/40 px-6 py-14 text-center">
      <p className="font-marca text-3xl text-marfil">No pudimos abrir el Archivo</p>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-texto-suave">
        Algo falló al leer tus libros. No se perdió nada: probá de nuevo en un momento.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button onClick={reset} className="min-h-11 rounded-full bg-durazno px-6 text-sm font-medium text-ciruela hover:bg-marfil">
          Reintentar
        </button>
        <Link href="/sala" className="min-h-11 content-center rounded-full border border-malva/60 px-6 text-sm text-texto-suave hover:text-marfil">
          Volver a la Gran Sala
        </Link>
      </div>
    </div>
  );
}
