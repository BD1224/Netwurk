// "/contacts" route - FEATURE 2: the contact book.
import { listContacts } from "@/actions/contacts.actions";
import { ContactBook } from "@/components/contacts/ContactBook";
import { Header } from "@/components/shared/Header";
import type { Contact } from "@/types";

export const dynamic = "force-dynamic"; // per-user data

export default async function ContactsPage() {
  let contacts: Contact[] | null = null;
  let error = "";
  try {
    contacts = await listContacts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load contacts.";
  }

  if (contacts) return <ContactBook initialContacts={contacts} />;
  return (
    <div className="min-h-dvh">
      <Header contactCount={0} current="contacts" />
      <main className="mx-auto max-w-[1160px] px-4 pt-8 sm:px-6">
        <p role="alert" className="text-muted">
          {error}
        </p>
      </main>
    </div>
  );
}
