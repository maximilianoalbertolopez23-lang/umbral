-- UMBRAL · Etapa 3 · El Archivo: libros, lecturas (relecturas), historial de progreso y portadas.
--
-- Modelo:
--   libros            datos del libro + estado ACTUAL (espejo del estado de su última lectura)
--   lecturas          cada pasada por el libro (1ª lectura, relecturas…) con sus fechas y página actual
--   sesiones_lectura  historial de progreso: cada registro de avance de una lectura
--   portadas          imagen subida por la persona (bytea), servida solo a su dueña
-- Las FK compuestas (id, user_id) impiden relacionar filas de personas distintas.

-- ---------------------------------------------------------------------------
-- Libros
-- ---------------------------------------------------------------------------
create table public.libros (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  biblioteca_id uuid not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  autores text[] not null default '{}' check (cardinality(autores) <= 10),
  isbn text check (isbn is null or isbn ~ '^[0-9]{9}[0-9X]$' or isbn ~ '^[0-9]{13}$'),
  saga text check (saga is null or char_length(btrim(saga)) between 1 and 120),
  saga_numero numeric(5, 1) check (saga_numero is null or saga_numero > 0),
  generos text[] not null default '{}' check (cardinality(generos) <= 10),
  etiquetas text[] not null default '{}' check (cardinality(etiquetas) <= 20),
  paginas_total integer check (paginas_total is null or paginas_total between 1 and 20000),
  sinopsis text check (sinopsis is null or char_length(sinopsis) <= 4000),
  estado text not null default 'quiero_leer'
    check (estado in ('quiero_leer', 'leyendo', 'terminado', 'pausado', 'abandonado')),
  calificacion smallint check (calificacion between 1 and 5),
  portada_version integer not null default 0,
  origen text not null default 'manual' check (origen in ('manual', 'openlibrary')),
  openlibrary_key text check (openlibrary_key is null or char_length(openlibrary_key) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (biblioteca_id, user_id) references public.bibliotecas (id, user_id) on delete cascade
);
create index libros_user_creado_idx on public.libros (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Lecturas: una fila por cada vez que se lee el libro. Las relecturas suman filas; nada se pisa.
-- ---------------------------------------------------------------------------
create table public.lecturas (
  id uuid primary key default gen_random_uuid(),
  libro_id uuid not null,
  user_id text not null,
  numero integer not null check (numero >= 1),
  estado text not null check (estado in ('leyendo', 'terminado', 'pausado', 'abandonado')),
  fecha_inicio date,
  fecha_fin date,
  pagina_actual integer not null default 0 check (pagina_actual >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (libro_id, numero),
  unique (id, user_id),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  check (fecha_fin is null or estado in ('terminado', 'abandonado')),
  foreign key (libro_id, user_id) references public.libros (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Historial de progreso (sesiones de lectura)
-- ---------------------------------------------------------------------------
create table public.sesiones_lectura (
  id uuid primary key default gen_random_uuid(),
  lectura_id uuid not null,
  user_id text not null,
  fecha date not null,
  pagina_inicio integer not null check (pagina_inicio >= 0),
  pagina_fin integer not null check (pagina_fin >= 0),
  minutos integer check (minutos is null or minutos between 1 and 1440),
  nota text check (nota is null or char_length(nota) <= 500),
  created_at timestamptz not null default now(),
  foreign key (lectura_id, user_id) references public.lecturas (id, user_id) on delete cascade
);
create index sesiones_lectura_idx on public.sesiones_lectura (lectura_id, fecha desc, created_at desc);

-- ---------------------------------------------------------------------------
-- Portadas subidas por la persona
-- ---------------------------------------------------------------------------
create table public.portadas (
  libro_id uuid primary key,
  user_id text not null,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  datos bytea not null check (octet_length(datos) between 1 and 500000),
  created_at timestamptz not null default now(),
  foreign key (libro_id, user_id) references public.libros (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Preferencia de vista del Archivo
-- ---------------------------------------------------------------------------
alter table public.preferencias
  add column vista_archivo text not null default 'estanteria' check (vista_archivo in ('estanteria', 'catalogo'));

-- ---------------------------------------------------------------------------
-- Consistencia del progreso con las páginas totales (la base es la última barrera)
-- ---------------------------------------------------------------------------
create function public.verificar_progreso()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total integer;
begin
  if tg_table_name = 'lecturas' then
    select paginas_total into total from public.libros where id = new.libro_id;
    if total is not null and new.pagina_actual > total then
      raise exception 'progreso_excede_total' using errcode = 'P0001';
    end if;
  else
    select l.paginas_total into total
      from public.lecturas t join public.libros l on l.id = t.libro_id
     where t.id = new.lectura_id;
    if total is not null and (new.pagina_inicio > total or new.pagina_fin > total) then
      raise exception 'progreso_excede_total' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger lecturas_progreso before insert or update on public.lecturas
  for each row execute function public.verificar_progreso();
create trigger sesiones_progreso before insert or update on public.sesiones_lectura
  for each row execute function public.verificar_progreso();

create function public.verificar_total_paginas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paginas_total is not null and new.paginas_total is distinct from old.paginas_total then
    if exists (
      select 1 from public.lecturas where libro_id = new.id and pagina_actual > new.paginas_total
    ) or exists (
      select 1 from public.sesiones_lectura s join public.lecturas t on t.id = s.lectura_id
       where t.libro_id = new.id and greatest(s.pagina_inicio, s.pagina_fin) > new.paginas_total
    ) then
      raise exception 'total_menor_que_progreso' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger libros_total_paginas before update on public.libros
  for each row execute function public.verificar_total_paginas();

create trigger libros_updated_at before update on public.libros
  for each row execute function public.set_updated_at();
create trigger lecturas_updated_at before update on public.lecturas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privilegios mínimos
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.libros to umbral_app;
grant update (titulo, autores, isbn, saga, saga_numero, generos, etiquetas, paginas_total, sinopsis,
              estado, calificacion, portada_version, origen, openlibrary_key)
  on public.libros to umbral_app;

grant select, insert, delete on public.lecturas to umbral_app;
grant update (estado, fecha_inicio, fecha_fin, pagina_actual) on public.lecturas to umbral_app;

grant select, insert, delete on public.sesiones_lectura to umbral_app;

grant select, insert, delete on public.portadas to umbral_app;
grant update (mime, datos) on public.portadas to umbral_app;

grant update (vista_archivo) on public.preferencias to umbral_app;

-- ---------------------------------------------------------------------------
-- Row Level Security: cada persona solo ve y toca sus filas
-- ---------------------------------------------------------------------------
alter table public.libros enable row level security;
alter table public.lecturas enable row level security;
alter table public.sesiones_lectura enable row level security;
alter table public.portadas enable row level security;

create policy libros_propios on public.libros
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy lecturas_propias on public.lecturas
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy sesiones_propias on public.sesiones_lectura
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy portadas_propias on public.portadas
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());
