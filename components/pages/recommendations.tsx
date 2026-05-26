'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { StreamingView } from '@/components/streaming-view'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recommendation, PendingRequest } from '@/lib/types'

interface RecommendationsPageProps {
  onNavigate?: (page: 'recommendations' | 'favourites') => void
  recommendations: Recommendation[]
  pendingRequest: PendingRequest | null
  onRecommendationsReady: (recs: Recommendation[]) => void
  generationId: number
}

export function RecommendationsPage({
  onNavigate,
  recommendations,
  pendingRequest,
  onRecommendationsReady,
  generationId,
}: RecommendationsPageProps) {
  if (pendingRequest) {
    return (
      <StreamingView
        pendingRequest={pendingRequest}
        onRecommendationsReady={onRecommendationsReady}
        onNavigate={onNavigate}
      />
    )
  }

  if (recommendations.length === 0) {
    return (
     <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">No TV show preferences uploaded</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upload your TV favourite TV shows (current or past) in the Manage Favourites tab to see a curated list of recommended TV Shows AI recommends that you should watch next and why.
        </p>
        <button
          onClick={() => onNavigate?.('favourites')}
          className="text-sm text-primary hover:underline"
        >
          Go to Manage Favourites →
        </button>
      </div>
    )
  }

  return <DashboardLayout recommendations={recommendations} generationId={generationId} />
}
