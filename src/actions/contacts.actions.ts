"use server";
// Server actions for the contact book (frontend -> server -> Supabase).
// The UI calls these like normal async functions. RLS restricts every query to
// rows where user_id = auth.uid(); we also filter by user_id explicitly.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { githubUsername } from "@/lib/github";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { getPersonDetails, recentRepos } from "@/services/personDetails";
import {
  ContactSchema,
  ContactUpdateSchema,
  PersonProfileSchema,
  SearchPersonSchema,
  type Contact,
  type ContactDetails,
  type ContactUpdate,
  type Repo,
  type SearchPerson,
} from "@/types";

const IdSchema = z.string().uuid();

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not logged in");
  return { supabase, userId: user.id };
}

/**
 * Save a search result to the user's contact book, along with what the search agent found
 * about them (repos snapshot, papers, accolades, source links), so the contact book can show
 * the same details as the Discover overlay. Saving someone twice returns the existing contact.
 */
export async function saveContact(person: SearchPerson): Promise<Contact> {
  const searchPerson = SearchPersonSchema.parse(person);
  const { id: personId, ...rest } = searchPerson;
  const found = await getPersonDetails(personId, searchPerson).catch(() => null);
  const profile = PersonProfileSchema.parse({
    ...rest,
    talking_points: found?.talking_points ?? rest.talking_points,
  });
  const details: ContactDetails = {
    repos: found?.repos ?? [],
    papers: found?.papers ?? [],
    accolades: found?.accolades ?? [],
    sources: found?.sources ?? [],
  };

  const { supabase, userId } = await requireUser();

  let { data, error } = await supabase
    .from("contacts")
    .insert({ ...profile, person_id: personId, details, user_id: userId })
    .select()
    .single();
  if (error?.code === "23505") {
    // Already saved (unique user_id + person_id): hand back the existing contact.
    ({ data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("person_id", personId)
      .single());
  }
  if (error) throw new Error(`Could not save contact: ${error.message}`);

  revalidatePath("/contacts");
  return ContactSchema.parse(data);
}

/** All of the logged-in user's contacts, newest first. */
export async function listContacts(): Promise<Contact[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load contacts: ${error.message}`);

  return z.array(ContactSchema).parse(data);
}

/** Edit a contact's notes, status and/or last-contacted date. */
export async function updateContact(id: string, patch: ContactUpdate): Promise<Contact> {
  const contactId = IdSchema.parse(id);
  const changes = ContactUpdateSchema.parse(patch);
  if (Object.keys(changes).length === 0) throw new Error("Nothing to update");
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("contacts")
    .update(changes)
    .eq("id", contactId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`Could not update contact: ${error.message}`);

  return ContactSchema.parse(data);
}

/** Delete a contact. */
export async function removeContact(id: string): Promise<void> {
  const contactId = IdSchema.parse(id);
  const { supabase, userId } = await requireUser();

  const { error } = await supabase.from("contacts").delete().eq("id", contactId).eq("user_id", userId);
  if (error) throw new Error(`Could not remove contact: ${error.message}`);

  revalidatePath("/contacts");
}

/**
 * For Discover: how many contacts the user has (header badge) and which search results are
 * already saved (their cards show a check). Empty when logged out.
 */
export async function contactSummary(): Promise<{ count: number; personIds: string[] }> {
  if (!supabaseConfigured) return { count: 0, personIds: [] };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { count: 0, personIds: [] };

  const { data, error } = await supabase.from("contacts").select("person_id").eq("user_id", auth.user.id);
  if (error) throw new Error(`Could not load contacts: ${error.message}`);
  return {
    count: data.length,
    personIds: data.flatMap((row) => (row.person_id ? [row.person_id as string] : [])),
  };
}

/**
 * Fresh "New on GitHub" repos for a contact (GitHub REST, cached 24h).
 * null when the contact has no github.com profile or GitHub can't be reached;
 * the page then keeps showing the snapshot saved with the contact.
 */
export async function contactRepos(id: string): Promise<Repo[] | null> {
  const contactId = IdSchema.parse(id);
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("contacts")
    .select("github_url")
    .eq("id", contactId)
    .eq("user_id", userId)
    .maybeSingle();
  const username = githubUsername((data?.github_url as string | null | undefined) ?? null);
  return username ? recentRepos(username) : null;
}
