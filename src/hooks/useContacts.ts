"use client";
// Browser-side React hook for the contact book. Calls Supabase DIRECTLY (no server step),
// using the browser client from src/lib/supabase/client.ts and the functions in src/lib/contacts.ts.
// RLS makes sure users only touch their own rows.
// Returns { contacts: Contact[], loading, error,
//           saveContact(person: PersonProfile), updateContact(id, { notes?, status? }), removeContact(id) }.
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import * as db from "@/lib/contacts";
import type { Contact, ContactStatus, PersonProfile } from "@/types";

export function useContacts() {
  const supabase = useMemo(() => createClient(), []);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load the contact book once
  useEffect(() => {
    db.listContacts(supabase)
      .then(setContacts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [supabase]);

  // each action updates the list locally instead of reloading it; errors are set and re-thrown
  // so the caller can react (e.g. keep a Save button enabled)
  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    try {
      return await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      throw e;
    }
  }, []);

  const saveContact = useCallback(
    (person: PersonProfile) =>
      run(async () => {
        const saved = await db.saveContact(supabase, person);
        setContacts((prev) => [saved, ...prev]);
        return saved;
      }),
    [run, supabase],
  );

  const updateContact = useCallback(
    (id: string, changes: { notes?: string | null; status?: ContactStatus }) =>
      run(async () => {
        const updated = await db.updateContact(supabase, id, changes);
        setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      }),
    [run, supabase],
  );

  const removeContact = useCallback(
    (id: string) =>
      run(async () => {
        await db.removeContact(supabase, id);
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }),
    [run, supabase],
  );

  return { contacts, loading, error, saveContact, updateContact, removeContact };
}
