import { describe, expect, it } from 'vitest'
import {
  computeOverallScore,
  escapeHtml,
  MAX_COUNT,
  MAX_SHOWS_LIST_CHARS,
  MAX_SYSTEM_PROMPT_CHARS,
  scoreToGrade,
  validateEvalInputs,
} from './eval-grading'

describe('scoreToGrade', () => {
  it('grades A at score >= 9 (boundary inclusive)', () => {
    expect(scoreToGrade(9.0)).toBe('A')
    expect(scoreToGrade(9.5)).toBe('A')
    expect(scoreToGrade(10)).toBe('A')
  })

  it('grades B at 8.0–8.999', () => {
    expect(scoreToGrade(8.0)).toBe('B')
    expect(scoreToGrade(8.5)).toBe('B')
    expect(scoreToGrade(8.99)).toBe('B')
  })

  it('grades C at 7.0–7.999', () => {
    expect(scoreToGrade(7.0)).toBe('C')
    expect(scoreToGrade(7.99)).toBe('C')
  })

  it('grades D at 6.0–6.999', () => {
    expect(scoreToGrade(6.0)).toBe('D')
    expect(scoreToGrade(6.5)).toBe('D')
  })

  it('grades F below 6', () => {
    expect(scoreToGrade(5.99)).toBe('F')
    expect(scoreToGrade(5.2)).toBe('F')
    expect(scoreToGrade(0)).toBe('F')
  })

  it('catches the regression at commit e697010 (8.4 → 5.2 dropped from B to F)', () => {
    // The actual prompt regression at that commit was caught by this exact mapping.
    // If the boundaries ever drift, the eval-history graphs in the portfolio would be wrong.
    expect(scoreToGrade(8.4)).toBe('B')
    expect(scoreToGrade(5.2)).toBe('F')
  })
})

describe('computeOverallScore', () => {
  it('averages a uniform array correctly', () => {
    expect(computeOverallScore([8, 8, 8, 8, 8])).toBe(8.0)
  })

  it('rounds to one decimal place', () => {
    // 41 / 5 = 8.2
    expect(computeOverallScore([8, 8, 8, 8, 9])).toBe(8.2)
    // 40 / 5 = 8.0
    expect(computeOverallScore([7, 8, 9, 10, 6])).toBe(8.0)
    // 8.33333... → 8.3
    expect(computeOverallScore([10, 7, 8])).toBe(8.3)
  })

  it('handles a real B-grade scenario (8.5, 7, 9, 8, 10 → 8.5)', () => {
    expect(computeOverallScore([8.5, 7, 9, 8, 10])).toBe(8.5)
  })
})

describe('escapeHtml', () => {
  it('escapes the four load-bearing HTML characters', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes ampersand first to avoid double-escaping', () => {
    expect(escapeHtml('Fish & Chips')).toBe('Fish &amp; Chips')
  })

  it('passes through safe text unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123')
  })

  it('does not double-escape already-escaped entities (documented behaviour)', () => {
    // &amp; becomes &amp;amp; — escapeHtml is intentionally NOT idempotent.
    // Pinned so any change is deliberate.
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })
})

describe('validateEvalInputs', () => {
  it('accepts well-formed inputs', () => {
    expect(validateEvalInputs('a system prompt', 'Show A\nShow B', 8)).toEqual({ ok: true })
  })

  it('rejects empty system prompt', () => {
    expect(validateEvalInputs('', 'shows', 5)).toEqual({ ok: false, error: 'System prompt is required' })
    expect(validateEvalInputs('   ', 'shows', 5)).toEqual({ ok: false, error: 'System prompt is required' })
  })

  it('rejects empty shows list', () => {
    expect(validateEvalInputs('prompt', '', 5)).toEqual({ ok: false, error: 'Shows list is required' })
  })

  it('rejects out-of-range count (< 1 or > 20)', () => {
    expect(validateEvalInputs('p', 's', 0).ok).toBe(false)
    expect(validateEvalInputs('p', 's', MAX_COUNT + 1).ok).toBe(false)
  })

  it('accepts boundary counts (1 and 20)', () => {
    expect(validateEvalInputs('p', 's', 1)).toEqual({ ok: true })
    expect(validateEvalInputs('p', 's', MAX_COUNT)).toEqual({ ok: true })
  })

  it('rejects oversize system prompt', () => {
    expect(validateEvalInputs('x'.repeat(MAX_SYSTEM_PROMPT_CHARS + 1), 'shows', 5).ok).toBe(false)
  })

  it('rejects oversize shows list', () => {
    expect(validateEvalInputs('prompt', 'x'.repeat(MAX_SHOWS_LIST_CHARS + 1), 5).ok).toBe(false)
  })
})
