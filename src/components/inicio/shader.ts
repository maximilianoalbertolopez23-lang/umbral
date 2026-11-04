/**
 * Animación del paisaje de la bienvenida. Es un shader sobre la misma ilustración (no hay capas separadas): cada zona
 * se mueve con una máscara suave dibujada a mano sobre la imagen (coordenadas 0..1, origen arriba a la izquierda).
 * - nubes: deriva lenta hacia la derecha (dos copias desplazadas que se funden entre sí)
 * - cascadas: caída continua + destellos de espuma + neblina en la base
 * - río: corriente hacia el frente + destellos del atardecer
 * - luces: ventanas del castillo, faroles del puente y el farol grande parpadean; el sol «respira»
 * - follaje: viento muy leve en las enredaderas, las flores y los árboles del borde
 */

export const VERTICE = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAGMENTO = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uScale;
uniform float uAspect;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.1) + 0.125 * noise(p * 4.3);
}
float caja(vec2 uv, vec2 a, vec2 b, float s) {
  vec2 d = smoothstep(a - s, a, uv) * (1.0 - smoothstep(b, b + s, uv));
  return d.x * d.y;
}
float mancha(vec2 uv, vec2 c, float r) {
  vec2 d = (uv - c) * vec2(uAspect, 1.0);
  return exp(-dot(d, d) / (r * r));
}
vec3 fluir(vec2 uv, vec2 dir, float amp, float vel) {
  float p0 = fract(uTime * vel);
  float p1 = fract(uTime * vel + 0.5);
  float wa = 1.0 - abs(2.0 * p0 - 1.0);
  vec3 a = texture2D(uTex, uv - dir * amp * p0).rgb;
  vec3 b = texture2D(uTex, uv - dir * amp * p1).rgb;
  return a * wa + b * (1.0 - wa);
}

