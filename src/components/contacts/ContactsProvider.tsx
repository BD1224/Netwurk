"use client";
// One shared contact book for every logged-in page. Lives in the (app) layout next to the
// search session, so the header count, the "already saved" checks on search results and the
// contact book all read the same list, loaded once per visit.
import { createContext, use } from "react";
import { useContacts } from "@/hooks/useContacts";

type ContactsState = ReturnType<typeof useContacts>;

const ContactsContext = createContext<ContactsState | null>(null);

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  return <ContactsContext value={useContacts()}>{children}</ContactsContext>;
}

export function useContactBook(): ContactsState {
  const state = use(ContactsContext);
  if (!state) throw new Error("useContactBook must be used inside ContactsProvider");
  return state;
}
