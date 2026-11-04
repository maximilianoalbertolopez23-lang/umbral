import type { Metadata, Viewport } from "next";
import { Caveat, EB_Garamond, Inter, Lora } from "next/font/google";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap", preload: false });

const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: {
    default: "UMBRAL — El Archivo de los Mundos",
    template: "%s · UMBRAL",
  },
  description:
    "Un journal de lectura que se vive como un mundo: una biblioteca antigua que cambia con cada libro que habitás.",
  applicationName: "UMBRAL",
  appleWebApp: { title: "UMBRAL", capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#2E182F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${ebGaramond.variable} ${inter.variable} ${lora.variable} ${caveat.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
