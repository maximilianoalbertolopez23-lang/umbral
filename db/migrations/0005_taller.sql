-- UMBRAL · Etapa 6 · El Taller: diseño de la sala, plantillas propias del journal.
--
-- Principio: PRESENTACIÓN separada de CONTENIDO. Nada de esto contiene libros, notas ni páginas: son ajustes visuales
-- que se pueden cambiar o borrar sin tocar el contenido (diario_paginas.contenido no se modifica nunca desde aquí).
--
--   disenos_sala        distribución y materiales de una habitación (jsonb validado por la aplicación)
--   plantillas_journal  plantillas propias: una base + ajustes (fuente, colores, fondo, borde, distribución…)
--   diario_paginas.plantilla_custom_id / preferencias.plantilla_diario_custom_id  referencian una plantilla propia;
--   si la plantilla se borra, la referencia queda en null y la página vuelve a su plantilla base.

create table public.disenos_sala (
  biblioteca_id uuid not null,
  user_id text not null,
  habitacion text not null default 'sala' check (habitacion in ('sala')),
  diseno jsonb not null check (jsonb_typeof(diseno) = 'object' and octet_length(diseno::text) <= 100000),
  -- Control de concurrencia optimista (mismo criterio que las páginas del journal).
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (biblioteca_id, habitacion),
  foreign key (biblioteca_id, user_id) references public.bibliotecas (id, user_id) on delete cascade
);

create table public.plantillas_journal (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public."user" ("id") on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  base text not null check (base in ('pergamino', 'archivo', 'editorial')),
  ajustes jsonb not null check (jsonb_typeof(ajustes) = 'object' and octet_length(ajustes::text) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index plantillas_journal_user_idx on public.plantillas_journal (user_id, created_at);

alter table public.diario_paginas add column plantilla_custom_id uuid;
alter table public.diario_paginas
  add foreign key (plantilla_custom_id, user_id) references public.plantillas_journal (id, user_id)
  on delete set null (plantilla_custom_id);

alter table public.preferencias add column plantilla_diario_custom_id uuid;
alter table public.preferencias
  add foreign key (plantilla_diario_custom_id, user_id) references public.plantillas_journal (id, user_id)
  on delete set null (plantilla_diario_custom_id);

create trigger disenos_sala_updated_at before update on public.disenos_sala
  for each row execute function public.set_updated_at();
create trigger plantillas_journal_updated_at before update on public.plantillas_journal
  for each row execute function public.set_updated_at();

-- Privilegios mínimos
grant select, insert, delete on public.disenos_sala to umbral_app;
grant update (diseno, version) on public.disenos_sala to umbral_app;
grant select, insert, delete on public.plantillas_journal to umbral_app;
grant update (nombre, base, ajustes) on public.plantillas_journal to umbral_app;
grant update (plantilla_custom_id) on public.diario_paginas to umbral_app;
grant update (plantilla_diario_custom_id) on public.preferencias to umbral_app;

-- Row Level Security
alter table public.disenos_sala enable row level security;
alter table public.plantillas_journal enable row level security;

create policy disenos_sala_propios on public.disenos_sala
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy plantillas_journal_propias on public.plantillas_journal
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());
