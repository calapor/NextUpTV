import { describe, expect, it, vi } from 'vitest'
import { calcCost, extractGeo, extractIp, extractUa, logUsage } from './usage-logger'

// Prevent the storage module from doing real IO when logUsage is tested
vi.mock('./usage-storage', () => ({
  appendEntry: vi.fn().mockResolvedValue(undefined),
}))

function makeReq(headers: Record<string, string>): Request {
  return new Request('http://localhost/test', { headers })
}

describe('calcCost — model pricing math', () => {
  it('computes opus cost correctly ($15 input / $75 output per 1M tokens)', () => {
    // 1000 in × $15/1M + 1000 out × $75/1M = $0.015 + $0.075 = $0.090
    expect(calcCost('claude-opus-4-7', 1000, 1000)).toBeCloseTo(0.090, 6)
  })

  it('computes sonnet cost correctly ($3 input / $15 output per 1M tokens)', () => {
    // 1000 in × $3/1M + 1000 out × $15/1M = $0.003 + $0.015 = $0.018
    expect(calcCost('claude-sonnet-4-6', 1000, 1000)).toBeCloseTo(0.018, 6)
  })

  it('computes haiku cost correctly ($0.80 input / $4 output per 1M tokens)', () => {
    // 1000 in × $0.80/1M + 1000 out × $4/1M = $0.0008 + $0.004 = $0.0048
    expect(calcCost('claude-haiku-4-5', 1000, 1000)).toBeCloseTo(0.0048, 6)
  })

  it('returns 0 for unknown models without throwing', () => {
    expect(calcCost('claude-fictional-99', 1000, 1000)).toBe(0)
    expect(calcCost('', 1000, 1000)).toBe(0)
  })

  it('returns 0 for zero tokens', () => {
    expect(calcCost('claude-sonnet-4-6', 0, 0)).toBe(0)
  })

  it('catches an output-rate regression — typical run cost lands in the published $0.015–$0.026 band', () => {
    // If MODEL_COSTS['claude-sonnet-4-6'].output were silently changed from 15 to 1.5,
    // this assertion would fail loudly. That's the entire point.
    // 1200 in × $3/1M + 900 out × $15/1M = $0.0036 + $0.0135 = $0.0171 — within the band.
    const cost = calcCost('claude-sonnet-4-6', 1200, 900)
    expect(cost).toBeGreaterThan(0.015)
    expect(cost).toBeLessThan(0.026)
  })
})

describe('extractIp', () => {
  it('returns the first hop from x-forwarded-for', () => {
    const req = makeReq({ 'x-forwarded-for': '203.0.113.1, 192.0.2.1, 10.0.0.1' })
    expect(extractIp(req)).toBe('203.0.113.1')
  })

  it('returns "unknown" when x-forwarded-for is absent', () => {
    expect(extractIp(makeReq({}))).toBe('unknown')
  })

  it('trims whitespace from the parsed IP', () => {
    const req = makeReq({ 'x-forwarded-for': '   203.0.113.1   , 192.0.2.1' })
    expect(extractIp(req)).toBe('203.0.113.1')
  })
})

describe('extractUa', () => {
  it('returns the user-agent header', () => {
    const req = makeReq({ 'user-agent': 'Mozilla/5.0 Test' })
    expect(extractUa(req)).toBe('Mozilla/5.0 Test')
  })

  it('returns "unknown" when the header is absent', () => {
    expect(extractUa(makeReq({}))).toBe('unknown')
  })

  it('truncates at 200 characters', () => {
    const longUa = 'A'.repeat(500)
    const req = makeReq({ 'user-agent': longUa })
    expect(extractUa(req)).toHaveLength(200)
  })
})

describe('extractGeo', () => {
  it('decodes URL-encoded city values', () => {
    const req = makeReq({
      'x-vercel-ip-city': 'S%C3%A3o%20Paulo',
      'x-vercel-ip-country': 'BR',
    })
    expect(extractGeo(req).city).toBe('São Paulo')
  })

  it('prefers countryName over countryCode when both are present', () => {
    const req = makeReq({
      'x-vercel-ip-country': 'GB',
      'x-vercel-ip-country-name': 'United Kingdom',
    })
    const geo = extractGeo(req)
    expect(geo.country).toBe('United Kingdom')
    expect(geo.countryCode).toBe('GB')
  })

  it('falls back to countryCode when countryName is absent', () => {
    const req = makeReq({ 'x-vercel-ip-country': 'IE' })
    expect(extractGeo(req).country).toBe('IE')
  })

  it('returns all undefined fields when no Vercel headers are present (local dev)', () => {
    const geo = extractGeo(makeReq({}))
    expect(geo).toEqual({
      city: undefined,
      region: undefined,
      country: undefined,
      countryCode: undefined,
    })
  })

  it('captures region when provided', () => {
    const req = makeReq({ 'x-vercel-ip-country-region': 'CA' })
    expect(extractGeo(req).region).toBe('CA')
  })
})

describe('logUsage', () => {
  it('swallows storage errors so it never crashes the request', async () => {
    const storage = await import('./usage-storage')
    const spy = vi.mocked(storage.appendEntry).mockRejectedValueOnce(new Error('disk full'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      logUsage({
        ts: new Date().toISOString(),
        ip: '1.2.3.4', ua: 'ua', route: 'recommendations',
        params: { fileContentChars: 0, keywordsChars: 0, count: 5, isTest: false },
        status: 'success', durationMs: 100,
      }),
    ).resolves.toBeUndefined()

    expect(spy).toHaveBeenCalledOnce()
    expect(consoleSpy).toHaveBeenCalled()
  })
})
