export interface StreamingPlatform {
  name: string
  searchUrl: (showTitle: string) => string
  iconName: string
}

// Keys cover all naming variants TVDB returns for the same service ('hbo max' vs
// 'max', 'amazon prime video' vs 'prime video', 'apple tv+' vs 'apple tv plus').
// TVDB does not normalise platform names across shows, so every observed variant
// needs its own entry pointing at the canonical platform metadata.
const STREAMING_PLATFORMS: Record<string, StreamingPlatform> = {
  netflix: {
    name: 'Netflix',
    searchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'netflix',
  },
  'apple tv+': {
    name: 'Apple TV+',
    searchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
    iconName: 'apple-tv',
  },
  'apple tv plus': {
    name: 'Apple TV+',
    searchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
    iconName: 'apple-tv',
  },
  'amazon prime video': {
    name: 'Amazon Prime Video',
    searchUrl: (title) => `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video`,
    iconName: 'prime-video',
  },
  'prime video': {
    name: 'Amazon Prime Video',
    searchUrl: (title) => `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video`,
    iconName: 'prime-video',
  },
  'disney+': {
    name: 'Disney+',
    searchUrl: (title) => `https://www.disneyplus.com/search/${encodeURIComponent(title)}`,
    iconName: 'disney-plus',
  },
  'hbo max': {
    name: 'Max',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'max',
  },
  max: {
    name: 'Max',
    searchUrl: (title) => `https://www.max.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'max',
  },
  hulu: {
    name: 'Hulu',
    searchUrl: (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'hulu',
  },
  peacock: {
    name: 'Peacock',
    searchUrl: (title) => `https://www.peacocktv.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'peacock',
  },
  'paramount+': {
    name: 'Paramount+',
    searchUrl: (title) => `https://www.paramountplus.com/search?query=${encodeURIComponent(title)}`,
    iconName: 'paramount-plus',
  },
  paramountplus: {
    name: 'Paramount+',
    searchUrl: (title) => `https://www.paramountplus.com/search?query=${encodeURIComponent(title)}`,
    iconName: 'paramount-plus',
  },
  britbox: {
    name: 'BritBox',
    searchUrl: (title) => `https://www.britbox.com/search?q=${encodeURIComponent(title)}`,
    iconName: 'britbox',
  },
  'amc+': {
    name: 'AMC+',
    searchUrl: (title) => `https://www.amcplus.com/browse/search?query=${encodeURIComponent(title)}`,
    iconName: 'amc-plus',
  },
  amcplus: {
    name: 'AMC+',
    searchUrl: (title) => `https://www.amcplus.com/browse/search?query=${encodeURIComponent(title)}`,
    iconName: 'amc-plus',
  },
  shudder: {
    name: 'Shudder',
    searchUrl: (title) => `https://www.shudder.com/search?query=${encodeURIComponent(title)}`,
    iconName: 'shudder',
  },
}

export function getPlatformInfo(
  platformName: string | undefined
): StreamingPlatform | null {
  if (!platformName) return null
  const key = platformName.toLowerCase().trim()
  return STREAMING_PLATFORMS[key] || null
}

export function getPlatformSearchUrl(
  platformName: string | undefined,
  showTitle: string
): string | null {
  const platform = getPlatformInfo(platformName)
  return platform ? platform.searchUrl(showTitle) : null
}

export function getAvailablePlatforms(
  platformNames: string[] | undefined
): StreamingPlatform[] {
  if (!platformNames) return []
  const seen = new Set<string>()
  const result: StreamingPlatform[] = []
  for (const name of platformNames) {
    const platform = getPlatformInfo(name)
    if (!platform || seen.has(platform.name)) continue
    seen.add(platform.name)
    result.push(platform)
  }
  return result
}
