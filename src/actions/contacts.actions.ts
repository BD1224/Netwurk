"use server";
// Server actions for the contact book (frontend -> server -> Supabase).
// The UI calls these like normal async functions. RLS restricts every query to
// rows where user_id = auth.uid(); we also filter by user_id explicitly.
// Until Supabase keys are in .env.local, everything goes to an in-memory mock store.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { mockContactsStore } from "@/services/mock/contactsStore";
import {
  ContactSchema,
  ContactUpdateSchema,
  PersonProfileSchema,
  type Contact,
  type ContactUpdate,
  type PersonProfile,
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

/** Save a search result to the user's contact book. */
export async function saveContact(person: PersonProfile): Promise<Contact> {
  const profile = PersonProfileSchema.parse(person);
  if (!supabaseConfigured) return mockContactsStore.insert(profile);
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...profile, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(`Could not save contact: ${error.message}`);

  revalidatePath("/contacts");
  return ContactSchema.parse(data);
}

/** All of the logged-in user's contacts, newest first. */
export async function listContacts(): Promise<Contact[]> {
  if (!supabaseConfigured) return mockContactsStore.list();
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
  if (!supabaseConfigured) return mockContactsStore.update(contactId, changes);
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
  if (!supabaseConfigured) return mockContactsStore.remove(contactId);
  const { supabase, userId } = await requireUser();

  const { error } = await supabase.from("contacts").delete().eq("id", contactId).eq("user_id", userId);
  if (error) throw new Error(`Could not remove contact: ${error.message}`);

  revalidatePath("/contacts");
}

/** How many contacts the user has saved (for the header badge). 0 when logged out. */
export async function countContacts(): Promise<number> {
  if (!supabaseConfigured) return mockContactsStore.count();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return 0;

  const { count, error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id);
  if (error) throw new Error(`Could not count contacts: ${error.message}`);
  return count ?? 0;
}
