// POST /api/search - the only API route. Runs on the server (a Vercel function).
// Checks the user is logged in (so strangers cannot spend our Claude credits), then calls
// runSearch() from src/services and streams back one SearchEvent per person as they finish.
// Writes nothing to the database. Sets maxDuration so the search can run for a few minutes.
