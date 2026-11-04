-- UMBRAL · Etapa 2 · Perfiles, bibliotecas, preferencias y personalización.
--
-- Modelo de seguridad: la aplicación consulta como el rol `umbral_app` (sin BYPASSRLS, sin acceso a las
-- tablas de Better Auth) y declara quién es con `set_config('app.user_id', ..., true)` dentro de cada
-- transacción (ver src/lib/db.ts). Las políticas RLS filtran por ese valor.

-- ---------------------------------------------------------------------------
-- Rol de la aplicación
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'umbral_app') then
    create role umbral_app nologin;
  end if;
end
$$;
-- Permite que el usuario de la conexión (propietario) haga `set local role umbral_app`.
grant umbral_app to current_user;
grant usage on schema public to umbral_app;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.app_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '')
$$;
grant execute on function public.app_user_id() to umbral_app;

-- ---------------------------------------------------------------------------
-- Perfiles (1 por cuenta). Los crea el trigger sobre "user".
-- ---------------------------------------------------------------------------
create table public.profiles (
  id text primary key references public."user" ("id") on delete cascade,
  guardiana_nombre text
    check (guardiana_nombre is null or char_length(btrim(guardiana_nombre)) between 2 and 40),
  onboarding_completado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (onboarding_completado_at is null or guardiana_nombre is not null)
);

-- ---------------------------------------------------------------------------
-- Bibliotecas personales (hoy una por cuenta; el id propio permite varias a futuro)
-- ---------------------------------------------------------------------------
create table public.bibliotecas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references public."user" ("id") on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- ---------------------------------------------------------------------------
-- Personalización inicial. La FK compuesta impide apuntar a la biblioteca de otra persona.
-- ---------------------------------------------------------------------------
create table public.personalizaciones (
  biblioteca_id uuid primary key,
  user_id text not null,
  apariencia text not null check (apariencia in ('noche', 'ocaso', 'alba')),
  ambiente text not null default 'gran-sala' check (ambiente in ('gran-sala')),
  updated_at timestamptz not null default now(),
  foreign key (biblioteca_id, user_id) references public.bibliotecas (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Preferencias de usuario
-- ---------------------------------------------------------------------------
create table public.preferencias (
  user_id text primary key references public."user" ("id") on delete cascade,
  idioma text not null default 'es-AR' check (idioma in ('es-AR')),
  reducir_movimiento text not null default 'sistema' check (reducir_movimiento in ('sistema', 'si', 'no')),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger bibliotecas_updated_at before update on public.bibliotecas
  for each row execute function public.set_updated_at();
create trigger personalizaciones_updated_at before update on public.personalizaciones
  for each row execute function public.set_updated_at();
create trigger preferencias_updated_at before update on public.preferencias
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Alta automática de perfil y preferencias al crearse la cuenta
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new."id");
  insert into public.preferencias (user_id) values (new."id");
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public;

create trigger on_user_created
  after insert on public."user"
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Cierre del onboarding: único camino para fijar onboarding_completado_at.
-- Verifica que existan nombre de Guardiana, biblioteca y personalización.
-- ---------------------------------------------------------------------------
create function public.completar_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid text := public.app_user_id();
begin
  if uid is null then
    raise exception 'no_autenticada' using errcode = '28000';
  end if;

  if not exists (select 1 from public.profiles where id = uid and guardiana_nombre is not null)
     or not exists (select 1 from public.personalizaciones where user_id = uid) then
    raise exception 'onboarding_incompleto' using errcode = 'P0001';
  end if;

  update public.profiles
     set onboarding_completado_at = coalesce(onboarding_completado_at, now())
   where id = uid;
end;
$$;
revoke all on function public.completar_onboarding() from public;
grant execute on function public.completar_onboarding() to umbral_app;

-- ---------------------------------------------------------------------------
-- Privilegios mínimos (columna por columna donde importa)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.bibliotecas, public.personalizaciones, public.preferencias
  from umbral_app;

grant select on public.profiles to umbral_app;
grant update (guardiana_nombre) on public.profiles to umbral_app;

grant select, insert on public.bibliotecas to umbral_app;
grant update (nombre) on public.bibliotecas to umbral_app;

grant select, insert on public.personalizaciones to umbral_app;
grant update (apariencia, ambiente) on public.personalizaciones to umbral_app;

grant select on public.preferencias to umbral_app;
grant update (idioma, reducir_movimiento) on public.preferencias to umbral_app;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bibliotecas enable row level security;
alter table public.personalizaciones enable row level security;
alter table public.preferencias enable row level security;

create policy profiles_select_propio on public.profiles
  for select to umbral_app using (id = public.app_user_id());
create policy profiles_update_propio on public.profiles
  for update to umbral_app
  using (id = public.app_user_id()) with check (id = public.app_user_id());

create policy bibliotecas_select_propia on public.bibliotecas
  for select to umbral_app using (user_id = public.app_user_id());
create policy bibliotecas_insert_propia on public.bibliotecas
  for insert to umbral_app with check (user_id = public.app_user_id());
create policy bibliotecas_update_propia on public.bibliotecas
  for update to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy personalizaciones_select_propia on public.personalizaciones
  for select to umbral_app using (user_id = public.app_user_id());
create policy personalizaciones_insert_propia on public.personalizaciones
  for insert to umbral_app with check (user_id = public.app_user_id());
create policy personalizaciones_update_propia on public.personalizaciones
  for update to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

create policy preferencias_select_propia on public.preferencias
  for select to umbral_app using (user_id = public.app_user_id());
create policy preferencias_update_propia on public.preferencias
  for update to umbral_app
  using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

-- ---------------------------------------------------------------------------
-- Cuentas anteriores a esta migración
-- ---------------------------------------------------------------------------
insert into public.profiles (id) select "id" from public."user" on conflict do nothing;
insert into public.preferencias (user_id) select "id" from public."user" on conflict do nothing;
