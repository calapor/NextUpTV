'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SAMPLE_SHOWS_LIST,
  TEST_RECS_CACHE_KEY,
  TEST_LIBRARY_CACHE_KEY,
  TEST_SHOWS_KEY,
} from '@/lib/test-data/sample-shows'
import type { Recommendation, LibraryShow } from '@/lib/types'

export function DemoCachePanel() {
  const [showsList, setShowsList] = useState(SAMPLE_SHOWS_LIST)
  const [recsCount, setRecsCount] = useState<number | null>(null)
  const [libCount, setLibCount] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      const recs = localStorage.getItem(TEST_RECS_CACHE_KEY)
      if (recs) setRecsCount(JSON.parse(recs).length)
    } catch {}
    try {
      const lib = localStorage.getItem(TEST_LIBRARY_CACHE_KEY)
      if (lib) setLibCount(JSON.parse(lib).length)
    } catch {}
    try {
      const shows = localStorage.getItem(TEST_SHOWS_KEY)
      if (shows) setShowsList(shows)
    } catch {}
  }, [])

  const handleRegenerate = async () => {
    if (!showsList.trim()) return
    setBusy(true)
    setStatusMsg('Starting...')
    setRecsCount(null)
    setLibCount(null)

    try { localStorage.setItem(TEST_SHOWS_KEY, showsList) } catch {}
    try { localStorage.removeItem(TEST_RECS_CACHE_KEY) } catch {}
    try { localStorage.removeItem(TEST_LIBRARY_CACHE_KEY) } catch {}

    try {
      // Step 1: Generate recommendations
      const recsRes = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: showsList, keywords: '', count: 20 }),
      })
      if (!recsRes.ok || !recsRes.body) throw new Error('Recommendations API failed')

      const reader = recsRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let recs: Recommendation[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.type === 'status' && !payload.message.startsWith('Suggesting: ')) {
              setStatusMsg(payload.message)
            } else if (payload.type === 'complete') {
              recs = payload.recommendations
              try { localStorage.setItem(TEST_RECS_CACHE_KEY, JSON.stringify(recs)) } catch {}
              setRecsCount(recs.length)
            } else if (payload.type === 'error') {
              throw new Error(payload.message)
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue
            throw parseErr
          }
        }
      }

      // Step 2: Fetch library shows
      setStatusMsg('Fetching library shows...')
      const libRes = await fetch('/api/library-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: showsList }),
      })
      if (!libRes.ok || !libRes.body) throw new Error('Library API failed')

      const libReader = libRes.body.getReader()
      const libDecoder = new TextDecoder()
      let libBuffer = ''
      const allShows: LibraryShow[] = []

      while (true) {
        const { done, value } = await libReader.read()
        if (done) break
        libBuffer += libDecoder.decode(value, { stream: true })
        const parts = libBuffer.split('\n\n')
        libBuffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const event = JSON.parse(part.slice(6))
            if (event.type === 'show') {
              allShows.push(event.show as LibraryShow)
            } else if (event.type === 'complete') {
              try { localStorage.setItem(TEST_LIBRARY_CACHE_KEY, JSON.stringify(allShows)) } catch {}
              setLibCount(allShows.length)
            }
          } catch {}
        }
      }

      setStatusMsg(`Done ✓ — ${recs.length} recommendations, ${allShows.length} library shows cached`)
    } catch (err) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleClear = () => {
    try { localStorage.removeItem(TEST_RECS_CACHE_KEY) } catch {}
    try { localStorage.removeItem(TEST_LIBRARY_CACHE_KEY) } catch {}
    try { localStorage.removeItem(TEST_SHOWS_KEY) } catch {}
    setRecsCount(null)
    setLibCount(null)
    setShowsList(SAMPLE_SHOWS_LIST)
    setStatusMsg('Cache cleared')
  }

  const statusColor = statusMsg?.startsWith('Done')
    ? 'text-emerald-600'
    : statusMsg?.startsWith('Error')
    ? 'text-red-600'
    : 'text-muted-foreground'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Demo Cache Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Recommendations: </span>
            {recsCount !== null
              ? <span className="text-emerald-600">{recsCount} shows cached</span>
              : <span className="text-amber-600">Not generated yet</span>}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Library shows: </span>
            {libCount !== null
              ? <span className="text-emerald-600">{libCount} shows cached</span>
              : <span className="text-amber-600">Not generated yet</span>}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label className="text-sm font-semibold">Sample shows list (one per line)</label>
        <Textarea
          value={showsList}
          onChange={(e) => setShowsList(e.target.value)}
          className="font-mono text-sm min-h-40 resize-none"
          disabled={busy}
          placeholder="One show per line..."
        />
        <p className="text-xs text-muted-foreground">
          Edit this list and click Regenerate to create a new permanent demo cache.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleRegenerate} disabled={busy || !showsList.trim()} className="flex-1">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {busy ? 'Generating...' : 'Regenerate Demo Cache'}
        </Button>
        <Button onClick={handleClear} variant="outline" disabled={busy}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Cache
        </Button>
      </div>

      {statusMsg && <p className={`text-sm ${statusColor}`}>{statusMsg}</p>}
    </div>
  )
}
