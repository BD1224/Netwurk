-- A professional photo URL for saved contacts (their own site, a team/lab page, GitHub or
-- Gravatar; never LinkedIn). Only the image's URL is stored. Safe to re-run.
alter table public.contacts add column if not exists photo_url text;
