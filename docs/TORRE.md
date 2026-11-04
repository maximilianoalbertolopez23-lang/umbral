# La Torre (etapa 7)

Progresión y recompensas. Opcional y sin prisa: **no hay rachas, ni vencimientos, ni castigos**, y ninguna función del journal se bloquea. Los premios son estéticos (muebles, estilos, fondos, bordes).

## Cómo funciona

- **Hechos verificables** (`leerHechos`): libros terminados, reseñas, reflexiones, citas, sagas, fantasía, sala personalizada… se leen de la base, nunca los informa el cliente.
- **Libro mayor** `eventos_progreso` (solo agregar, `unique(user_id, clave)`): XP y Esencias son la **suma** de sus filas. Claves: `terminado:<lectura>`, `resena:<libro>`, `reflexion:<día>` (una por día), `mision:<id>`, `logro:<id>`, `compra:<articulo>`.
- **`sincronizarProgreso`** otorga lo que falta (idempotente, bajo `pg_advisory_xact_lock`). Se ejecuta al abrir La Torre y los editores de El Taller. Editar una reseña, recargar o evaluar N veces no duplica nada.
- **Inventario** `inventario` (solo agregar): se llena por compra (`comprarArticulo`: valida piso, saldo y duplicado, todo en una transacción) o por recompensa de un logro.
- **Uso real en El Taller**: `guardarDisenoSala` y las plantillas del journal rechazan en el servidor lo que está en la tienda y no en el inventario (`ErrorTaller` «bloqueado»). Los editores lo muestran deshabilitado («Se consigue en La Torre»).

## Ampliar (solo datos, `src/modules/torre/reglas.ts`)

| Qué | Dónde |
|---|---|
| Actividad con XP | `ACTIVIDADES` + su clave en `leerHechos` |
| Misión / logro | `MISIONES` / `LOGROS` (meta = métrica + objetivo; recompensa opcional con `items`) |
| Métrica nueva | `Metricas` + consulta en `leerHechos` |
| Artículo de tienda | `TIENDA` (`tipo:id`, precio, piso mínimo) — el test comprueba que apunta a algo existente |

Niveles: `xpParaNivel(n) = 50·n·(n−1)`. Sin compras reales ni monetización.

## Probar

`npx vitest run` (`src/modules/torre`, `db/tests/torre.test.ts`) y `npm run db:migrar` (0006). En la app: terminar un libro → `/torre` muestra el aviso y las Esencias → canjear → usarlo en `/taller/sala` o `/taller/journal`.

## Límites conocidos

- Borrar y recrear un libro genera nuevas claves (`terminado`/`reseña` por id de libro/lectura): es posible recargar recompensas con libros ficticios. Mitigación futura: clave por título/ISBN normalizado.
- Las misiones se evalúan al abrir La Torre/El Taller, no en el instante de la acción.
- Pendiente de tu rediseño de jugabilidad («menos Pet Society»): la Torre hoy es una pantalla de consulta y canje.
