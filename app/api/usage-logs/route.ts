import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import type { UsageLogEntry } from '@/lib/types'

const LOG_DIR = path.join(process.cwd(), 'data', 'usage-logs')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10), 1000)
  const dateFilter = searchParams.get('date')

  try {
    let files: string[]
    try {
      files = (await fs.readdir(LOG_DIR))
        .filter((f) => f.endsWith('.jsonl'))
        .sort()
        .reverse()
    } catch {
      return NextResponse.json({ entries: [], total: 0, files: 0 })
    }

    if (dateFilter) {
      files = files.filter((f) => f.startsWith(dateFilter))
    }

    const entries: UsageLogEntry[] = []

    for (const file of files) {
      if (entries.length >= limit) break
      const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8')
      const lines = content.trim().split('\n').filter(Boolean).reverse()
      for (const line of lines) {
        if (entries.length >= limit) break
        try {
          entries.push(JSON.parse(line))
        } catch {
          // skip malformed lines
        }
      }
    }

    return NextResponse.json({ entries, total: entries.length, files: files.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
