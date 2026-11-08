# wetNork — Plan

Find people to network with → research them → save the ones you want as contacts with notes.

**Target users:** job seekers and/or people looking to network.
**Principle:** minimal is better.

**Stack (actual):** Next.js 16 (App Router, TS, `proxy.ts`) · React 19 · Supabase (Postgres + Auth via `@supabase/ssr`) · Tailwind v4 (no DaisyUI) · Motion (`motion/react`) · Radix Dialog · Zod 4 · `@anthropic-ai/sdk` · Serper (Google search API) · OpenAlex (papers) · GitHub public API · deployed on Vercel

**Status:** backend, frontend and auth are all built and wired together. No automated test runner is set up yet. The main gaps are listed under "Open items" at the bottom.

---

## What actually happens (pipeline)

| Stage | What happens | Where |
|---|---|---|
| 1. Specify | User sets filters: companies, roles, states, universities, research areas | `FilterBar.tsx`, `SearchSession.tsx` |
| 2a. Find candidates | **No AI.** Code runs Google searches through Serper restricted to `site:linkedin.com/in`, parses names/titles/orgs out of result titles, and repeats up to 5 rounds (excluding names already found) to reach **20 people**. If research areas were given, it also searches Google Scholar profiles. | `services/agents/orchestrator.ts` |
| 2b. Research each person | For each candidate, 2–5 Serper queries run (LinkedIn, role, university, GitHub, Scholar if academic). Then **one Claude call** (`claude-haiku-5-5`, no tools, medium effort) reads only those results and returns JSON. Five people are processed at a time. | `services/agents/researcher.ts`, `prompts.ts`, `runSearch.ts` |
| 2c. Filter | A person is dropped if Claude reports `confidence: low` (maybe someone else with the same name), `matchesSearch: false`, or invalid JSON twice. Execs, VPs, chairs and public figures are also dropped. | `researcher.ts` |
| 3. Stream | `POST /api/search` streams one NDJSON `SearchEvent` per line (`found`, `person`, `done`, `error`). **Nothing is written to the database.** | `app/api/search/route.ts`, `hooks/useSearch.ts` |
| 4. Display + save | Results appear as **cards** (not a table) with skeletons while loading. Clicking a card opens a dialog with details, GitHub repos and papers. **Save** adds the person to Supabase. | `Discover.tsx`, `PersonCard.tsx`, `PersonDialog.tsx` |
| 5. Contact book | `/contacts` has a filterable list, a detail panel, status and notes. Edits are optimistic, notes are debounced, and delete has a 4-second Undo. | `ContactBook.tsx`, `ContactsProvider.tsx` |

Search results live in the browser only. They survive a trip to `/contacts` (held in `SearchSessionProvider`) but not a refresh.

**Extras on a person (not in the original plan):**
- **GitHub repos**: fetched in the browser from `api.github.com` using the username in `githubUrl`.
- **Papers**: `POST /api/papers` looks up the person on OpenAlex. The first lookup asks Haiku which author matches. The id is saved in `contacts.openalex_id`, with `"none"` meaning no match, so matching happens once. After that it fetches the 5 newest papers by id.
- **Illustrated avatars**: generated from the person's details (`IllustratedAvatar.tsx`, `avatar-look.ts`).

**Email rule:** `confirmed` if a result states the person's own address (shared addresses like `info@` don't count). Otherwise it's `guessed`, copying the org's visible format, or `first.last@<org domain>`. Null only if the org is unknown.

**Talking points:** a `; `-separated list of 3–5 short topics, each taken from something found about the person. (The original plan said one paragraph.)

---

## Auth (built)

- Google OAuth, or email + password (sign in, create account with an emailed confirmation link, forgot password).
- Routes: `/login`, `/set-password`, `/auth/callback` (OAuth/PKCE), `/auth/confirm` (token-hash links that work on any device).
- `src/proxy.ts` refreshes the session, sends logged-out users to `/login`, and sends signed-in users on `/login` to `/search`.
- Magic link was in the original plan and has been replaced by the above.
- Accounts only hold the email and the contact book.

---

## File layout (actual)

