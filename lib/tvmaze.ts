const TVMAZE_BASE = 'https://api.tvmaze.com'

export interface TvdbResult {
  thumbnail_url: string
  show_url: string
}

export async function fetchTvdbData(title: string): Promise<TvdbResult | null> {
  try {
    const res = await fetch(
      `${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(title)}`
    )
    if (!res.ok) return null

    const results: Array<{
      score: number
      show: {
        image?: { medium?: string }
        externals?: { thetvdb?: number }
        premiered?: string
      }
    }> = await res.json()

    if (!results.length) return null

    // Pick the result with the most recent premiere year to handle duplicates
    const best = results.reduce((prev, curr) => {
      const prevYear = parseInt(prev.show.premiered ?? '0', 10)
      const currYear = parseInt(curr.show.premiered ?? '0', 10)
      return currYear > prevYear ? curr : prev
    })

    const thumbnail_url = best.show.image?.medium
    if (!thumbnail_url) return null

    const tvdbId = best.show.externals?.thetvdb
    const show_url = tvdbId
      ? `https://thetvdb.com/?tab=series&id=${tvdbId}`
      : `https://thetvdb.com/search?query=${encodeURIComponent(title)}`

    return { thumbnail_url, show_url }
  } catch {
    return null
  }
}
