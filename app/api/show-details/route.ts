import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/tvdb'
import type { ShowDetails, CastMember } from '@/lib/types'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const CACHE_TTL = 60 * 60 * 1000

const detailCache = new Map<string, { data: ShowDetails | null; expiresAt: number }>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tvdbId = searchParams.get('tvdbId')

  if (!tvdbId || isNaN(Number(tvdbId))) {
    return NextResponse.json({ error: 'Invalid tvdbId' }, { status: 400 })
  }

  const cached = detailCache.get(tvdbId)
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.data === null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(cached.data)
  }

  try {
    const token = await getAuthToken()
    const res = await fetch(`${TVDB_BASE}/series/${tvdbId}/extended`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      detailCache.set(tvdbId, { data: null, expiresAt: Date.now() + CACHE_TTL })
      return NextResponse.json({ error: 'TVDB fetch failed' }, { status: 502 })
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
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
