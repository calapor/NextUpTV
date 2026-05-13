'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export function RecommendationCard() {
  return (
    <Card className="group overflow-hidden bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer hover:shadow-lg">
      {/* Poster Image Skeleton */}
      <div className="aspect-[2/3] bg-accent/10 overflow-hidden relative">
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Rating & Year */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        
        {/* Description */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        
        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          disabled
        >
          View Details
        </Button>
      </div>
    </Card>
  )
}

export function RecommendationCardGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <RecommendationCard key={i} />
      ))}
    </div>
  )
}
