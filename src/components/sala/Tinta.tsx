import { useId } from "react";
import type { Animo } from "@/modules/sala/companera";

const TEXTO: Record<Animo, string> = { dormida: "durmiendo", leyendo: "leyendo con vos", contenta: "contenta" };

/** Tinta, la gata de la biblioteca: ilustración vectorial fija con tres ánimos (sin animaciones). */
export function Tinta({ animo }: { animo: Animo }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 240 210" role="img" aria-label={`Tinta, la gata de la biblioteca, ${TEXTO[animo]}`} className="h-48 w-auto sm:h-60">
      <defs>
        <radialGradient id={`${u}-pelo`} cx=".4" cy=".3" r=".9">
          <stop offset="0" stopColor="#4a3a6b" />
          <stop offset="1" stopColor="#241a3a" />
        </radialGradient>
        <radialGradient id={`${u}-ojo`} cx=".5" cy=".4" r=".7">
          <stop offset="0" stopColor="#ffe3b8" />
          <stop offset="1" stopColor="#e9a35e" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="198" rx="86" ry="9" fill="#000" opacity=".3" />

      {/* cola */}
      <path d="M186 176c34 2 44-30 30-52-6-9-16-8-14 2 3 14-2 28-18 34z" fill={`url(#${u}-pelo)`} />
      <path d="M212 126c4 8 3 16 0 22" fill="none" stroke="#f2c7a2" strokeWidth="3" strokeLinecap="round" opacity=".35" />

      {/* cuerpo */}
      <path d="M44 184c-10-52 20-92 76-92s86 40 76 92z" fill={`url(#${u}-pelo)`} />
      <path d="M96 184c-4-30 6-52 24-52s28 22 24 52z" fill="#f4ead8" opacity=".9" />

      {/* orejas */}
      <path d="M62 92 54 40l40 24z" fill={`url(#${u}-pelo)`} />
      <path d="M178 92l8-52-40 24z" fill={`url(#${u}-pelo)`} />
      <path d="M66 80 62 54l22 14zM174 80l4-26-22 14z" fill="#e8a8a0" opacity=".7" />

      {/* cabeza */}
      <ellipse cx="120" cy="104" rx="58" ry="46" fill={`url(#${u}-pelo)`} />
      <path d="M104 62q16 12 32 0" fill="none" stroke="#6a5a8e" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <path d="M120 58v12" stroke="#6a5a8e" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <ellipse cx="120" cy="124" rx="22" ry="15" fill="#f4ead8" opacity=".9" />

      {/* ojos */}
      {animo === "leyendo" && (
        <>
          <ellipse cx="96" cy="102" rx="9" ry="11" fill={`url(#${u}-ojo)`} />
          <ellipse cx="144" cy="102" rx="9" ry="11" fill={`url(#${u}-ojo)`} />
          <ellipse cx="96" cy="104" rx="3.4" ry="8" fill="#1b1330" />
          <ellipse cx="144" cy="104" rx="3.4" ry="8" fill="#1b1330" />
          <circle cx="99" cy="99" r="2.4" fill="#fff" />
          <circle cx="147" cy="99" r="2.4" fill="#fff" />
        </>
      )}
      {animo === "contenta" && (
        <>
          <path d="M86 106q10-14 20 0M134 106q10-14 20 0" fill="none" stroke="#ffe3b8" strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="82" cy="120" rx="9" ry="5" fill="#e8a8a0" opacity=".55" />
          <ellipse cx="158" cy="120" rx="9" ry="5" fill="#e8a8a0" opacity=".55" />
        </>
      )}
      {animo === "dormida" && <path d="M86 104q10 8 20 0M134 104q10 8 20 0" fill="none" stroke="#ffe3b8" strokeWidth="4" strokeLinecap="round" />}

      {/* nariz, boca y bigotes */}
      <path d="M114 118h12l-6 7z" fill="#e8a8a0" />
      <path d="M120 125v5M108 132q12 8 24 0" fill="none" stroke="#e8a8a0" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M78 124l-26-6M78 130l-28 4M162 124l26-6M162 130l28 4" stroke="#d9cfe8" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />

      {/* collar con cascabel */}
      <path d="M74 140q46 24 92 0" fill="none" stroke="#a63d5b" strokeWidth="7" strokeLinecap="round" />
      <circle cx="120" cy="157" r="7" fill="#f2c7a2" />
      <path d="M116 158h8" stroke="#a9805a" strokeWidth="1.6" />

      {/* patas */}
      <ellipse cx="92" cy="186" rx="19" ry="11" fill={`url(#${u}-pelo)`} />
      <ellipse cx="148" cy="186" rx="19" ry="11" fill={`url(#${u}-pelo)`} />

      {animo === "leyendo" && (
        <g>
          <path d="M62 176l58-14 58 14v22l-58-14-58 14z" fill="#f4ead8" />
          <path d="M120 162v22" stroke="#8a6f9e" strokeWidth="2.4" />
          <path d="M72 180l40-9M72 188l40-9M168 180l-40-9M168 188l-40-9" stroke="#c9b8d9" strokeWidth="1.4" opacity=".8" />
        </g>
      )}
      {animo === "contenta" && (
        <g fill="#f2c7a2" aria-hidden="true">
          <path d="M200 40l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" />
          <path d="M34 62l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" opacity=".8" />
        </g>
      )}
      {animo === "dormida" && (
        <g fill="#c9b8d9" aria-hidden="true">
          <text x="190" y="62" fontSize="26" fontStyle="italic">z</text>
          <text x="208" y="42" fontSize="18" fontStyle="italic">z</text>
        </g>
      )}
    </svg>
  );
}
