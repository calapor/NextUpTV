![NextUpTV](docs/portfolio/assets/nextuptv-logo-1280x200.jpg)

[![CI](https://github.com/calapor/NextUpTV/actions/workflows/ci.yml/badge.svg)](https://github.com/calapor/NextUpTV/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/github/checks-status/calapor/NextUpTV/main?check=Test%20Report&label=tests&logo=vitest)](https://github.com/calapor/NextUpTV/actions/workflows/ci.yml)

# NextUpTV — AI-Powered TV Recommendation Platform

NextUpTV generates personalised TV show recommendations by combining your watch history with Claude Sonnet — delivering enriched results (posters, streaming platforms, ratings) in real time via a cinematic dark-mode interface.

This project was solely intended to demonstrate applied AI engineering, design, scoping, prompting, evaluating, and shipping with AI in the loop, and to learn and understand how legacy development manager roles intersect with the problems that AI solves and new problems it introduces in a typical development cycle. 

---

> **Portfolio documentation** — architecture, prompt engineering lifecycle, evaluation framework, AI safety, and engineering decision log:
> 📄 [docs/portfolio/README.md](docs/portfolio/README.md)

---

## Features

- **AI recommendations** — Claude Sonnet 4.6 analyses your favourites and returns tailored picks with per-show reasoning
- **Real-time streaming** — recommendations appear progressively as Claude generates them (SSE)
- **Two-pass enrichment** — show titles are looked up in TVDB in parallel during generation; each card arrives with poster, synopsis, year, runtime, genres, content rating, and average user rating
- **Streaming platform icons** — direct search links for Netflix, Prime Video, Disney+, Max, Hulu, Apple TV+, Peacock, Paramount+, and more
- **Interactive filter panel** — client-side sliders for genre tone (comedy, horror), year range, minimum rating, runtime, and watch-list size; no repeat API calls
- **Manage Favourites** — upload a plain-text or CSV watch history (up to 5 MB) and add free-text keywords; input is persisted to localStorage between sessions
- **Session persistence** — recommendations, filter state, and favourites input survive page reloads via localStorage
- **Prompt safety** — user input is wrapped in XML delimiters server-side; strict token budgets and length caps prevent abuse
- **Cinematic dark-mode UI** — inspired by Netflix, Spotify, and Letterboxd; responsive across desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| UI | React 19, shadcn/ui, Tailwind CSS 4 |
| AI | Anthropic Claude Sonnet 4.6 |
| Media data | TVDB v4 API |
| Analytics | Vercel Analytics |

## Environment Variables

Create a `.env.local` file at the project root:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for recommendation generation |
| `TVDB_API_KEY` | Yes | TVDB v4 API key for poster, synopsis, rating enrichment ([thetvdb.com](https://thetvdb.com)) |
| `ADMIN_PASSWORD` | Optional | Gates `/admin` and its API routes via HTTP Basic Auth; open if unset |
| `DATABASE_URL` | Optional | Neon Postgres connection string. If set, usage logs are written to Postgres; otherwise they fall back to JSONL files at `data/usage-logs/`. See [docs/portfolio/08-observability-and-cost-tracking.md](docs/portfolio/08-observability-and-cost-tracking.md#3-production-setup) for the Vercel + Neon setup. |

`ADMIN_PASSWORD` gates the `/admin` page and its API routes (`/api/eval`, `/api/usage-logs`, `/api/admin/demo-cache`) via HTTP Basic Auth middleware. If `ADMIN_PASSWORD` is unset the admin interface is open — this is the default for local development. `EVAL_PASSWORD` was used in earlier versions and is no longer required.

## Getting Started

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm test         # Vitest in watch mode
pnpm test:run     # Single run (used by CI)
pnpm test:cov     # Single run with coverage report
```

The Vitest suite covers the deterministic logic that surrounds the AI calls — JSON-stream recovery, title dedup, TVDB caching, per-token cost calculation, SSE framing, and prompt structural sanity. CI runs type-check → test → lint on every push and PR to `main`. See [EDL Decision 13](docs/portfolio/09-engineering-decision-log.md#decision-13-unit-tests-targeted-at-the-deterministic-glue-not-the-model) for the rationale.

## Architecture

### Recommendation flow

1. The user uploads a watch-history file and/or enters keywords on the **Manage Favourites** tab, then triggers a recommendation run.
2. The browser opens an SSE connection to `/api/recommendations`.
3. The server streams Claude's JSON response token by token. As each show title appears in the stream, a TVDB lookup fires immediately — so enrichment runs in parallel with generation rather than after it.
4. `partial_recommendation` events push poster cards to the UI as TVDB results arrive, giving the user visible progress.
5. Once Claude finishes, the server merges the full Claude output with the TVDB data, deduplicates, filters out any input shows, and emits a final `complete` event with the sorted recommendation set.
6. All filtering (sliders) happens entirely in the browser against the cached result — no additional API calls.

### Persistence

| Key | Contents |
|---|---|
| `nextuptv_recommendations` | Last recommendation set |
| `nextuptv_filter_state` | Filter slider positions |
| `nextuptv_favourites_input` | Last favourites file content + keywords |

## Project Structure

```
app/
  api/
    recommendations/   SSE recommendation endpoint
    eval/              Prompt evaluation endpoint
  eval/                Developer evaluation workbench
  layout.tsx
  page.tsx
components/
  app-shell.tsx        Root state and routing
  top-navigation.tsx   Fixed header and tab nav
  dashboard-layout.tsx Filter panel + recommendation grid
  recommendation-card.tsx
  streaming-view.tsx   SSE consumer and progressive UI
  streaming-platform-icons.tsx
  loading-skeleton.tsx
  pages/
    recommendations.tsx
    favourites.tsx
lib/
  types.ts             Shared TypeScript interfaces
  title-utils.ts       Shared title normalisation and JSON extraction
  tvdb.ts              TVDB v4 API client with 1-hour cache
  prompts.ts           Claude system prompt
  streaming-platforms.ts Platform registry and search URLs
  utils.ts             clsx / tailwind-merge helper
public/
  streaming-icons/     SVG icons for each platform
  eval-reports/        Generated HTML evaluation reports
specs/
  product-overview.md
  design-system.md
  features/            Per-feature specifications
```

## Responsive Layout

| Device | Width | Layout |
|---|---|---|
| Mobile | < 768 px | Full-width; filter panel in drawer |
| Tablet | 768 – 1024 px | 35 / 65 split |
| Desktop | > 1024 px | 30 / 70 split |

## Upcoming Phases

- **User Profiles** — named preference profiles with save, load, and switch
- **Preference Persistence** — backend-backed storage for favourites and recommendation history
- **Additional Filters** — language, country of origin, network, content rating
- **Favourite TV alerts** - air date, status, spin off series 

## Credits

Built with Claude Code. The application code, portfolio documentation, and architecture diagrams in this repo were produced in collaboration with Claude (Anthropic). The product scope, design markup construction, wireframes, architecture decisions, prompt design, evaluation framework, and shipping calls are mine. The project is intended to demonstrate applied AI engineering, design, scoping, prompting, evaluating, and shipping with AI in the loop.  See the [Engineering Decision Log](docs/portfolio/09-engineering-decision-log.md) for the full rationale.
