'use client'

import { useState } from 'react'
import { TopNavigation } from '@/components/top-navigation'
import { RecommendationsPage } from '@/components/pages/recommendations'
import { FavouritesPage } from '@/components/pages/favourites'
import type { Recommendation, PendingRequest } from '@/lib/types'

type Page = 'recommendations' | 'favourites'

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('recommendations')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null)

  const handlePageChange = (page: Page) => {
    if (page !== 'recommendations' && pendingRequest) {
      setPendingRequest(null)
    }
    setCurrentPage(page)
  }

  const handleFavouritesSubmit = (req: PendingRequest) => {
    setRecommendations([])
    setPendingRequest(req)
    setCurrentPage('recommendations')
  }

  const handleRecommendationReceived = (rec: Recommendation) => {
    setRecommendations((prev) => [...prev, rec])
  }

  const handleRecommendationsReady = () => {
    setPendingRequest(null)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 overflow-hidden pt-16">
        {currentPage === 'recommendations' ? (
          <div key="recommendations" className="h-full">
            <RecommendationsPage
              onNavigate={handlePageChange}
              recommendations={recommendations}
              pendingRequest={pendingRequest}
              onRecommendationReceived={handleRecommendationReceived}
              onRecommendationsReady={handleRecommendationsReady}
            />
          </div>
        ) : (
          <div key="favourites" className="h-full">
            <FavouritesPage onNavigate={handlePageChange} onSubmit={handleFavouritesSubmit} />
          </div>
        )}
      </main>
    </div>
  )
}
