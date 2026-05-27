![NextUpTV](assets/nextuptv-logo-1280x200.jpg)

# Engineering Decision Log

**Document ID:** EDL  
**Related:** [PDB](00-product-design-brief.md) | [ARCH](02-system-architecture.md) | [DATA](03-data-model-reference.md) | [PROMPT](04-prompt-engineering-lifecycle.md) | [EVAL](05-evaluation-framework.md) | [SAFETY](06-ai-safety-and-hardening.md) | [STREAM](07-streaming-architecture-and-ux.md) | [OPS](08-observability-and-cost-tracking.md)  
**Last Updated:** May 2026  
**Status:** Final

---

## 

This document records twelve deliberate engineering decisions made during the development of NextUpTV. Each decision had alternatives that were considered and a rationale that can be defended. The decisions span infrastructure, AI architecture, UX, security, and the development workflow itself. They are documented here because the reasoning behind a decision is often more revealing than the decision itself.

---

## How to Read This Document

Each entry follows the same structure:

- **Decision:** What was chosen
- **Alternatives considered:** What else was evaluated
- **Rationale:** Why this choice was made
- **Outcome / Learning:** What happened; whether the decision held up

---

## Decision 1: SSE Over WebSockets for Streaming

**Decision:** Used Server-Sent Events (SSE) for the streaming recommendation pipeline.

**Alternatives considered:**
- WebSockets: bidirectional, stateful, widely supported
- Polling: simple but creates unnecessary requests and adds latency

