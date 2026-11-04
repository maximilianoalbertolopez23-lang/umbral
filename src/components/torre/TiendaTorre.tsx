"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { comprarAction } from "@/app/(mundo)/torre/actions";
import { Aviso } from "@/components/auth/formulario";
import { NOMBRE_TIPO_TIENDA, TIENDA, type TipoTienda } from "@/modules/torre/reglas";

const TIPOS = Object.keys(NOMBRE_TIPO_TIENDA) as TipoTienda[];

export function TiendaTorre({ esencias, nivel, inventario }: { esencias: number; nivel: number; inventario: string[] }) {
  const router = useRouter();
  const [, refrescar] = useTransition();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "info" | "error"; texto: string } | null>(null);
  const tengo = new Set(inventario);

  async function obtener(clave: string, nombre: string) {
    setOcupado(clave);
    const r = await comprarAction(clave);
    setOcupado(null);
    setMensaje(r.ok ? { tipo: "info", texto: `«${nombre}» ya está en tu inventario. Podés usarlo desde El Taller.` } : { tipo: "error", texto: r.error });
    refrescar(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {TIPOS.map((tipo) => (
        <div key={tipo}>
          <h3 className="mb-2 text-xs uppercase tracking-[0.14em] text-malva">{NOMBRE_TIPO_TIENDA[tipo]}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {TIENDA.filter((a) => a.tipo === tipo).map((a) => {
              const lo_tengo = tengo.has(a.clave);
              const faltaNivel = nivel < a.nivel;
              const faltaEsencia = esencias < a.precio;
              return (
                <li key={a.clave} className="flex items-center justify-between gap-3 rounded-xl border border-malva/30 bg-noche/50 p-3">
                  <div>
                    <p className="text-marfil">{a.nombre}</p>
                    <p className="text-xs text-texto-suave">{lo_tengo ? "En tu inventario" : faltaNivel ? `Se abre en el piso ${a.nivel}` : a.descripcion}</p>
                  </div>
                  <button
                    type="button"
                    disabled={lo_tengo || faltaNivel || faltaEsencia || ocupado !== null}
                    onClick={() => obtener(a.clave, a.nombre)}
                    aria-label={lo_tengo ? `${a.nombre}: ya lo tenés` : `Obtener ${a.nombre} por ${a.precio} Esencias`}
                    className="min-h-11 shrink-0 rounded-full border border-durazno/60 px-4 text-sm text-durazno transition hover:bg-durazno/10 disabled:opacity-40"
                  >
                    {lo_tengo ? "Tuyo" : ocupado === a.clave ? "…" : `✦ ${a.precio}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
