![NextUpTV](assets/nextuptv-logo-1280x200.jpg)

# Data Model Reference

**Document ID:** DATA  
**Related:** [ARCH](02-system-architecture.md) | [PROMPT](04-prompt-engineering-lifecycle.md) | [EVAL](05-evaluation-framework.md)  
**Last Updated:** May 2026  
**Status:** Final

---

## TL;DR

The domain model is defined in a single file (`lib/types.ts`) shared by all server routes and client components. The most interesting design decision is the two-phase `PartialRecommendation` / `Recommendation` split: cards arrive from TVDB with poster and metadata, then upgrade with Claude-generated attributes when the full JSON is parsed. This separation is what enables the progressive streaming UX.

---

## 1. Core Interfaces

### `PartialRecommendation`

Represents a show during the first pass of streaming enrichment — TVDB has resolved, but Claude has not finished generating the full JSON yet. This is what powers the progressive card display.

```typescript
interface PartialRecommendation {
  title: string
  id?: number                          // TVDB series ID
  one_sentence_synopsis?: string       // TVDB overview (truncated)
  release_year?: number                // From TVDB firstAired
  episode_runtime_minutes?: number     // TVDB average runtime
  content_rating?: string              // e.g. "TV-MA", "TV-14"
  genres?: string[]                    // TVDB genre tags
  tvdb_poster_thumbnail_url?: string   // 210px poster thumbnail
  tvdb_show_url?: string               // thetvdb.com series page
  streaming_platforms?: string[]       // From TVDB companies or Claude inference
  average_user_rating?: number         // TVDB community rating
}
```

All fields except `title` are optional because TVDB may not have data for every show, and the card must render gracefully in partial states.

### `Recommendation`

The fully resolved shape after Claude's JSON is parsed and merged with TVDB data. Extends the TVDB fields with Claude-generated attributes.

```typescript
interface Recommendation {
  // TV Show fields (TVDB-sourced when available)
  id?: number
  title: string
  one_sentence_synopsis?: string
  release_year: number                 // Required after full parse
  episode_runtime_minutes: number      // Required after full parse
  content_rating?: string
  genres: string[]                     // Required after full parse
  tvdb_poster_thumbnail_url?: string
  tvdb_show_url?: string
  streaming_platforms?: string[]
  average_user_rating?: number
  imdb_rating: number                  // Claude-generated estimate

  // AI Recommendation Attributes (Claude-generated, scored 0–10)
  comedy_score: number
  horror_score: number
  action_score: number
  drama_score: number
  suspense_score: number
  romance_score: number

  // Recommendation Metadata
  reason: string                       // One sentence, specific to the user's input
  recommendation_score?: number        // Reserved for future ranking use
  matched_keywords?: string[]          // Reserved for future keyword highlighting
}
```

**Why genre scores matter architecturally:** These six fields are not decoration — they are the filter dimensions. Client-side sliders for "Comedy Level" and "Horror Level" read directly from `comedy_score` and `horror_score`. Without these in the Claude output contract, client-side filtering on tone would require a separate classification call. See `[PROMPT]` for how the rules driving these scores evolved.

### `RecommendationsRequest`

The validated payload sent from the browser to `POST /api/recommendations`:

```typescript
interface RecommendationsRequest {
  fileContent: string   // Parsed file content, max 12,000 chars server-side
  keywords: string      // Free-text keywords, max 5,000 chars server-side
  count: number         // Number of recommendations requested (1–10)
}
```

### `PendingRequest`

Stored in `AppShell` state between the Favourites tab submission and the Recommendations tab consuming it. Includes `isTest` to trigger demo mode.

```typescript
interface PendingRequest {
  fileContent: string
  keywords: string
  fileName?: string    // Display name of the uploaded file
  isTest?: boolean     // If true, uses bundled demo data; no API call
}
```

---

## 2. AI Recommendation Attributes

The six genre scores serve a dual purpose that is worth calling out explicitly:

**As recommendation metadata:** They tell the reader what kind of show this is — a drama with some suspense but no horror.

**As filter dimensions:** The client renders six sliders directly driven by these values. Filtering is entirely client-side. No second API call is made when a user moves the Horror slider. This is only possible because the scores are embedded in the AI output.

The scores are Claude's estimates based on its knowledge of each show. They are calibrated in the system prompt (`All numeric scores (0–10) and ratings must be realistic estimates based on your knowledge`) to avoid clustering at extremes.

