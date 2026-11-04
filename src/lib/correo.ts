import "server-only";
import nodemailer from "nodemailer";

interface Correo {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

/** Envía por SMTP (SMTP_URL). Sin SMTP solo se tolera en desarrollo, donde el enlace queda en la consola del servidor. */
export async function enviarCorreo({ para, asunto, texto, html }: Correo) {
  const smtp = process.env.SMTP_URL;
  if (!smtp) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL no está configurado.");
    console.info(`\n[correo de desarrollo, SMTP_URL sin configurar]\nPara: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return;
  }
  const transporte = nodemailer.createTransport(smtp);
  await transporte.sendMail({
    from: process.env.MAIL_FROM ?? "UMBRAL <no-responder@umbral.local>",
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
}

function plantilla(titulo: string, cuerpo: string, boton: string, url: string) {
  return `<div style="background:#2E182F;padding:32px;font-family:Georgia,serif;color:#FCF8F2">
  <h1 style="font-weight:400;font-size:26px;margin:0 0 16px">${titulo}</h1>
  <p style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;margin:0 0 24px">${cuerpo}</p>
  <a href="${url}" style="display:inline-block;background:#F2C7A2;color:#2E182F;font-family:Arial,sans-serif;text-decoration:none;padding:14px 28px;border-radius:999px">${boton}</a>
  <p style="font-family:Arial,sans-serif;font-size:13px;color:#AE7A7E;margin:24px 0 0">Si no fuiste vos, ignorá este mensaje.</p>
</div>`;
}

export function correoVerificacion(para: string, url: string): Correo {
  return {
    para,
    asunto: "Confirmá tu correo · UMBRAL",
    texto: `Confirmá tu correo para recibir las llaves de la biblioteca: ${url}\n\nSi no fuiste vos, ignorá este mensaje.`,
    html: plantilla("Recibí las llaves", "Confirmá tu correo para entrar a la biblioteca.", "Confirmar correo", url),
  };
}

export function correoRecuperacion(para: string, url: string): Correo {
  return {
    para,
    asunto: "Recuperá el acceso · UMBRAL",
    texto: `Elegí una contraseña nueva para tu cuenta: ${url}\n\nEl enlace vence en una hora. Si no fuiste vos, ignorá este mensaje.`,
    html: plantilla("Recuperar el acceso", "Usá este enlace para elegir una contraseña nueva. Vence en una hora.", "Elegir contraseña", url),
  };
}
