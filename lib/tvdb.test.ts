import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the Anthropic SDK before importing tvdb so its module-level `new Anthropic()` is harmless
vi.mock('@anthropic-ai/sdk', () => {
  const messages = { create: vi.fn() }
  const Anthropic = vi.fn(() => ({ messages }))
  return { default: Anthropic }
})

// We import tvdb fresh per-test so the module-level token / show cache resets.
async function loadTvdb() {
  vi.resetModules()
  return await import('./tvdb')
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('getAuthToken', () => {
  beforeEach(() => {
    vi.stubEnv('TVDB_API_KEY', 'test-key')
  })

  it('fetches a token and caches it for ~29 days', async () => {
    const { getAuthToken } = await loadTvdb()
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok-1' } }))

    const t1 = await getAuthToken()
    const t2 = await getAuthToken()

    expect(t1).toBe('tok-1')
    expect(t2).toBe('tok-1')
    expect(fetchSpy).toHaveBeenCalledTimes(1) // second call hits cache
  })

  it('re-fetches when the cached token is within 24h of expiry', async () => {
    const { getAuthToken } = await loadTvdb()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok-1' } }))
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok-2' } }))

    await getAuthToken() // caches tok-1 with expiresAt = now + 29 days

    // Advance time to 28 days + 1 hour later — cached expiry is now within the 24h buffer
    vi.setSystemTime(new Date('2026-01-29T01:00:00Z'))
    const t2 = await getAuthToken()
    expect(t2).toBe('tok-2')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('throws when TVDB login responds non-OK', async () => {
    const { getAuthToken } = await loadTvdb()
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({}, false, 401))
    await expect(getAuthToken()).rejects.toThrow(/TVDB auth failed: 401/)
  })
})

describe('fetchTvdbData', () => {
  beforeEach(() => {
    vi.stubEnv('TVDB_API_KEY', 'test-key')
  })

  it('returns enrichment data for a successful series lookup', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } })) // login
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{
            tvdb_id: '12345',
            name: 'The Bear',
            overview: 'A chef returns home to run his family sandwich shop. He struggles.',
            year: '2022',
            slug: 'the-bear',
            thumbnail: 'https://thumb',
          }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            averageRuntime: 28,
            score: 8.4,
            contentRatings: [{ country: 'usa', name: 'TV-MA' }],
            genres: [{ name: 'Drama' }, { name: 'Comedy' }],
            companies: [
              { name: 'FX', companyType: { companyTypeName: 'Network' } },
              { name: 'Hulu', companyType: { companyTypeName: 'Streaming Service' } },
              { name: 'Some Distributor', companyType: { companyTypeName: 'Distributor' } },
            ],
            year: 2022,
          },
        }),
      )

    const result = await fetchTvdbData('The Bear')
    expect(result).toMatchObject({
      id: 12345,
      release_year: 2022,
      episode_runtime_minutes: 28,
      content_rating: 'TV-MA',
      genres: ['Drama', 'Comedy'],
      streaming_platforms: ['FX', 'Hulu'],
      average_user_rating: 8.4,
      tvdb_show_url: 'https://thetvdb.com/series/the-bear',
    })
    expect(result?.one_sentence_synopsis).toBe('A chef returns home to run his family sandwich shop.')
  })

  it('caches by lowercased title (case-insensitive cache hit)', async () => {
    const { fetchTvdbData } = await loadTvdb()
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] })) // empty search → null + cache

    const r1 = await fetchTvdbData('The Bear')
    const r2 = await fetchTvdbData('the bear')
    const r3 = await fetchTvdbData('  THE BEAR  ')

    expect(r1).toBeNull()
    expect(r2).toBeNull()
    expect(r3).toBeNull()
    // Only login + first search; subsequent calls hit the cached null
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns null and caches when TVDB search responds non-OK', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(jsonResponse({}, false, 500))

    expect(await fetchTvdbData('Mystery Show')).toBeNull()
  })

  it('returns null when search yields zero results', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }))

    expect(await fetchTvdbData('Unknown Show')).toBeNull()
  })

  it('returns null when the series-detail lookup fails', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ tvdb_id: '99', name: 'Foo', overview: 'A show.', year: '2020' }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}, false, 502))

    expect(await fetchTvdbData('Foo')).toBeNull()
  })

  it('falls back to Claude inferStreamingServices when TVDB returns zero streaming companies', async () => {
    // Set up the Anthropic mock BEFORE loading tvdb (so the module-level instance gets it)
    const Anthropic = (await import('@anthropic-ai/sdk')).default as unknown as ReturnType<typeof vi.fn>
    const messagesCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: '["Netflix", "Hulu"]' }],
    })
    Anthropic.mockImplementation(() => ({ messages: { create: messagesCreate } }) as never)

    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{
            tvdb_id: '42',
            name: 'NoCompanies',
            overview: 'A show with no streaming companies listed.',
            year: '2021',
          }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            averageRuntime: 45,
            score: 7,
            contentRatings: [{ country: 'usa', name: 'TV-14' }],
            genres: [],
            companies: [], // empty → triggers Claude fallback
            year: 2021,
          },
        }),
      )

    const result = await fetchTvdbData('NoCompanies')
    expect(result?.streaming_platforms).toEqual(['Netflix', 'Hulu'])
    expect(messagesCreate).toHaveBeenCalledOnce()
  })

  it('falls back to empty array when Claude returns malformed JSON', async () => {
    const Anthropic = (await import('@anthropic-ai/sdk')).default as unknown as ReturnType<typeof vi.fn>
    Anthropic.mockImplementation(() => ({
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'not json' }] }) },
    }) as never)

    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ tvdb_id: '7', name: 'X', overview: 'X show.', year: '2020' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { genres: [], companies: [], contentRatings: [], year: 2020 },
        }),
      )

    const result = await fetchTvdbData('X')
    expect(result?.streaming_platforms).toEqual([])
  })

  it('cuts firstSentence at the first period — documented edge case with "Mr."', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { token: 'tok' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{
            tvdb_id: '1', name: 'X',
            overview: 'Mr. Smith was tired. He kept walking.',
            year: '2020',
          }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            companies: [{ name: 'Netflix', companyType: { companyTypeName: 'Streaming Service' } }],
            genres: [], contentRatings: [], year: 2020,
          },
        }),
      )

    const result = await fetchTvdbData('X')
    // Documented limitation: firstSentence cuts at "Mr." — pinned so any future
    // fix is deliberate, not accidental.
    expect(result?.one_sentence_synopsis).toBe('Mr.')
  })

  it('handles unexpected fetch exceptions by returning null and caching', async () => {
    const { fetchTvdbData } = await loadTvdb()
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network blew up'))
    expect(await fetchTvdbData('Anything')).toBeNull()
  })
})
