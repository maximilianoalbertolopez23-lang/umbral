import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { exigeVerificacionCorreo } from "@/lib/config";
import { correoRecuperacion, correoVerificacion, enviarCorreo } from "@/lib/correo";
import { obtenerPool } from "@/lib/db";

function crearAuth() {
  return betterAuth({
    database: obtenerPool(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 72,
      requireEmailVerification: exigeVerificacionCorreo(),
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => enviarCorreo(correoRecuperacion(user.email, url)),
      // Registrarse con un correo que ya existe responde igual que siempre (no revela si hay cuenta), pero si esa cuenta
      // quedó sin confirmar se le vuelve a mandar el correo de confirmación: así nadie queda trabado.
      onExistingUserSignUp: async ({ user }) => {
        if (user.emailVerified || !exigeVerificacionCorreo()) return;
        await obtenerAuth().api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/bienvenida" } });
      },
    },
    emailVerification: {
      sendOnSignUp: exigeVerificacionCorreo(),
      // Intentar entrar con una cuenta sin confirmar reenvía el correo de confirmación.
      sendOnSignIn: exigeVerificacionCorreo(),
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => enviarCorreo(correoVerificacion(user.email, url)),
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof crearAuth>;
const global_ = globalThis as unknown as { __umbralAuth?: Auth };

/** Instancia perezosa: solo se crea cuando hay configuración (el build no la necesita). */
export function obtenerAuth(): Auth {
  global_.__umbralAuth ??= crearAuth();
  return global_.__umbralAuth;
}