**Interpreting the scale:**

| Score | Meaning |
|-------|---------|
| 0–2 | Essentially absent |
| 3–4 | Minor element |
| 5–6 | Moderate presence |
| 7–8 | Significant element |
| 9–10 | Defining characteristic |

---

## 3. Library Types

Used by the My Shows tab and the `/api/library-status` and `/api/show-details` routes.

```typescript
interface LibraryShow {
  id: number
  title: string
  poster?: string
  tvdb_url?: string
  status: string                                    // "Continuing", "Ended", etc.
  season_count: number
  last_aired?: string                               // ISO date
  last_episode?: { season: number; number: number }
  next_aired?: string                               // ISO date
  next_episode?: { season: number; number: number }
}

interface CastMember {
  actor: string
  character: string
  image?: string
}

interface ShowDetails {
  status: string
  season_count: number
  cast: CastMember[]
  full_overview: string
}
```

---

## 4. Usage Logging Schema

Every API request that invokes Claude is logged as a `UsageLogEntry`. Log files are written in JSONL format, one file per day, at `data/usage-logs/YYYY-MM-DD.jsonl`.

```typescript
type UsageRoute = 'recommendations' | 'library-status' | 'show-details'

interface UsageLogEntry {
  ts: string                                              // ISO 8601 timestamp
  ip: string                                              // From x-forwarded-for header
  ua: string                                              // User-Agent, truncated to 200 chars
  route: UsageRoute
  params: RecommendationsParams | LibraryStatusParams | ShowDetailsParams
  status: 'success' | 'error'
  durationMs: number                                      // Wall-clock time of the API route
  model?: string                                          // e.g. 'claude-sonnet-4-6'
  inputTokens?: number
  outputTokens?: number
  costUsd?: number                                        // Calculated at $3/M input, $15/M output
  geo?: GeoInfo                                           // Resolved from ip-api.com
}

interface GeoInfo {
  city?: string
  region?: string
  country?: string
  countryCode?: string
}

interface RecommendationsParams {
  fileContentChars: number
  keywordsChars: number
  count: number
  isTest: boolean
}
```

See `[OPS]` for how these are read, displayed, and interpreted.

---

## 5. Eval Types

Used by the evaluation pipeline in `app/api/eval/route.ts` and the admin eval panel.

```typescript
interface CriterionScore {
  score: number      // 0–10
  rationale: string  // Judge's explanation for the score
}

interface EvalCriteria {
  relevance: CriterionScore
  reasoningQuality: CriterionScore
  diversity: CriterionScore
  metadataAccuracy: CriterionScore
  noOverlap: CriterionScore
}

type EvalGrade = 'A' | 'B' | 'C' | 'D' | 'F'

interface EvalRunResult {
  recommendations: Recommendation[]
  criteria: EvalCriteria
  overallScore: number   // Mean of the five criterion scores, rounded to 1 decimal
  grade: EvalGrade
  rawCritique: string    // 2–4 sentence narrative from the judge
  reportUrl: string      // Path to the generated HTML report
}
```

**Grade boundaries:**

| Grade | Score Range |
|-------|-------------|
| A | ≥ 9.0 |
| B | ≥ 8.0 |
| C | ≥ 7.0 |
| D | ≥ 6.0 |
| F | < 6.0 |

See `[EVAL]` for the complete evaluation framework including the 27-run history.

---

## 6. Type Discipline

All interfaces live in a single file: `lib/types.ts`. Every server route (`app/api/*/route.ts`) and every client component that handles recommendation data imports from this file.

This single-source-of-truth approach means:
- TypeScript catches mismatches between what the API returns and what the client expects at compile time
- Refactoring a field name propagates to both sides with a single change
- No duplication of interface definitions between server and client code

The `[DATA]` model is stable. The only fields added after the initial definition were the streaming platform and eval types as those features were built.

---

## Supporting File References

- [`lib/types.ts`](../../lib/types.ts) — single source of truth for all domain interfaces (159 lines)
- [`lib/eval-data.ts`](../../lib/eval-data.ts) — eval test preset constants
- [`app/api/recommendations/route.ts`](../../app/api/recommendations/route.ts) — produces `Recommendation[]`
- [`app/api/eval/route.ts`](../../app/api/eval/route.ts) — produces `EvalRunResult`
- [`lib/usage-logger.ts`](../../lib/usage-logger.ts) — writes `UsageLogEntry` to JSONL
