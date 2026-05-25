export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function sanitizeSeriesTitle(title: string): string {
  // Strip leading type prefixes e.g. "Miniseries: Band of Brothers", "Limited Series: Chernobyl"
  title = title.replace(/^(?:Mini(?:series)?|Limited\s+Series|Anthology|Documentary|Reality|Animation|Animated)\s*:\s*/i, '').trim()
  // Strip dash-based self-corrections e.g. "Night Agent — instead: Longmire"
  title = title.replace(/\s*[—–-]\s*(?:instead|actually|wait|correction|oops)[^]*$/i, '').trim()
  // Strip parenthetical self-corrections Claude sometimes emits
  // e.g. "(wait — already listed)", "(already recommended)"
  title = title.replace(/\s*\([^)]*\b(?:wait|already listed|already recommended|correction|oops|I mean)\b[^)]*\)/gi, '').trim()
  // Strip trailing season/series/part qualifiers e.g. "(Season 1)", ": Series 2", " - Part 3"
  return title.replace(/[\s:–\-]*\(?(?:Season|Series|Part)\s+\d+\)?$/i, '').trim()
}

export function sanitizeReason(reason: string): string {
  // Strip dash-based self-corrections e.g. "something — instead: something else"
  reason = reason.replace(/\s*[—–-]\s*(?:instead|actually|wait|correction|oops)[^]*$/i, '').trim()
  // Strip parenthetical self-corrections Claude sometimes emits mid-generation
  // e.g. "(wait — already listed)", "(already recommended)", "(correction: ...)"
  return reason
    .replace(/\s*\([^)]*\b(?:wait|already listed|already recommended|correction|oops|I mean)\b[^)]*\)/gi, '')
    .trim()
}

export function buildInputTitleSet(lines: string): Set<string> {
  return new Set(lines.split(/[\n,;]+/).map(l => normalizeTitle(l.trim())).filter(Boolean))
}

export function isInputShow(title: string, inputTitles: Set<string>): boolean {
  const n = normalizeTitle(title)
  for (const t of inputTitles) {
    if (t === n || t.includes(n) || n.includes(t)) return true
  }
  return false
}

// Claude streams JSON token-by-token, so the buffer may be truncated mid-object
// (network error, max_tokens hit, premature stream close). This scans for balanced
// brace pairs and keeps the last one that parses successfully — recovering as much
// of the response as Claude actually emitted instead of throwing on the partial.
export function extractJson(text: string): string {
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  let lastValid: string | null = null
  let i = 0

  while (i < cleaned.length) {
    const start = cleaned.indexOf('{', i)
    if (start === -1) break

    let depth = 0
    let inString = false
    let escape = false
    let end = -1

    for (let j = start; j < cleaned.length; j++) {
      const c = cleaned[j]
      if (escape) { escape = false; continue }
      if (inString) {
        if (c === '\\') escape = true
        else if (c === '"') inString = false
        continue
      }
      if (c === '"') { inString = true; continue }
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) { end = j; break }
      }
    }

    if (end === -1) break

    const candidate = cleaned.slice(start, end + 1)
    try {
      JSON.parse(candidate)
      lastValid = candidate
    } catch { /* skip incomplete or invalid candidates */ }

    i = end + 1  // advance past the whole object to find only top-level siblings
  }

  if (lastValid) return lastValid

  // Fallback: original behaviour (will throw on truly empty/invalid input)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new SyntaxError('No JSON object found in response')
  }
  return cleaned.slice(start, end + 1)
}
