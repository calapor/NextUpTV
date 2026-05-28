import { describe, expect, it } from 'vitest'
import { getAvailablePlatforms, getPlatformInfo, getPlatformSearchUrl } from './streaming-platforms'

describe('getPlatformInfo', () => {
  it('looks up canonical platforms case-insensitively', () => {
    expect(getPlatformInfo('Netflix')?.name).toBe('Netflix')
    expect(getPlatformInfo('NETFLIX')?.name).toBe('Netflix')
    expect(getPlatformInfo('netflix')?.name).toBe('Netflix')
  })

  it('resolves both "hbo max" and "max" to the canonical Max entry', () => {
    expect(getPlatformInfo('hbo max')?.name).toBe('Max')
    expect(getPlatformInfo('Max')?.name).toBe('Max')
  })

  it('resolves "apple tv+" and "apple tv plus" to the same platform', () => {
    expect(getPlatformInfo('Apple TV+')?.name).toBe('Apple TV+')
    expect(getPlatformInfo('Apple TV Plus')?.name).toBe('Apple TV+')
  })

  it('resolves "amazon prime video" and "prime video" to the same platform', () => {
    expect(getPlatformInfo('Amazon Prime Video')?.name).toBe('Amazon Prime Video')
    expect(getPlatformInfo('Prime Video')?.name).toBe('Amazon Prime Video')
  })

  it('returns null for unknown platforms (does not throw)', () => {
    expect(getPlatformInfo('Quibi')).toBeNull()
    expect(getPlatformInfo('')).toBeNull()
    expect(getPlatformInfo(undefined)).toBeNull()
  })

  it('trims surrounding whitespace before lookup', () => {
    expect(getPlatformInfo('  Netflix  ')?.name).toBe('Netflix')
  })
})

describe('getPlatformSearchUrl', () => {
  it('builds a properly URL-encoded search URL for Netflix', () => {
    const url = getPlatformSearchUrl('Netflix', 'The Bear & Co.')
    expect(url).toBe('https://www.netflix.com/search?q=The%20Bear%20%26%20Co.')
  })

  it('returns null for unknown platforms', () => {
    expect(getPlatformSearchUrl('Quibi', 'Anything')).toBeNull()
  })

  // Exercise every platform's searchUrl closure so the URL templates stay tested.
  // If any platform's URL host changes (e.g. a service rebrands), the matching case
  // here surfaces the regression without needing a per-platform spec file.
  it.each([
    ['Netflix', 'netflix.com/search'],
    ['Apple TV+', 'tv.apple.com/search'],
    ['Apple TV Plus', 'tv.apple.com/search'],
    ['Amazon Prime Video', 'amazon.com/s'],
    ['Prime Video', 'amazon.com/s'],
    ['Disney+', 'disneyplus.com/search'],
    ['HBO Max', 'max.com/search'],
    ['Max', 'max.com/search'],
    ['Hulu', 'hulu.com/search'],
    ['Peacock', 'peacocktv.com/search'],
    ['Paramount+', 'paramountplus.com/search'],
    ['ParamountPlus', 'paramountplus.com/search'],
    ['BritBox', 'britbox.com/search'],
    ['AMC+', 'amcplus.com/browse/search'],
    ['AMCPlus', 'amcplus.com/browse/search'],
    ['Shudder', 'shudder.com/search'],
  ])('builds a search URL for %s', (platform, expectedFragment) => {
    const url = getPlatformSearchUrl(platform, 'Test Show')
    expect(url).toContain(expectedFragment)
    expect(url).toContain('Test%20Show')
  })
})

describe('getAvailablePlatforms', () => {
  it('deduplicates by canonical name (hbo max and max collapse to one Max entry)', () => {
    const result = getAvailablePlatforms(['hbo max', 'max', 'netflix'])
    expect(result.map((p) => p.name)).toEqual(['Max', 'Netflix'])
  })

  it('preserves insertion order (first canonical hit wins)', () => {
    const result = getAvailablePlatforms(['netflix', 'hbo max', 'max'])
    expect(result.map((p) => p.name)).toEqual(['Netflix', 'Max'])
  })

  it('skips unknown platforms silently', () => {
    const result = getAvailablePlatforms(['netflix', 'Quibi', 'hulu'])
    expect(result.map((p) => p.name)).toEqual(['Netflix', 'Hulu'])
  })

  it('returns empty array for undefined or empty input', () => {
    expect(getAvailablePlatforms(undefined)).toEqual([])
    expect(getAvailablePlatforms([])).toEqual([])
  })
})
