'use client'

import { getAvailablePlatforms, getPlatformSearchUrl } from '@/lib/streaming-platforms'

interface StreamingPlatformIconsProps {
  platforms: string[] | undefined
  showTitle: string
}

export function StreamingPlatformIcons({
  platforms,
  showTitle,
}: StreamingPlatformIconsProps) {
  const availablePlatforms = getAvailablePlatforms(platforms)

  if (availablePlatforms.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {availablePlatforms.map((platform) => {
        const searchUrl = getPlatformSearchUrl(platform.name, showTitle)
        if (!searchUrl) return null

        return (
          <a
            key={platform.name}
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Watch on ${platform.name}`}
            aria-label={`Watch on ${platform.name}`}
            className="inline-block hover:opacity-80 transition-opacity"
          >
            <img
              src={`/icons/streaming/${platform.iconName}.svg`}
              alt={platform.name}
              className="w-8 h-8 object-contain"
            />
          </a>
        )
      })}
    </div>
  )
}
