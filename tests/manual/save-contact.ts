// Manual test: logs in as the test user and saves one fake contact.
// Run: npm run test:save-contact   → then check Table Editor → contacts in Supabase.
import { createClient } from "@supabase/supabase-js";
import { saveContact } from "@/lib/contacts";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!url || !anonKey || !email || !password) {
    throw new Error("Missing env vars. Fill in .env.local (see .env.local.example).");
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  // Log in, so the access rules know who is saving
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error(`Login failed: ${loginError.message}`);

  const contact = await saveContact(supabase, {
    fullName: "Test Person",
    title: "Software Engineer",
    company: "Acme",
    university: null,
    location: "Boston, MA",
    email: "tperson@acme.com",
    emailStatus: "guessed",
    linkedinUrl: "https://www.linkedin.com/in/test-person",
    githubUrl: null,
    personalSite: null,
    researchAreas: [],
    talkingPoints: "Works on backend systems at Acme. Interested in developer tools.",
    sources: ["https://example.com"],
  });

  console.log("Saved contact:", contact);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
