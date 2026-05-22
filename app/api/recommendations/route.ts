import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { PartialRecommendation, RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvdb'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from '@/lib/prompts'
import testRecommendations from '@/lib/test-data/recommendations.json'
import { buildInputTitleSet, extractJson, isInputShow } from '@/lib/title-utils'
import { logUsage, extractIp, extractUa, calcCost } from '@/lib/usage-logger'

const anthropic = new Anthropic()
const encoder = new TextEncoder()

function sseEvent(obj: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
}

function sanitizeSeriesTitle(title: string): string {
  // Strip leading type prefixes e.g. "Miniseries: Band of Brothers", "Limited Series: Chernobyl"
  title = title.replace(/^(?:Mini(?:series)?|Limited\s+Series|Anthology|Documentary|Reality|Animation|Animated)\s*:\s*/i, '').trim()
  // Strip dash-based self-corrections e.g. "Night Agent — instead: Longmire"
  title = title.replace(/\s*[—–-]\s*(?:instead|actually|wait|correction|oops)[^]*$/i, '').trim()
  // Strip parenthetical self-corrections Claude sometimes emits
  // e.g. "(wait — already listed)", "(already recommended)"
  title = title.replace(/\s*\([^)]*\b(?:wait|already listed|already recommended|correction|oops|I mean)\b[^)]*\)/gi, '').trim()
  // Strip trailing season/series/part qualifiers e.g. "(Season 1)", ": Series 2", " - Part 3"
  return title.replace(/[\s:–\-]*\(?(?:Season|Series|Part)\s+\d+\)?$/i, '').trim()
}

function sanitizeReason(reason: string): string {
  // Strip dash-based self-corrections e.g. "something — instead: something else"
  reason = reason.replace(/\s*[—–-]\s*(?:instead|actually|wait|correction|oops)[^]*$/i, '').trim()
  // Strip parenthetical self-corrections Claude sometimes emits mid-generation
  // e.g. "(wait — already listed)", "(already recommended)", "(correction: ...)"
  return reason
    .replace(/\s*\([^)]*\b(?:wait|already listed|already recommended|correction|oops|I mean)\b[^)]*\)/gi, '')
    .trim()
}


function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

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

  if (new URL(req.url).searchParams.get('test') === 'true') {
    logUsage({
      ts: new Date().toISOString(), ip, ua, route: 'recommendations',
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

  if ((fileContent?.length ?? 0) > 12_000) {
    return new Response('File content too large', { status: 400 })
  }
  if ((keywords?.length ?? 0) > 5_000) {
    return new Response('Keywords too long', { status: 400 })
  }

  const fileContentChars = fileContent?.length ?? 0
  const keywordsChars = keywords?.length ?? 0

  const userContent = [
    fileContent && `My favourite shows (from uploaded file):\n<user_input>\n${fileContent}\n</user_input>`,
    keywords && `Keywords, shows and genres I enjoy:\n<user_input>\n${keywords}\n</user_input>`,
    `Please return ${count} recommendations.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const stream = new ReadableStream({
    async start(controller) {
      let streamErrored = false
      let inputTokens = 0
      let outputTokens = 0
      const MODEL = 'claude-sonnet-4-6'
      try {
        controller.enqueue(sseEvent({ type: 'status', message: 'Analyzing your favorites...' }))

        const inputTitles = buildInputTitleSet([fileContent, keywords].filter(Boolean).join('\n'))
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

        controller.enqueue(sseEvent({ type: 'status', message: 'Fetching show details...' }))

        let parsed: RecommendationsResponse
        try {
          parsed = JSON.parse(extractJson(fullText))
        } catch (parseErr) {
          console.error('[recommendations] JSON parse failed. Raw text:\n', fullText)
          throw parseErr
        }

        parsed.recommendations.forEach((rec) => {
          rec.title = sanitizeSeriesTitle(rec.title)
          rec.reason = sanitizeReason(rec.reason)
        })

        const seenTitles = new Set<string>()
        const enriched = []
        for (const rec of parsed.recommendations) {
          if (seenTitles.has(rec.title)) continue
          if (isInputShow(rec.title, inputTitles)) continue
          seenTitles.add(rec.title)
          const tvdb = await (tvdbPromises.get(rec.title) ?? fetchTvdbData(rec.title))
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
        }

        enriched.sort((a, b) => (b.imdb_rating ?? 0) - (a.imdb_rating ?? 0))
        controller.enqueue(sseEvent({ type: 'complete', recommendations: enriched }))
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
          ts: new Date().toISOString(), ip, ua, route: 'recommendations',
          params: { fileContentChars, keywordsChars, count, isTest: false },
          status: streamErrored ? 'error' : 'success',
          durationMs: Date.now() - startedAt,
          model: MODEL,
          inputTokens,
          outputTokens,
          costUsd: calcCost(MODEL, inputTokens, outputTokens),
        })
      }
    },
  })

  return sseResponse(stream)
}
