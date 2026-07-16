import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { isClaudeHalted, CLAUDE_HALTED_MESSAGE } from '@/lib/claude-halt'
import type { PartialRecommendation, RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvdb'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from '@/lib/prompts'
import testRecommendations from '@/lib/test-data/recommendations.json'
import {
  buildInputTitleSet,
  extractJson,
  isInputShow,
  sanitizeSeriesTitle,
  sanitizeReason,
} from '@/lib/title-utils'
import { sseEvent, sseResponse } from '@/lib/sse'
import { logUsage, extractIp, extractUa, extractGeo, calcCost } from '@/lib/usage-logger'
import {
  buildUserContent,
  extractRawInputTitles,
  filterAndDedupeRecommendations,
  validateInputSize,
} from '@/lib/recommendations-pipeline'

const anthropic = new Anthropic()

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleTestRequest(): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEvent({ type: 'status', message: 'Analyzing your favorites...' }))
      await delay(400)
      controller.enqueue(sseEvent({ type: 'status', message: 'Generating recommendations...' }))
      await delay(400)

      for (const rec of testRecommendations) {
        controller.enqueue(sseEvent({ type: 'partial_recommendation', recommendation: rec }))
        await delay(300)
      }

      controller.enqueue(sseEvent({ type: 'status', message: 'Fetching show details...' }))
      await delay(400)

      for (const rec of testRecommendations) {
        controller.enqueue(sseEvent({ type: 'recommendation', recommendation: rec }))
      }

      controller.enqueue(sseEvent({ type: 'complete', recommendations: testRecommendations }))
      controller.close()
    },
  })
  return sseResponse(stream)
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const ip = extractIp(req)
  const ua = extractUa(req)
  const geo = extractGeo(req)

  if (new URL(req.url).searchParams.get('test') === 'true') {
    logUsage({
      ts: new Date().toISOString(), ip, ua, geo, route: 'recommendations',
      params: { fileContentChars: 0, keywordsChars: 0, count: 20, isTest: true },
      status: 'success', durationMs: Date.now() - startedAt,
    })
    return handleTestRequest()
  }

  let body: RecommendationsRequest
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }
  const { fileContent, keywords, count } = body

  const validation = validateInputSize(fileContent, keywords)
  if (!validation.ok) {
    return new Response(validation.error, { status: validation.status })
  }

  const fileContentChars = fileContent?.length ?? 0
  const keywordsChars = keywords?.length ?? 0

  const userContent = buildUserContent(fileContent, keywords, count)

  if (await isClaudeHalted()) {
    return NextResponse.json({ error: CLAUDE_HALTED_MESSAGE, claudeHalted: true }, { status: 503 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      let streamErrored = false
      let inputTokens = 0
      let outputTokens = 0
      let enriched: Array<RecommendationsResponse['recommendations'][number]> = []
      const MODEL = 'claude-sonnet-4-6'
      const timings: Array<{ label: string; durationMs: number }> = []
      let lastTimeMs = startedAt
      const time = (label: string) => {
        const now = Date.now()
        const durationMs = now - lastTimeMs
        lastTimeMs = now
        timings.push({ label, durationMs })
        console.log(`[recommendations] +${now - startedAt}ms ${label} (Δ${durationMs}ms)`)
      }
      try {
        controller.enqueue(sseEvent({ type: 'status', message: 'Analyzing your favorites...' }))

        const inputTitles = buildInputTitleSet([fileContent, keywords].filter(Boolean).join('\n'))

        // Fire TVDB lookups for input show titles concurrently with Claude streaming.
        // This resolves cross-script duplicates (e.g. Hebrew "טהרן" → TVDB id for "Tehran")
        // that normalizeTitle can't catch because it strips non-ASCII characters.
        const rawInputTitles = extractRawInputTitles(fileContent, keywords)
        const inputTvdbIds = new Set<number>()
        const inputTvdbLookupDone = Promise.all(
          rawInputTitles.map(t =>
            fetchTvdbData(t).then(data => { if (data?.id) inputTvdbIds.add(data.id) }).catch(() => {})
          )
        )

        let fullText = ''
        const tvdbPromises = new Map<string, ReturnType<typeof fetchTvdbData>>()
        const titleRegex = /"title":\s*"([^"]+)"/g

        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 6144,
          system: RECOMMENDATIONS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        })

        anthropicStream.on('message', (msg) => {
          inputTokens = msg.usage.input_tokens
          outputTokens = msg.usage.output_tokens
        })

        controller.enqueue(sseEvent({ type: 'status', message: 'Generating recommendations...' }))

        anthropicStream.on('text', (textDelta) => {
          fullText += textDelta
          titleRegex.lastIndex = 0
          let match
          while ((match = titleRegex.exec(fullText)) !== null) {
            const sanitized = sanitizeSeriesTitle(match[1])
            if (!tvdbPromises.has(sanitized) && !isInputShow(sanitized, inputTitles)) {
              const promise = fetchTvdbData(sanitized)
              tvdbPromises.set(sanitized, promise)
              promise.then((tvdb) => {
                if (tvdb) {
                  const partial: PartialRecommendation = {
                    title: sanitized,
                    id: tvdb.id,
                    one_sentence_synopsis: tvdb.one_sentence_synopsis,
                    release_year: tvdb.release_year,
                    episode_runtime_minutes: tvdb.episode_runtime_minutes,
                    content_rating: tvdb.content_rating,
                    genres: tvdb.genres,
                    tvdb_poster_thumbnail_url: tvdb.tvdb_poster_thumbnail_url,
                    tvdb_show_url: tvdb.tvdb_show_url,
                    streaming_platforms: tvdb.streaming_platforms,
                    average_user_rating: tvdb.average_user_rating,
                  }
                  try {
                    controller.enqueue(sseEvent({ type: 'partial_recommendation', recommendation: partial }))
                  } catch {
                    // Stream already closed — TVDB fetch resolved after stream ended
                  }
                }
              })
              controller.enqueue(sseEvent({ type: 'status', message: `Suggesting: ${sanitized}` }))
            }
          }
        })

        await anthropicStream.done()
        time('Anthropic streaming')
        await inputTvdbLookupDone
        time('TVDB input lookups (wait)')

        controller.enqueue(sseEvent({ type: 'status', message: 'Fetching show details...' }))

        let parsed: RecommendationsResponse
        try {
          parsed = JSON.parse(extractJson(fullText))
        } catch (parseErr) {
          console.error('[recommendations] JSON parse failed. Raw text:\n', fullText)
          throw parseErr
        }

        const candidates = filterAndDedupeRecommendations(parsed.recommendations, inputTitles)

        // Kick off any TVDB fetches not already started during streaming, so they all
        // run in parallel rather than serializing one-per-iteration.
        const tvdbResults = await Promise.all(
          candidates.map((rec) => tvdbPromises.get(rec.title) ?? fetchTvdbData(rec.title))
        )
        time(`Enrichment (${candidates.length} candidates)`)

        candidates.forEach((rec, i) => {
          const tvdb = tvdbResults[i]
          // Cross-script duplicate check: if the recommended show's TVDB ID matches an input
          // show's TVDB ID, skip it. Catches cases like Hebrew "טהרן" → English "Tehran".
          if (tvdb?.id && inputTvdbIds.has(tvdb.id)) return
          const enrichedRec = {
            ...rec,
            ...(tvdb
              ? {
                  id: tvdb.id,
                  one_sentence_synopsis: tvdb.one_sentence_synopsis,
                  release_year: tvdb.release_year,
                  episode_runtime_minutes: tvdb.episode_runtime_minutes,
                  content_rating: tvdb.content_rating,
                  genres: tvdb.genres,
                  tvdb_poster_thumbnail_url: tvdb.tvdb_poster_thumbnail_url,
                  tvdb_show_url: tvdb.tvdb_show_url,
                  streaming_platforms: tvdb.streaming_platforms,
                  average_user_rating: tvdb.average_user_rating,
                }
              : {}),
          }
          enriched.push(enrichedRec)
          controller.enqueue(sseEvent({ type: 'recommendation', recommendation: enrichedRec }))
        })

        enriched.sort((a, b) => (b.imdb_rating ?? 0) - (a.imdb_rating ?? 0))
        controller.enqueue(sseEvent({ type: 'complete', recommendations: enriched }))
        time('Finalize')
      } catch (err) {
        streamErrored = true
        const message =
          err instanceof SyntaxError
            ? 'Claude returned invalid JSON. Please try again.'
            : 'An error occurred while generating recommendations.'
        const detail = err instanceof Error ? err.message : String(err)
        controller.enqueue(sseEvent({ type: 'error', message, detail }))
      } finally {
        controller.close()
        await logUsage({
          ts: new Date().toISOString(), ip, ua, geo, route: 'recommendations',
          params: { fileContentChars, keywordsChars, count, isTest: false, timings },
          status: streamErrored ? 'error' : 'success',
          durationMs: Date.now() - startedAt,
          model: MODEL,
          inputTokens,
          outputTokens,
          costUsd: calcCost(MODEL, inputTokens, outputTokens),
          inputText: [
            fileContent && `--- Uploaded favourites ---\n${fileContent}`,
            keywords && `--- Keywords ---\n${keywords}`,
          ].filter(Boolean).join('\n\n') || undefined,
          outputText: enriched.length > 0 ? enriched.map(r => r.title).join('\n') : undefined,
        })
        console.log(`[recommendations] +${Date.now() - startedAt}ms logUsage done`)
      }
    },
  })

  return sseResponse(stream)
}
