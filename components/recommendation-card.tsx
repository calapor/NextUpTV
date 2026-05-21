'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StreamingPlatformIcons } from '@/components/streaming-platform-icons'
import { ShowDetailSheet } from '@/components/show-detail-sheet'
import type { PartialRecommendation, Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  recommendation: PartialRecommendation | Recommendation
  onSelect?: (rec: PartialRecommendation | Recommendation) => void
}

export function RecommendationCard({ recommendation, onSelect }: RecommendationCardProps) {
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
    <Card
      className="group overflow-hidden bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer hover:shadow-lg"
      onClick={() => onSelect?.(recommendation)}
    >
      {/* Poster Image Area */}
      {posterArea}

      {/* Card Content */}
      <div className="p-4 grid grid-cols-[1fr_auto] gap-3 auto-rows-min">
        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-2">{recommendation.title}</h3>
          <p className="text-sm text-muted-foreground">{recommendation.release_year}</p>
        </div>

        {/* Streaming Platforms - spans multiple rows on the right */}
        <div className="row-span-3">
          <StreamingPlatformIcons
            platforms={recommendation.streaming_platforms}
            showTitle={recommendation.title}
          />
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

        {/* Reason - spans full width below */}
        {'reason' in recommendation && (
          <p className="text-sm text-muted-foreground col-span-2">{recommendation.reason}</p>
        )}
      </div>
    </Card>
  )
}

interface RecommendationCardGridProps {
  recommendations: Recommendation[]
}

export function RecommendationCardGrid({ recommendations }: RecommendationCardGridProps) {
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelect = (rec: PartialRecommendation | Recommendation) => {
    setSelectedRec(rec as Recommendation)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((rec, i) => (
          <RecommendationCard key={rec.id ?? `${i}-${rec.title}`} recommendation={rec} onSelect={handleSelect} />
        ))}
      </div>
      <ShowDetailSheet
        recommendation={selectedRec}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
