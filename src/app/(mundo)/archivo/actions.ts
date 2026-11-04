"use server";

import { revalidatePath } from "next/cache";
import type { PoolClient } from "pg";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/app/(auth)/actions";
import { obtenerUsuario } from "@/lib/auth/dal";
import { conUsuario } from "@/lib/db";
import { descargarPortadaOpenLibrary } from "@/lib/openlibrary";
import { erroresPorCampo } from "@/lib/validacion";
import {
  esquemaCalificacion,
  esquemaEstado,
  esquemaFechasLectura,
  esquemaLibro,
  esquemaProgreso,
} from "@/modules/archivo/esquemas";
import {
  actualizarFechasLectura,
  actualizarLibro,
  aplicarEstado,
  calificarLibro,
  crearLibro,
  eliminarLibro,
  ErrorDominio,
  guardarVistaArchivo,
  iniciarRelectura,
  registrarProgreso,
  type PortadaNueva,
} from "@/modules/archivo/repositorio";
import type { VistaArchivo } from "@/modules/archivo/tipos";
import { detectarImagen, fechaHoy, MAX_BYTES_PORTADA } from "@/modules/archivo/utiles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar los cambios. Probá de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Volvé a ingresar para continuar.";

const texto = (fd: FormData, campo: string) => (typeof fd.get(campo) === "string" ? (fd.get(campo) as string) : "");

/** Valores de texto del formulario, para no perder lo escrito cuando hay un error. */
function valoresDe(fd: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") salida[k] = v;
  return salida;
}

/** Corre una operación como la persona autenticada y traduce los errores a mensajes para el formulario. */
async function ejecutar<T>(
  operacion: (userId: string, db: PoolClient) => Promise<T>,
): Promise<{ ok: true; valor: T } | { ok: false; error: string }> {
  const usuario = await obtenerUsuario();
  if (!usuario) return { ok: false, error: SESION_VENCIDA };
  try {
    return { ok: true, valor: await conUsuario(usuario.id, (db) => operacion(usuario.id, db)) };
  } catch (e) {
    if (e instanceof ErrorDominio) return { ok: false, error: e.message };
    console.error("[archivo] error inesperado", e);
    return { ok: false, error: ERROR_GENERAL };
  }
}

type LecturaPortada = { portada: PortadaNueva | null } | { error: string };

/** Portada subida por la persona (ya redimensionada en el navegador) o, si no, la elegida en Open Library. */
async function leerPortada(fd: FormData): Promise<LecturaPortada> {
  const archivo = fd.get("portada");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_BYTES_PORTADA) return { error: "La portada pesa demasiado (máximo 400 KB)." };
    const datos = new Uint8Array(await archivo.arrayBuffer());
    const mime = detectarImagen(datos);
    if (!mime) return { error: "La portada debe ser una imagen JPG, PNG o WebP." };
    return { portada: { mime, datos } };
  }
  const coverId = Number(texto(fd, "portadaOpenLibrary"));
  if (Number.isInteger(coverId) && coverId > 0) {
    const datos = await descargarPortadaOpenLibrary(coverId, MAX_BYTES_PORTADA);
    const mime = datos ? detectarImagen(datos) : null;
    if (datos && mime) return { portada: { mime, datos } };
  }
  return { portada: null };
}

export async function crearLibroAction(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = valoresDe(fd);
  const r = esquemaLibro.safeParse(Object.fromEntries(fd));
  if (!r.success) return { campos: erroresPorCampo(r.error), valores };
  const portada = await leerPortada(fd);
  if ("error" in portada) return { campos: { portada: portada.error }, valores };

  const clave = texto(fd, "openlibraryKey").slice(0, 40);
  const resultado = await ejecutar((uid, db) =>
    crearLibro(db, uid, r.data, {
      portada: portada.portada,
      origen: clave ? "openlibrary" : "manual",
      openlibraryKey: clave || null,
    }),
  );
  if (!resultado.ok) return { error: resultado.error, valores };
  revalidatePath("/archivo");
  redirect(`/archivo/${resultado.valor}`);
}

export async function actualizarLibroAction(id: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const valores = valoresDe(fd);
  if (!UUID.test(id)) return { error: "No encontramos ese libro." };
  const r = esquemaLibro.safeParse(Object.fromEntries(fd));
  if (!r.success) return { campos: erroresPorCampo(r.error), valores };
  const portada = await leerPortada(fd);
  if ("error" in portada) return { campos: { portada: portada.error }, valores };

  const resultado = await ejecutar((uid, db) =>
    actualizarLibro(db, uid, id, r.data, { portada: portada.portada, quitarPortada: fd.get("quitarPortada") === "on" }),
  );
  if (!resultado.ok) return { error: resultado.error, valores };
  revalidatePath("/archivo");
  redirect(`/archivo/${id}`);
}

