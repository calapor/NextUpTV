import type { EvalGrade } from './types'

export function scoreToGrade(score: number): EvalGrade {
  if (score >= 9) return 'A'
  if (score >= 8) return 'B'
  if (score >= 7) return 'C'
  if (score >= 6) return 'D'
  return 'F'
}

export function computeOverallScore(scores: number[]): number {
  const sum = scores.reduce((a, b) => a + b, 0)
  return Math.round((sum / scores.length) * 10) / 10
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface EvalInputValidation {
  ok: boolean
  error?: string
}

export const MAX_SYSTEM_PROMPT_CHARS = 10_000
export const MAX_SHOWS_LIST_CHARS = 20_000
export const MIN_COUNT = 1
export const MAX_COUNT = 20

export function validateEvalInputs(
  systemPrompt: string | undefined,
  showsList: string | undefined,
  count: number,
): EvalInputValidation {
  if (!systemPrompt?.trim()) return { ok: false, error: 'System prompt is required' }
  if (!showsList?.trim()) return { ok: false, error: 'Shows list is required' }
  if (count < MIN_COUNT || count > MAX_COUNT) return { ok: false, error: 'Count must be between 1 and 20' }
  if (systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) return { ok: false, error: 'System prompt exceeds maximum length' }
  if (showsList.length > MAX_SHOWS_LIST_CHARS) return { ok: false, error: 'Shows list exceeds maximum length' }
  return { ok: true }
}
