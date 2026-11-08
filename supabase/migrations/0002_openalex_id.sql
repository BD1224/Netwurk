-- Adds the contact's OpenAlex author id (e.g. 'A5001226970').
-- Filled the first time a saved contact's papers are looked up, so later lookups
-- skip the name search + Haiku match and just fetch the latest papers by id.
-- null = not looked up yet, 'none' = looked up, no matching author (don't look again). Paste into the Supabase SQL Editor and run, or `supabase db push`.

alter table public.contacts
  add column if not exists openalex_id text;
