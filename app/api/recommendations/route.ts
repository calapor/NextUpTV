import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { RecommendationsRequest, RecommendationsResponse } from '@/lib/types'
import { fetchTvdbData } from '@/lib/tvmaze'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from '@/lib/prompts'

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

  const enriched = parsed.recommendations.map((rec, i) => ({
    ...rec,
    ...(tvdbResults[i]
      ? { tvdb_thumbnail_url: tvdbResults[i]!.thumbnail_url, tvdb_show_url: tvdbResults[i]!.show_url }
      : {}),
  }))

  return NextResponse.json({ recommendations: enriched })
}
