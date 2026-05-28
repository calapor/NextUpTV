import type { Recommendation } from './types'
import { isInputShow, sanitizeReason, sanitizeSeriesTitle } from './title-utils'

export const MAX_FILE_CONTENT_CHARS = 12_000
export const MAX_KEYWORDS_CHARS = 5_000
export const MAX_RAW_INPUT_TITLES = 80

export type ValidationResult =
  | { ok: true }
  | { ok: false; status: 400; error: string }

export function validateInputSize(fileContent: string | undefined, keywords: string | undefined): ValidationResult {
  if ((fileContent?.length ?? 0) > MAX_FILE_CONTENT_CHARS) {
    return { ok: false, status: 400, error: 'File content too large' }
  }
  if ((keywords?.length ?? 0) > MAX_KEYWORDS_CHARS) {
    return { ok: false, status: 400, error: 'Keywords too long' }
  }
  return { ok: true }
}

export function buildUserContent(
  fileContent: string | undefined,
  keywords: string | undefined,
  count: number,
): string {
  const combinedFavourites = [fileContent, keywords].filter(Boolean).join('\n').trim()
  return [
    combinedFavourites && `My favourites — TV shows, films, genres, or keywords:\n<user_input>\n${combinedFavourites}\n</user_input>`,
    `Please return ${count} recommendations.`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function extractRawInputTitles(fileContent: string | undefined, keywords: string | undefined): string[] {
  const joined = [fileContent, keywords].filter(Boolean).join('\n')
  return [...new Set(
    joined.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean).slice(0, MAX_RAW_INPUT_TITLES)
  )]
}

export function parseStreamTitles(text: string): string[] {
  const titleRegex = /"title":\s*"([^"]+)"/g
  const titles: string[] = []
  let match
  while ((match = titleRegex.exec(text)) !== null) {
    titles.push(match[1])
  }
  return titles
}

export function filterAndDedupeRecommendations(
  recs: Recommendation[],
  inputTitles: Set<string>,
): Recommendation[] {
  const seenTitles = new Set<string>()
  return recs
    .map((rec) => ({
      ...rec,
      title: sanitizeSeriesTitle(rec.title),
      reason: sanitizeReason(rec.reason),
    }))
    .filter((rec) => (rec.imdb_rating ?? 0) > 0)
    .filter((rec) => {
      if (seenTitles.has(rec.title)) return false
      if (isInputShow(rec.title, inputTitles)) return false
      seenTitles.add(rec.title)
      return true
    })
}
