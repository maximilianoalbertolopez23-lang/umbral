import type { ModuloId } from "@/modules/registry";

/** Iconos de línea geométricos para la navegación. Decorativos: el texto acompaña siempre. */
const trazos: Record<ModuloId, React.ReactNode> = {
  sala: <path d="M5 21V10a7 7 0 0 1 14 0v11M9 21v-8a3 3 0 0 1 6 0v8M3 21h18" />,
  archivo: <path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5ZM12 6v13.5" />,
  escritorio: <path d="M20 4C12 5 7 10 5.5 16.5L4 20l3.5-1.5C14 17 19 12 20 4ZM9 15l5-5" />,
  taller: <path d="M14.5 6.5 17.5 3.5l3 3-3 3M3 21l10.5-10.5M12 8l4 4M6 14l4 4" />,
  torre: <path d="M8 21V9l-1-5h10l-1 5v12M8 21h8M12 12v3M4 21h16" />,
  portales: <path d="M12 3a8 8 0 0 0-8 8v10h16V11a8 8 0 0 0-8-8Zm0 5a3 3 0 0 0-3 3v10h6V11a3 3 0 0 0-3-3Z" />,
};

export function IconoModulo({ id, className }: { id: ModuloId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {trazos[id]}
    </svg>
  );
}
