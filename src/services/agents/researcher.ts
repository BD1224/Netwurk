// import "server-only"
// researchPerson(candidate): one Claude call per person (web_search + web_fetch).
// Finds public info, applies the email rule (confirmed vs guessed), writes talking points,
// returns a PersonProfile checked with Zod.
