# wetNork — Plan

Find people to network with → research them → save the ones you want as contacts with notes.

**Target users:** job seekers and/or people looking to network.
**Principle:** minimal is better.

**Stack:** Next.js 16 (App Router, TS) · Supabase (Postgres + Auth) · Tailwind v4 (tokens in `globals.css`, shadcn-style `cn()` helper) · Motion (`motion/react`) · Anthropic TS SDK (`@anthropic-ai/sdk`) · Zod · deployed on Vercel

**Integrations:** Supabase and the Claude API. The Claude API's built-in web search / web fetch tools do all the research, including reading LinkedIn, GitHub, university and company pages.

---

## Pipeline

| Stage | What happens | Where |
|---|---|---|
| 1. Specify | User types into five fields: title, company, university, location, research | `FilterBar.tsx` |
| 2. Find + enrich | An orchestrator agent finds **up to 20** people (fewer is OK). Worker agents research each person in parallel. **Nothing is written to the database.** | `src/services/` |
| 3. Display + save | Results stream in as **person cards** (Discover page). Only cards the user clicks **+** on go to Supabase. That's their contact book for future logins. | `/search`, `/contacts` |

Search results live only in the browser. Refreshing or leaving the page clears them, so anyone worth keeping should be saved.

**Results table columns (placeholder; the user will define these):** Name · Title · Company / University · Location · Email (`confirmed` / `guessed` badge) · LinkedIn · GitHub · Talking points · Save

**Email rule:**
- If an email is stated explicitly in a public source (LinkedIn, university directory, job post, personal site) → store it with tag `confirmed`.
- Otherwise → guess from the org's usual format (e.g. `<first initial><last name>@<school>.edu`) and tag it `guessed`.

**Talking points:** one short, broad paragraph of basic info.

---

## File layout

Standard Next.js `src/` layout. The root folder name `wetNork/` is a placeholder.

```
wetNork/                            # project root (name may change)
├── README.md
├── PLAN.md
├── package.json
├── tsconfig.json                   # path alias: "@/*" → "src/*"
├── next.config.ts
├── postcss.config.mjs              # Tailwind v4: theme + DaisyUI are set in globals.css (no tailwind.config)
├── eslint.config.mjs
├── .gitignore
├── .env.local.example              # ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
│                                   # NEXT_PUBLIC_SUPABASE_ANON_KEY
├── public/                         # static assets (logo, favicon)
├── supabase/
│   └── migrations/0001_init.sql    # creates the contacts table + access rules (schema only, no data)
├── tests/
│   └── unit/schemas.test.ts        # Zod schema tests
└── src/
    ├── proxy.ts                    # (Next 16 name for middleware) sends logged-out users to /login
    ├── app/                        # ROUTES: each folder = a URL
    │   ├── layout.tsx              # DaisyUI theme, navbar
    │   ├── page.tsx                # redirect → /search
    │   ├── globals.css
    │   ├── login/page.tsx          # /login (Supabase magic link)
    │   ├── (app)/                  # group for logged-in pages (not part of the URL)
    │   │   ├── layout.tsx          # shared navbar + login check
    │   │   ├── search/page.tsx     # /search   FEATURE 1: filter form + live results table
    │   │   └── contacts/page.tsx   # /contacts FEATURE 2: saved contacts table, notes edited in a modal
    │   └── api/search/route.ts     # POST: runs a search, streams results back
    ├── actions/                    # ← server functions the UI calls (frontend⇄backend contract)
    │   └── contacts.actions.ts
    ├── components/                 # UI only (Tailwind + Motion)
    │   ├── search/   Discover, FilterBar, NetworkBackground, PersonCard, ...
    │   ├── contacts/ ContactBook, ContactList, ContactRow, ContactDetail, TalkingPoints, FilterChips
    │   └── shared/   Header, Toast, IllustratedAvatar, AnimatedTitle, icons
    ├── hooks/
    │   └── useSearch.ts            # calls /api/search, adds rows to the table as they arrive
    ├── types/                      # ← SHARED TYPES (frontend + backend)
    │   ├── index.ts                # Zod schemas + TS types
    │   └── database.types.ts       # generated from Supabase: `supabase gen types typescript`
    ├── services/                   # BACKEND ONLY (`import "server-only"`)
    │   ├── agents/
    │   │   ├── orchestrator.ts     # filters → up to 20 candidates
    │   │   ├── researcher.ts       # one candidate → PersonProfile
    │   │   └── prompts.ts
    │   └── runSearch.ts            # runs both stages, yields each person as they finish
    └── lib/
        ├── anthropic.ts            # Anthropic SDK client (server only)
        ├── supabase/client.ts      # browser client
        └── supabase/server.ts      # server client (auth cookies)
```

