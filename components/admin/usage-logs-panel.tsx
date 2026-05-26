'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { UsageLogEntry, RecommendationsParams, LibraryStatusParams, ShowDetailsParams } from '@/lib/types'

const ROUTE_COLORS: Record<string, string> = {
  recommendations: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'library-status': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'show-details': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function countryFlag(code: string): string {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
}

function formatCost(usd: number | undefined): string {
  if (usd == null) return '—'
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  return `$${usd.toFixed(4)}`
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatParams(entry: UsageLogEntry): string {
  const p = entry.params
  if (entry.route === 'recommendations') {
    const rp = p as RecommendationsParams
    const parts = []
    if (rp.fileContentChars > 0) parts.push(`file: ${rp.fileContentChars.toLocaleString()} chars`)
    if (rp.keywordsChars > 0) parts.push(`keywords: ${rp.keywordsChars} chars`)
    parts.push(`count: ${rp.count}`)
    if (rp.isTest) parts.push('test mode')
    return parts.join(' · ')
  }
  if (entry.route === 'library-status') {
    const lp = p as LibraryStatusParams
    return `${lp.titleCount} titles · file: ${lp.fileContentChars.toLocaleString()} chars`
  }
  if (entry.route === 'show-details') {
    return `tvdbId: ${(p as ShowDetailsParams).tvdbId}`
  }
  return ''
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function UsageLogsPanel() {
  const [entries, setEntries] = useState<UsageLogEntry[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [date, setDate] = useState(todayDate())
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const load = useCallback(async (selectedDate: string) => {
    setStatus('loading')
    setExpandedIdx(null)
    try {
      const res = await fetch(`/api/usage-logs?date=${selectedDate}&limit=500`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setEntries(data.entries ?? [])
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => { load(date) }, [date, load])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Usage Logs</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="font-sans text-sm border border-border rounded-md px-3 py-1.5 bg-background"
        />
        <Button variant="outline" size="sm" onClick={() => load(date)}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
        {status === 'idle' && (
          <span className="text-sm text-muted-foreground ml-auto">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {status === 'loading' ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : status === 'error' ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Failed to load logs.</CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">No entries for {date}.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              Showing {entries.length} entries, newest first
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Route</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Duration</th>
                  <th className="text-left px-4 py-2 font-medium">Location</th>
                  <th className="text-left px-4 py-2 font-medium">Cost</th>
                  <th className="text-left px-4 py-2 font-medium">Params</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <Fragment key={i}>
                    <tr
                      key={i}
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{formatTime(entry.ts)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROUTE_COLORS[entry.route] ?? ''}`}>
                          {entry.route}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={entry.status === 'success'
                            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'border-red-500/30 text-red-600 dark:text-red-400'}
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">{formatDuration(entry.durationMs)}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {entry.geo?.countryCode ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="cursor-default"
                              title={[entry.geo.city, entry.geo.region, entry.geo.country]
                                .filter(Boolean)
                                .join(', ') + `\nIP: ${entry.ip}`}
                            >
                              {countryFlag(entry.geo.countryCode)}
                            </span>
                            <span>{entry.geo.city ?? entry.geo.country ?? entry.geo.countryCode}</span>
                          </span>
                        ) : (
                          <span className="font-sans" title={entry.ip}>{entry.ip}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground"
                        title={entry.inputTokens != null ? `${entry.inputTokens.toLocaleString()} in · ${entry.outputTokens?.toLocaleString()} out` : undefined}>
                        {formatCost(entry.costUsd)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatParams(entry)}</td>
                    </tr>
                    {expandedIdx === i && (
                      <tr key={`${i}-detail`} className="border-b border-border/50 bg-muted/30">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="space-y-3">
                            {(entry.inputText || entry.outputText) && (
                              <div className="grid grid-cols-2 gap-3">
                                {entry.inputText && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                                    <pre className="text-xs font-sans bg-background border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap">{entry.inputText}</pre>
                                  </div>
                                )}
                                {entry.outputText && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
                                    <pre className="text-xs font-sans bg-background border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap">{entry.outputText}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Full entry</p>
                              <pre className="text-xs font-sans bg-background border border-border rounded p-3 overflow-x-auto">
                                {JSON.stringify(entry, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
