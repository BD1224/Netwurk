-- Keeps what the search agent found when a contact is saved, so the contact book can show
-- the same details as the Discover overlay (repos snapshot, papers, accolades, source links).
-- person_id links the contact to the search result it came from, so Discover can show
-- "already saved" and the same person can't be saved twice.

alter table public.contacts
  add column person_id text,
  add column details jsonb not null default '{}'::jsonb;

create unique index contacts_user_person_idx
  on public.contacts (user_id, person_id)
  where person_id is not null;
