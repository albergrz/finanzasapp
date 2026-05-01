-- ============================================================================
-- Coliseum Finanzas — Supabase schema (run once in SQL Editor)
-- ============================================================================

-- Roles enum
do $$ begin
  create type role as enum ('jefe', 'peluquero');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('efectivo', 'tarjeta', 'bizum');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- profiles  (1:1 con auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  role role not null default 'peluquero',
  created_at timestamptz not null default now()
);

-- Auto-crear profile al registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- barbers
-- ============================================================================
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- services
-- ============================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- tickets
-- ============================================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  method payment_method not null,
  client text,
  occurred_at timestamptz not null default now(),
  appointment_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tickets_occurred_at_idx on public.tickets(occurred_at desc);
create index if not exists tickets_barber_id_idx on public.tickets(barber_id);

-- ============================================================================
-- appointments
-- ============================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  appt_date date not null,
  appt_time time not null,
  client text,
  status appointment_status not null default 'pending',
  ticket_id uuid references public.tickets(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_idx on public.appointments(appt_date);

-- FK cruzada (tickets → appointments) creada después porque la tabla aún no existía
do $$ begin
  alter table public.tickets
    add constraint tickets_appointment_id_fkey
    foreign key (appointment_id) references public.appointments(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Helpers
-- ============================================================================
create or replace function public.is_jefe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'jefe', false);
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.barbers     enable row level security;
alter table public.services    enable row level security;
alter table public.tickets     enable row level security;
alter table public.appointments enable row level security;

-- profiles: cada uno ve su perfil; el jefe ve todos
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select
  using (id = auth.uid() or public.is_jefe());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_jefe_update on public.profiles;
create policy profiles_jefe_update on public.profiles for update
  using (public.is_jefe()) with check (public.is_jefe());

-- barbers / services: todos los autenticados leen; solo jefe escribe
drop policy if exists barbers_read on public.barbers;
create policy barbers_read on public.barbers for select using (auth.uid() is not null);

drop policy if exists barbers_write on public.barbers;
create policy barbers_write on public.barbers for all using (public.is_jefe()) with check (public.is_jefe());

drop policy if exists services_read on public.services;
create policy services_read on public.services for select using (auth.uid() is not null);

drop policy if exists services_write on public.services;
create policy services_write on public.services for all using (public.is_jefe()) with check (public.is_jefe());

-- tickets: todos autenticados leen e insertan; actualizar/borrar solo jefe
drop policy if exists tickets_read on public.tickets;
create policy tickets_read on public.tickets for select using (auth.uid() is not null);

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets for insert with check (auth.uid() is not null);

drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets for update using (public.is_jefe()) with check (public.is_jefe());

drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete on public.tickets for delete using (public.is_jefe());

-- appointments: todos autenticados leen, insertan y actualizan; borrar solo jefe
drop policy if exists appts_read on public.appointments;
create policy appts_read on public.appointments for select using (auth.uid() is not null);

drop policy if exists appts_insert on public.appointments;
create policy appts_insert on public.appointments for insert with check (auth.uid() is not null);

drop policy if exists appts_update on public.appointments;
create policy appts_update on public.appointments for update using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists appts_delete on public.appointments;
create policy appts_delete on public.appointments for delete using (public.is_jefe());

-- ============================================================================
-- Seed inicial (servicios y peluqueros provisionales)
-- ============================================================================
insert into public.barbers (name, display_order) values
  ('Saad', 1), ('Jorge', 2), ('Adrián', 3)
on conflict do nothing;

insert into public.services (name, price, display_order) values
  ('Corte', 18, 1),
  ('Tinte', 55, 2),
  ('Mechas', 75, 3),
  ('Peinado', 20, 4),
  ('Barba', 12, 5),
  ('Tratamiento', 35, 6)
on conflict do nothing;
