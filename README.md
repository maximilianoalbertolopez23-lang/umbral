# UMBRAL — El Archivo de los Mundos

Journal digital de lectura vivido como un mundo de fantasía medieval. «Los libros no se guardan. Se habitan.»

**Estado:** Etapa 7 (La Torre) más una primera auditoría integral; sin desplegar. Requiere Postgres y un secreto de sesión: ver `docs/CONFIGURACION.md`. Sin eso, la app lo indica y no simula nada.

## Ejecutar
```bash
npm install
npm run db:local   # Postgres local (otra terminal); ver docs/CONFIGURACION.md
npm run db:migrar
npm run dev      # http://localhost:3000
```

## Verificar
```bash
npm run lint
npm test
npm run build
```

## Más
- `docs/PRODUCTO.md` — visión, habitaciones, alcance
- `docs/ARQUITECTURA.md` — stack, estructura, decisiones
- `docs/CONFIGURACION.md` — base de datos, cuentas y correo
- `docs/ARCHIVO.md` — El Archivo: datos, reglas y cómo probarlo
- `docs/ESCRITORIO.md` — El Escritorio: bloques, plantillas, guardado y pruebas
- `docs/SALA.md` — La Gran Sala: objetos, estancias, accesibilidad y pruebas
- `docs/TALLER.md` — El Taller: sala, plantillas del journal y respaldo
- `docs/TORRE.md` — La Torre: XP, Esencias, misiones, logros, tienda
- `docs/DESPLIEGUE.md` — variables, migraciones, publicación, dominio y respaldos
- `docs/AUDITORIA.md` — informe de la auditoría integral
- `docs/PLAN.md` — etapas
- `brand/README.md` — identidad, recursos y pendientes de exportación

Next.js 16 difiere de versiones anteriores: ver `AGENTS.md` antes de tocar código.
