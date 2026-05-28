import { describe, expect, it } from 'vitest'
import {
  buildInputTitleSet,
  extractJson,
  isInputShow,
  normalizeTitle,
  sanitizeReason,
  sanitizeSeriesTitle,
} from './title-utils'

describe('normalizeTitle', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeTitle('The Bear!')).toBe('thebear')
    expect(normalizeTitle('Mr. Robot')).toBe('mrrobot')
    expect(normalizeTitle("It's Always Sunny")).toBe('itsalwayssunny')
  })

  it('strips diacritics by removing non-ASCII letters (documented behaviour)', () => {
    expect(normalizeTitle('Pokémon')).toBe('pokmon')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeTitle('   ')).toBe('')
  })
})

describe('sanitizeSeriesTitle', () => {
  it('strips leading type prefixes (Miniseries:, Limited Series:, etc.)', () => {
    expect(sanitizeSeriesTitle('Miniseries: Band of Brothers')).toBe('Band of Brothers')
    expect(sanitizeSeriesTitle('Limited Series: Chernobyl')).toBe('Chernobyl')
    expect(sanitizeSeriesTitle('Documentary: Wild Wild Country')).toBe('Wild Wild Country')
  })

  it('strips dash-based self-corrections from the title', () => {
    expect(sanitizeSeriesTitle('Night Agent — instead: Longmire')).toBe('Night Agent')
    expect(sanitizeSeriesTitle('Foo - actually no')).toBe('Foo')
  })

  it('strips parenthetical self-corrections', () => {
    expect(sanitizeSeriesTitle('Severance (wait — already listed)')).toBe('Severance')
    expect(sanitizeSeriesTitle('Foo (already recommended above)')).toBe('Foo')
  })

  it('strips trailing season/series/part qualifiers', () => {
    expect(sanitizeSeriesTitle('The Crown (Season 1)')).toBe('The Crown')
    expect(sanitizeSeriesTitle('Sherlock: Series 2')).toBe('Sherlock')
    expect(sanitizeSeriesTitle('Doctor Who - Part 3')).toBe('Doctor Who')
  })

  it('passes through clean titles unchanged', () => {
    expect(sanitizeSeriesTitle('The Bear')).toBe('The Bear')
    expect(sanitizeSeriesTitle('Ozark')).toBe('Ozark')
  })
})

describe('sanitizeReason', () => {
  it('strips dash-based self-corrections at the end', () => {
    expect(sanitizeReason('A great pick — actually never mind')).toBe('A great pick')
  })

  it('strips parenthetical self-corrections inline', () => {
    expect(sanitizeReason('Fans of X (wait — already listed) will enjoy this'))
      .toBe('Fans of X will enjoy this')
  })

  it('passes through clean reasons unchanged', () => {
    expect(sanitizeReason('A taut political thriller with deft pacing.'))
      .toBe('A taut political thriller with deft pacing.')
  })
})

describe('buildInputTitleSet', () => {
  it('splits on newlines, commas, and semicolons', () => {
    const set = buildInputTitleSet('The Bear\nOzark, Severance; Tehran')
    expect(set.has('thebear')).toBe(true)
    expect(set.has('ozark')).toBe(true)
    expect(set.has('severance')).toBe(true)
    expect(set.has('tehran')).toBe(true)
  })

  it('drops empty and whitespace-only entries', () => {
    const set = buildInputTitleSet('The Bear\n\n  \nOzark')
    expect(set.size).toBe(2)
  })

  it('deduplicates entries with the same normalized form', () => {
    const set = buildInputTitleSet('The Bear\nThe Bear\nTHE BEAR')
    expect(set.size).toBe(1)
  })
})

describe('isInputShow', () => {
  const input = buildInputTitleSet('The Office\nBreaking Bad')

  it('returns true for exact-match titles (case-insensitive)', () => {
    expect(isInputShow('The Office', input)).toBe(true)
    expect(isInputShow('breaking bad', input)).toBe(true)
  })

  it('returns true via bidirectional substring match', () => {
    // recommended "Office" should match input "The Office"
    expect(isInputShow('Office', input)).toBe(true)
    // recommended "The Office US" should also match input "The Office"
    expect(isInputShow('The Office US', input)).toBe(true)
  })

  it('returns false for clearly different titles', () => {
    expect(isInputShow('Succession', input)).toBe(false)
    expect(isInputShow('Better Call Saul', input)).toBe(false)
  })

  it('handles empty input set', () => {
    expect(isInputShow('Anything', new Set())).toBe(false)
  })
})

