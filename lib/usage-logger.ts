import type { GeoInfo, UsageLogEntry } from './types'
import { appendEntry } from './usage-storage'

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

const LOCAL_IPS = new Set(['unknown', '127.0.0.1', '::1', 'localhost'])

async function geolocateIp(ip: string): Promise<GeoInfo> {
  if (LOCAL_IPS.has(ip) || ip.startsWith('192.168.') || ip.startsWith('10.')) return {}
  try {
    // ipwho.is: HTTPS, no API key required, 10k requests/month free.
    // Chosen over ip-api.com (HTTP-only, 45/min per source IP — too tight for
    // Vercel's shared egress IP pool) so geo lookups don't silently fail in prod.
    const res = await fetch(
      `https://ipwho.is/${ip}?fields=success,country,country_code,city,region`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (!res.ok) return {}
    const data = await res.json()
    if (data.success === false) return {}
    return {
      city: data.city || undefined,
      region: data.region || undefined,
      country: data.country || undefined,
      countryCode: data.country_code || undefined,
    }
  } catch {
    return {}
  }
}

export async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const geo = await geolocateIp(entry.ip)
    await appendEntry({ ...entry, geo })
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
