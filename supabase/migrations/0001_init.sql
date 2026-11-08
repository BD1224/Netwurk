-- Creates the database structure (no data). Paste into the Supabase SQL Editor and run,
-- or run `supabase db push`. Safe to re-run: everything is "if not exists".
-- 1. contacts table: person fields copied from a search result + the user's own fields.
-- 2. RLS policies: a signed-in user can only select/insert/update/delete their own rows.
-- User accounts live in Supabase Auth (auth.users), so there is no users table.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  -- Which user saved this contact. Defaults to the logged-in user.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- person data (copied from the search result when saved). Only full_name is required.
  full_name text not null,
  title text,
  company text,
  university text,
  location text,
  email text,
  email_status text check (email_status in ('confirmed', 'guessed')),
  linkedin_url text,
  github_url text,
  personal_site text,
  research_areas text[] default '{}',
  talking_points text,               -- newline-separated
  sources text[] default '{}',       -- URLs the info came from

  -- user's own fields
  status text not null default 'to_contact'
    check (status in ('to_contact', 'reached_out', 'replied', 'met')),
  notes text,
  last_contacted date,               -- null = never contacted ("To reach out")
  created_at timestamptz not null default now()
);

-- Fast lookup of one user's contacts, newest first
create index if not exists contacts_user_created_idx on public.contacts (user_id, created_at desc);

-- Row Level Security: each signed-in user can only see and change their own contacts
alter table public.contacts enable row level security;

create policy "Users read their own contacts"
  on public.contacts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users add their own contacts"
  on public.contacts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own contacts"
  on public.contacts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete their own contacts"
  on public.contacts for delete
  to authenticated
  using (user_id = (select auth.uid()));
