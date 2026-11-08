// Plain functions that read/write the Supabase `contacts` table.
// The useContacts hook calls these. They live outside the hook so they can also run
// in a test script (hooks only run inside React components).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ContactStatus, PersonProfile, type Contact } from "@/types";

// App field names (camelCase) -> database column names (snake_case)
function toRow(p: PersonProfile) {
  return {
    full_name: p.fullName,
    title: p.title ?? null,
    company: p.company ?? null,
    university: p.university ?? null,
    location: p.location ?? null,
    email: p.email ?? null,
    email_status: p.emailStatus ?? null,
    linkedin_url: p.linkedinUrl ?? null,
    github_url: p.githubUrl ?? null,
    personal_site: p.personalSite ?? null,
    scholar_url: p.scholarUrl ?? null,
    orcid: p.orcid ?? null,
    research_areas: p.researchAreas ?? null,
    talking_points: p.talkingPoints ?? null,
    sources: p.sources ?? null,
  };
}

// Database row -> app shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Contact {
  return {
    id: r.id,
    fullName: r.full_name,
    title: r.title,
    company: r.company,
    university: r.university,
    location: r.location,
    email: r.email,
    emailStatus: r.email_status,
    linkedinUrl: r.linkedin_url,
    githubUrl: r.github_url,
    personalSite: r.personal_site,
    scholarUrl: r.scholar_url ?? null,
    orcid: r.orcid ?? null,
    // nullable in the database; the app always sees a list / string
    researchAreas: r.research_areas ?? [],
    talkingPoints: r.talking_points ?? "",
    sources: r.sources ?? [],
    status: r.status,
    notes: r.notes,
    openalexId: r.openalex_id ?? null,
    createdAt: r.created_at,
  };
}

// Saves a search result to the logged-in user's contact book.
// user_id is filled in by the database (defaults to the logged-in user).
export async function saveContact(supabase: SupabaseClient, person: PersonProfile): Promise<Contact> {
  const valid = PersonProfile.parse(person); // throws if the data is malformed
  const { data, error } = await supabase.from("contacts").insert(toRow(valid)).select().single();
  if (error) throw new Error(`saveContact failed: ${error.message}`);
  return fromRow(data);
}

// All of the logged-in user's contacts, newest first (RLS filters to their rows).
export async function listContacts(supabase: SupabaseClient): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listContacts failed: ${error.message}`);
  return data.map(fromRow);
}

// Edits the user's own fields on a contact.
export async function updateContact(
  supabase: SupabaseClient,
  id: string,
  changes: { notes?: string | null; status?: ContactStatus; openalexId?: string | null },
): Promise<Contact> {
  const row = {
    notes: changes.notes,
    status: changes.status && ContactStatus.parse(changes.status),
    openalex_id: changes.openalexId,
  };
  const { data, error } = await supabase.from("contacts").update(row).eq("id", id).select().single();
  if (error) throw new Error(`updateContact failed: ${error.message}`);
  return fromRow(data);
}

export async function removeContact(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(`removeContact failed: ${error.message}`);
}
