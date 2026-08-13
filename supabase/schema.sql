-- SHPE LAMC website — database schema
-- Run this once in the Supabase project's SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

-- ============================================================
-- 1. PROFILES — one row per signed-up user, tracks approval state
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'pending' check (role in ('pending', 'admin')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone can see their own profile (so the site can show "pending approval").
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Approved admins can see every profile (needed for the approvals queue).
create policy "profiles: admins read all"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Only the owner can change someone else's role/owner flag (the approval action).
create policy "profiles: owner updates roles"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_owner = true)
  );

-- Auto-create a pending profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helper: is the current user an approved admin?
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer set search_path = public stable;

-- ============================================================
-- 2. EVENTS — public list, admin-managed
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  event_time text,
  location text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events: public read" on public.events for select using (true);
create policy "events: admin write" on public.events for insert with check (public.is_admin());
create policy "events: admin update" on public.events for update using (public.is_admin());
create policy "events: admin delete" on public.events for delete using (public.is_admin());

-- ============================================================
-- 3. RESOURCES — the internal "SharePoint" document library (logged-in only)
-- ============================================================
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  category text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Only approved admins/board can view the library (not the general public).
create policy "resources: admin read" on public.resources for select using (public.is_admin());
create policy "resources: admin write" on public.resources for insert with check (public.is_admin());
create policy "resources: admin update" on public.resources for update using (public.is_admin());
create policy "resources: admin delete" on public.resources for delete using (public.is_admin());

-- ============================================================
-- 4. SPONSORS — public list, admin-managed
-- ============================================================
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;

create policy "sponsors: public read" on public.sponsors for select using (true);
create policy "sponsors: admin write" on public.sponsors for insert with check (public.is_admin());
create policy "sponsors: admin update" on public.sponsors for update using (public.is_admin());
create policy "sponsors: admin delete" on public.sponsors for delete using (public.is_admin());

-- ============================================================
-- 5. SCHOLARSHIPS — public list, admin-managed
-- ============================================================
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  deadline date,
  link text,
  created_at timestamptz not null default now()
);

alter table public.scholarships enable row level security;

create policy "scholarships: public read" on public.scholarships for select using (true);
create policy "scholarships: admin write" on public.scholarships for insert with check (public.is_admin());
create policy "scholarships: admin update" on public.scholarships for update using (public.is_admin());
create policy "scholarships: admin delete" on public.scholarships for delete using (public.is_admin());

-- ============================================================
-- 6. STORAGE — file uploads for the resource library
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

create policy "resource files: admin read"
  on storage.objects for select
  using (bucket_id = 'resources' and public.is_admin());

create policy "resource files: admin upload"
  on storage.objects for insert
  with check (bucket_id = 'resources' and public.is_admin());

create policy "resource files: admin delete"
  on storage.objects for delete
  using (bucket_id = 'resources' and public.is_admin());

-- ============================================================
-- 7. ONE-TIME SETUP — make the first account the owner
-- ============================================================
-- After you sign up on the live site with your own email, run this once
-- (replace the email) to make yourself the owner and first admin:
--
-- update public.profiles
-- set role = 'admin', is_owner = true
-- where email = 'you@example.com';
