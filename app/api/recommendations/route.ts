import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvdb'

export const RECOMMENDATIONS_SYSTEM_PROMPT = `You are a personalised TV show recommendation engine.

The user will provide a list of favourites — TV shows, films, genres, or keywords —
either as uploaded file content or as free text. Return a curated list of TV show
recommendations based on those preferences.

Rules:
- Return exactly the number of recommendations requested
- Never recommend something the user has already listed as a favourite
- Explain in one sentence why each item matches their specific inputs
- All numeric scores (0–10) and ratings must be realistic estimates based on your knowledge
- recommendation_score reflects how well the show matches the user's specific inputs (0–10)
- matched_keywords lists the specific words or phrases from the user's input that influenced this pick

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
      "romance_score": 2,
      "recommendation_score": 8.5,
      "matched_keywords": ["crime", "psychological"]
    }
  ]
}`

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const { fileContent, keywords, count } = (await req.json()) as RecommendationsRequest

  const userContent = [
    fileContent && `My favourite shows (from uploaded file):\n${fileContent}`,
    keywords && `Keywords, shows and genres I enjoy:\n${keywords}`,
    `Please return ${count} recommendations.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: RECOMMENDATIONS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed: RecommendationsResponse = JSON.parse(text)

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

  return NextResponse.json({ recommendations: enriched })
}
