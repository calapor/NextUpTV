import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvdb'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from '@/lib/prompts'

const anthropic = new Anthropic()
const encoder = new TextEncoder()

function sseEvent(obj: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
}

function sanitizeSeriesTitle(title: string): string {
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

function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new SyntaxError('No JSON object found in Claude response')
  }
  return text.slice(start, end + 1)
}

export async function POST(req: NextRequest) {
  const { fileContent, keywords, count } = (await req.json()) as RecommendationsRequest

  const userContent = [
    fileContent && `My favourite shows (from uploaded file):\n${fileContent}`,
    keywords && `Keywords, shows and genres I enjoy:\n${keywords}`,
    `Please return ${count} recommendations.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(sseEvent({ type: 'status', message: 'Analyzing your favorites...' }))

        let fullText = ''
        const foundTitles = new Set<string>()
        const titleRegex = /"title":\s*"([^"]+)"/g

        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          system: RECOMMENDATIONS_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        })

        controller.enqueue(sseEvent({ type: 'status', message: 'Generating recommendations...' }))

        anthropicStream.on('text', (textDelta) => {
          fullText += textDelta
          titleRegex.lastIndex = 0
          let match
          while ((match = titleRegex.exec(fullText)) !== null) {
            const title = match[1]
            if (!foundTitles.has(title)) {
              foundTitles.add(title)
              controller.enqueue(sseEvent({ type: 'status', message: `Suggesting: ${title}` }))
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

        const tvdbResults = await Promise.all(
          parsed.recommendations.map((rec) => fetchTvdbData(rec.title))
        )

        const enriched = parsed.recommendations.map((rec, i) => {
          const tvdb = tvdbResults[i]
          return {
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
        })

        controller.enqueue(sseEvent({ type: 'recommendations', recommendations: enriched }))
      } catch (err) {
        const message =
          err instanceof SyntaxError
            ? 'Claude returned invalid JSON. Please try again.'
            : 'An error occurred while generating recommendations.'
        const detail = err instanceof Error ? err.message : String(err)
        controller.enqueue(sseEvent({ type: 'error', message, detail }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
