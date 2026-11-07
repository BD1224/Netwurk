// "use server" - server actions for the contact book (frontend -> server -> Supabase).
// The UI calls these like normal functions:
//   saveContact(person: PersonProfile): Contact      - validates with Zod, inserts a row
//   listContacts(): Contact[]                         - the logged-in user's contacts
//   updateContact(id, { notes?, status? }): Contact   - edit notes / status
//   removeContact(id): void
