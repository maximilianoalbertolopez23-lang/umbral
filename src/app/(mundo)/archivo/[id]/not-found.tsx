import Link from "next/link";

export default function LibroNoEncontrado() {
  return (
    <div className="rounded-3xl border border-dashed border-malva/50 px-6 py-14 text-center">
      <p className="font-marca text-3xl text-marfil">Ese libro no está en tu Archivo</p>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-texto-suave">Puede que lo hayas eliminado o que el enlace no sea correcto.</p>
      <Link href="/archivo" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-durazno px-6 text-sm font-medium text-ciruela hover:bg-marfil">
        Volver al Archivo
      </Link>
    </div>
  );
}
