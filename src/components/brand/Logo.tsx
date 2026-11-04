/* Los SVG de marca se sirven como <img>: evita colisiones de ids de gradientes entre instancias. */
/* eslint-disable @next/next/no-img-element */

const ASSETS = {
  vertical: { src: "/brand/umbral-logo-vertical.svg", ratio: 390.95 / 373.25 },
  horizontal: { src: "/brand/umbral-logo-horizontal.svg", ratio: 690.3 / 206.15 },
  marca: { src: "/brand/umbral-marca.svg", ratio: 280.37 / 287.48 },
  logotipo: { src: "/brand/umbral-logotipo.svg", ratio: 390.95 / 89.15 },
} as const;

export type VarianteLogo = keyof typeof ASSETS;

interface LogoProps {
  variante?: VarianteLogo;
  /** Alto en px. El ancho se deriva de la proporción original. */
  alto: number;
  className?: string;
  priority?: boolean;
  decorativo?: boolean;
}

/** Logo oficial. Diseñado para fondos oscuros (ciruela/morado): no usar sobre marfil. */
export function Logo({ variante = "vertical", alto, className, priority, decorativo }: LogoProps) {
  const { src, ratio } = ASSETS[variante];
  return (
    <img
      src={src}
      width={Math.round(alto * ratio)}
      height={alto}
      alt={decorativo ? "" : "UMBRAL"}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}
