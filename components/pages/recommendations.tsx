'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Recommendation } from '@/lib/types'

interface RecommendationsPageProps {
  onNavigate?: (page: 'recommendations' | 'favourites') => void
  recommendations: Recommendation[]
}

export function RecommendationsPage({ onNavigate, recommendations }: RecommendationsPageProps) {
  const isEmpty = recommendations.length === 0

  if (isEmpty) {
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

  return <DashboardLayout recommendations={recommendations} />
}
