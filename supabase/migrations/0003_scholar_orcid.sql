-- Adds the contact's Google Scholar profile link and ORCID iD.
-- scholar_url is shown to the user; orcid lets the papers lookup match them on OpenAlex
-- exactly. Both are null when we didn't find them. Paste into the Supabase SQL Editor and run, or `supabase db push`.

alter table public.contacts
  add column if not exists scholar_url text,
  add column if not exists orcid text;
