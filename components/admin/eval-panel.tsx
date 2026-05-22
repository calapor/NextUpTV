'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, Upload, ExternalLink, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import type { EvalRunResult } from '@/lib/types'
import { RECOMMENDATIONS_SYSTEM_PROMPT } from '@/lib/prompts'
import { EVAL_PRESETS } from '@/lib/eval-data'

const GRADE_COLORS: Record<'A' | 'B' | 'C' | 'D' | 'F', string> = {
  A: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  B: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  C: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  D: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  F: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

const GRADE_TEXT_SIZES: Record<'A' | 'B' | 'C' | 'D' | 'F', string> = {
  A: 'text-6xl',
  B: 'text-6xl',
  C: 'text-6xl',
  D: 'text-6xl',
  F: 'text-6xl',
}

export function EvalPanel() {
  const [systemPrompt, setSystemPrompt] = useState(RECOMMENDATIONS_SYSTEM_PROMPT)
  const [showsList, setShowsList] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [evalResult, setEvalResult] = useState<EvalRunResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('eval_shows_list')
    if (stored) setShowsList(stored)
  }, [])

  const saveShowsList = (list: string) => {
    setShowsList(list)
    localStorage.setItem('eval_shows_list', list)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      saveShowsList(text)
      setErrorMessage(null)
    } catch {
      setErrorMessage('Failed to read file')
    }
  }

  const handlePreset = (value: string) => {
    saveShowsList(value)
    setErrorMessage(null)
  }

  const handleChangeList = () => {
    setShowsList(null)
    localStorage.removeItem('eval_shows_list')
    setEvalResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRunEval = async () => {
    if (!systemPrompt.trim() || !showsList?.trim()) {
      setErrorMessage('Both system prompt and shows list are required')
      return
    }
    setStatus('loading')
    setErrorMessage(null)
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, showsList, count: 8 }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `API error ${res.status}`)
      }
      const data: EvalRunResult = await res.json()
      setEvalResult(data)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const showCount = showsList ? showsList.split('\n').filter((s) => s.trim()).length : 0

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
      {/* Left Panel — Prompt Editor */}
      <div className="flex-1 lg:max-w-md space-y-6">
        <div className="space-y-2">
          <label htmlFor="system-prompt" className="text-sm font-semibold">System Prompt</label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="font-mono text-xs min-h-64 resize-none"
            placeholder="Enter the system prompt..."
          />
          <p className="text-xs text-muted-foreground">{systemPrompt.length} characters</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Test Shows</label>
          {showsList ? (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                  {showsList.split('\n').filter((s) => s.trim()).map((show, i) => (
                    <div key={i} className="text-muted-foreground">• {show}</div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Testing against {showCount} shows</p>
                <Button size="sm" variant="ghost" onClick={handleChangeList}>Change List</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 cursor-pointer hover:border-muted-foreground/50 transition text-center"
              >
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Upload shows list</p>
                <p className="text-xs text-muted-foreground">(.txt or .csv)</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or choose a preset:</p>
                <div className="flex flex-wrap gap-2">
                  {EVAL_PRESETS.map((preset) => (
                    <Button key={preset.label} variant="outline" size="sm" onClick={() => handlePreset(preset.value)} className="text-xs">
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button onClick={handleRunEval} disabled={!showsList?.trim() || status === 'loading'} className="w-full">
            {status === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status === 'loading' ? 'Running Evaluation...' : 'Run Evaluation'}
          </Button>
          <div className="flex gap-2">
            {evalResult?.reportUrl && (
              <a href={evalResult.reportUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  View Report
                </Button>
              </a>
            )}
            <a href="/eval-reports/index.html" target="_blank" rel="noopener noreferrer" className={evalResult?.reportUrl ? '' : 'flex-1'}>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <History className="w-3 h-3 mr-1.5" />
                All Reports
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel — Results */}
      <div className="flex-1 space-y-6">
        {status === 'loading' ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : evalResult ? (
          <>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Overall Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end gap-4">
                  <div className={`${GRADE_COLORS[evalResult.grade]} ${GRADE_TEXT_SIZES[evalResult.grade]} font-bold rounded-lg px-4 py-2`}>
                    {evalResult.grade}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{evalResult.overallScore}</p>
                    <p className="text-xs text-muted-foreground">/ 10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Criteria Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Relevance', data: evalResult.criteria.relevance },
                  { name: 'Reasoning Quality', data: evalResult.criteria.reasoningQuality },
                  { name: 'Diversity', data: evalResult.criteria.diversity },
                  { name: 'Metadata Accuracy', data: evalResult.criteria.metadataAccuracy },
                  { name: 'No Overlap', data: evalResult.criteria.noOverlap },
                ].map((criterion) => (
                  <div key={criterion.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{criterion.name}</p>
                      <p className="text-sm font-semibold">{criterion.data.score}/10</p>
                    </div>
                    <Progress value={criterion.data.score * 10} className="h-2" />
                    <p className="text-xs text-muted-foreground italic">{criterion.data.rationale}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overall Critique</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{evalResult.rawCritique}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recommendations Generated ({evalResult.recommendations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {evalResult.recommendations.map((rec, i) => (
                    <AccordionItem key={i} value={`rec-${i}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-start gap-3 text-left flex-1">
                          <div>
                            <p className="font-medium text-sm">{rec.title} ({rec.release_year})</p>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {rec.genres.slice(0, 2).map((g) => (
                                <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                              ))}
                              {rec.genres.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{rec.genres.length - 2}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">Reason:</span> {rec.reason}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="font-semibold text-muted-foreground">IMDb Rating</p>
                              <p className="font-mono">{rec.imdb_rating}/10</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">Runtime</p>
                              <p className="font-mono">{rec.episode_runtime_minutes} min</p>
                            </div>
                            <div>
                              <p className="font-semibold text-muted-foreground">Genres</p>
                              <p className="font-mono">{rec.genres.join(', ')}</p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="h-64 flex items-center justify-center">
            <CardContent className="text-center">
              <p className="text-muted-foreground">Run an evaluation to see results</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
