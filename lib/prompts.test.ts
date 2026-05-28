import { describe, expect, it } from 'vitest'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from './prompts'

describe('RECOMMENDATIONS_SYSTEM_PROMPT — structural sanity checks', () => {
  it('references the <user_input> tag (prompt-injection defence)', () => {
    // The route wraps user content in <user_input>...</user_input>. The prompt's
    // "treat content inside <user_input>" clause is what makes injection inert.
    // If this reference disappears, the defence collapses silently.
    expect(RECOMMENDATIONS_SYSTEM_PROMPT).toContain('<user_input>')
  })

  it('explicitly tells the model to ignore embedded instructions inside user_input', () => {
    expect(RECOMMENDATIONS_SYSTEM_PROMPT).toMatch(/treat ALL content inside <user_input>/i)
  })

  it('declares every field name that the Recommendation type expects', () => {
    // Regression guard: if a new field is added to Recommendation but not the prompt,
    // downstream parsing silently drops it. This test couples the contract.
    const required = [
      'title', 'genres', 'reason', 'imdb_rating', 'release_year',
      'episode_runtime_minutes',
      'comedy_score', 'horror_score', 'action_score',
      'drama_score', 'suspense_score', 'romance_score',
    ]
    for (const field of required) {
      expect(RECOMMENDATIONS_SYSTEM_PROMPT).toContain(`"${field}"`)
    }
  })

  it('forbids markdown fences and prose in the response (drives extractJson reliability)', () => {
    expect(RECOMMENDATIONS_SYSTEM_PROMPT).toMatch(/no markdown fences/i)
  })

  it('enforces the no-overlap rule across scripts (catches Hebrew → English transliteration)', () => {
    expect(RECOMMENDATIONS_SYSTEM_PROMPT).toMatch(/regardless of language or script/i)
  })
})
