import { NextRequest, NextResponse } from 'next/server'
import { listEntries } from '@/lib/usage-storage'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 1000)
  const dateFilter = searchParams.get('date') ?? undefined

  try {
    const result = await listEntries({ limit, date: dateFilter })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
