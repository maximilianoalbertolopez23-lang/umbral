"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULOS, MODULOS_NUCLEO } from "@/modules/registry";
import { IconoModulo } from "@/components/ui/Iconos";

function activa(pathname: string, ruta: string) {
  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}

/** Barra lateral (escritorio): todas las habitaciones; las futuras se marcan como tales. */
export function NavLateral() {
  const pathname = usePathname();
  return (
    <nav aria-label="Habitaciones" className="flex flex-col gap-1">
      {MODULOS.map((m) => (
        <Link
          key={m.id}
          href={m.ruta}
          aria-current={activa(pathname, m.ruta) ? "page" : undefined}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] text-texto-suave transition-colors hover:bg-morado/40 hover:text-marfil aria-[current=page]:bg-morado/60 aria-[current=page]:text-durazno"
        >
          <IconoModulo id={m.id} className="size-5 shrink-0" />
          <span className="flex-1">{m.nombre}</span>
          {m.fase === "futuro" && <span className="text-[0.7rem] uppercase tracking-wider text-malva">Luego</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior (celular): los módulos núcleo. Portales se alcanza desde la Gran Sala. */
export function NavInferior() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Habitaciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-malva/25 bg-noche/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${MODULOS_NUCLEO.length}, minmax(0, 1fr))` }}>
        {MODULOS_NUCLEO.map((m) => (
          <li key={m.id}>
            <Link
              href={m.ruta}
              aria-current={activa(pathname, m.ruta) ? "page" : undefined}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-texto-suave aria-[current=page]:text-durazno"
            >
              <IconoModulo id={m.id} className="size-6" />
              {m.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
