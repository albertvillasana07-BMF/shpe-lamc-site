-- Scores can only be posted by signed-in SHPE members (email + student ID from the Join page)
-- or by board accounts. The name on the board comes from the member record, so it's always the same.

alter table public.game_scores add column if not exists member_key text;

create or replace function public.member_login(p_email text, p_student_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select full_name into v_name
  from public.members
  where lower(btrim(email)) = lower(btrim(coalesce(p_email, '')))
    and coalesce(btrim(student_id), '') <> ''
    and regexp_replace(student_id, '\s', '', 'g') = regexp_replace(coalesce(p_student_id, ''), '\s', '', 'g')
  order by created_at desc
  limit 1;

  if v_name is null then
    perform pg_sleep(0.6); -- slows down guessing
    raise exception 'That email and student ID don''t match a SHPE member. Sign up on the Join page first.';
  end if;
  return left(btrim(regexp_replace(v_name, '\s+', ' ', 'g')), 24);
end;
$$;

drop function if exists public.submit_game_score(text, text, integer, text, integer);

create or replace function public.submit_game_score(
  p_game text, p_score integer, p_week text, p_seconds integer default null,
  p_email text default null, p_student_id text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_key text;
  v_id uuid;
begin
  if p_game not in ('wordle', 'breakout', 'rocket') then
    raise exception 'Unknown game';
  end if;
  if p_week !~ '^\d{4}-W\d{2}$' then
    raise exception 'Bad week';
  end if;
  if (p_game = 'wordle' and (p_score < 1 or p_score > 6))
     or (p_game = 'breakout' and (p_score < 0 or p_score > 2000))
     or (p_game = 'rocket' and (p_score < 0 or p_score > 1000000)) then
    raise exception 'Score out of range';
  end if;
  if (select count(*) from public.game_scores where created_at > now() - interval '1 minute') > 40 then
    raise exception 'Too many scores right now, try again in a minute';
  end if;

  -- Board accounts (already signed in to the site)
  if auth.uid() is not null then
    select left(btrim(coalesce(nullif(full_name, ''), split_part(email, '@', 1))), 24), lower(email)
      into v_name, v_key
    from public.profiles
    where id = auth.uid() and role = 'admin';
  end if;

  -- Members (email + student ID)
  if v_name is null then
    v_name := public.member_login(p_email, p_student_id);
    v_key := lower(btrim(p_email));
  end if;

  insert into public.game_scores (game, player_name, score, seconds, week, member_key)
  values (p_game, v_name, p_score, p_seconds, p_week, v_key)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.member_login(text, text) to anon, authenticated;
grant execute on function public.submit_game_score(text, integer, text, integer, text, text) to anon, authenticated;
