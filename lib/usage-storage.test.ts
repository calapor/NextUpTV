import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We mock both backends. Each test resets modules so the env-driven dispatch
// is re-evaluated.
const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  appendFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  readdir: vi.fn(),
}))
vi.mock('fs/promises', () => ({ default: fsMock, ...fsMock }))

const neonSql = vi.hoisted(() => vi.fn())
const neonFactory = vi.hoisted(() => vi.fn(() => neonSql))
vi.mock('@neondatabase/serverless', () => ({ neon: neonFactory }))

async function loadStorage() {
  vi.resetModules()
  return await import('./usage-storage')
}

beforeEach(() => {
  fsMock.mkdir.mockClear()
  fsMock.appendFile.mockClear()
  fsMock.readFile.mockReset()
  fsMock.readdir.mockReset()
  neonSql.mockReset()
  neonFactory.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const sampleEntry = {
  ts: '2026-05-28T12:00:00.000Z',
  ip: '203.0.113.1', ua: 'TestUA', route: 'recommendations' as const,
  params: { fileContentChars: 100, keywordsChars: 0, count: 5, isTest: false },
  status: 'success' as const, durationMs: 1500,
  model: 'claude-sonnet-4-6',
}

describe('appendEntry dispatch', () => {
  it('writes to local JSONL when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { appendEntry } = await loadStorage()
    await appendEntry(sampleEntry)
    expect(fsMock.appendFile).toHaveBeenCalledTimes(1)
    expect(neonFactory).not.toHaveBeenCalled()
    const [filePath, content] = fsMock.appendFile.mock.calls[0]
    expect(String(filePath)).toMatch(/\.jsonl$/)
    expect(String(content)).toContain('"ip":"203.0.113.1"')
    expect(String(content).endsWith('\n')).toBe(true)
  })

  it('writes to Neon when DATABASE_URL is set', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://fake')
    const { appendEntry } = await loadStorage()
    neonSql.mockResolvedValue([])
    await appendEntry(sampleEntry)
    expect(neonFactory).toHaveBeenCalledWith('postgres://fake')
    expect(neonSql).toHaveBeenCalledTimes(1)
    expect(fsMock.appendFile).not.toHaveBeenCalled()
  })
})

describe('listEntries (local JSONL backend)', () => {
  beforeEach(() => vi.stubEnv('DATABASE_URL', ''))

  it('returns entries newest-first within a file (reverse line order)', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-28.jsonl'])
    const entries = [
      { ts: '2026-05-28T10:00:00.000Z', ip: 'a', ua: 'u', route: 'recommendations', params: {}, status: 'success', durationMs: 1 },
      { ts: '2026-05-28T11:00:00.000Z', ip: 'b', ua: 'u', route: 'recommendations', params: {}, status: 'success', durationMs: 1 },
      { ts: '2026-05-28T12:00:00.000Z', ip: 'c', ua: 'u', route: 'recommendations', params: {}, status: 'success', durationMs: 1 },
    ]
    fsMock.readFile.mockResolvedValueOnce(entries.map((e) => JSON.stringify(e)).join('\n'))

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10 })
    expect(result.entries.map((e) => e.ip)).toEqual(['c', 'b', 'a'])
  })

  it('returns files newest-first (reverse sorted filenames)', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-26.jsonl', '2026-05-28.jsonl', '2026-05-27.jsonl'])
    fsMock.readFile
      .mockResolvedValueOnce('{"ts":"2026-05-28T00:00:00.000Z","ip":"newest","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}')
      .mockResolvedValueOnce('{"ts":"2026-05-27T00:00:00.000Z","ip":"middle","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}')
      .mockResolvedValueOnce('{"ts":"2026-05-26T00:00:00.000Z","ip":"oldest","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}')

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10 })
    expect(result.entries.map((e) => e.ip)).toEqual(['newest', 'middle', 'oldest'])
    expect(result.files).toBe(3)
  })

  it('respects the limit parameter and stops reading mid-file', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-28.jsonl'])
    const entries = Array.from({ length: 5 }, (_, i) => ({
      ts: `2026-05-28T0${i}:00:00.000Z`, ip: `ip-${i}`, ua: 'u',
      route: 'recommendations', params: {}, status: 'success', durationMs: 1,
    }))
    fsMock.readFile.mockResolvedValueOnce(entries.map((e) => JSON.stringify(e)).join('\n'))

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 2 })
    expect(result.entries).toHaveLength(2)
  })

  it('silently skips malformed JSONL lines', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-28.jsonl'])
    fsMock.readFile.mockResolvedValueOnce(
      '{"ts":"2026-05-28T00:00:00.000Z","ip":"ok","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}\n' +
      'not json at all\n' +
      '{ broken json'
    )

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].ip).toBe('ok')
  })

  it('filters by date when opts.date is provided', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-26.jsonl', '2026-05-28.jsonl', '2026-05-27.jsonl'])
    fsMock.readFile.mockResolvedValueOnce(
      '{"ts":"2026-05-28T00:00:00.000Z","ip":"target","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}'
    )

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10, date: '2026-05-28' })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].ip).toBe('target')
    expect(fsMock.readFile).toHaveBeenCalledTimes(1) // only one file read
  })

  it('returns empty result when LOG_DIR does not exist', async () => {
    fsMock.readdir.mockRejectedValueOnce(new Error('ENOENT'))
    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10 })
    expect(result).toEqual({ entries: [], total: 0, files: 0 })
  })

  it('only considers .jsonl files (ignores other extensions)', async () => {
    fsMock.readdir.mockResolvedValueOnce(['2026-05-28.jsonl', '2026-05-28.txt', 'README.md'])
    fsMock.readFile.mockResolvedValueOnce(
      '{"ts":"2026-05-28T00:00:00.000Z","ip":"ok","ua":"u","route":"recommendations","params":{},"status":"success","durationMs":1}'
    )
    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 10 })
    expect(result.files).toBe(1)
  })
})

describe('listEntries (Neon backend)', () => {
  beforeEach(() => vi.stubEnv('DATABASE_URL', 'postgres://fake'))

  it('maps Postgres rows into UsageLogEntry shape', async () => {
    neonSql.mockResolvedValueOnce([
      {
        ts: '2026-05-28T12:00:00.000Z',
        ip: '203.0.113.1', ua: 'UA', route: 'recommendations',
        status: 'success', duration_ms: 1500,
        model: 'claude-sonnet-4-6', input_tokens: 1000, output_tokens: 500,
        cost_usd: '0.018',
        params: { fileContentChars: 100, keywordsChars: 0, count: 5, isTest: false },
        geo: { country: 'US' },
        input_text: 'in', output_text: 'out',
      },
    ])

    const { listEntries } = await loadStorage()
    const result = await listEntries({ limit: 1 })
    expect(result.entries).toHaveLength(1)
    const e = result.entries[0]
    expect(e.ip).toBe('203.0.113.1')
    expect(e.costUsd).toBe(0.018) // numeric → Number coercion
    expect(e.geo).toEqual({ country: 'US' })
    expect(e.inputTokens).toBe(1000)
  })
})