```
wetNork/
├── AGENTS.md, README.md (stub), PLAN.md
├── package.json, tsconfig.json (alias "@/*" → "src/*"), next.config.ts,
│   postcss.config.mjs, eslint.config.mjs
├── .env.local.example      # ANTHROPIC_API_KEY, SERPER_API_KEY, OPENALEX_API_KEY,
│                           # NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, TEST_USER_*, MOCK_SEARCH
├── supabase/migrations/    # 0001_init.sql (contacts + RLS), 0002_openalex_id.sql
├── tests/
│   ├── unit/schemas.test.ts    # placeholder: comments only, no test runner installed
│   └── manual/save-contact.ts  # `npm run test:save-contact` (logs in, saves a fake contact)
└── src/
    ├── proxy.ts
    ├── app/
    │   ├── layout.tsx, page.tsx (→ /search), globals.css
    │   ├── login/, set-password/
    │   ├── auth/callback/route.ts, auth/confirm/route.ts
    │   ├── (app)/layout.tsx           # mounts ContactsProvider + SearchSessionProvider
    │   ├── (app)/search/page.tsx
    │   ├── (app)/contacts/page.tsx
    │   └── api/search/route.ts, api/papers/route.ts
    ├── components/
    │   ├── auth/      SignInCard, SetPasswordCard, CheckInbox, GoogleMark, next-cookie
    │   ├── search/    Discover, FilterBar, Headline, PersonCard, PersonDialog, ResultsHeader,
    │   │              SearchSession, SkeletonCard, NetworkBackground, network-data, person-style
    │   ├── contacts/  ContactBook, ContactList, ContactRow, ContactDetail, ContactsProvider,
    │   │              FilterChips, TalkingPoints, status
    │   └── shared/    Header, AnimatedTitle, DetailsLists, IllustratedAvatar, Toast, icons, avatar-look
    ├── hooks/         useSearch, useContacts, usePersonDetails, useSignOut
    ├── types/         index.ts (Zod schemas + types), database.types.ts
    ├── services/      (server only) runSearch, papers, agents/{orchestrator,researcher,prompts}
    └── lib/           anthropic, serper (server only) · supabase/{client,server} · contacts, github, dates, utils
```

**How the browser reaches data:**
```
useSearch        ──▶ /api/search ──▶ runSearch ──▶ Serper + Claude (Haiku)   (server holds the keys)
usePersonDetails ──▶ /api/papers ──▶ OpenAlex + Claude (Haiku, first time only)
                 ──▶ api.github.com                                          (browser, public)
useContacts      ──▶ Supabase directly (anon key + RLS)
```

Both API routes check the Supabase session first (401 if logged out) so strangers can't spend API credits.

**Keys:**
| Key | Used by | Visible to users? |
|---|---|---|
| `ANTHROPIC_API_KEY`, `SERPER_API_KEY`, `OPENALEX_API_KEY` | server only | no |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | yes (fine, RLS protects rows) |
| `MOCK_SEARCH=1` | server | returns 3 fake people without calling Claude or Serper |

---

## Supabase schema: one table (`contacts`)

Columns: `id`, `user_id` (defaults to `auth.uid()`, cascades on user delete), `full_name`, `title`, `company`, `university`, `location`, `email`, `email_status` (`confirmed`|`guessed`), `linkedin_url`, `github_url`, `personal_site`, `research_areas text[]`, `talking_points`, `sources text[]`, `status` (`to_contact`|`reached_out`|`replied`|`met`), `notes`, `openalex_id` (migration 0002), `created_at`.

RLS: four policies (select, insert, update, delete), each limited to `user_id = auth.uid()`.

---

## Shared types (`src/types/index.ts`)

`SearchCriteria` · `Candidate` (`name, title, org, urls`) · `EmailStatus` · `PersonProfile` · `ResearchResult` (profile + `confidence` + `matchesSearch`, never saved) · `ContactStatus` · `Contact` · `SearchEvent` (`found` | `person` | `done` | `error`) · `SearchResult` (profile + browser key) · `Repo` · `Paper` · `PapersRequest` / `PapersResult` · `OpenAlexId`.

Note: `SearchCriteria` still has a `freeText` field, but the search code ignores it.

---

## Decisions (current)
- Auth: Supabase, Google + email/password
- Up to 20 results per search; fewer is fine (filtering drops uncertain people)
- Public info only, but any public source (LinkedIn included)
- Search is **Serper + code**, not Claude's web tools. Claude only reads search snippets and cannot fetch pages.
- One model: **`claude-haiku-5-5`**, for researching and for the OpenAlex author match. Sonnet and Opus are not used.
- Research: 5 people at a time, to avoid Serper rate limits (429s retry up to 3 times)
- Search results are not stored; only saved contacts go to Supabase
- Contacts: the browser talks to Supabase directly
- `/api/search` uses `maxDuration = 300`
- No outreach drafting; already-saved people are not skipped in search

## Changes from the original plan
| Original | Now |
|---|---|
| Claude `web_search` / `web_fetch` do the research | Serper search, then Claude reads snippets with no tools |
| Orchestrator agent finds the people | Plain code, with no AI call |
| Sonnet orchestrator, Haiku to try | Haiku only |
| DaisyUI table | Custom Tailwind cards, a detail dialog and a contacts list/panel |
| Magic-link login | Google + email/password |
| One-paragraph talking points | 3–5 topic list |
| Contacts: notes, status | Same, plus repos, papers and OpenAlex id |

## Open items
- **Tests:** `tests/unit/schemas.test.ts` is only a comment, and there's no test runner in `package.json`.
- **README** is a one-line stub with no setup steps.
- **Column definitions** are still working defaults. The user hasn't finalized them.
- **Unused:** `freeText` in `SearchCriteria` and the `university` search (it only affects the query text).
- **Search quality** depends on LinkedIn title parsing, which is fragile. Headline formats vary.
- **Deploy:** not yet confirmed on Vercel. Needs env vars set, including `OPENALEX_API_KEY`, and a Supabase redirect URL for the OAuth callback.
- **Housekeeping:** `database.types.ts` may need regenerating after migration 0002.
