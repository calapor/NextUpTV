'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StreamingPlatformIcons } from '@/components/streaming-platform-icons'
import type { PartialRecommendation, Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  recommendation: PartialRecommendation | Recommendation
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [imgError, setImgError] = useState(false)

  const titleInitials = recommendation.title
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()

  const showThumbnail = !!recommendation.tvdb_poster_thumbnail_url && !imgError

  const posterContent = showThumbnail ? (
    <img
      src={recommendation.tvdb_poster_thumbnail_url}
      alt={`${recommendation.title} poster`}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  ) : (
    <>
      <div className="text-4xl font-bold text-white/80">{titleInitials}</div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </>
  )

  const posterArea = (
    <div className={`aspect-[2/3] overflow-hidden relative flex items-center justify-center ${
      showThumbnail ? '' : 'bg-gradient-to-br from-blue-600 to-purple-600'
    }`}>
      {posterContent}
    </div>
  )

  return (
    <Card className="group overflow-hidden bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer hover:shadow-lg">
      {/* Poster Image Area */}
      {recommendation.tvdb_show_url ? (
        <a
          href={recommendation.tvdb_show_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          tabIndex={-1}
          aria-label={`View ${recommendation.title} on TheTVDB`}
        >
          {posterArea}
        </a>
      ) : (
        posterArea
      )}

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-2">{recommendation.title}</h3>
          <p className="text-sm text-muted-foreground">{recommendation.release_year}</p>
        </div>

        {/* Rating */}
        {'imdb_rating' in recommendation && (
          <div className="flex gap-2">
            <Badge variant="secondary">★ {recommendation.imdb_rating.toFixed(1)}</Badge>
          </div>
        )}

        {/* Genres */}
        {recommendation.genres && recommendation.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recommendation.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        {/* Streaming Platforms */}
        <StreamingPlatformIcons
          platforms={recommendation.streaming_platforms}
          showTitle={recommendation.title}
        />

        {/* Reason */}
        {'reason' in recommendation && (
          <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
        )}
      </div>
    </Card>
  )
}

interface RecommendationCardGridProps {
  recommendations: Recommendation[]
}

export function RecommendationCardGrid({ recommendations }: RecommendationCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.title} recommendation={rec} />
      ))}
    </div>
  )
}
