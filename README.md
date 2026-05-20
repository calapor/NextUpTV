# NextUpTV — AI-Powered TV Recommendation Platform

NextUpTV generates personalised TV show recommendations by combining your watch history with Claude Sonnet — delivering enriched results (posters, streaming platforms, ratings) in real time via a cinematic dark-mode interface.

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

```
ANTHROPIC_API_KEY=sk-ant-...
TVDB_API_KEY=your-tvdb-api-key
EVAL_USER=admin
EVAL_PASSWORD=changeme
```

Obtain a TVDB API key at [thetvdb.com](https://thetvdb.com).

`EVAL_USER` and `EVAL_PASSWORD` gate the `/eval` workbench via HTTP Basic Auth. If `EVAL_PASSWORD` is unset the route is open (useful in local dev).

## Getting Started

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
```

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