export async function eliminarLibroAction(id: string): Promise<EstadoForm> {
  if (!UUID.test(id)) return { error: "No encontramos ese libro." };
  const resultado = await ejecutar((uid, db) => eliminarLibro(db, uid, id));
  if (!resultado.ok) return { error: resultado.error };
  if (!resultado.valor) return { error: "Ese libro ya no existe." };
  revalidatePath("/archivo");
  redirect("/archivo");
}

export async function cambiarEstadoAction(id: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const r = esquemaEstado.safeParse({ estado: texto(fd, "estado") });
  if (!r.success || !UUID.test(id)) return { error: "Elegí un estado de lectura." };
  const hoy = fechaHoy();
  // Atajo desde la ficha: al terminar o abandonar se registra la fecha de hoy; al empezar, el inicio.
  const resultado = await ejecutar(async (uid, db) => {
    const actual = await db.query<{ fecha_inicio: string | null; fecha_fin: string | null }>(
      `select fecha_inicio, fecha_fin from lecturas where libro_id = $2 and user_id = $1 order by numero desc limit 1`,
      [uid, id],
    );
    const previa = actual.rows[0];
    const estado = r.data.estado;
    const fechaInicio = previa?.fecha_inicio ?? (estado === "quiero_leer" ? null : hoy);
    const fechaFin = estado === "terminado" || estado === "abandonado" ? (previa?.fecha_fin ?? hoy) : null;
    await aplicarEstado(db, uid, id, estado, { fechaInicio, fechaFin });
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath(`/archivo/${id}`);
  revalidatePath("/archivo");
  return { ok: true, info: "Estado actualizado." };
}

export async function registrarProgresoAction(id: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const entrada = { pagina: texto(fd, "pagina"), minutos: texto(fd, "minutos"), fecha: texto(fd, "fecha"), nota: texto(fd, "nota") };
  const r = esquemaProgreso.safeParse(entrada);
  if (!r.success || !UUID.test(id)) return { campos: r.success ? {} : erroresPorCampo(r.error), valores: entrada };

  const resultado = await ejecutar((uid, db) =>
    registrarProgreso(db, uid, id, {
      pagina: Number(r.data.pagina),
      minutos: r.data.minutos ? Number(r.data.minutos) : null,
      fecha: r.data.fecha || null,
      nota: r.data.nota || null,
    }),
  );
  if (!resultado.ok) return { error: resultado.error, valores: entrada };
  revalidatePath(`/archivo/${id}`);
  revalidatePath("/archivo");
  const { terminado, porcentaje } = resultado.valor;
  return {
    ok: true,
    info: terminado ? "¡Llegaste al final! Marcamos el libro como terminado." : `Progreso guardado${porcentaje !== null ? `: ${porcentaje} %` : ""}.`,
  };
}

export async function releerAction(id: string): Promise<EstadoForm> {
  if (!UUID.test(id)) return { error: "No encontramos ese libro." };
  const resultado = await ejecutar((uid, db) => iniciarRelectura(db, uid, id));
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath(`/archivo/${id}`);
  revalidatePath("/archivo");
  return { ok: true, info: `Empezaste la lectura n.º ${resultado.valor}. La anterior queda en el historial.` };
}

export async function calificarAction(id: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const r = esquemaCalificacion.safeParse({ calificacion: texto(fd, "calificacion") });
  if (!r.success || !UUID.test(id)) return { error: "La calificación va de 1 a 5." };
  const n = Number(r.data.calificacion);
  const resultado = await ejecutar((uid, db) => calificarLibro(db, uid, id, n === 0 ? null : n));
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath(`/escritorio/libro/${id}`);
  revalidatePath(`/archivo/${id}`);
  revalidatePath("/archivo");
  return { ok: true };
}

export async function fechasLecturaAction(lecturaId: string, libroId: string, _: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const entrada = { fechaInicio: texto(fd, "fechaInicio"), fechaFin: texto(fd, "fechaFin") };
  const r = esquemaFechasLectura.safeParse(entrada);
  if (!r.success || !UUID.test(lecturaId)) return { campos: r.success ? {} : erroresPorCampo(r.error), valores: entrada };
  const resultado = await ejecutar((uid, db) =>
    actualizarFechasLectura(db, uid, lecturaId, { fechaInicio: r.data.fechaInicio || null, fechaFin: r.data.fechaFin || null }),
  );
  if (!resultado.ok) return { error: resultado.error, valores: entrada };
  revalidatePath(`/archivo/${libroId}`);
  revalidatePath("/archivo");
  return { ok: true, info: "Fechas actualizadas." };
}

export async function guardarVistaAction(vista: VistaArchivo): Promise<void> {
  if (vista !== "estanteria" && vista !== "catalogo") return;
  await ejecutar((uid, db) => guardarVistaArchivo(db, uid, vista));
}
