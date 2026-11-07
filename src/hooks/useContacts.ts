// Browser-side React hook for the contact book. Calls Supabase DIRECTLY (no server step),
// using the browser client from src/lib/supabase/client.ts. RLS makes sure users only touch their own rows.
// Returns { contacts: Contact[], loading, error,
//           saveContact(person: PersonProfile), updateContact(id, { notes?, status? }), removeContact(id) }.
