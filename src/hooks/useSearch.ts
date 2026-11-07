// Browser-side React hook for the search. POSTs SearchCriteria to /api/search (the server,
// which holds the secret Claude key) and reads the stream, adding each person to `people`.
// Returns { runSearch(criteria), people: PersonProfile[], running, error }.