**Boundary rule:** `components/` and `hooks/` import only from `types/`, `actions/`, `hooks/` and `lib/supabase/client.ts`. `services/` is server-only. A wrong import fails the build.

---

## Supabase schema: one table

```sql
contacts (
  id uuid pk default gen_random_uuid(),
  user_id uuid NOT NULL references auth.users,
  -- person data (copied from the search result when saved)
  full_name text NOT NULL,
  title text, company text, university text,
  location text,
  email text,
  email_status text,          -- 'confirmed' | 'guessed' | null
  linkedin_url text, github_url text, personal_site text,
  research_areas text[],
  talking_points text,
  sources text[],
  -- user's own fields
  status text default 'to_contact',  -- to_contact | reached_out | replied | met
  notes text,
  last_contacted date,               -- null = "To reach out"
  created_at timestamptz default now()
)
-- RLS: each user can only read/write rows where user_id = auth.uid()
```
User accounts are stored by Supabase Auth (`auth.users`), so we don't create a users table.

---

## Frontend ⇄ Backend contract

**Shared types (`src/types/index.ts`)**
| Type | Shape |
|---|---|
| `SearchCriteria` | `{ title?, company?, university?, location?, research? }` (at least one) |
| `EmailStatus` | `'confirmed' \| 'guessed'` |
| `PersonProfile` | one search result (the person fields above) |
| `ContactStatus` | `'to_contact' \| 'reached_out' \| 'replied' \| 'met'` |
| `Contact` | `PersonProfile & { id, status, notes, created_at }` |
| `SearchEvent` (NDJSON, one per line) | `{type:'step', step: 0-3}` · `{type:'found', count}` · `{type:'person', person}` · `{type:'done', count}` · `{type:'error', message}` |

**Search (streaming API route)**
| Call | Returns |
|---|---|
| `POST /api/search` with `SearchCriteria` | a stream of `SearchEvent`s |
| `useSearch()` hook (wraps the call above) | `{ runSearch(criteria), reset(), status, running, people, step, total, error }` |

**Contacts (server actions in `contacts.actions.ts`)**
| Function | Returns |
|---|---|
| `saveContact(person: PersonProfile)` | `Contact` |
| `listContacts()` | `Contact[]` |
| `updateContact(id, { notes?, status?, last_contacted? })` | `Contact` |
| `removeContact(id)` | `void` |
| `countContacts()` | `number` (header badge) |

Until Supabase keys are set, these actions use an in-memory mock store (`src/services/mock/contactsStore.ts`), reset on server restart.

**Backend-only:** `runSearch()`, `findCandidates()`, `researchPerson()`.

---

## Agent harness

### Chosen: plain Claude API calls, with fan-out in our own code
1. **Orchestrator** (`claude-sonnet-5-5`, low effort, `web_search`): filters → JSON list of up to 20 `{name, title, org, urls}`.
2. **Researchers** (one call per person, ~5 at a time via `Promise.all`, `web_search` + `web_fetch`): each returns a `PersonProfile`, checked with Zod and streamed to the browser immediately. Start on `claude-sonnet-5-5`. Try `claude-haiku-5-5` for researchers if cost or speed matters, after confirming it supports the web tools we need.
3. Vercel: the `/api/search` request stays open while it streams. Set `export const maxDuration` to your plan's max on that route.

### Alternatives (for reference)
- **Managed Agents (hosted by Anthropic):** define the agent once (prompt, web tools, optional subagents), e.g. as `agents/researcher/agent.md` synced with the `ant` CLI. Each search starts a "session" with one API call, Anthropic runs the loop, and we stream back the final JSON. No timeout worries, but it's a newer beta API.
- **Claude Agent SDK:** Claude Code as a library: `query({ prompt })`, with subagents as `.claude/agents/*.md` files. It needs a long-running server, which doesn't fit Vercel well.

### Why no GitHub API
`web_fetch` can read `github.com/<user>` directly. We don't need exact repo stats.

---

## Decisions
- Auth: Supabase Auth (magic link)
- Up to 20 results per search; fewer is OK
- Public info only, via search APIs and public APIs (e.g. GitHub REST). **No LinkedIn scraping.**
- Search steps shown in the UI: Web search → GitHub → Google Scholar → Checking emails
- Email: `confirmed` if stated explicitly in a source, otherwise `guessed`
- Search results are **not** stored. Only saved contacts go to Supabase.
- Models: Sonnet 5.5 (Haiku 5.5 to try for researchers); no Opus
- Vercel; a slow search is acceptable
- No outreach drafting; no skipping of already-saved people
- Filters are on the search form only. Results and contacts are plain tables.

## Next step
The user drafts the exact data to collect per person. The `contacts` columns, `PersonProfile` and the results-table columns are placeholders until then.
