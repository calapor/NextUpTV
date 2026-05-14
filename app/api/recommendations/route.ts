import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvmaze'

export const RECOMMENDATIONS_SYSTEM_PROMPT = `You are a personalised TV show recommendation engine.

The user will provide a list of favourites — TV shows, films, genres, or keywords —
either as uploaded file content or as free text. Return a curated list of TV show
recommendations based on those preferences.

Rules:
- Return exactly the number of recommendations requested
- Never recommend something the user has already listed as a favourite
- Explain in one sentence why each item matches their specific inputs
- All numeric scores (0–10) and ratings must be realistic estimates based on your knowledge

Respond ONLY with valid JSON — no markdown fences, no prose — in this exact shape:
{
  "recommendations": [
    {
      "title": "Show name",
      "genres": ["genre1", "genre2"],
      "reason": "One sentence explanation tied to their input",
      "imdb_rating": 8.2,
      "release_year": 2019,
      "episode_runtime_minutes": 45,
      "comedy_score": 3,
      "horror_score": 1,
      "action_score": 7,
      "drama_score": 9,
      "suspense_score": 8,
      "romance_score": 2
    }
  ]
}`

const anthropic = new Anthropic()
const encoder = new TextEncoder()

function sseEvent(obj: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
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

        const tvdbResults = await Promise.all(
          parsed.recommendations.map((rec) => fetchTvdbData(rec.title))
        )

        const enriched = parsed.recommendations.map((rec, i) => ({
          ...rec,
          ...(tvdbResults[i]
            ? { tvdb_thumbnail_url: tvdbResults[i]!.thumbnail_url, tvdb_show_url: tvdbResults[i]!.show_url }
            : {}),
        }))

        controller.enqueue(sseEvent({ type: 'recommendations', recommendations: enriched }))
      } catch (err) {
        const message =
          err instanceof SyntaxError
            ? 'Claude returned invalid JSON. Please try again.'
            : 'An error occurred while generating recommendations.'
        controller.enqueue(sseEvent({ type: 'error', message }))
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
