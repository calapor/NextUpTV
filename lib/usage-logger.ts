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

export async function logUsage(entry: UsageLogEntry): Promise<void> {
  try {
    await appendEntry(entry)
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

// Vercel populates these headers at the edge for every incoming request.
// Locally (next dev), they're absent → returns an empty GeoInfo, which the
// admin UI handles via its IP-only fallback.
export function extractGeo(req: Request): GeoInfo {
  const countryCode = req.headers.get('x-vercel-ip-country') ?? undefined
  const cityEncoded = req.headers.get('x-vercel-ip-city')
  const region = req.headers.get('x-vercel-ip-country-region') ?? undefined
  const countryName = req.headers.get('x-vercel-ip-country-name') ?? undefined
  return {
    city: cityEncoded ? decodeURIComponent(cityEncoded) : undefined,
    region,
    country: countryName ?? countryCode,
    countryCode,
  }
}
