'use client'

import { getAvailablePlatforms, getPlatformSearchUrl } from '@/lib/streaming-platforms'
import Image from 'next/image'

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
    <div className="flex gap-2 mt-3">
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
            <div className="relative w-8 h-8">
              <Image
                src={`/icons/streaming/${platform.iconName}.svg`}
                alt={platform.name}
                fill
                className="object-contain"
              />
            </div>
          </a>
        )
      })}
    </div>
  )
}
