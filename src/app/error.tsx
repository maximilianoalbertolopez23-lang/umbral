"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-5 text-center">
      <h1 className="font-marca text-4xl text-marfil">Algo se apagó en el archivo</h1>
      <p className="mt-3 text-texto-suave">Ocurrió un error inesperado. Probá de nuevo.</p>
      <button onClick={reset} className="mt-8 rounded-full bg-durazno px-6 py-3 text-ciruela hover:bg-marfil">
        Reintentar
      </button>
    </main>
  );
}