**Rationale:** The recommendation generation flow is fundamentally unidirectional — the server sends events to the browser, and the browser never needs to send mid-stream messages back. WebSockets require a stateful connection and a WebSocket server (not natively supported in Vercel's serverless model without additional configuration). SSE is HTTP/1.1-compatible, works natively with Next.js streaming responses, and is directly supported by Vercel's serverless infrastructure without any special configuration. The simpler choice matched the simpler problem.

**Outcome:** SSE worked cleanly for the entire streaming pipeline. No WebSocket infrastructure was needed. The native `ReadableStream` support in Next.js App Router made the server-side implementation straightforward.

---

## Decision 2: Parallel TVDB Enrichment During Claude Generation

**Decision:** TVDB lookups fire immediately as Claude streams each title, rather than waiting for full generation to complete.

**Alternatives considered:**
- Sequential: wait for Claude to finish, then enrich all shows
- Batched: wait for Claude to finish, then fire all TVDB calls in parallel

**Rationale:** Sequential enrichment adds a full TVDB round-trip (1–2 seconds) on top of the already-significant Claude generation time. Batched parallel enrichment is better, but still starts enrichment only after Claude finishes. Streaming enrichment begins TVDB lookups as soon as the first title appears in Claude's output — the TVDB call for show #1 is often complete before Claude has even generated show #3. The cost is minimal: if Claude changes a title after the regex match (which occasionally happens), the TVDB call for the old title is wasted. In practice this happens for approximately 1 of 10 shows and the waste is a single API call.

**Outcome:** The first card typically appears 2–3 seconds after submission. The trade-off (1–2 wasted TVDB calls per run) was accepted and is not user-visible.

---

## Decision 3: localStorage for Persistence, Not a Database

**Decision:** Recommendations, filter state, and favourites input are stored in `localStorage`, not in a server-side database.

**Alternatives considered:**
- PostgreSQL or SQLite with a Vercel-hosted database (Neon, Turso)
- Redis for session caching
- Server-side sessions with cookies

**Rationale:** A database requires schema design, migrations, connection pooling, and ongoing cost. For a v2 application with no user authentication, storing sessions per-user is not meaningfully possible anyway — without auth, there is no user identity to key against. localStorage achieves the primary persistence goal (recommendations survive a page reload) without any backend infrastructure. The explicit trade-off — data is lost if the user clears their browser or switches device — was accepted as appropriate for a v2 scope.

**Outcome:** localStorage persistence worked well for the intended use case. The absence of a database eliminated a significant operational concern and allowed the entire application to run on Vercel's free tier.

---

## Decision 4: Claude as Fallback for Streaming Platform Inference

**Decision:** When TVDB's `companies` array is empty for a show, a targeted Claude call (`max_tokens: 200`) infers which streaming platforms carry it.

**Alternatives considered:**
- Maintain a static mapping of shows to streaming platforms (not scalable, stales immediately)
- Omit streaming platform data when TVDB doesn't have it (acceptable but reduces card utility)
- Use a third-party streaming availability API (adds another API dependency, often paid)

**Rationale:** Claude's training data covers streaming platform availability reasonably well for established shows. For a non-critical data point (the streaming icon badges on cards), Claude's knowledge is good enough. The call is cheap (200 tokens max, a fraction of a cent) and non-blocking. The staleness risk — Claude doesn't know about platform changes after its training cutoff — is acceptable for a recommendation UI where accuracy is approximate, not guaranteed.

**Outcome:** Claude's streaming platform inference proved accurate for most major shows on major platforms. For very new shows or regional platforms, it occasionally returned incorrect data. This was accepted as an appropriate quality floor for a v2 feature.

---

## Decision 5: LLM-as-Judge for Evaluation

**Decision:** Used Claude Sonnet 4.6 as the judge in the evaluation pipeline, scoring its own outputs from a different perspective.

**Alternatives considered:**
- Human evaluation: a panel of raters assesses recommendation sets
- Programmatic heuristics: rule-based scoring (e.g. check IMDb ratings against a reference database)
- A different model as judge (e.g. GPT-4 evaluating Claude's output)

**Rationale:** Human evaluation at scale is expensive and slow. Programmatic heuristics can catch metadata errors but cannot assess reasoning quality or relevance — the most important criteria. Using a different model as judge would reduce correlated bias but adds a second API provider dependency. The LLM-as-judge pattern (same model family, different system prompt and reasoning context) is well-established in AI engineering and provides fast, scalable, directionally-reliable evaluation at near-zero marginal cost.

**Outcome:** The judge reliably detected large regressions (F-grade runs when the no-overlap constraint was violated or token changes broke the prompt) and confirmed improvements. It is less reliable for distinguishing B from C — a known limitation of the approach documented in `[EVAL]`.

---

## Decision 6: Genre Scores in Claude's Output Contract

**Decision:** Added six genre dimension scores (comedy, horror, action, drama, suspense, romance) to the required JSON output from Claude.

**Alternatives considered:**
- Classify genres from TVDB's genre tags (no scoring, just binary presence)
- Infer tone scores from the recommendation text using a second Claude call
- Omit tone-based filtering entirely (only filter on runtime, year, rating)

**Rationale:** Client-side filtering on tone requires numeric values, not boolean presence flags. TVDB genres are categorical ("Crime", "Drama") and do not capture tonal nuance — a show can be a Crime Drama with high suspense and no comedy, or high comedy and light suspense. Asking Claude to score these dimensions at generation time adds approximately 60 tokens to the output and costs a fraction of a cent per request. A second classification call would double the Claude cost and add latency. The embedded scores also improved Reasoning Quality in the eval framework — requiring specific genre scores appeared to make Claude reason more specifically about what distinguishes each show.

**Outcome:** The six genre score sliders became one of the most useful filter features. The unexpected side effect — improved reasoning quality in eval — was measurable and repeatable across eval runs.

---

## Decision 7: Committing Demo Data to Git

**Decision:** Bundled pre-generated demo recommendations and library data are committed to the repository as JSON files.

**Alternatives considered:**
- Regenerate demo data on each demo run (using the API)
- Cache demo data in an environment variable or secret
- Use a database fixture that is seeded on deployment

**Rationale:** Committed demo data enables:
- Offline demos with no API access
- Demos with no inference cost
- A stable, reproducible baseline for screenshots and documentation
- Development work on the UI without triggering real API calls

The trade-off is repository size inflation and the need to periodically regenerate the data when the prompt or data model changes. The `/admin → Demo Cache` tab provides a one-click regeneration tool to manage this. The data files are small (a few kilobytes) and the regeneration workflow is documented.

**Outcome:** Demo data commits (`0b6b268: Refresh demo library and recommendation sample data`) became a standard part of the development workflow whenever the output format changed.

---

## Decision 8: TVDB Over TVMaze as the Metadata Provider

**Decision:** Replaced TVMaze with TVDB v4 API (commit `d45dadc: Replace TVMaze with TVDB API v4`).

**Alternatives considered:**
- Continue with TVMaze (existing integration)
- Build against both APIs with fallback logic
- Use The Movie Database (TMDB) which also covers TV shows

**Rationale:** TVMaze was the initial choice because it requires no API key for basic usage. After building the initial recommendation cards, two gaps became clear: TVMaze lacks content ratings (TV-MA, TV-14, etc.) and its coverage of streaming platform availability data is weak. TVDB v4 provides both, plus richer episode-level data for the My Shows feature. The migration cost — a new API key, a new client, rewritten endpoint calls — was one day of work. TMDB was considered but TVDB has stronger TV-specific coverage and a more stable API for series data.

**Outcome:** TVDB provided all the data needed for the recommendation cards, show detail panels, and library status views. The API key requirement was a minor operational overhead.

---

## Decision 9: Server-Side Title Prefix Stripping

**Decision:** Strip title prefixes like "Miniseries:", "Limited Series:", "Part 2:" on the server before passing titles to TVDB.

**Alternatives considered:**
- Add a prompt rule telling Claude never to emit these prefixes
- Handle them in the client display layer
- Ignore them and accept degraded TVDB match rates

**Rationale:** The prompt rule approach was tested first. It reduced but did not eliminate the artifacts — Claude sometimes emitted these prefixes in the title field despite the rule, particularly for well-known limited series (Chernobyl, Band of Brothers). Server-side stripping with `sanitizeSeriesTitle()` is deterministic and catches all known prefix patterns regardless of what Claude emits. Client-side handling would display clean titles but TVDB lookups using unstripped titles would fail to resolve posters and metadata. Server-side is the right layer to solve a server-side data quality problem.

**Outcome:** TVDB match rates improved significantly after adding prefix stripping. The set of prefix patterns handled by `sanitizeSeriesTitle()` grew over three commits as new patterns were observed in Claude output.

---

## Decision 10: `<user_input>` XML Tags for Injection Isolation

**Decision:** Wrap user-provided file content and keywords in `<user_input>` XML tags on the server, with an explicit meta-instruction in the system prompt.

**Alternatives considered:**
- Sanitize user input at ingestion (strip instruction-like patterns before sending to Claude)
- Use a separate Claude call to screen input for injection attempts before the main call
- Accept the risk as low and do nothing

**Rationale:** Input sanitization is fragile — it requires maintaining a list of patterns to strip, and adversarial inputs are designed to evade pattern matching. A pre-screening call adds latency and cost. XML tag isolation is an additive, zero-degradation approach: it costs nothing for legitimate inputs, does not require pattern maintenance, and activates only when the model detects instruction-like content in the tagged section. The approach is recommended by Anthropic's own guidance on prompt injection. Accepting the risk was also considered — the blast radius of a successful injection is a degraded recommendation set, not a data breach — but hardening was the more professional choice.

**Outcome:** The hardening was confirmed cost-free via eval runs before and after the commit. Scores were unchanged. The meta-instruction did not confuse the model's behavior for legitimate inputs.

---

## Decision 11: Neon Postgres in Production, Local Disk in Development for Usage Logs

**Decision:** Usage logs persist to a Neon Postgres `usage_logs` table when `DATABASE_URL` is set in the environment, and to JSONL files on local disk when it isn't. A thin storage abstraction in `lib/usage-storage.ts` dispatches between the two backends.

**Alternatives considered:**
- **Vercel Blob with daily JSONL objects.** Read the existing day's blob, append the new line, write it back.
- **Vercel Blob with per-entry blobs.** One blob per log line, listed by prefix to read.
- **Vercel KV (Redis).** `LPUSH` per entry, `LRANGE` to read.
- **External observability SaaS (Axiom, Logtail).** Free tier, drop-in HTTP client.
- **Keep JSONL only and accept the Vercel limitation.** Treat the cloud deploy as ephemeral and only inspect logs in local dev.

**Rationale:** Vercel's serverless filesystem is read-only at runtime, so the existing JSONL-on-disk approach silently dropped every cloud-deploy log entry. A backend was required. Vercel Blob was the obvious first reach but was the wrong primitive on three counts: it is an object store optimised for write-once read-many media, so an append-on-every-request pattern requires read-modify-write and races under concurrent invocations; it only supports `access: 'public'` blobs, which is a privacy concern given the logs contain IP addresses, geo data, and per-request costs; and per-entry blobs would push the read path into a `list + N-fetch` loop, which is fine until it isn't. Vercel KV would solve the concurrency and privacy problems but offers no queryability — the admin dashboard becomes a manual scan rather than `SELECT … WHERE date = …`. An external SaaS was a reasonable choice but adds another vendor dependency for a portfolio app already using Vercel and Neon. Neon Postgres gives concurrent atomic appends for free, private-by-default access, a SQL surface that maps cleanly onto the existing admin UI, and a generous Hobby-tier free plan. The `@neondatabase/serverless` driver uses HTTP rather than long-lived TCP connections, which matches the serverless invocation model with no pooling required.

Keeping local disk as the dev backend avoids forcing every contributor to provision a database, keeps the local dev loop fast, and means the project still demonstrates the JSONL approach (which is the right answer when you control the filesystem).

The storage layer dispatches on `process.env.DATABASE_URL` presence rather than `process.env.VERCEL`. This means a developer can opt into testing against the cloud DB simply by setting the env var locally — the abstraction does not assume Vercel is the only production target.

**Outcome:** Production deploys now persist usage telemetry to Neon, with preview deploys writing to branched copies of the database that auto-destroy when the preview is removed. The dev experience is unchanged for contributors who do not set `DATABASE_URL`. The per-request response shape returned by `/api/usage-logs` was preserved, so the admin UI required no changes when the backend swapped.

---

## Decision 12: AI-Assisted Development with Human Direction

**Decision:** Use Claude Code as the primary coding and documentation collaborator throughout the build. Retain human ownership of the work that does not transfer to the model: product scope, architecture decisions, prompt design, evaluation criteria, and the call on what to ship.

**Alternatives considered:**
- **Hand-written code, AI only for autocomplete.** Honest about the line between human and machine, but slower, and a poor demonstration of the very skill the project sets out to evidence.
- **AI for code only, hand-written documentation.** Avoids questions about authorship in the prose, but creates two voices in the repo and effectively hides the workflow the project is meant to showcase.
- **No AI assistance.** Would have produced a smaller surface area in the same time budget and contradicted the project's thesis.

**Rationale:** The point of NextUpTV is to demonstrate applied AI engineering. Building it without AI in the loop would have undermined the demonstration. The senior-engineer skills that matter — choosing the problem, scoping the surface area, designing the prompt contract, building an evaluation harness, deciding when output is good enough to ship — do not transfer to the model. Coding velocity and prose drafting do. Spending the saved hours on evaluation runs, decision documentation, and product judgment was a better use of the time than typing the same code by hand.

Documenting the workflow openly is more credible than pretending otherwise. A reader can see the result and infer the tooling; saying so directly removes ambiguity and matches the way the work will increasingly be done.

**Outcome:** The repo ships with code, portfolio documentation, and architecture diagrams co-authored with Claude. Development used [Conductor](https://conductor.build) to run several Claude Code agents in parallel across isolated git worktrees, with integration and review happening at the merge boundary — a pattern that mirrors how an engineering manager coordinates work across a small team. The evaluation framework (Decision 5) and the prompt hardening (Decision 10) are the clearest examples of work that benefited from the saved coding hours — both required iteration that would have been hard to justify in a hand-written timeline. The most useful discipline learned was treating the model's first answer as a draft rather than a result: the obvious solution is often right, but when it isn't, the cost of pushing back is small and the cost of accepting it is large. Several entries in this log (notably 4, 8, and 11) record cases where the second answer was the one that shipped. A more visible example sits in the portfolio documentation itself: the first cut of the architecture diagrams was text-based ASCII flow blocks rendered inline in the markdown. I directed a switch to PlantUML source files rendered to PNGs (commit `c01a050`); `.puml` is now the canonical source for every architecture diagram in the repo. The ASCII version would have shipped if the first answer had been accepted.

---

## Supporting File References

All decisions reference source evidence. Key files:

- [`app/api/recommendations/route.ts`](../../app/api/recommendations/route.ts) — decisions 1, 2, 6, 9, 10
- [`lib/tvdb.ts`](../../lib/tvdb.ts) — decisions 4, 8
- [`lib/usage-logger.ts`](../../lib/usage-logger.ts) — decision (observability rationale)
- [`lib/usage-storage.ts`](../../lib/usage-storage.ts), [`lib/db/schema.sql`](../../lib/db/schema.sql) — decision 11 (Neon + local-disk hybrid)
- [`lib/prompts.ts`](../../lib/prompts.ts) — decisions 6, 9, 10
- [`lib/title-utils.ts`](../../lib/title-utils.ts) — decision 9
- [`public/eval-reports/manifest.json`](../../public/eval-reports/manifest.json) — decision 5
- [`lib/test-data/demo-recommendations.json`](../../lib/test-data/demo-recommendations.json) — decision 7
- Git commit `d45dadc` — decision 8 (TVMaze → TVDB)
- Git commit `0c955dc` — decision 10 (prompt injection hardening)
- Git commit `f7215a1` — decision 6 (genre scores)
- Git commit `6b73ed1` — decision 2 (two-pass streaming)
