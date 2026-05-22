import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/tvdb'
import type { ShowDetails, CastMember } from '@/lib/types'
import { logUsage, extractIp, extractUa } from '@/lib/usage-logger'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const CACHE_TTL = 60 * 60 * 1000

const detailCache = new Map<string, { data: ShowDetails | null; expiresAt: number }>()

export async function GET(req: NextRequest) {
  const startedAt = Date.now()
  const ip = extractIp(req)
  const ua = extractUa(req)
  const { searchParams } = new URL(req.url)
  const tvdbId = searchParams.get('tvdbId') ?? ''

  const respond = async (response: NextResponse, logStatus: 'success' | 'error') => {
    await logUsage({
      ts: new Date().toISOString(), ip, ua, route: 'show-details',
      params: { tvdbId }, status: logStatus, durationMs: Date.now() - startedAt,
    })
    return response
  }

  if (!tvdbId || isNaN(Number(tvdbId))) {
    return respond(NextResponse.json({ error: 'Invalid tvdbId' }, { status: 400 }), 'error')
  }

  const cached = detailCache.get(tvdbId)
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.data === null) {
      return respond(NextResponse.json({ error: 'Not found' }, { status: 404 }), 'error')
    }
    return respond(NextResponse.json(cached.data), 'success')
  }

  try {
    const token = await getAuthToken()
    const res = await fetch(`${TVDB_BASE}/series/${tvdbId}/extended`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      detailCache.set(tvdbId, { data: null, expiresAt: Date.now() + CACHE_TTL })
      return respond(NextResponse.json({ error: 'TVDB fetch failed' }, { status: 502 }), 'error')
    }

    const { data } = await res.json()

    const status: string = data?.status?.name ?? 'Unknown'

    const seasons: Array<{ number: number; type?: { name: string } }> = data?.seasons ?? []
    const season_count = seasons.filter(
      (s) => s.type?.name === 'Aired Order' && s.number > 0
    ).length

    const characters: Array<{
      name: string
      personName: string
      image?: string
      sort: number
      peopleType: string
    }> = data?.characters ?? []

    const cast: CastMember[] = characters
      .filter((c) => c.peopleType === 'Actor')
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 10)
      .map((c) => ({
        actor: c.personName,
        character: c.name,
        image: c.image ?? undefined,
      }))

    const full_overview: string = data?.overview ?? ''

    const result: ShowDetails = { status, season_count, cast, full_overview }
    detailCache.set(tvdbId, { data: result, expiresAt: Date.now() + CACHE_TTL })
    return respond(NextResponse.json(result), 'success')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return respond(NextResponse.json({ error: message }, { status: 500 }), 'error')
  }
}
