'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SAMPLE_SHOWS_LIST, TEST_SHOWS_KEY } from '@/lib/test-data/sample-shows'
import type { Recommendation, LibraryShow } from '@/lib/types'

export function DemoCachePanel() {
  const [showsList, setShowsList] = useState(SAMPLE_SHOWS_LIST)
  const [recsCount, setRecsCount] = useState<number | null>(null)
  const [libCount, setLibCount] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Load current shows list from localStorage (admin preference only)
    try {
      const stored = localStorage.getItem(TEST_SHOWS_KEY)
      if (stored) setShowsList(stored)
    } catch {}
    // Load cache status from bundled files via API
    fetch('/api/admin/demo-cache')
      .then(r => r.json())
      .then(({ recsCount, libCount }) => {
        if (recsCount > 0) setRecsCount(recsCount)
        if (libCount > 0) setLibCount(libCount)
      })
      .catch(() => {})
  }, [])

  const handleRegenerate = async () => {
    if (!showsList.trim()) return
    setBusy(true)
    setStatusMsg('Starting...')
    setRecsCount(null)
    setLibCount(null)

    try { localStorage.setItem(TEST_SHOWS_KEY, showsList) } catch {}

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
            } else if (payload.type === 'error') {
              throw new Error(payload.message)
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
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
            if (event.type === 'show') allShows.push(event.show as LibraryShow)
          } catch {}
        }
      }

      // Step 3: Write results to bundled JSON files
      setStatusMsg('Saving to files...')
      const writeRes = await fetch('/api/admin/demo-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations: recs, libraryShows: allShows }),
      })
      if (!writeRes.ok) {
        const err = await writeRes.json()
        throw new Error(err.error ?? 'Failed to write files')
      }

      setRecsCount(recs.length)
      setLibCount(allShows.length)
      setStatusMsg(`Done ✓ — ${recs.length} recommendations, ${allShows.length} library shows written to lib/test-data/. Commit the updated files to bundle them with the app.`)
    } catch (err) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const handleClear = async () => {
    setBusy(true)
    try {
      await fetch('/api/admin/demo-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations: [], libraryShows: [] }),
      })
      try { localStorage.removeItem(TEST_SHOWS_KEY) } catch {}
      setRecsCount(null)
      setLibCount(null)
      setShowsList(SAMPLE_SHOWS_LIST)
      setStatusMsg('Cache cleared — commit the updated files to apply.')
    } catch (err) {
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
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
              ? <span className="text-emerald-600">{recsCount} shows bundled</span>
              : <span className="text-amber-600">Not generated yet</span>}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Library shows: </span>
            {libCount !== null
              ? <span className="text-emerald-600">{libCount} shows bundled</span>
              : <span className="text-amber-600">Not generated yet</span>}
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            Generated data is stored in <code className="font-mono">lib/test-data/demo-*.json</code>. Commit those files after regenerating to bundle them with the app.
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
