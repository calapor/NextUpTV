export const SAMPLE_SHOWS_LIST = `The Americans
Homeland
Breaking Bad
Ozark
The Beast in me
Widow's Bay
Ted Lasso
A Knight of the Seven Kingdoms
Chernobyl
Dark Matter
For All Mankind`

export const TEST_SHOWS_KEY = 'nextuptv_test_shows'

export function getTestShowsList(): string {
  try {
    const s = localStorage.getItem(TEST_SHOWS_KEY)
    if (s) return s
  } catch {}
  return SAMPLE_SHOWS_LIST
}

export function getTestShowsDisplay(): string[] {
  try {
    const s = localStorage.getItem(TEST_SHOWS_KEY)
    if (s) return s.split('\n').map(t => t.trim().replace(/,$/, '')).filter(Boolean)
  } catch {}
  return SAMPLE_SHOWS_LIST.split('\n').map(t => t.trim()).filter(Boolean)
}
