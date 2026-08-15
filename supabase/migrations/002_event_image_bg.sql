alter table public.events
  add column if not exists image_url text,
  add column if not exists bg_color text;
