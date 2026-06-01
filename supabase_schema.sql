-- GRA Stay Manager V3 schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'Admin' check (role in ('Boss','Admin','Cleaner','Maintenance')),
  created_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text default 'Available',
  note text,
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  room_name text,
  guest text not null,
  guest_phone text,
  source text default 'Airbnb',
  check_in date not null,
  check_out date not null,
  total numeric default 0,
  paid numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  room_name text,
  task_type text default 'Cleaning + Bedding',
  task_date date not null,
  assignee text default 'Cleaner',
  status text default 'Pending',
  cost numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete set null,
  room_name text,
  issue text not null,
  status text default 'Pending',
  created_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric default 0,
  expense_date date default current_date,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  backup_date date default current_date,
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.cleaning_tasks enable row level security;
alter table public.repairs enable row level security;
alter table public.expenses enable row level security;
alter table public.backups enable row level security;

create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "user update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "user insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "authenticated read rooms" on public.rooms for select to authenticated using (true);
create policy "authenticated write rooms" on public.rooms for all to authenticated using (true) with check (true);
create policy "authenticated read bookings" on public.bookings for select to authenticated using (true);
create policy "authenticated write bookings" on public.bookings for all to authenticated using (true) with check (true);
create policy "authenticated read cleaning" on public.cleaning_tasks for select to authenticated using (true);
create policy "authenticated write cleaning" on public.cleaning_tasks for all to authenticated using (true) with check (true);
create policy "authenticated read repairs" on public.repairs for select to authenticated using (true);
create policy "authenticated write repairs" on public.repairs for all to authenticated using (true) with check (true);
create policy "authenticated read expenses" on public.expenses for select to authenticated using (true);
create policy "authenticated write expenses" on public.expenses for all to authenticated using (true) with check (true);
create policy "authenticated read backups" on public.backups for select to authenticated using (true);
create policy "authenticated write backups" on public.backups for all to authenticated using (true) with check (true);
