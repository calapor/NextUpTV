import { describe, expect, it } from 'vitest'
import type { Recommendation } from './types'
import { buildInputTitleSet } from './title-utils'
import {
  buildUserContent,
  extractRawInputTitles,
  filterAndDedupeRecommendations,
  MAX_FILE_CONTENT_CHARS,
  MAX_KEYWORDS_CHARS,
  MAX_RAW_INPUT_TITLES,
  parseStreamTitles,
  validateInputSize,
} from './recommendations-pipeline'

const baseRec: Recommendation = {
  title: '',
  release_year: 2020,
  episode_runtime_minutes: 45,
  genres: ['Drama'],
  imdb_rating: 8,
  comedy_score: 3, horror_score: 1, action_score: 5,
  drama_score: 8, suspense_score: 6, romance_score: 2,
  reason: 'A good pick.',
}

describe('validateInputSize', () => {
  it('accepts inputs within the published 12K/5K caps', () => {
    expect(validateInputSize('a'.repeat(MAX_FILE_CONTENT_CHARS), 'b'.repeat(MAX_KEYWORDS_CHARS))).toEqual({ ok: true })
  })

  it('rejects fileContent over 12K with 400', () => {
    const result = validateInputSize('a'.repeat(MAX_FILE_CONTENT_CHARS + 1), '')
    expect(result).toEqual({ ok: false, status: 400, error: 'File content too large' })
  })

  it('rejects keywords over 5K with 400', () => {
    const result = validateInputSize('', 'b'.repeat(MAX_KEYWORDS_CHARS + 1))
    expect(result).toEqual({ ok: false, status: 400, error: 'Keywords too long' })
  })

  it('treats undefined inputs as length-0', () => {
    expect(validateInputSize(undefined, undefined)).toEqual({ ok: true })
  })
})

describe('buildUserContent', () => {
  it('wraps combined favourites in <user_input> XML tags (prompt-injection defence)', () => {
    const content = buildUserContent('Show A\nShow B', 'thrillers', 5)
    expect(content).toContain('<user_input>')
    expect(content).toContain('</user_input>')
    expect(content).toContain('Show A')
    expect(content).toContain('thrillers')
    expect(content).toContain('Please return 5 recommendations.')
  })

  it('omits the favourites section entirely when both inputs are empty', () => {
    const content = buildUserContent('', '', 8)
    expect(content).not.toContain('<user_input>')
    expect(content).toBe('Please return 8 recommendations.')
  })

  it('handles fileContent-only and keywords-only without orphan delimiters', () => {
    const onlyFile = buildUserContent('Show A', '', 5)
    const onlyKeywords = buildUserContent('', 'thrillers', 5)
    expect(onlyFile).toContain('<user_input>\nShow A\n</user_input>')
    expect(onlyKeywords).toContain('<user_input>\nthrillers\n</user_input>')
  })
})

describe('extractRawInputTitles', () => {
  it('splits on newlines, commas, and semicolons', () => {
    expect(extractRawInputTitles('A\nB, C; D', '')).toEqual(['A', 'B', 'C', 'D'])
  })

  it('deduplicates and trims', () => {
    expect(extractRawInputTitles('A\nA\n  A  ', '')).toEqual(['A'])
  })

  it('caps at MAX_RAW_INPUT_TITLES to bound TVDB parallelism', () => {
    const many = Array.from({ length: MAX_RAW_INPUT_TITLES + 50 }, (_, i) => `Show ${i}`).join('\n')
    expect(extractRawInputTitles(many, '')).toHaveLength(MAX_RAW_INPUT_TITLES)
  })
})

describe('parseStreamTitles', () => {
  it('extracts titles from a partial streaming JSON buffer', () => {
    const buffer = '{"recommendations":[{"title":"Foo","imdb_rating":8},{"title":"Bar"'
    expect(parseStreamTitles(buffer)).toEqual(['Foo', 'Bar'])
  })

  it('returns empty array when no title fields are present yet', () => {
    expect(parseStreamTitles('{"recommendations":[')).toEqual([])
  })

  it('documented limitation: escaped quotes inside a title break the naive regex', () => {
    // The production regex is /"title":\s*"([^"]+)"/g — it stops at the first " regardless
    // of whether it is escaped. This pins the limitation so any future fix is intentional.
    const buffer = '{"title":"It\\"s a show"}'
    const titles = parseStreamTitles(buffer)
    // The regex captures up to the escaped quote, NOT the real terminator
    expect(titles[0]).toBe('It\\')
  })
})

describe('filterAndDedupeRecommendations', () => {
  const inputTitles = buildInputTitleSet('The Office\nBreaking Bad')

  it('drops recommendations whose normalized title matches an input show', () => {
    const recs: Recommendation[] = [
      { ...baseRec, title: 'The Office US' }, // bidirectional substring match
      { ...baseRec, title: 'Succession' },
    ]
    const result = filterAndDedupeRecommendations(recs, inputTitles)
    expect(result.map((r) => r.title)).toEqual(['Succession'])
  })

  it('drops recommendations with imdb_rating <= 0 (Claude hallucinated rating guard)', () => {
    const recs: Recommendation[] = [
      { ...baseRec, title: 'Good Show', imdb_rating: 8 },
      { ...baseRec, title: 'Hallucinated', imdb_rating: 0 },
    ]
    const result = filterAndDedupeRecommendations(recs, new Set())
    expect(result.map((r) => r.title)).toEqual(['Good Show'])
  })

  it('deduplicates by title within the same response', () => {
    const recs: Recommendation[] = [
      { ...baseRec, title: 'Succession' },
      { ...baseRec, title: 'Succession' },
    ]
    const result = filterAndDedupeRecommendations(recs, new Set())
    expect(result).toHaveLength(1)
  })

  it('runs sanitizeSeriesTitle and sanitizeReason before the dedup check', () => {
    const recs: Recommendation[] = [
      { ...baseRec, title: 'Miniseries: Chernobyl', reason: 'A taut drama — actually never mind' },
    ]
    const [r] = filterAndDedupeRecommendations(recs, new Set())
    expect(r.title).toBe('Chernobyl')
    expect(r.reason).toBe('A taut drama')
  })

  it('returns empty array when given an empty recommendations list', () => {
    expect(filterAndDedupeRecommendations([], new Set())).toEqual([])
  })
})