describe('extractJson (the crown jewel — streaming recovery)', () => {
  it('recovers a complete JSON object from prose surrounding it', () => {
    const text = 'Here is your answer: {"recommendations":[{"title":"Foo"}]} hope this helps'
    expect(JSON.parse(extractJson(text))).toEqual({ recommendations: [{ title: 'Foo' }] })
  })

  it('strips leading ```json fence and trailing ``` fence', () => {
    const text = '```json\n{"a":1}\n```'
    expect(JSON.parse(extractJson(text))).toEqual({ a: 1 })
  })

  it('strips leading ``` (no language) fence', () => {
    const text = '```\n{"a":1}\n```'
    expect(JSON.parse(extractJson(text))).toEqual({ a: 1 })
  })

  it('recovers the last valid object when stream truncates mid-second-object', () => {
    // First object is complete; second truncates after opening brace
    const text = '{"recommendations":[{"title":"Foo"}]} extra stuff {"recommendations":[{"title":"Bar'
    const recovered = JSON.parse(extractJson(text))
    expect(recovered.recommendations[0].title).toBe('Foo')
  })

  it('respects escaped quotes inside string values', () => {
    // The escaped quote MUST NOT terminate the string scan
    const text = '{"reason":"He said \\"hi\\" loudly"}'
    expect(JSON.parse(extractJson(text))).toEqual({ reason: 'He said "hi" loudly' })
  })

  it('handles nested objects (depth > 1)', () => {
    const text = '{"a":{"b":{"c":1}}}'
    expect(JSON.parse(extractJson(text))).toEqual({ a: { b: { c: 1 } } })
  })

  it('handles braces appearing inside string values without confusing the depth counter', () => {
    const text = '{"note":"this string has } a closing brace inside it","ok":true}'
    expect(JSON.parse(extractJson(text))).toEqual({
      note: 'this string has } a closing brace inside it',
      ok: true,
    })
  })

  it('throws SyntaxError when no JSON object is present', () => {
    expect(() => extractJson('this has no braces at all')).toThrow(SyntaxError)
    expect(() => extractJson('this has no braces at all')).toThrow(/No JSON object found/)
  })

  it('documents the SSE-truncation-inside-array limitation', () => {
    // Realistic SSE truncation: stream cuts mid-array before the outer `}` arrives.
    // The brace-depth loop never finds a balanced top-level object (outer `{` never
    // closes), so the fallback returns the slice between the first `{` and last `}` —
    // which is still unbalanced because the `[` array bracket is unclosed.
    // This test pins the limitation so any future "fix" is intentional, not accidental.
    const text = '{"recommendations":[{"title":"Foo"}'
    const result = extractJson(text)
    // The function returns a string but it is NOT valid JSON in this case.
    expect(() => JSON.parse(result)).toThrow()
    // It does include the inner object substring, which is the recoverable payload
    // a future improvement could surface.
    expect(result).toContain('"title":"Foo"')
  })

  it('recovers a single complete object that lives inside otherwise-truncated array prose', () => {
    // No outer object — just a stray complete object after some prose.
    // Brace loop finds the {} pair and accepts it.
    const text = 'partial array stuff: {"title":"Foo","imdb_rating":8.5}, more stuff'
    expect(JSON.parse(extractJson(text))).toEqual({ title: 'Foo', imdb_rating: 8.5 })
  })

  it('does not get fooled by an opening brace inside a string at the start', () => {
    const text = '{"prefix":"this string starts with {","value":42}'
    expect(JSON.parse(extractJson(text))).toEqual({
      prefix: 'this string starts with {',
      value: 42,
    })
  })

  it('handles surrounding whitespace and content gracefully', () => {
    const text = '   \n\n  {"a":1}  \n\n  '
    expect(JSON.parse(extractJson(text))).toEqual({ a: 1 })
  })
})
