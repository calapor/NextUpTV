import fs from 'fs/promises'
import path from 'path'
import type { GeoInfo, UsageLogEntry } from './types'

// Pricing in USD per token — verify at https://www.anthropic.com/pricing
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7':   { input: 15 / 1_000_000,   output: 75 / 1_000_000 },
  'claude-sonnet-4-6': { input: 3 / 1_000_000,    output: 15 / 1_000_000 },
  'claude-haiku-4-5':  { input: 0.80 / 1_000_000, output: 4 / 1_000_000 },
}

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model]
  if (!costs) return 0
  return costs.input * inputTokens + costs.output * outputTokens
}

const LOG_DIR = path.join(process.cwd(), 'data', 'usage-logs')

function todayFilePath() {
  return path.join(LOG_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`)
}

const LOCAL_IPS = new Set(['unknown', '127.0.0.1', '::1', 'localhost'])

async function geolocateIp(ip: string): Promise<GeoInfo> {
  if (LOCAL_IPS.has(ip) || ip.startsWith('192.168.') || ip.startsWith('10.')) return {}
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode,city,regionName`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return {}
    const data = await res.json()
    if (data.status === 'fail') return {}
    return {
      city: data.city || undefined,
      region: data.regionName || undefined,
      country: data.country || undefined,
      countryCode: data.countryCode || undefined,
    }
  } catch {
    return {}
  }
}

export async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const geo = await geolocateIp(entry.ip)
    await fs.mkdir(LOG_DIR, { recursive: true })
    await fs.appendFile(todayFilePath(), JSON.stringify({ ...entry, geo }) + '\n', 'utf-8')
  } catch (err) {
    console.error('[usage-logger] write failed:', err)
  }
}

export function extractIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : 'unknown'
}

export function extractUa(req: Request): string {
  return (req.headers.get('user-agent') ?? 'unknown').slice(0, 200)
}
