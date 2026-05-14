'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { LoadingSkeletonGrid } from '@/components/loading-skeleton'
import type { PendingRequest, Recommendation } from '@/lib/types'

interface StreamingViewProps {
  pendingRequest: PendingRequest
  onRecommendationsReady: (recs: Recommendation[]) => void
  onNavigate?: (page: 'recommendations' | 'favourites') => void
}

export function StreamingView({ pendingRequest, onRecommendationsReady, onNavigate }: StreamingViewProps) {
  const [phase, setPhase] = useState('Connecting...')
  const [foundLines, setFoundLines] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: pendingRequest.fileContent,
          keywords: pendingRequest.keywords,
          count: 10,
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
          } else if (payload.type === 'recommendations') {
            onRecommendationsReady(payload.recommendations)
          } else if (payload.type === 'error') {
            setErrorMessage(payload.message)
          }
          // text events intentionally ignored
        }
      }
    }

    run().catch((err) => {
      if (err.name !== 'AbortError') {
        setErrorMessage('Connection lost. Please try again.')
      }
    })

    return () => controller.abort()
  }, [pendingRequest, onRecommendationsReady])

  return (
    <div className="mt-16 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {errorMessage ? (
          <Alert variant="destructive" className="mb-6 max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {errorMessage}
              <Button
                variant="link"
                onClick={() => onNavigate?.('favourites')}
                className="ml-1 p-0 h-auto"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mb-6">
            {/* Pinned phase header */}
            <p className="text-sm font-medium text-foreground mb-1">{phase}</p>

            {/* Scrolling found-titles log */}
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
        )}

        <LoadingSkeletonGrid />
      </div>
    </div>
  )
}
