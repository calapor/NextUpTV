'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { RecommendationCardGrid } from '@/components/recommendation-card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Filter } from 'lucide-react'
import type { Recommendation } from '@/lib/types'

const STORAGE_KEY = 'nextuptv_filter_state'

interface DashboardLayoutProps {
  recommendations: Recommendation[]
}

export function DashboardLayout({ recommendations }: DashboardLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const close = (e: MediaQueryListEvent) => { if (e.matches) setSheetOpen(false) }
    mql.addEventListener('change', close)
    return () => mql.removeEventListener('change', close)
  }, [])

  // Runtime uses a max-threshold: slider at right (Long) = show all, move left = filter out longer shows
  const [runtimeMax, setRuntimeMax]           = useState(0)
  const [ratingMin, setRatingMin]             = useState(0)
  const [comedyMin, setComedyMin]             = useState(0)
  const [horrorMin, setHorrorMin]             = useState(0)
  const [yearMin, setYearMin]                 = useState(0)
  const [listCount, setListCount]             = useState(0)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const initialized = useRef(false)

  const availablePlatforms = useMemo(() => {
    const all = recommendations.flatMap(r => r.streaming_platforms ?? [])
    return [...new Set(all)].sort()
  }, [recommendations])

  const dataRanges = useMemo(() => {
    if (recommendations.length === 0) return null
    const runtimes = recommendations.map(r => r.episode_runtime_minutes).filter(v => v > 0)
    const ratings  = recommendations.map(r => r.imdb_rating).filter(v => v > 0)
    const comedies = recommendations.map(r => r.comedy_score)
    const horrors  = recommendations.map(r => r.horror_score)
    const years    = recommendations.map(r => r.release_year)
    return {
      runtime: { min: Math.min(...runtimes), max: Math.max(...runtimes), hasData: runtimes.length > 0 && Math.min(...runtimes) < Math.max(...runtimes) },
      rating:  { min: Math.min(...ratings),  max: Math.max(...ratings),  hasData: ratings.length > 0 && Math.min(...ratings) < Math.max(...ratings) },
      comedy:  { min: Math.min(...comedies), max: Math.max(...comedies), hasData: Math.min(...comedies) < Math.max(...comedies) },
      horror:  { min: Math.min(...horrors),  max: Math.max(...horrors),  hasData: Math.min(...horrors) < Math.max(...horrors) },
      year:    { min: Math.min(...years),    max: Math.max(...years),    hasData: Math.min(...years) < Math.max(...years) },
    }
  }, [recommendations])

  useEffect(() => {
    if (!dataRanges) return

    if (!initialized.current) {
      initialized.current = true
      const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') } catch { return null } })()
      if (saved) {
        setRuntimeMax(Math.max(dataRanges.runtime.min, Math.min(saved.runtimeMax ?? dataRanges.runtime.max, dataRanges.runtime.max)))
        setRatingMin (Math.max(dataRanges.rating.min,  Math.min(saved.ratingMin  ?? dataRanges.rating.min,  dataRanges.rating.max)))
        setComedyMin (Math.max(dataRanges.comedy.min,  Math.min(saved.comedyMin  ?? dataRanges.comedy.min,  dataRanges.comedy.max)))
        setHorrorMin (Math.max(dataRanges.horror.min,  Math.min(saved.horrorMin  ?? dataRanges.horror.min,  dataRanges.horror.max)))
        setYearMin   (Math.max(dataRanges.year.min,    Math.min(saved.yearMin    ?? dataRanges.year.min,    dataRanges.year.max)))
        setListCount (saved.listCount ?? recommendations.length)
        setSelectedPlatforms(saved.selectedPlatforms ?? [])
        return
      }
    }
    setRuntimeMax(dataRanges.runtime.max)
    setRatingMin (dataRanges.rating.min)
    setComedyMin (dataRanges.comedy.min)
    setHorrorMin (dataRanges.horror.min)
    setYearMin   (dataRanges.year.min)
    setListCount (recommendations.length)
  }, [dataRanges])

  useEffect(() => {
    if (!dataRanges) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ runtimeMax, ratingMin, comedyMin, horrorMin, yearMin, listCount, selectedPlatforms }))
    } catch {}
  }, [runtimeMax, ratingMin, comedyMin, horrorMin, yearMin, listCount, selectedPlatforms, dataRanges])

  const filteredRecommendations = useMemo(() => {
    const result = recommendations.filter(r => {
      const platformMatch = selectedPlatforms.length === 0 ||
        selectedPlatforms.some(p => r.streaming_platforms?.includes(p))
      return (
        r.episode_runtime_minutes <= runtimeMax &&
        r.imdb_rating >= ratingMin &&
        r.comedy_score >= comedyMin &&
        r.horror_score >= horrorMin &&
        r.release_year >= yearMin &&
        platformMatch
      )
    })
    return result.slice(0, listCount)
  }, [recommendations, runtimeMax, ratingMin, comedyMin, horrorMin, yearMin, listCount, selectedPlatforms])

  const resetFilters = () => {
    if (!dataRanges) return
    setRuntimeMax(dataRanges.runtime.max)
    setRatingMin (dataRanges.rating.min)
    setComedyMin (dataRanges.comedy.min)
    setHorrorMin (dataRanges.horror.min)
    setYearMin   (dataRanges.year.min)
    setListCount (recommendations.length)
    setSelectedPlatforms([])
  }

  const filterContent = (
    <div className="space-y-6">

      {dataRanges?.runtime.hasData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Runtime</Label>
            <span className="text-sm text-muted-foreground">≤ {runtimeMax} min</span>
          </div>
          <Slider
            value={[runtimeMax]}
            onValueChange={(val) => setRuntimeMax(val[0])}
            min={dataRanges.runtime.min}
            max={dataRanges.runtime.max}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Short</span>
            <span className="text-xs text-muted-foreground">Long</span>
          </div>
        </div>
      )}

      {dataRanges?.runtime.hasData && dataRanges?.rating.hasData && <Separator />}

      {dataRanges?.rating.hasData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Rating</Label>
            <span className="text-sm text-muted-foreground">{ratingMin.toFixed(1)}+</span>
          </div>
          <Slider
            value={[ratingMin]}
            onValueChange={(val) => setRatingMin(val[0])}
            min={dataRanges.rating.min}
            max={dataRanges.rating.max}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{dataRanges.rating.min.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">{dataRanges.rating.max.toFixed(1)}</span>
          </div>
        </div>
      )}

      {dataRanges?.comedy.hasData && <Separator />}

      {dataRanges?.comedy.hasData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Comedy Level</Label>
            <span className="text-sm text-muted-foreground">{comedyMin.toFixed(1)}+</span>
          </div>
          <Slider
            value={[comedyMin]}
            onValueChange={(val) => setComedyMin(val[0])}
            min={dataRanges.comedy.min}
            max={dataRanges.comedy.max}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Not funny</span>
            <span className="text-xs text-muted-foreground">Very funny</span>
          </div>
        </div>
      )}

      {dataRanges?.horror.hasData && <Separator />}

      {dataRanges?.horror.hasData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Horror Level</Label>
            <span className="text-sm text-muted-foreground">{horrorMin.toFixed(1)}+</span>
          </div>
          <Slider
            value={[horrorMin]}
            onValueChange={(val) => setHorrorMin(val[0])}
            min={dataRanges.horror.min}
            max={dataRanges.horror.max}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Not scary</span>
            <span className="text-xs text-muted-foreground">Very scary</span>
          </div>
        </div>
      )}

      {dataRanges?.year.hasData && <Separator />}

      {dataRanges?.year.hasData && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">Age</Label>
            <span className="text-sm text-muted-foreground">{yearMin}+</span>
          </div>
          <Slider
            value={[yearMin]}
            onValueChange={(val) => setYearMin(val[0])}
            min={dataRanges.year.min}
            max={dataRanges.year.max}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{dataRanges.year.min}</span>
            <span className="text-xs text-muted-foreground">{dataRanges.year.max}</span>
          </div>
        </div>
      )}

      {availablePlatforms.length > 0 && <Separator />}

      {availablePlatforms.length > 0 && (
        <div>
          <Label className="text-base font-semibold">Streaming Platforms</Label>
          <div className="flex flex-wrap gap-2 mt-3">
            {availablePlatforms.map(platform => {
              const selected = selectedPlatforms.includes(platform)
              return (
                <button
                  key={platform}
                  onClick={() =>
                    setSelectedPlatforms(prev =>
                      selected ? prev.filter(p => p !== platform) : [...prev, platform]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {platform}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {recommendations.length > 0 && <Separator />}

      {recommendations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold">List</Label>
            <span className="text-sm text-muted-foreground">{listCount}</span>
          </div>
          <Slider
            value={[listCount]}
            onValueChange={(val) => setListCount(val[0])}
            min={1}
            max={recommendations.length}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">1</span>
            <span className="text-xs text-muted-foreground">{recommendations.length}</span>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={resetFilters}>
            Reset Filters
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="h-full flex overflow-hidden flex-col md:flex-row">
      {/* Desktop Filter Panel - Hidden on mobile */}
      <div className="hidden md:flex md:w-[280px] lg:w-[30%] border-r border-border bg-card/50 p-6 overflow-y-auto flex-col">
        <h2 className="text-lg font-semibold text-foreground mb-6">Filters</h2>
        {filterContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Title and Mobile Filter Button */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-6 border-b border-border">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Your Recommendations</h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              {filteredRecommendations.length} of {recommendations.length} shown
            </p>
          </div>
          <div className="md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6">
                  <SheetTitle className="text-lg font-semibold text-foreground mb-6">Filters</SheetTitle>
                  {filterContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <RecommendationCardGrid recommendations={filteredRecommendations} />
        </div>
      </div>
    </div>
  )
}
