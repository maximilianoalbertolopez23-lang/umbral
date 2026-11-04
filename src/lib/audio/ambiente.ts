/**
 * Música de fondo tranquila, generada en el momento con Web Audio (no hay archivo de audio ni derechos de terceros):
 * un colchón de acordes lentos (re dórico), notas sueltas tipo arpa con eco largo y un soplo de viento muy suave.
 * Nunca suena sola: el navegador exige un gesto de la persona y la interfaz le ofrece apagarla.
 */

/** Dm9 → Bbmaj7 → Fmaj7 → Cadd9, en Hz. */
export const ACORDES: readonly (readonly number[])[] = [
  [146.83, 220.0, 261.63, 329.63],
  [116.54, 174.61, 220.0, 293.66],
  [174.61, 220.0, 261.63, 329.63],
  [130.81, 196.0, 293.66, 329.63],
];
/** Re, fa, sol, la, do, re, fa (pentatónica menor de re): suena bien sobre cualquiera de los acordes. */
export const NOTAS_ARPA: readonly number[] = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46];
export const SEGUNDOS_POR_ACORDE = 15;

type ConstructorAudio = typeof AudioContext;

function impulso(ctx: AudioContext, segundos: number, caida: number): AudioBuffer {
  const largo = Math.floor(ctx.sampleRate * segundos);
  const buffer = ctx.createBuffer(2, largo, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const datos = buffer.getChannelData(canal);
    for (let i = 0; i < largo; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, caida);
  }
  return buffer;
}

export class MotorAmbiente {
  private ctx: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private bus: GainNode | null = null;
  private temporizadores = new Set<number>();
  private acorde = 0;
  private ultimaNota = -1;

  get sonando(): boolean {
    return this.ctx !== null;
  }

  async iniciar(volumen = 0.5): Promise<void> {
    if (this.ctx) return;
    const Constructor: ConstructorAudio | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext;
    if (!Constructor) throw new Error("Este navegador no soporta audio web.");
    const ctx = new Constructor({ latencyHint: "playback" });
    await ctx.resume();
    this.ctx = ctx;

    const ahora = ctx.currentTime;
    const maestro = ctx.createGain();
    maestro.gain.setValueAtTime(0, ahora);
    maestro.gain.linearRampToValueAtTime(volumen, ahora + 4);
    const compresor = ctx.createDynamicsCompressor();
    maestro.connect(compresor);
    compresor.connect(ctx.destination);

    const bus = ctx.createGain();
    const seco = ctx.createGain();
    seco.gain.value = 0.7;
    const eco = ctx.createConvolver();
    eco.buffer = impulso(ctx, 4.2, 2.4);
    const mojado = ctx.createGain();
    mojado.gain.value = 0.6;
    bus.connect(seco);
    seco.connect(maestro);
    bus.connect(eco);
    eco.connect(mojado);
    mojado.connect(maestro);
    this.maestro = maestro;
    this.bus = bus;

    this.viento(ctx, bus);
    this.programarAcorde();
    this.programarNota(1.5);
  }

  setVolumen(v: number) {
    if (this.ctx && this.maestro) this.maestro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  detener() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.ctx = null;
    this.temporizadores.forEach((t) => window.clearTimeout(t));
    this.temporizadores.clear();
    if (this.maestro) {
      this.maestro.gain.cancelScheduledValues(ctx.currentTime);
      this.maestro.gain.setValueAtTime(this.maestro.gain.value, ctx.currentTime);
      this.maestro.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
    }
    window.setTimeout(() => void ctx.close().catch(() => {}), 1700);
    this.maestro = null;
    this.bus = null;
  }

  private tarde(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.temporizadores.delete(id);
      fn();
    }, ms);
    this.temporizadores.add(id);
  }

  private programarAcorde() {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    this.tocarAcorde(ctx, this.bus, ACORDES[this.acorde % ACORDES.length], ctx.currentTime + 0.05, SEGUNDOS_POR_ACORDE);
    this.acorde++;
    this.tarde(() => this.programarAcorde(), SEGUNDOS_POR_ACORDE * 1000);
  }

  private tocarAcorde(ctx: AudioContext, bus: GainNode, notas: readonly number[], t0: number, duracion: number) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.Q.value = 0.4;
    filtro.frequency.setValueAtTime(650, t0);
    filtro.frequency.linearRampToValueAtTime(1050, t0 + duracion / 2);
    filtro.frequency.linearRampToValueAtTime(650, t0 + duracion + 4);
    filtro.connect(bus);
    const fin = t0 + duracion + 5;
    for (const f of notas) {
      for (const [tipo, desafinado, nivel] of [["sine", -5, 0.05], ["triangle", 6, 0.022]] as const) {
        const osc = ctx.createOscillator();
        osc.type = tipo;
        osc.frequency.value = f;
        osc.detune.value = desafinado;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(nivel, t0 + 4);
        g.gain.setValueAtTime(nivel, t0 + duracion);
        g.gain.linearRampToValueAtTime(0, fin);
        osc.connect(g);
        g.connect(filtro);
        osc.start(t0);
        osc.stop(fin + 0.1);
      }
    }
  }

  private programarNota(esperaS: number) {
    this.tarde(() => {
      const ctx = this.ctx;
      if (!ctx || !this.bus) return;
      let i = Math.floor(Math.random() * NOTAS_ARPA.length);
      if (i === this.ultimaNota) i = (i + 1) % NOTAS_ARPA.length;
      this.ultimaNota = i;
      this.tocarNota(ctx, this.bus, NOTAS_ARPA[i], ctx.currentTime, 0.5 + Math.random() * 0.5);
      if (Math.random() < 0.3) this.tocarNota(ctx, this.bus, NOTAS_ARPA[Math.min(i + 2, NOTAS_ARPA.length - 1)], ctx.currentTime + 0.4, 0.4);
      this.programarNota(2.2 + Math.random() * 3.8);
    }, esperaS * 1000);
  }

  private tocarNota(ctx: AudioContext, bus: GainNode, f: number, t0: number, fuerza: number) {
    const panorama = ctx.createStereoPanner();
    panorama.pan.value = Math.random() * 1.0 - 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.11 * fuerza, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    g.connect(panorama);
    panorama.connect(bus);
    for (const [tipo, mult, nivel] of [["triangle", 1, 1], ["sine", 2, 0.25]] as const) {
      const osc = ctx.createOscillator();
      osc.type = tipo;
      osc.frequency.value = f * mult;
      const n = ctx.createGain();
      n.gain.value = nivel;
      osc.connect(n);
      n.connect(g);
      osc.start(t0);
      osc.stop(t0 + 3.3);
    }
  }

  private viento(ctx: AudioContext, bus: GainNode) {
    const largo = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    const banda = ctx.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 480;
    banda.Q.value = 0.6;
    const nivel = ctx.createGain();
    nivel.gain.value = 0.012;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const profundidad = ctx.createGain();
    profundidad.gain.value = 0.007;
    lfo.connect(profundidad);
    profundidad.connect(nivel.gain);
    fuente.connect(banda);
    banda.connect(nivel);
    nivel.connect(bus);
    fuente.start();
    lfo.start();
  }
}
