'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { LoadingSkeletonGrid } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type RecommendationState = 'empty' | 'loading' | 'success' | 'error'

interface RecommendationsPageProps {
  onNavigate?: (page: 'recommendations' | 'favourites') => void
}

export function RecommendationsPage({ onNavigate }: RecommendationsPageProps) {
  const [state, setRecommendationState] = useState<RecommendationState>('empty')

  if (state === 'empty') {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="flex flex-col items-center justify-center text-center max-w-md px-4">
          {/* Empty state */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              No recommendations yet
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Go to Manage Favourites to upload your preferences and generate recommendations
            </p>
          </div>

          {/* CTA */}
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onNavigate?.('favourites')}
          >
            Go to Manage Favourites
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-full w-full bg-background">
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Something went wrong generating your recommendations. Please try again.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-4 px-4">
          <Button
            onClick={() => setRecommendationState('empty')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="h-full w-full flex overflow-hidden">
        {/* Hidden filter panel during loading */}
        <div className="hidden lg:flex lg:w-[30%] border-r border-border bg-card/50 p-6" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-6 border-b border-border">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Generating recommendations...</h1>
              <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <LoadingSkeletonGrid />
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return <DashboardLayout />
}
