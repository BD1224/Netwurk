// import "server-only" - backend only.
// The search pipeline, called by /api/search:
//   1. findCandidates(criteria) -> up to 20 people
//   2. researchPerson() on each, ~5 at a time
//   3. yields each finished PersonProfile so the route can stream it immediately.
