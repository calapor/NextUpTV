import Anthropic from '@anthropic-ai/sdk'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const anthropic = new Anthropic()

export interface TvdbEnrichment {
  id: number
  one_sentence_synopsis: string
  release_year: number
  episode_runtime_minutes: number
  content_rating: string
  genres: string[]
  tvdb_poster_thumbnail_url?: string
  tvdb_show_url: string
  streaming_platforms: string[]
  average_user_rating: number
}

let tokenCache: { token: string; expiresAt: number } | null = null

const SHOW_CACHE_TTL = 60 * 60 * 1000
const showCache = new Map<string, { data: TvdbEnrichment | null; expiresAt: number }>()

export async function getAuthToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 86_400_000) {
    return tokenCache.token
  }
  const res = await fetch(`${TVDB_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: process.env.TVDB_API_KEY }),
  })
  if (!res.ok) throw new Error(`TVDB auth failed: ${res.status}`)
  const { data } = await res.json()
  tokenCache = { token: data.token, expiresAt: Date.now() + 29 * 86_400_000 }
  return data.token
}

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?]/)
  return match ? match[0] : text
}

async function inferStreamingServices(title: string, overview: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `What streaming services currently offer the TV show "${title}"? Respond with ONLY a JSON array of service names (e.g., ["Netflix", "Hulu", "Apple TV+"]). If you're unsure, return an empty array [].

Show synopsis: ${overview}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      try {
        const platforms = JSON.parse(content.text)
        return Array.isArray(platforms) ? platforms : []
      } catch {
        return []
      }
    }
    return []
  } catch {
    return []
  }
}

export async function fetchTvdbData(title: string): Promise<TvdbEnrichment | null> {
  const cacheKey = title.trim().toLowerCase()
  try {
    const cached = showCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const token = await getAuthToken()
    const headers = { Authorization: `Bearer ${token}` }

    const searchRes = await fetch(
      `${TVDB_BASE}/search?q=${encodeURIComponent(title)}&type=series`,
      { headers }
    )
    if (!searchRes.ok) {
      showCache.set(cacheKey, { data: null, expiresAt: Date.now() + SHOW_CACHE_TTL })
      return null
    }

    const searchData = await searchRes.json()
    const results: Array<{
      tvdb_id: string
      name: string
      thumbnail?: string
      image_url?: string
      overview?: string
      year?: string
      slug?: string
    }> = searchData.data ?? []

    if (!results.length) {
      showCache.set(cacheKey, { data: null, expiresAt: Date.now() + SHOW_CACHE_TTL })
      return null
    }
    const best = results[0]
    const tvdbId = parseInt(best.tvdb_id, 10)

    const seriesRes = await fetch(`${TVDB_BASE}/series/${tvdbId}`, { headers })
    if (!seriesRes.ok) {
      showCache.set(cacheKey, { data: null, expiresAt: Date.now() + SHOW_CACHE_TTL })
      return null
    }

    const seriesData = await seriesRes.json()
    const series: {
      averageRuntime?: number
      score?: number
      contentRatings?: Array<{ country: string; name: string }>
      genres?: Array<{ name: string }>
      companies?: Array<{ name: string; companyType?: { companyTypeName: string } }>
      image?: string
      slug?: string
      year?: number
    } = seriesData.data ?? {}

    const contentRatings = series.contentRatings ?? []
    const usRating = contentRatings.find((r) => r.country === 'usa') ?? contentRatings[0]

    const networkTypes = new Set(['Network', 'Streaming Service'])
    let streaming = (series.companies ?? [])
      .filter((c) => networkTypes.has(c.companyType?.companyTypeName ?? ''))
      .map((c) => c.name)

    // If TVDB doesn't provide streaming services, use Claude to infer them
    if (streaming.length === 0) {
      streaming = await inferStreamingServices(best.name, best.overview ?? '')
    }

    const posterUrl = best.thumbnail ?? best.image_url ?? series.image

    const slug = best.slug ?? series.slug ?? best.tvdb_id
    const tvdb_show_url = `https://thetvdb.com/series/${slug}`

    const releaseYear = best.year ? parseInt(best.year, 10) : (series.year ?? 0)

    const result: TvdbEnrichment = {
      id: tvdbId,
      one_sentence_synopsis: firstSentence(best.overview ?? ''),
      release_year: releaseYear,
      episode_runtime_minutes: series.averageRuntime ?? 0,
      content_rating: usRating?.name ?? '',
      genres: (series.genres ?? []).map((g) => g.name),
      tvdb_poster_thumbnail_url: posterUrl,
      tvdb_show_url,
      streaming_platforms: streaming,
      average_user_rating: series.score ?? 0,
    }
    showCache.set(cacheKey, { data: result, expiresAt: Date.now() + SHOW_CACHE_TTL })
    return result
  } catch {
    showCache.set(cacheKey, { data: null, expiresAt: Date.now() + SHOW_CACHE_TTL })
    return null
  }
}
