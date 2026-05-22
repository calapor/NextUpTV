'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LoadingSkeletonCard } from '@/components/loading-skeleton'
import { RecommendationCard } from '@/components/recommendation-card'
import type { PartialRecommendation, PendingRequest, Recommendation } from '@/lib/types'
import { getTestShowsList } from '@/lib/test-data/sample-shows'
import demoRecsData from '@/lib/test-data/demo-recommendations.json'

function formatElapsed(ms: number): string {
  const total = ms / 1000
  if (total < 60) return `${total.toFixed(2)}s`
  const m = Math.floor(total / 60)
  const s = (total % 60).toFixed(2)
  return `${m}m ${s}s`
}

interface StreamingViewProps {
  pendingRequest: PendingRequest
  onRecommendationsReady: (recs: Recommendation[]) => void
  onNavigate?: (page: 'recommendations' | 'favourites') => void
}

export function StreamingView({ pendingRequest, onRecommendationsReady, onNavigate }: StreamingViewProps) {
  const [phase, setPhase] = useState('Connecting...')
  const [liveRecs, setLiveRecs] = useState<Array<PartialRecommendation | Recommendation>>([])
  const [streaming, setStreaming] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerStartRef = useRef<number | null>(null)

  const isProcessing = phase === 'Generating recommendations...' || phase === 'Fetching show details...'

  // Latch start time once when generating begins; keep it across the fetching phase
  useEffect(() => {
    if (phase === 'Generating recommendations...' && timerStartRef.current === null) {
      timerStartRef.current = Date.now()
      setElapsed(0)
    }
  }, [phase])

  useEffect(() => {
    if (!isProcessing || timerStartRef.current === null) return
    const interval = setInterval(() => {
      setElapsed(Date.now() - timerStartRef.current!)
    }, 10)
    return () => clearInterval(interval)
  }, [isProcessing])

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      // For test mode, use the bundled demo data (generated locally and committed)
      if (pendingRequest.isTest) {
        const demoRecs = demoRecsData as unknown as Recommendation[]
        if (demoRecs.length > 0) {
          await simulateCachedRecs(demoRecs, controller.signal)
          return
        }
        setErrorMessage('Demo not yet generated. Visit /admin → Demo Cache to generate it.')
        return
      }

      // Real API call: use sample shows list for test mode, user data otherwise
      const fileContent = pendingRequest.isTest ? getTestShowsList() : pendingRequest.fileContent
      const keywords = pendingRequest.isTest ? '' : pendingRequest.keywords

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent, keywords, count: 20 }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setErrorMessage(`Request failed (${res.status})`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6))

          if (payload.type === 'status') {
            if (!payload.message.startsWith('Suggesting: ')) {
              setPhase(payload.message)
            }
          } else if (payload.type === 'partial_recommendation') {
            const partial: PartialRecommendation = payload.recommendation
            setLiveRecs(prev => {
              if (prev.some(r => r.title === partial.title)) return prev
              return [...prev, partial].slice(0, 10)
            })
          } else if (payload.type === 'recommendation') {
            const newRec: Recommendation = payload.recommendation
            setLiveRecs(prev => {
              const deduped = prev.filter(r => r.title !== newRec.title)
              const merged = [...deduped, newRec].sort((a, b) => {
                const ra = 'imdb_rating' in a ? (a as Recommendation).imdb_rating : -1
                const rb = 'imdb_rating' in b ? (b as Recommendation).imdb_rating : -1
                return (rb ?? -1) - (ra ?? -1)
              })
              return merged.slice(0, 10)
            })
          } else if (payload.type === 'complete') {
            setStreaming(false)
            onRecommendationsReady(payload.recommendations)
          } else if (payload.type === 'error') {
            setErrorMessage(payload.message)
            setErrorDetail(payload.detail ?? null)
          }
        }
      }
    }

    async function simulateCachedRecs(recs: Recommendation[], signal: AbortSignal) {
      function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }
      setPhase('Analyzing your favorites...')
      await delay(400); if (signal.aborted) return
      setPhase('Generating recommendations...')
      await delay(400)
      for (const rec of recs) {
        if (signal.aborted) return
        setLiveRecs(prev => prev.some(r => r.title === rec.title) ? prev : [...prev, rec].slice(0, 10))
        await delay(300)
      }
      if (signal.aborted) return
      setPhase('Fetching show details...')
      await delay(400)
      for (const rec of recs) {
        if (signal.aborted) return
        setLiveRecs(prev =>
          [...prev.filter(r => r.title !== rec.title), rec]
            .sort((a, b) => {
              const ra = 'imdb_rating' in a && typeof (a as Recommendation).imdb_rating === 'number' ? (a as Recommendation).imdb_rating : 0
              const rb = 'imdb_rating' in b && typeof (b as Recommendation).imdb_rating === 'number' ? (b as Recommendation).imdb_rating : 0
              return rb - ra
            })
            .slice(0, 10)
        )
      }
      if (!signal.aborted) {
        setStreaming(false)
        onRecommendationsReady(recs)
      }
    }

    run().catch((err) => {
      if (err.name !== 'AbortError') {
        setErrorMessage('Connection lost. Please try again.')
      }
    })

    return () => controller.abort()
  }, [pendingRequest, onRecommendationsReady])

  const skeletonCount = streaming ? Math.max(0, 10 - liveRecs.length) : 0

  return (
    <div className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {!errorMessage && (
        <div className="px-4 lg:px-6 py-3 border-b border-border shrink-0">
          <p className="text-sm font-medium text-foreground">{phase}</p>
          {isProcessing && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/25 border-t-foreground animate-spin" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {errorMessage && (
          <Alert variant="destructive" className="mb-6 max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              <div className="mb-2">
                {errorMessage}
                <Button
                  variant="link"
                  onClick={() => onNavigate?.('favourites')}
                  className="ml-1 p-0 h-auto"
                >
                  Try again
                </Button>
              </div>
              {errorDetail && (
                <>
                  <Button
                    variant="link"
                    onClick={() => setShowDetail(!showDetail)}
                    className="p-0 h-auto text-xs"
                  >
                    {showDetail ? 'Hide' : 'Show'} details
                  </Button>
                  {showDetail && (
                    <pre className="mt-2 p-2 bg-black bg-opacity-20 rounded text-xs overflow-auto max-h-32 whitespace-pre-wrap break-words">
                      {errorDetail}
                    </pre>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {liveRecs.map((rec, i) => (
            <RecommendationCard key={rec.id ?? `${i}-${rec.title}`} recommendation={rec} />
          ))}
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <LoadingSkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
