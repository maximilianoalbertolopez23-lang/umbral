"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Autoguardado } from "@/modules/escritorio/autoguardado";

/**
 * Evita perder cambios: avisa al cerrar la pestaña con cambios sin guardar, guarda al ocultarse la pestaña, antes de
 * navegar dentro de la app (clic en cualquier enlace) y al salir con el botón «atrás».
 */
export function useProtegerSalida<T>(auto: Autoguardado<T>) {
  const router = useRouter();
  useEffect(() => {
    const antesDeCerrar = (e: BeforeUnloadEvent) => {
      if (auto.haySinGuardar()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const alOcultar = () => {
      if (document.visibilityState === "hidden" && auto.haySinGuardar()) void auto.guardarYa();
    };
    const alHacerClic = async (e: MouseEvent) => {
      const enlace = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!enlace || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || enlace.target === "_blank") return;
      const url = new URL(enlace.href, location.href);
      if (url.origin !== location.origin || !auto.haySinGuardar()) return;
      e.preventDefault();
      e.stopPropagation();
      const ok = await auto.guardarYa();
      if (ok || window.confirm("No pudimos guardar los últimos cambios. ¿Querés salir igual y perderlos?")) {
        router.push(url.pathname + url.search + url.hash);
      }
    };
    window.addEventListener("beforeunload", antesDeCerrar);
    document.addEventListener("visibilitychange", alOcultar);
    document.addEventListener("click", alHacerClic, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeCerrar);
      document.removeEventListener("visibilitychange", alOcultar);
      document.removeEventListener("click", alHacerClic, true);
      if (auto.haySinGuardar()) void auto.guardarYa();
    };
  }, [auto, router]);
}
