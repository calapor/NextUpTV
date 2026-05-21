'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StreamingPlatformIcons } from '@/components/streaming-platform-icons'
import type { Recommendation, PartialRecommendation, ShowDetails } from '@/lib/types'

interface ShowDetailSheetProps {
  recommendation: Recommendation | PartialRecommendation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Continuing') {
    return (
      <Badge variant="outline" className="border-green-500 text-green-500 w-fit">
        {status}
      </Badge>
    )
  }
  if (status === 'Ended') {
    return <Badge variant="secondary" className="w-fit">{status}</Badge>
  }
  return <Badge variant="outline" className="w-fit">{status}</Badge>
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex gap-4">
        <Skeleton className="w-[40%] aspect-[2/3] rounded-md shrink-0" />
        <div className="flex flex-col gap-3 flex-1 pt-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  )
}

export function ShowDetailSheet({ recommendation: rec, open, onOpenChange }: ShowDetailSheetProps) {
  const [details, setDetails] = useState<ShowDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !rec?.id) {
      setDetails(null)
      return
    }
    setLoading(true)
    setDetails(null)
    fetch(`/api/show-details?tvdbId=${rec.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ShowDetails | null) => setDetails(data))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false))
  }, [open, rec?.id])

  const synopsis = details?.full_overview || rec?.one_sentence_synopsis || ''
  const isFullRec = rec && 'imdb_rating' in rec

  const titleInitials = rec
    ? rec.title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0"
      >
        <SheetTitle className="sr-only">{rec?.title ?? 'Show Details'}</SheetTitle>
        {!rec || loading ? (
          <SheetSkeleton />
        ) : (
          <>

            <div className="flex flex-col gap-6 p-6">
              {/* Hero */}
              <div className="flex gap-4">
                <div className="w-[40%] shrink-0">
                  {rec.tvdb_poster_thumbnail_url ? (
                    <img
                      src={rec.tvdb_poster_thumbnail_url}
                      alt={`${rec.title} poster`}
                      className="w-full aspect-[2/3] object-cover object-top rounded-md"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-md bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/80">{titleInitials}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground leading-tight">{rec.title}</h2>

                  <p className="text-sm text-muted-foreground">
                    {[
                      rec.release_year,
                      rec.episode_runtime_minutes ? `${rec.episode_runtime_minutes} min` : null,
                      rec.content_rating,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  {details?.season_count != null && details.season_count > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {details.season_count} {details.season_count === 1 ? 'Season' : 'Seasons'}
                    </p>
                  )}

                  {details?.status && <StatusBadge status={details.status} />}

                  <div className="flex gap-2 flex-wrap">
                    {rec.average_user_rating != null && rec.average_user_rating > 0 && (
                      <Badge variant="outline" className="text-xs">
                        TVDB {rec.average_user_rating.toFixed(1)}
                      </Badge>
                    )}
                    {isFullRec && rec.imdb_rating > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        IMDb {rec.imdb_rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Genres */}
              {rec.genres && rec.genres.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {rec.genres.map((genre) => (
                      <Badge key={genre} variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {/* Synopsis */}
              {synopsis && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Synopsis</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{synopsis}</p>
                  </div>
                </>
              )}

              {/* Cast */}
              {details?.cast && details.cast.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Cast</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {details.cast.map((member, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 shrink-0 w-14">
                          <div className="w-14 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {member.image ? (
                              <img
                                src={member.image}
                                alt={member.actor}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">
                                {member.actor
                                  .split(' ')
                                  .map((w) => w[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-foreground text-center leading-tight line-clamp-2 w-full">
                            {member.actor}
                          </span>
                          <span className="text-xs text-muted-foreground text-center leading-tight line-clamp-1 w-full">
                            {member.character}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Where to Watch */}
              {rec.streaming_platforms && rec.streaming_platforms.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Where to Watch</h3>
                    <StreamingPlatformIcons
                      platforms={rec.streaming_platforms}
                      showTitle={rec.title}
                    />
                  </div>
                </>
              )}

              {/* Why Recommended */}
              {isFullRec && rec.reason && (
                <>
                  <Separator />
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      Why we recommend this
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
                  </div>
                </>
              )}

              {/* Footer — TVDB link */}
              {rec.tvdb_show_url && (
                <>
                  <Separator />
                  <a
                    href={rec.tvdb_show_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    View on TVDB
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
