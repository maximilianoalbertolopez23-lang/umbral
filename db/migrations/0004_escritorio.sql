-- UMBRAL · Etapa 4 · El Escritorio: journal por libro, diario general, imágenes y papelera.
--
-- Modelo:
--   diario_paginas   una fila por página. libro_id = null → diario general. El contenido es una lista de bloques (jsonb)
--                    validada por la aplicación (src/modules/escritorio/bloques.ts); aquí solo se acota tipo y tamaño.
--   diario_imagenes  imágenes subidas (bytea), siempre colgadas de una página de su dueña.
-- Eliminar una página la manda a la papelera (eliminada_at); se puede restaurar o borrar definitivamente.
-- Borrar un libro borra en cascada sus páginas del journal (la confirmación del Archivo lo advierte).

create table public.diario_paginas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public."user" ("id") on delete cascade,
  libro_id uuid,
  tipo text not null check (tipo in (
    'resena', 'reflexiones', 'citas', 'personajes', 'momentos', 'notas', 'libre',
    'objetivos', 'lista', 'recuerdos', 'resumen'
  )),
  titulo text not null default '' check (char_length(titulo) <= 120),
  contenido jsonb not null default '[]'::jsonb
    check (jsonb_typeof(contenido) = 'array' and octet_length(contenido::text) <= 400000),
  plantilla text not null default 'pergamino' check (plantilla in ('pergamino', 'archivo', 'editorial')),
  estado text not null default 'borrador' check (estado in ('borrador', 'publicada')),
  orden integer not null default 0,
  -- Control de concurrencia optimista: cada guardado exige la versión que la persona tenía abierta.
  version integer not null default 1,
  eliminada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (libro_id, user_id) references public.libros (id, user_id) on delete cascade
);
create index diario_paginas_ambito_idx on public.diario_paginas (user_id, libro_id, orden) where eliminada_at is null;
create index diario_paginas_papelera_idx on public.diario_paginas (user_id, eliminada_at) where eliminada_at is not null;

create table public.diario_imagenes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pagina_id uuid not null,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  datos bytea not null check (octet_length(datos) between 1 and 800000),
  created_at timestamptz not null default now(),
  foreign key (pagina_id, user_id) references public.diario_paginas (id, user_id) on delete cascade
);
create index diario_imagenes_pagina_idx on public.diario_imagenes (pagina_id);

-- Plantilla por defecto para las páginas nuevas.
alter table public.preferencias
  add column plantilla_diario text not null default 'pergamino'
  check (plantilla_diario in ('pergamino', 'archivo', 'editorial'));

create trigger diario_paginas_updated_at before update on public.diario_paginas
  for each row execute function public.set_updated_at();

-- Privilegios mínimos
grant select, insert, delete on public.diario_paginas to umbral_app;
grant update (titulo, contenido, plantilla, estado, orden, version, eliminada_at) on public.diario_paginas to umbral_app;
grant select, insert, delete on public.diario_imagenes to umbral_app;
grant update (plantilla_diario) on public.preferencias to umbral_app;

-- Row Level Security
alter table public.diario_paginas enable row level security;
alter table public.diario_imagenes enable row level security;

create policy diario_paginas_propias on public.diario_paginas
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy diario_imagenes_propias on public.diario_imagenes
  for all to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());
