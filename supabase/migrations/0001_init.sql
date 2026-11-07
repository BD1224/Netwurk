-- Creates the database structure (no data). Run with `supabase db push`.
-- 1. contacts table: person fields copied from a search result + the user's own fields.
-- 2. RLS policies: a user can only select/insert/update/delete rows where user_id = auth.uid().
-- User accounts live in Supabase Auth (auth.users), so there is no users table.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- person data (copied from the search result when saved)
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
  sources text[] default '{}',

  -- user's own fields
  status text not null default 'to_contact'
    check (status in ('to_contact', 'reached_out', 'replied', 'met')),
  notes text,
  last_contacted date,               -- null = never contacted ("To reach out")
  created_at timestamptz not null default now()
);

create index contacts_user_created_idx on public.contacts (user_id, created_at desc);

alter table public.contacts enable row level security;

create policy "Users read their own contacts"
  on public.contacts for select
  using (user_id = (select auth.uid()));

create policy "Users add their own contacts"
  on public.contacts for insert
  with check (user_id = (select auth.uid()));

create policy "Users update their own contacts"
  on public.contacts for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete their own contacts"
  on public.contacts for delete
  using (user_id = (select auth.uid()));
