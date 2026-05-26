import fs from 'fs/promises'
import path from 'path'
import { neon } from '@neondatabase/serverless'
import type { GeoInfo, UsageLogEntry } from './types'

type EntryWithGeo = UsageLogEntry & { geo?: GeoInfo }

export interface ListResult {
  entries: UsageLogEntry[]
  total: number
  files: number
}

const isNeonConfigured = () => Boolean(process.env.DATABASE_URL)

export async function appendEntry(entry: EntryWithGeo): Promise<void> {
  if (isNeonConfigured()) {
    await appendEntryNeon(entry)
  } else {
    await appendEntryLocal(entry)
  }
}

export async function listEntries(opts: { limit: number; date?: string }): Promise<ListResult> {
  if (isNeonConfigured()) {
    return listEntriesNeon(opts)
  }
  return listEntriesLocal(opts)
}

// --- Neon backend -----------------------------------------------------------

async function appendEntryNeon(entry: EntryWithGeo): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!)
  await sql`
    INSERT INTO usage_logs (
      ts, ip, ua, route, status, duration_ms,
      model, input_tokens, output_tokens, cost_usd,
      params, geo, input_text, output_text
    ) VALUES (
      ${entry.ts}, ${entry.ip}, ${entry.ua}, ${entry.route}, ${entry.status}, ${entry.durationMs},
      ${entry.model ?? null}, ${entry.inputTokens ?? null}, ${entry.outputTokens ?? null}, ${entry.costUsd ?? null},
      ${JSON.stringify(entry.params)}::jsonb, ${entry.geo ? JSON.stringify(entry.geo) : null}::jsonb,
      ${entry.inputText ?? null}, ${entry.outputText ?? null}
    )
  `
}

async function listEntriesNeon(opts: { limit: number; date?: string }): Promise<ListResult> {
  const sql = neon(process.env.DATABASE_URL!)
  const rows = (await sql`
    SELECT ts, ip, ua, route, status, duration_ms,
           model, input_tokens, output_tokens, cost_usd, params, geo,
           input_text, output_text
    FROM usage_logs
    WHERE (${opts.date ?? null}::date IS NULL OR ts::date = ${opts.date ?? null}::date)
    ORDER BY ts DESC
    LIMIT ${opts.limit}
  `) as Array<Record<string, unknown>>

  const entries: UsageLogEntry[] = rows.map((row) => {
    const entry: UsageLogEntry = {
      ts: new Date(row.ts as string).toISOString(),
      ip: row.ip as string,
      ua: row.ua as string,
      route: row.route as UsageLogEntry['route'],
      params: row.params as UsageLogEntry['params'],
      status: row.status as UsageLogEntry['status'],
      durationMs: row.duration_ms as number,
    }
    if (row.model != null) entry.model = row.model as string
    if (row.input_tokens != null) entry.inputTokens = row.input_tokens as number
    if (row.output_tokens != null) entry.outputTokens = row.output_tokens as number
    if (row.cost_usd != null) entry.costUsd = Number(row.cost_usd)
    if (row.geo != null) entry.geo = row.geo as GeoInfo
    if (row.input_text != null) entry.inputText = row.input_text as string
    if (row.output_text != null) entry.outputText = row.output_text as string
    return entry
  })

  return { entries, total: entries.length, files: 1 }
}

// --- Local disk backend (JSONL files, one per day) --------------------------

const LOG_DIR = path.join(process.cwd(), 'data', 'usage-logs')

function todayFilePath() {
  return path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`)
}

async function appendEntryLocal(entry: EntryWithGeo): Promise<void> {
  await fs.mkdir(LOG_DIR, { recursive: true })
  await fs.appendFile(todayFilePath(), JSON.stringify(entry) + '\n', 'utf-8')
}

async function listEntriesLocal(opts: { limit: number; date?: string }): Promise<ListResult> {
  let files: string[]
  try {
    files = (await fs.readdir(LOG_DIR))
      .filter((f) => f.endsWith('.jsonl'))
      .sort()
      .reverse()
  } catch {
    return { entries: [], total: 0, files: 0 }
  }

  if (opts.date) {
    files = files.filter((f) => f.startsWith(opts.date!))
  }

  const entries: UsageLogEntry[] = []
  for (const file of files) {
    if (entries.length >= opts.limit) break
    const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean).reverse()
    for (const line of lines) {
      if (entries.length >= opts.limit) break
      try {
        entries.push(JSON.parse(line))
      } catch {
        // skip malformed lines
      }
    }
  }

  return { entries, total: entries.length, files: files.length }
}
