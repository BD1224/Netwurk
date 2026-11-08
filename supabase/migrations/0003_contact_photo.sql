-- A professional photo URL for saved contacts (team/lab page, their own site or GitHub avatar;
-- never LinkedIn). Only the image's URL is stored. Safe to re-run.
alter table public.contacts add column if not exists photo_url text;
