'use client'

import { useState } from 'react'
import { TopNavigation } from '@/components/top-navigation'
import { RecommendationsPage } from '@/components/pages/recommendations'
import { FavouritesPage } from '@/components/pages/favourites'
import type { Recommendation } from '@/lib/types'

type Page = 'recommendations' | 'favourites'

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('recommendations')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 overflow-hidden pt-16">
        {currentPage === 'recommendations' ? (
          <div key="recommendations" className="h-full">
            <RecommendationsPage onNavigate={handlePageChange} recommendations={recommendations} />
          </div>
        ) : (
          <div key="favourites" className="h-full">
            <FavouritesPage onNavigate={handlePageChange} onRecommendationsReady={setRecommendations} />
          </div>
        )}
      </main>
    </div>
  )
}
