/**
 * Autoguardado controlado. Reglas:
 *  - Espera `demoraMs` sin cambios antes de guardar (no guarda en cada tecla).
 *  - Nunca hay dos guardados a la vez: lo que se escribe mientras se guarda se envía enseguida después.
 *  - Si falla, reintenta con esperas crecientes; agotados los reintentos queda en "error" hasta que la persona
 *    reintente o siga escribiendo. Los cambios NO se descartan.
 *  - Un conflicto (la página cambió en otra pestaña) detiene el guardado automático para no pisar nada.
 *  - `guardarYa()` fuerza el guardado y resuelve cuando no queda nada pendiente (para navegar sin perder cambios).
 */
export type EstadoGuardado = "guardado" | "pendiente" | "guardando" | "reintentando" | "error" | "conflicto";

export type ResultadoGuardado = { ok: true } | { ok: false; conflicto?: boolean; mensaje?: string };

export interface OpcionesAutoguardado<T> {
  guardar: (valor: T) => Promise<ResultadoGuardado>;
  alCambiarEstado: (estado: EstadoGuardado, detalle?: string) => void;
  demoraMs?: number;
  esperasReintento?: number[];
}

export class Autoguardado<T> {
  private pendiente: { valor: T } | null = null;
  private curso: Promise<void> | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private intentos = 0;
  private detenido = false;
  private readonly demora: number;
  private readonly esperas: number[];

  constructor(private readonly o: OpcionesAutoguardado<T>) {
    this.demora = o.demoraMs ?? 1500;
    this.esperas = o.esperasReintento ?? [2000, 5000, 15000];
  }

  /** Registra el valor más reciente y programa el guardado. */
  cambiar(valor: T) {
    this.pendiente = { valor };
    if (this.detenido) return; // conflicto: no se guarda sola
    this.intentos = 0;
    if (!this.curso) this.o.alCambiarEstado("pendiente");
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.ejecutar(), this.demora);
  }

  haySinGuardar(): boolean {
    return this.pendiente !== null || this.curso !== null;
  }

  /** Guarda ahora y espera. Devuelve true si no quedó nada sin guardar. */
  async guardarYa(): Promise<boolean> {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    await this.ejecutar();
    return !this.haySinGuardar();
  }

  /** Reintento manual tras un error. */
  async reintentar() {
    this.intentos = 0;
    return this.guardarYa();
  }

  detener() {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private ejecutar(): Promise<void> {
    if (this.curso) return this.curso;
    this.curso = (async () => {
      try {
        while (this.pendiente && !this.detenido) {
          const { valor } = this.pendiente;
          this.pendiente = null;
          this.o.alCambiarEstado("guardando");

          let r: ResultadoGuardado;
          try {
            r = await this.o.guardar(valor);
          } catch {
            r = { ok: false, mensaje: "Sin conexión" };
          }

          if (r.ok) {
            this.intentos = 0;
            if (!this.pendiente) this.o.alCambiarEstado("guardado");
            continue;
          }
          this.pendiente ??= { valor }; // lo no guardado vuelve a la cola (salvo que haya algo más nuevo)
          if (r.conflicto) {
            this.detenido = true;
            this.o.alCambiarEstado("conflicto", r.mensaje);
            return;
          }
          const espera = this.esperas[this.intentos++];
          if (espera === undefined) {
            this.o.alCambiarEstado("error", r.mensaje);
            return;
          }
          this.o.alCambiarEstado("reintentando", r.mensaje);
          await new Promise((ok) => setTimeout(ok, espera));
        }
      } finally {
        this.curso = null;
      }
    })();
    return this.curso;
  }
}
