'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { TopNavigation } from '@/components/top-navigation'
import { RecommendationsPage } from '@/components/pages/recommendations'
import { FavouritesPage } from '@/components/pages/favourites'
import { LibraryPage } from '@/components/pages/library'
import type { Recommendation, PendingRequest, CachedFavouritesInput, LibraryShow } from '@/lib/types'

type Page = 'recommendations' | 'favourites' | 'library'

const RECS_KEY = 'nextuptv_recommendations'
const FAVS_KEY = 'nextuptv_favourites_input'

export function AppShell() {
  const [currentPage, setCurrentPage] = useState<Page>('recommendations')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null)
  const [cachedFavouritesInput, setCachedFavouritesInput] = useState<CachedFavouritesInput | null>(null)
  const [libraryShows, setLibraryShows] = useState<LibraryShow[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const libraryAbortRef = useRef<AbortController | null>(null)
  const libraryShowsRef = useRef<LibraryShow[]>([])
  const libraryLoadingRef = useRef(false)
  libraryShowsRef.current = libraryShows
  libraryLoadingRef.current = libraryLoading

  const fetchLibrary = useCallback(async (fileContent: string) => {
    libraryAbortRef.current?.abort()
    const abortController = new AbortController()
    libraryAbortRef.current = abortController

    setLibraryLoading(true)
    setLibraryShows([])

    try {
      const res = await fetch('/api/library-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent }),
        signal: abortController.signal,
      })

      if (!res.ok || !res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if (event.type === 'show') {
              setLibraryShows((prev) => [...prev, event.show as LibraryShow])
            } else if (event.type === 'complete') {
              setLibraryLoading(false)
            }
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
    } finally {
      if (!abortController.signal.aborted) setLibraryLoading(false)
    }
  }, [])

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
        if (parsed && typeof parsed.keywords === 'string') {
          setCachedFavouritesInput(parsed)
        }
      }
    } catch {}
  }, [])

  // Fetch library whenever fileContent changes
  useEffect(() => {
    if (cachedFavouritesInput?.fileContent) {
      fetchLibrary(cachedFavouritesInput.fileContent)
    }
  }, [cachedFavouritesInput?.fileContent, fetchLibrary])

  // Retry if navigating to My Shows with no data and not already loading
  useEffect(() => {
    if (
      currentPage === 'library' &&
      cachedFavouritesInput?.fileContent &&
      !libraryLoadingRef.current &&
      libraryShowsRef.current.length === 0
    ) {
      fetchLibrary(cachedFavouritesInput.fileContent)
    }
  }, [currentPage, cachedFavouritesInput?.fileContent, fetchLibrary])

  const handlePageChange = (page: Page) => {
    setCurrentPage(page)
  }

  const handleFavouritesSubmit = (req: PendingRequest) => {
    setRecommendations([])
    setPendingRequest(req)
    setCurrentPage('recommendations')
    const newCached: CachedFavouritesInput = {
      fileContent: req.fileContent,
      fileName: req.fileName ?? '',
      keywords: req.keywords,
    }
    setCachedFavouritesInput(newCached)
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify(newCached))
    } catch {}
    try { localStorage.removeItem(RECS_KEY) } catch {}
  }

  const handleClearAll = () => {
    libraryAbortRef.current?.abort()
    try { localStorage.removeItem(RECS_KEY) } catch {}
    try { localStorage.removeItem(FAVS_KEY) } catch {}
    setRecommendations([])
    setPendingRequest(null)
    setCachedFavouritesInput(null)
    setLibraryShows([])
    setLibraryLoading(false)
  }

  const handleRecommendationsReady = (recs: Recommendation[]) => {
    setRecommendations(recs)
    setPendingRequest(null)
    try { localStorage.setItem(RECS_KEY, JSON.stringify(recs)) } catch {}
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation currentPage={currentPage} onPageChange={handlePageChange} />
      <main className="flex-1 overflow-hidden pt-16 pb-16 sm:pb-0">
        <div className={`h-full ${currentPage === 'recommendations' ? '' : 'hidden'}`}>
          <RecommendationsPage
            onNavigate={handlePageChange}
            recommendations={recommendations}
            pendingRequest={pendingRequest}
            onRecommendationsReady={handleRecommendationsReady}
          />
        </div>
        <div className={`h-full ${currentPage === 'library' ? '' : 'hidden'}`}>
          <LibraryPage
            shows={libraryShows}
            loading={libraryLoading}
            hasLibrary={!!cachedFavouritesInput?.fileContent}
            onNavigate={handlePageChange}
          />
        </div>
        <div className={`h-full ${currentPage === 'favourites' ? '' : 'hidden'}`}>
          <FavouritesPage
            onNavigate={handlePageChange}
            onSubmit={handleFavouritesSubmit}
            cachedInput={cachedFavouritesInput}
            onClearAll={handleClearAll}
          />
        </div>
      </main>
    </div>
  )
}
