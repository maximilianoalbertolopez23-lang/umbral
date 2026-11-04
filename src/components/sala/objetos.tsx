"use client";

import { useId } from "react";
import { obtenerItem, type ItemCatalogo } from "@/modules/taller/catalogo";
import { escalaProfundidad, type ObjetoColocado, type Sala } from "@/modules/taller/sala";

/**
 * Cada objeto es una ilustración pintada con fondo transparente (public/objetos). Se dibuja en su propio sistema de
 * coordenadas (0 … ancho, 0 … alto, origen arriba a la izquierda) y la escena lo coloca, escala y espeja.
 */
export function ArteObjeto({ tipo, variante }: { tipo: string; variante: number }) {
  const item = obtenerItem(tipo);
  if (!item) return null;
  const src = item.variantes[Math.min(variante, item.variantes.length - 1)];
  return (
    <g>
      {!item.plano && <ellipse cx={item.ancho / 2} cy={item.alto - 2} rx={item.ancho * 0.4} ry={Math.max(4, item.alto * 0.035)} fill="#000" opacity=".35" />}
      <image href={src} x="0" y="0" width={item.ancho} height={item.alto} preserveAspectRatio="xMidYMax meet" />
    </g>
  );
}

/** Transformación que coloca un objeto en la escena: de piso (apoyado, con perspectiva) o de pared (centrado). */
export function transformacionDe(o: Pick<ObjetoColocado, "x" | "y" | "giro"> & { sala?: Sala; escala?: number }, item: ItemCatalogo): string {
  const flip = o.giro ? -1 : 1;
  const e = o.escala ?? 1;
  if (item.zona === "suelo") {
    const s = escalaProfundidad(o.y, o.sala) * e;
    return `translate(${o.x} ${o.y}) scale(${s * flip} ${s}) translate(${-item.ancho / 2} ${-item.alto})`;
  }
  return `translate(${o.x} ${o.y}) scale(${flip * e} ${e}) translate(${-item.ancho / 2} ${-item.alto / 2})`;
}

/** Orden de dibujo: pared, alfombras y luego de atrás hacia adelante (y creciente); `capa` mueve un objeto por encima o por debajo de ese orden. */
export function ordenarParaDibujar(objetos: ObjetoColocado[]): ObjetoColocado[] {
  const clave = (o: ObjetoColocado) => {
    const item = obtenerItem(o.tipo);
    if (!item) return 0;
    const base = item.zona === "pared" ? -1000 : item.plano ? -500 : o.y;
    return base + o.capa * 1000;
  };
  return [...objetos].sort((a, b) => clave(a) - clave(b));
}

/**
 * Capa con los objetos colocados (solo lectura: no capta clics). Los objetos que emiten luz suman su resplandor,
 * que se apaga junto con las velas.
 */
export function CapaDecoracion({ objetos, sala = "gran-sala", filtro = "none", viewBox = "0 0 1600 900", verOcultos = false, previa }: { objetos: ObjetoColocado[]; sala?: Sala; filtro?: string; viewBox?: string; verOcultos?: boolean; previa?: ObjetoColocado }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${u}-glow`}>
          <stop offset="0" stopColor="#f2c7a2" stopOpacity=".55" />
          <stop offset=".5" stopColor="#f2c7a2" stopOpacity=".16" />
          <stop offset="1" stopColor="#f2c7a2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={{ filter: filtro }}>
        {ordenarParaDibujar([...objetos, ...(previa ? [previa] : [])].filter((o) => o.sala === sala && (verOcultos || previa === o || !o.oculto))).map((o) => {
          const item = obtenerItem(o.tipo);
          if (!item) return null;
          const caja = item.zona === "suelo" ? { cx: o.x, cy: o.y - item.alto * escalaProfundidad(o.y, o.sala) * o.escala * 0.8 } : { cx: o.x, cy: o.y - item.alto * 0.2 };
          return (
            <g key={o.id} opacity={previa === o ? 0.65 : o.oculto ? 0.28 : 1}>
              {item.emiteLuz && <circle className={o.tipo === "candelabro-pared" ? "sala-glow sala-glow-vela" : "sala-glow"} cx={caja.cx} cy={caja.cy} r={item.zona === "suelo" ? 170 : 110} fill={`url(#${u}-glow)`} style={{ mixBlendMode: "screen" }} />}
              <g transform={transformacionDe(o, item)}>
                <ArteObjeto tipo={o.tipo} variante={o.variante} />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
