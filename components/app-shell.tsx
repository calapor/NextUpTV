'use client'

import { useState, useEffect } from 'react'
import { TopNavigation } from '@/components/top-navigation'
import { RecommendationsPage } from '@/components/pages/recommendations'
import { FavouritesPage } from '@/components/pages/favourites'
import type { Recommendation, PendingRequest, CachedFavouritesInput } from '@/lib/types'

type Page = 'recommendations' | 'favourites'

const RECS_KEY = 'nextuptv_recommendations'
const FAVS_KEY = 'nextuptv_favourites_input'

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('recommendations')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null)
  const [cachedFavouritesInput, setCachedFavouritesInput] = useState<CachedFavouritesInput | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) setRecommendations(parsed)
      }
    } catch {}

    try {
      const raw = localStorage.getItem(FAVS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.keywords === 'string') setCachedFavouritesInput(parsed)
      }
    } catch {}
  }, [])

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
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify({
        fileContent: req.fileContent,
        fileName: req.fileName ?? '',
        keywords: req.keywords,
      }))
    } catch {}
    try { localStorage.removeItem(RECS_KEY) } catch {}
  }

  const handleRecommendationsReady = (recs: Recommendation[]) => {
    setRecommendations(recs)
    setPendingRequest(null)
    try { localStorage.setItem(RECS_KEY, JSON.stringify(recs)) } catch {}
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
              onRecommendationsReady={handleRecommendationsReady}
            />
          </div>
        ) : (
          <div key="favourites" className="h-full">
            <FavouritesPage onNavigate={handlePageChange} onSubmit={handleFavouritesSubmit} cachedInput={cachedFavouritesInput} />
          </div>
        )}
      </main>
    </div>
  )
}
