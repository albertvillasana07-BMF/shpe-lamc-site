-- Game leaderboards (already applied to the live database)
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('wordle', 'breakout', 'rocket')),
  player_name text not null check (char_length(player_name) between 1 and 24),
  score integer not null check (score >= 0 and score <= 10000000),
  seconds integer check (seconds is null or (seconds >= 0 and seconds <= 86400)),
  week text not null,
  created_at timestamptz not null default now()
);
-- Scores are submitted only through public.submit_game_score(), which validates
-- names, blocks common bad words, checks score ranges, and limits spam.
-- See the Supabase dashboard (Database, then Functions) for the full function.
