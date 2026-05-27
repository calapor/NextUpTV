import { NextRequest } from 'next/server'
import { getAuthToken } from '@/lib/tvdb'
import type { LibraryShow } from '@/lib/types'
import { sseEvent, sseResponse } from '@/lib/sse'
import { logUsage, extractIp, extractUa, extractGeo } from '@/lib/usage-logger'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const CACHE_TTL = 4 * 60 * 60 * 1000

const libraryCache = new Map<string, { data: LibraryShow; expiresAt: number }>()

type TvdbSeason = { id: number; number: number; type?: { name: string } }
type TvdbEpisode = { seasonNumber: number; number: number; aired?: string }

async function fetchSeasonEpisodes(seasonId: number, token: string): Promise<TvdbEpisode[]> {
  try {
    const res = await fetch(`${TVDB_BASE}/seasons/${seasonId}/extended?meta=episodes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const { data } = await res.json()
    return data?.episodes ?? []
  } catch {
    return []
  }
}

function findEpInList(eps: TvdbEpisode[], date: string) {
  const ep = eps.find((e) => e.aired === date)
  return ep ? { season: ep.seasonNumber, number: ep.number } : undefined
}

async function processShow(title: string, token: string): Promise<LibraryShow | null> {
  const headers = { Authorization: `Bearer ${token}` }

  const searchRes = await fetch(
    `${TVDB_BASE}/search?q=${encodeURIComponent(title)}&type=series`,
    { headers }
  )
  if (!searchRes.ok) return null

  const searchData = await searchRes.json()
  const best = (searchData.data ?? [])[0]
  if (!best) return null

  const nameTranslations: string[] = best.nameTranslations ?? []
  if (!resultMatchesQuery(title, best.name ?? '', nameTranslations)) return null

  const tvdbId = parseInt(best.tvdb_id, 10)
  if (isNaN(tvdbId)) return null

  const cached = libraryCache.get(String(tvdbId))
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const extRes = await fetch(`${TVDB_BASE}/series/${tvdbId}/extended`, { headers })
  if (!extRes.ok) return null
  const { data: series } = await extRes.json()

  const status: string = series?.status?.name ?? 'Unknown'
  const nextAired: string | undefined = series?.nextAired || undefined
  const lastAired: string | undefined = series?.lastAired || undefined

  const rawSeasons: TvdbSeason[] = series?.seasons ?? []
  const airedSeasons = rawSeasons
    .filter((s) => s.type?.name === 'Aired Order' && s.number > 0)
    .sort((a, b) => a.number - b.number)

  const season_count = airedSeasons.length
  const lastIdx = airedSeasons.length - 1

  let last_episode: { season: number; number: number } | undefined
  let next_episode: { season: number; number: number } | undefined

  if (lastIdx >= 0) {
    const lastSeasonEps = await fetchSeasonEpisodes(airedSeasons[lastIdx].id, token)

    if (lastAired) {
      last_episode = findEpInList(lastSeasonEps, lastAired)
      if (!last_episode && lastIdx > 0) {
        const prevEps = await fetchSeasonEpisodes(airedSeasons[lastIdx - 1].id, token)
        last_episode = findEpInList(prevEps, lastAired)
      }
    }

    if (nextAired) {
      next_episode = findEpInList(lastSeasonEps, nextAired)
      if (!next_episode && lastIdx + 1 < airedSeasons.length) {
        const nextSeasonEps = await fetchSeasonEpisodes(airedSeasons[lastIdx + 1].id, token)
        next_episode = findEpInList(nextSeasonEps, nextAired)
      }
    }
  }

  const slug = best.slug ?? best.tvdb_id
  const result: LibraryShow = {
    id: tvdbId,
    title: best.name ?? title,
    poster: best.thumbnail ?? best.image_url,
    tvdb_url: `https://thetvdb.com/series/${slug}`,
    status,
    season_count,
    last_aired: lastAired,
    last_episode,
    next_aired: nextAired,
    next_episode,
  }

  libraryCache.set(String(tvdbId), { data: result, expiresAt: Date.now() + CACHE_TTL })
  return result
}

const CSV_HEADERS = new Set(['name', 'title', 'show', 'shows', 'series', 'tvshow', 'program'])

// Library exports from Trakt, Letterboxd, JustWatch etc. embed episode markers
// (S01E01, 1x01) and year suffixes that TVDB's search endpoint doesn't understand.
// Stripping them yields the bare show title so search lands on the right series.
function extractBaseTitle(line: string): string {
  return line
    .replace(/\s+[-–]\s+[Ss]\d{1,2}[Ee]\d{1,3}.*$/, '')
    .replace(/\s+[Ss]\d{1,2}[Ee]\d{1,3}.*$/, '')
    .replace(/\s+\d{1,2}x\d{1,3}.*$/, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim()
}

function isHeaderLine(title: string): boolean {
  return CSV_HEADERS.has(title.toLowerCase().trim())
}

function resultMatchesQuery(
  query: string,
  resultName: string,
  nameTranslations: string[] = []
): boolean {
  if (/[^\x00-\x7F]/.test(query)) {
    return [resultName, ...nameTranslations].some((t) => t && t.includes(query))
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const q = norm(query)
  const r = norm(resultName)

  if (!q) return false
  if (q === r || r.includes(q) || q.includes(r)) return true

  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or'])
  const qWords = q.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w))
  const rWords = new Set(r.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)))

  return qWords.some((w) => rWords.has(w))
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const ip = extractIp(req)
  const ua = extractUa(req)
  const geo = extractGeo(req)

  let fileContent: string
  try {
    const body = await req.json()
    fileContent = body.fileContent
  } catch {
    return new Response('Invalid request', { status: 400 })
  }

  if (!fileContent || typeof fileContent !== 'string') {
    return new Response('fileContent required', { status: 400 })
  }

  const seenTitles = new Set<string>()
  const titles: string[] = []
  for (const line of fileContent.split(/[\n,;]+/)) {
    const base = extractBaseTitle(line.trim())
    if (base.length < 2) continue
    if (isHeaderLine(base)) continue
    const key = base.toLowerCase().replace(/\s+/g, ' ')
    if (!seenTitles.has(key)) {
      seenTitles.add(key)
      titles.push(base)
      if (titles.length >= 150) break
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(sseEvent(data))
        } catch {
          // stream already closed
        }
      }

      let streamErrored = false
      try {
        if (titles.length === 0) {
          send({ type: 'complete' })
          return
        }

        const token = await getAuthToken()
        const seenIds = new Set<number>()

        // Process titles in concurrent batches of 5. TVDB doesn't publish a hard
        // rate limit, but parallel-within-batch + sequential-across-batches has
        // proven reliable in practice without triggering 429s, while staying fast
        // enough that a 150-title library finishes in ~10s.
        for (let i = 0; i < titles.length; i += 5) {
          const batch = titles.slice(i, i + 5)
          await Promise.all(
            batch.map(async (title) => {
              const show = await processShow(title, token)
              if (!show || seenIds.has(show.id)) return
              seenIds.add(show.id)
              send({ type: 'show', show })
            })
          )
        }

        send({ type: 'complete' })
      } catch (err) {
        streamErrored = true
        send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
        await logUsage({
          ts: new Date().toISOString(), ip, ua, geo, route: 'library-status',
          params: { fileContentChars: fileContent.length, titleCount: titles.length },
          status: streamErrored ? 'error' : 'success',
          durationMs: Date.now() - startedAt,
        })
      }
    },
  })

  return sseResponse(stream)
}