void main() {
  float t = uTime;
  vec2 uv0 = (vUv - 0.5) * uScale + 0.5;

  // Máscaras (sobre la imagen sin desplazar)
  float cielo = max(smoothstep(0.47, 0.55, uv0.x) * (1.0 - smoothstep(0.18, 0.30, uv0.y)), smoothstep(0.27, 0.33, uv0.x) * (1.0 - smoothstep(0.03, 0.075, uv0.y)));
  float cascada = caja(uv0, vec2(0.295, 0.36), vec2(0.345, 0.45), 0.015);
  cascada = max(cascada, caja(uv0, vec2(0.405, 0.37), vec2(0.44, 0.44), 0.012));
  cascada = max(cascada, caja(uv0, vec2(0.262, 0.465), vec2(0.385, 0.70), 0.02));
  cascada = max(cascada, caja(uv0, vec2(0.532, 0.55), vec2(0.558, 0.69), 0.012));
  float rio = caja(uv0, vec2(0.40, 0.775), vec2(0.78, 1.0), 0.04);
  float hojas = (1.0 - smoothstep(0.17, 0.21, uv0.x)) * (1.0 - smoothstep(0.26, 0.32, uv0.y));
  float flores = (1.0 - smoothstep(0.22, 0.26, uv0.x)) * smoothstep(0.76, 0.82, uv0.y);
  float arboles = smoothstep(0.80, 0.86, uv0.x) * smoothstep(0.55, 0.62, uv0.y);

  // Viento en el follaje
  vec2 uv = uv0;
  uv.x += sin(t * 1.1 + uv0.y * 9.0 + uv0.x * 5.0) * 0.0035 * hojas;
  uv.y += cos(t * 0.8 + uv0.x * 8.0) * 0.0015 * hojas;
  uv.x += sin(t * 1.4 + uv0.x * 14.0) * 0.0025 * flores;
  uv.x += sin(t * 0.9 + uv0.y * 7.0) * 0.0018 * arboles;

  vec3 col = texture2D(uTex, uv).rgb;

  // Nubes: deriva hacia la derecha
  if (cielo > 0.002) {
    float modula = 0.6 + 0.8 * noise(uv0 * 3.0 + vec2(t * 0.01, 0.0));
    col = mix(col, fluir(uv, vec2(1.0, 0.04), 0.032 * modula, 0.022), cielo);
  }
  // Cascadas: caída continua
  if (cascada > 0.002) {
    col = mix(col, fluir(uv, vec2(0.0, 1.0), 0.06, 0.62), cascada);
    float hebra = fbm(vec2(uv0.x * 70.0, uv0.y * 6.0 - t * 1.4));
    col += vec3(0.75, 0.80, 1.0) * smoothstep(0.55, 0.9, hebra) * 0.26 * cascada;
  }
  // Río: corriente hacia el frente y destellos
  if (rio > 0.002) {
    col = mix(col, fluir(uv, vec2(-0.35, 1.0), 0.022, 0.30), rio);
    float chispa = smoothstep(0.78, 0.95, noise(vec2(uv0.x * 90.0, uv0.y * 260.0) + vec2(t * 0.45, t * 1.1)));
    float reflejo = mancha(uv0, vec2(0.62, 0.90), 0.22);
    col += vec3(1.0, 0.70, 0.45) * chispa * rio * (0.12 + 0.55 * reflejo);
  }
  // Neblina en la base de las cascadas
  float neblina = mancha(uv0, vec2(0.30, 0.71), 0.07) + mancha(uv0, vec2(0.545, 0.70), 0.05) + mancha(uv0, vec2(0.34, 0.46), 0.05);
  col += vec3(0.9, 0.85, 1.0) * neblina * fbm(uv0 * vec2(8.0, 12.0) + vec2(t * 0.03, -t * 0.05)) * 0.16;

  // Luces: ventanas del castillo, faroles del puente y farol grande
  float luz = 0.0;
  luz += mancha(uv0, vec2(0.300, 0.173), 0.010) * (0.55 + 0.45 * sin(t * 2.1 + 1.0) * sin(t * 1.3));
  luz += mancha(uv0, vec2(0.310, 0.175), 0.010) * (0.55 + 0.45 * sin(t * 2.7 + 3.0) * sin(t * 1.1));
  luz += mancha(uv0, vec2(0.287, 0.218), 0.010) * (0.55 + 0.45 * sin(t * 1.9 + 5.0) * sin(t * 1.7));
  luz += mancha(uv0, vec2(0.333, 0.210), 0.010) * (0.55 + 0.45 * sin(t * 2.4 + 2.0) * sin(t * 1.2));
  luz += mancha(uv0, vec2(0.293, 0.320), 0.012) * (0.55 + 0.45 * sin(t * 2.2 + 4.0) * sin(t * 1.5));
  luz += mancha(uv0, vec2(0.250, 0.320), 0.012) * (0.55 + 0.45 * sin(t * 1.8 + 6.0) * sin(t * 1.4));
  luz += mancha(uv0, vec2(0.357, 0.315), 0.012) * (0.55 + 0.45 * sin(t * 2.6 + 7.0) * sin(t * 1.6));
  luz += mancha(uv0, vec2(0.410, 0.295), 0.010) * (0.55 + 0.45 * sin(t * 2.0 + 8.0) * sin(t * 1.9));
  luz += mancha(uv0, vec2(0.568, 0.475), 0.012) * (0.6 + 0.4 * sin(t * 3.1 + 1.0));
  luz += mancha(uv0, vec2(0.651, 0.468), 0.012) * (0.6 + 0.4 * sin(t * 2.8 + 2.0));
  luz += mancha(uv0, vec2(0.742, 0.465), 0.012) * (0.6 + 0.4 * sin(t * 3.3 + 3.0));
  luz += mancha(uv0, vec2(0.845, 0.462), 0.012) * (0.6 + 0.4 * sin(t * 2.9 + 4.0));
  col += vec3(1.0, 0.72, 0.38) * luz * 0.22;
  float farol = mancha(uv0, vec2(0.082, 0.59), 0.045) * (0.65 + 0.35 * sin(t * 4.0) * sin(t * 2.3 + 1.0) + 0.1 * noise(vec2(t * 6.0, 1.0)));
  col += vec3(1.0, 0.70, 0.35) * farol * 0.22;

  // El sol detrás del castillo «respira»
  col += vec3(1.0, 0.62, 0.30) * mancha(uv0, vec2(0.455, 0.315), 0.13) * (0.07 + 0.04 * sin(t * 0.45));

  gl_FragColor = vec4(col, 1.0);
}`;
