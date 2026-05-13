'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingSkeletonCard() {
  return (
    <Card className="overflow-hidden bg-card animate-pulse">
      {/* Poster with gradient shimmer */}
      <div className="aspect-[2/3] bg-gradient-to-b from-accent/20 via-accent/10 to-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 bg-accent/20" />
        <Skeleton className="h-4 w-1/2 bg-accent/15" />
        
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-12 rounded-full bg-accent/20" />
          <Skeleton className="h-6 w-12 rounded-full bg-accent/20" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-accent/15" />
          <Skeleton className="h-3 w-5/6 bg-accent/15" />
        </div>
      </div>
    </Card>
  )
}

export function LoadingSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <LoadingSkeletonCard key={i} />
      ))}
    </div>
  )
}
