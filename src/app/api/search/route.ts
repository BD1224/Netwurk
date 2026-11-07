// POST /api/search - the only API route. Runs on the server (a Vercel function).
// Receives SearchCriteria, calls runSearch() from src/services, and streams back one
// SearchEvent per person as they finish. Writes nothing to the database.
// Sets maxDuration so the search can run for a few minutes.
