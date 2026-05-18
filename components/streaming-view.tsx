'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LoadingSkeletonGrid } from '@/components/loading-skeleton'
import type { PendingRequest, Recommendation } from '@/lib/types'

interface StreamingViewProps {
  pendingRequest: PendingRequest
  onRecommendationReceived: (rec: Recommendation) => void
  onRecommendationsReady: () => void
  onNavigate?: (page: 'recommendations' | 'favourites') => void
  compact?: boolean
}

export function StreamingView({
  pendingRequest,
  onRecommendationReceived,
  onRecommendationsReady,
  onNavigate,
  compact = false,
}: StreamingViewProps) {
  const [phase, setPhase] = useState('Connecting...')
  const [foundLines, setFoundLines] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: pendingRequest.fileContent,
          keywords: pendingRequest.keywords,
          count: 30,
        }),
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
            if (payload.message.startsWith('Suggesting: ')) {
              setFoundLines((prev) => [...prev, payload.message])
            } else {
              setPhase(payload.message)
            }
          } else if (payload.type === 'recommendation') {
            onRecommendationReceived(payload.recommendation)
          } else if (payload.type === 'recommendations_complete') {
            onRecommendationsReady()
          } else if (payload.type === 'error') {
            setErrorMessage(payload.message)
            setErrorDetail(payload.detail ?? null)
          }
        }
      }
    }

    run().catch((err) => {
      if (err.name !== 'AbortError') {
        setErrorMessage('Connection lost. Please try again.')
      }
    })

    return () => controller.abort()
  }, [pendingRequest, onRecommendationReceived, onRecommendationsReady])

  if (errorMessage) {
    const errorContent = (
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
    )

    if (compact) return <div className="px-4 py-3 border-b border-border">{errorContent}</div>
    return (
      <div className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">{errorContent}</div>
      </div>
    )
  }

  // Compact mode: slim banner shown above DashboardLayout while streaming
  if (compact) {
    return (
      <div className="px-4 lg:px-6 py-2 border-b border-border bg-card/30 flex items-center gap-4">
        <p className="text-sm font-medium text-foreground shrink-0">{phase}</p>
        <div className="relative flex-1 h-5 overflow-hidden">
          <div className="h-full flex flex-col justify-end">
            {foundLines.slice(-1).map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Full mode: shown while waiting for the first card
  return (
    <div className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-1">{phase}</p>
          <div className="relative h-10 overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 z-10 bg-gradient-to-b from-background to-transparent" />
            <div className="h-full flex flex-col justify-end gap-0.5">
              {foundLines.map((line, i) => (
                <p
                  key={i}
                  className="shrink-0 text-sm leading-5 text-muted-foreground truncate animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
        <LoadingSkeletonGrid />
      </div>
    </div>
  )
}
