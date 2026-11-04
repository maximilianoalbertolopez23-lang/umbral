import { FondoPortal } from "@/components/escena/FondoPortal";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <FondoPortal>
      <main id="contenido">{children}</main>
    </FondoPortal>
  );
}
