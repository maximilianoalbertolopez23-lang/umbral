/**
 * Interruptor del juego: Gran Sala, Taller, Torre, Portales, animaciones y música. Está APAGADO por defecto: la app se
 * publica como diario de lectura (Archivo + Escritorio). Para encenderlo hay que definir NEXT_PUBLIC_JUEGO=1 (en
 * .env.local o en Vercel) y volver a compilar. El código y los datos del juego se conservan intactos.
 */
export const JUEGO_ACTIVO = process.env.NEXT_PUBLIC_JUEGO === "1";

/** A dónde se va después de ingresar o terminar la bienvenida. */
export const RUTA_INICIO = JUEGO_ACTIVO ? "/sala" : "/archivo";
