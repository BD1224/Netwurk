-- Creates the database structure (no data). Paste into the Supabase SQL Editor and run,
-- or run `supabase db push`.
-- One table: each row is a person a user saved to their contact book.
-- User accounts live in Supabase Auth (auth.users), so there is no users table.
-- Person fields are placeholders until the spreadsheet columns are finalized.

create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  -- Which user saved this contact. Defaults to the logged-in user.
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Person data (copied from the search result when saved). Only full_name is required.
  full_name       text not null,
  title           text,
  company         text,
  university      text,
  location        text,                 -- "City, ST"
  email           text,
  email_status    text check (email_status in ('confirmed', 'guessed')),
  linkedin_url    text,
  github_url      text,
  personal_site   text,
  research_areas  text[],
  talking_points  text,                 -- one short paragraph
  sources         text[],               -- URLs the AI got its info from

  -- The user's own fields
  status          text not null default 'to_contact'
                  check (status in ('to_contact', 'reached_out', 'replied', 'met')),
  notes           text,

  created_at      timestamptz not null default now()
);

-- Fast lookup of one user's contacts
create index if not exists contacts_user_id_idx on public.contacts (user_id);

-- Row Level Security: each user can only see and change their own contacts
alter table public.contacts enable row level security;

create policy "Users can read their own contacts"
  on public.contacts for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own contacts"
  on public.contacts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own contacts"
  on public.contacts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own contacts"
  on public.contacts for delete
  to authenticated
  using ((select auth.uid()) = user_id);
