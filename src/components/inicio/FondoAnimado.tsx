"use client";

import { useEffect, useRef, useState } from "react";
import { coberturaUV } from "./cobertura";
import { FRAGMENTO, VERTICE } from "./shader";

const CUADROS_POR_SEGUNDO = 30;

/**
 * Paisaje con movimiento (nubes, cascadas, río, luces y follaje) dibujado con WebGL sobre la misma ilustración.
 * La imagen estática de abajo sigue siendo el respaldo: si no hay WebGL, si la persona pidió menos movimiento o si algo
 * falla, el lienzo no aparece y se ve la imagen quieta. Se pausa cuando la pestaña está oculta.
 */
export function FondoAnimado({ src, ancho, alto }: { src: string; ancho: number; alto: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    let vivo = true;
    let raf = 0;
    let ultimo = 0;
    let dibujado = false;
    let textura = false;

    const compilar = (tipo: number, fuente: string) => {
      const s = gl.createShader(tipo);
      if (!s) return null;
      gl.shaderSource(s, fuente);
      gl.compileShader(s);
      if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
      console.warn("[FondoAnimado] el shader no compiló:", gl.getShaderInfoLog(s));
      return null;
    };
    const vs = compilar(gl.VERTEX_SHADER, VERTICE);
    const fs = compilar(gl.FRAGMENT_SHADER, FRAGMENTO);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uScale = gl.getUniformLocation(prog, "uScale");
    gl.uniform1f(gl.getUniformLocation(prog, "uAspect"), ancho / alto);

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      const [sx, sy] = coberturaUV(w / h, ancho / alto);
      gl.uniform2f(uScale, sx, sy);
    };

    const dibujar = (ms: number) => {
      if (!vivo) return;
      raf = requestAnimationFrame(dibujar);
      if (document.hidden || ms - ultimo < 1000 / CUADROS_POR_SEGUNDO) return;
      ultimo = ms;
      gl.uniform1f(uTime, ms / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!dibujado) {
        dibujado = true;
        setListo(true);
      }
    };

    const imagen = new Image();
    imagen.decoding = "async";
    imagen.onload = () => {
      if (!vivo) return;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagen);
      textura = true;
      ajustar();
      raf = requestAnimationFrame(dibujar);
    };
    imagen.src = src;

    const observador = new ResizeObserver(() => {
      if (textura) ajustar();
    });
    observador.observe(canvas);
    const alPerder = (e: Event) => {
      e.preventDefault();
      vivo = false;
      cancelAnimationFrame(raf);
      setListo(false);
    };
    canvas.addEventListener("webglcontextlost", alPerder);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      observador.disconnect();
      canvas.removeEventListener("webglcontextlost", alPerder);
      // No se fuerza la pérdida del contexto: en desarrollo (StrictMode) el efecto se monta dos veces sobre el mismo lienzo.
      gl.deleteProgram(prog);
      gl.deleteBuffer(buffer);
    };
  }, [src, ancho, alto]);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-[15] h-full w-full transition-opacity duration-[1500ms] ${listo ? "opacity-100" : "opacity-0"}`} />;
}
