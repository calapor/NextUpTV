export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
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

export function extractJson(text: string): string {
  // Strip optional markdown fences
  let cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new SyntaxError('No JSON object found in response')
  }
  return cleaned.slice(start, end + 1)
}
