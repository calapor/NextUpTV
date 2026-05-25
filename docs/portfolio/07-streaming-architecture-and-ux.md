![NextUpTV](assets/nextuptv-logo-1280x200.jpg)

# Streaming Architecture and Progressive UI

**Document ID:** STREAM  
**Related:** [ARCH](02-system-architecture.md) | [PROMPT](04-prompt-engineering-lifecycle.md) | [EDL](09-engineering-decision-log.md)  
**Last Updated:** May 2026  
**Status:** Final

---

## 

Generating 10 AI recommendations with real-time TV metadata takes 8–15 seconds. Rendering nothing until it finishes is not acceptable UX. The solution is a two-pass streaming architecture: Claude streams titles character by character, TVDB lookups fire immediately in parallel, and recommendation cards appear in the browser as each one resolves — typically starting within 2–3 seconds of submission. The total generation time is displayed as a live elapsed timer.

---

## 1. The Latency Problem

A single recommendation request involves two sequential latency sources:
1. **Claude generation:** Producing 10 structured recommendations at `max_tokens: 6144` takes 4–10 seconds depending on server load and input length
2. **TVDB enrichment:** Each recommendation requires a TVDB API call to resolve the poster, genres, synopsis, and runtime — a further 1–2 seconds if done sequentially

If these run sequentially (wait for Claude → then enrich all 10 shows), the user waits 8–15 seconds staring at a spinner, then sees 10 cards appear simultaneously.

The streaming architecture eliminates this perceived wait: the first card typically appears 2–3 seconds after submission, with remaining cards arriving progressively over the next several seconds.

![Streaming mid-generation — three cards visible, status bar showing elapsed time](assets/screenshots/streaming-in-progress.png)
*Mid-generation state: three cards have appeared as TVDB resolved their titles. The status bar shows "Generating recommendations... 4.2s". The remaining cards will appear as Claude streams the next titles.*

---

## 2. SSE Event Protocol

The `/api/recommendations` endpoint responds with an SSE (Server-Sent Events) stream. The browser opens a persistent HTTP connection and receives events as they are emitted. Five event types are used:

| Event Type | Payload | When Emitted | UI Effect |
|------------|---------|--------------|-----------|
| `status` | `{ type: 'status', message: string }` | Phase transitions | Status bar text updates |
| `partial_recommendation` | `{ type: 'partial_recommendation', recommendation: PartialRecommendation }` | Each TVDB resolve during Claude generation | New card appears with poster and TVDB metadata |
| `recommendation` | `{ type: 'recommendation', recommendation: Recommendation }` | After Claude finishes, per-show merge with Claude attributes | Card upgrades with genre scores, IMDb rating, reason |
| `complete` | `{ type: 'complete', recommendations: Recommendation[] }` | Final sorted array after all enrichment | State transferred to AppShell; localStorage updated |
| `error` | `{ type: 'error', message: string, detail?: string }` | Any server error | Error alert displayed; stream closes |

All events are JSON-serialised and transmitted as `data: {...}\n\n` per the SSE spec. The client uses the browser's native `EventSource` API equivalent, reading from the `ReadableStream` response body.

---

## 3. Two-Pass Architecture

**Pass 1: Parallel enrichment during Claude generation**

While Claude streams its JSON response character by character, the server accumulates the text into a running `fullText` string. On every text delta from the Anthropic SDK, a regex pattern scans `fullText` for newly completed title fields:

```
Pattern: /"title":\s*"([^"]+)"/g
```

Each time a new show title is found, `fetchTvdbData(title)` is called immediately as a non-blocking promise. When TVDB resolves for a title, the server emits a `partial_recommendation` event with the poster, synopsis, genres, and runtime — before Claude has finished generating.

This means the first card can appear in the browser as soon as Claude has generated its first `"title"` field and TVDB has resolved — typically 2–3 seconds into generation.

**Pass 2: Claude attribute merge after generation completes**

When `anthropicStream.done()` resolves, the full Claude JSON is parsed using `extractJson()`. The parsed recommendations include all Claude-generated fields: `comedy_score`, `horror_score`, `drama_score`, `action_score`, `suspense_score`, `romance_score`, `imdb_rating`, and `reason`.

The server then:
1. Sanitizes titles and reasons (`sanitizeSeriesTitle()`, `sanitizeReason()`)
2. Filters shows with `imdb_rating: 0` (signal that Claude fabricated an unknown show)
3. Deduplicates by normalized title
4. Filters any show that matches an input show (by title or TVDB ID)
5. Sorts by `imdb_rating` descending
6. Emits a `recommendation` event for each show (upgrading the card already rendered from Pass 1)
7. Emits a `complete` event with the full final array

---

## 4. Client-Side State Machine

`StreamingView` manages a state machine with four sequential phases:

```
Connecting
    │
    ▼ (first 'status' event)
"Analyzing your favorites..."
    │
    ▼ (first 'partial_recommendation' or generation status event)
"Generating recommendations..."  ← timer latches here
    │
    ▼ (Claude done, enrichment underway)
"Fetching show details..."
    │
    ▼ ('complete' event)
[Complete — cards fully rendered]
```

