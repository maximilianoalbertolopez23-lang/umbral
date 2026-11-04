import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center px-5 text-center">
      <p className="font-marca text-6xl text-durazno">404</p>
      <h1 className="mt-4 font-marca text-4xl text-marfil">Esta puerta no existe</h1>
      <p className="mt-3 text-texto-suave">El pasillo termina aquí. Volvé a la entrada del archivo.</p>
      <Link href="/" className="mt-8 rounded-full border border-durazno/50 px-6 py-3 text-durazno hover:bg-durazno/10">
        Volver al umbral
      </Link>
    </main>
  );
}
