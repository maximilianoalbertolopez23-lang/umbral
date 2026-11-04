-- UMBRAL · Etapa 7 · La Torre: experiencia, Esencias, misiones, logros e inventario.
--
-- Todo el progreso sale de UN libro mayor de solo-agregar (eventos_progreso). No hay contadores editables: el XP y las
-- Esencias son la suma de sus filas. Cada evento tiene una `clave` única por persona (p. ej. «terminado:<lectura>»), de
-- modo que un mismo hecho NUNCA se premia dos veces, por más que se edite o se vuelva a evaluar.
--
--   eventos_progreso  libro mayor: actividades, misiones, logros y compras (compra = Esencias negativas)
--   inventario        lo que la persona tiene: se llena por compra o por recompensa y se usa desde El Taller
--
-- La aplicación solo puede leer e insertar: no hay UPDATE ni DELETE para umbral_app.

create table public.eventos_progreso (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public."user" ("id") on delete cascade,
  clave text not null check (char_length(clave) between 3 and 200),
  tipo text not null check (tipo in ('actividad', 'mision', 'logro', 'compra')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  xp integer not null default 0 check (xp >= 0),
  esencias integer not null default 0,
  -- Solo una compra puede restar Esencias; todo lo demás las suma.
  check ((tipo = 'compra' and esencias <= 0 and xp = 0) or (tipo <> 'compra' and esencias >= 0)),
  created_at timestamptz not null default now(),
  unique (user_id, clave)
);
create index eventos_progreso_user_idx on public.eventos_progreso (user_id, created_at desc);

create table public.inventario (
  user_id text not null references public."user" ("id") on delete cascade,
  clave text not null check (char_length(clave) between 3 and 120),
  origen text not null check (origen in ('compra', 'recompensa')),
  created_at timestamptz not null default now(),
  primary key (user_id, clave)
);

grant select, insert on public.eventos_progreso to umbral_app;
grant select, insert on public.inventario to umbral_app;

alter table public.eventos_progreso enable row level security;
alter table public.inventario enable row level security;

create policy eventos_progreso_propios on public.eventos_progreso
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy inventario_propio on public.inventario
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());