The `liveRecs` array grows throughout this process. New cards are appended as `partial_recommendation` events arrive and sorted by IMDb rating (best first) as `recommendation` events upgrade them with scores.

The elapsed timer starts when the "Generating" phase begins and stops when `complete` is received. It displays in `12.34s` format and is visible on the status bar throughout generation and fetching phases.

![Completed recommendations grid — all ten cards fully loaded](assets/screenshots/recommendations-complete.png)
*The completed state after all SSE events have resolved. Cards are sorted by IMDb rating, genre score badges are populated, and the elapsed time (visible in the status bar) shows total generation + enrichment time.*

---

## 5. Deduplication Strategy

Three layers of deduplication prevent the same show appearing twice:

**Layer 1: `seenTitles` Set (server-side)**  
As titles are extracted from Claude's streaming text, each is added to a `Set`. If the same title appears twice in Claude's output (which can happen with longer inputs), the second occurrence is ignored.

**Layer 2: `isInputShow()` by normalized title (server-side)**  
After generation, each recommended show is checked against the input show list using case-insensitive, punctuation-stripped title comparison. If a match is found, the recommendation is filtered out.

**Layer 3: TVDB ID comparison (server-side)**  
To handle cross-script duplicates, the input shows are looked up in TVDB at the start of the request, and their TVDB series IDs are stored. If a recommended show's TVDB ID matches any input show's TVDB ID, it is filtered regardless of whether the titles match.

This third layer was added in commit `2ec19ca` to handle a specific case: the Hebrew input "טהרן" and the English recommendation "Tehran" are the same show, but string comparison would not detect this. TVDB resolves both to the same series ID.

---

## 6. Demo Mode

The demo mode (triggered by `isTest: true` in the request payload, or `?test=true` in the URL) serves pre-generated recommendation data from `lib/test-data/demo-recommendations.json` without calling Claude or TVDB.

`simulateCachedRecs()` replays the bundled recommendations with artificial delays to simulate the streaming experience:
- Status events are emitted with short delays to animate the status bar phases
- Cards appear progressively using `setTimeout` intervals
- The elapsed timer runs normally

This allows API-free demos and development work without incurring inference costs. The demo data is regenerated via the `/admin → Demo Cache` tab when the underlying prompt or data model changes. Demo data commits are visible in git history (`0b6b268: Refresh demo library and recommendation sample data`).

---

## 7. Performance Elapsed Timer

The timer provides real transparency about generation performance. It is not decorative — it surfaces actual inference latency to users and to the developer.

Implementation:
- `timerStartRef` is a `useRef` that latches the timestamp when the "Generating recommendations" phase begins
- A `setInterval` running every 10 milliseconds updates a displayed elapsed time
- `formatElapsed()` renders the value as `12.34s`
- The interval continues through the Fetching phase so users see the total generation + enrichment time
- The timer stops on `complete` event; the final time is visible on the completed recommendations view

Typical observed times: 6–12 seconds for 10 recommendations with TVDB enrichment on a cold Vercel function.

---

## 8. Mobile Responsive Behaviour

The layout adapts across three breakpoints:

| Breakpoint | Filter Panel | Grid | Status Bar |
|------------|-------------|------|------------|
| Desktop (>1024px) | Fixed 30% left column | 4-column card grid | Inline above grid |
| Tablet (768–1024px) | Fixed 35% left column | 2–3 column grid | Inline above grid |
| Mobile (<768px) | Bottom drawer (hidden by default) | 1-column full-width | Pinned to top, stays visible while scrolling |

The mobile bottom drawer was added in commit `f67da65: Improve mobile layout`. The pinned status bar was added in commit `e497306: Pin generation status bar while scrolling` — on mobile, without pinning, the status bar scrolls out of view during generation and the user loses visibility of progress.

The streaming icons (Netflix, Hulu, etc.) are SVG files in `/public/streaming-icons/` and render at 20×20px in card badges. They were added in commit `c366714: Add streaming platform icons to recommendation cards`.

---

## Supporting File References

- [`app/api/recommendations/route.ts`](../../app/api/recommendations/route.ts)`:40–79` — SSE event emission functions and types
- [`app/api/recommendations/route.ts`](../../app/api/recommendations/route.ts)`:130–248` — two-pass streaming pipeline
- [`components/streaming-view.tsx`](../../components/streaming-view.tsx) — SSE consumer, state machine, timer, progressive cards
- [`components/recommendation-card.tsx`](../../components/recommendation-card.tsx) — card rendering with poster fallback
- [`components/dashboard-layout.tsx`](../../components/dashboard-layout.tsx) — filter panel and responsive grid layout
- [`lib/title-utils.ts`](../../lib/title-utils.ts) — `buildInputTitleSet()`, `isInputShow()`, `extractJson()`
- [`lib/test-data/demo-recommendations.json`](../../lib/test-data/demo-recommendations.json) — bundled demo data
