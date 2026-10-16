-- 003: Our Story section, photo descriptions (accessibility), and
-- weekly LAMC event suggestions. Safe to run more than once.

-- Our Story + photo descriptions on the homepage/join page
alter table public.site_settings
  add column if not exists hero_image_alt text,
  add column if not exists join_image_alt text,
  add column if not exists story_text text,
  add column if not exists founder_image_url text,
  add column if not exists founder_image_alt text,
  add column if not exists builder_text text,
  add column if not exists builder_image_url text,
  add column if not exists builder_image_alt text,
  add column if not exists builder_signature text,
  add column if not exists mos_text text,
  add column if not exists mos_image_url text,
  add column if not exists mos_image_alt text,
  add column if not exists sis_text text,
  add column if not exists sis_image_url text,
  add column if not exists sis_image_alt text;

-- Optional "More info" link on events
alter table public.events
  add column if not exists link_url text;

-- Photo descriptions for slideshow photos
alter table public.slideshow_photos
  add column if not exists alt_text text;

-- Events found on lamission.edu, waiting for a board member to approve
create table if not exists public.event_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  event_time text,
  location text,
  source_url text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'dismissed')),
  found_at timestamptz not null default now()
);

alter table public.event_suggestions enable row level security;

drop policy if exists "event_suggestions: admin read" on public.event_suggestions;
drop policy if exists "event_suggestions: admin write" on public.event_suggestions;
drop policy if exists "event_suggestions: admin update" on public.event_suggestions;
drop policy if exists "event_suggestions: admin delete" on public.event_suggestions;

create policy "event_suggestions: admin read"
  on public.event_suggestions for select using (public.is_admin());
create policy "event_suggestions: admin write"
  on public.event_suggestions for insert with check (public.is_admin());
create policy "event_suggestions: admin update"
  on public.event_suggestions for update using (public.is_admin());
create policy "event_suggestions: admin delete"
  on public.event_suggestions for delete using (public.is_admin());
