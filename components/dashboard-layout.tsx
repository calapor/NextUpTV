'use client'

import { useState } from 'react'
import { RecommendationCardGrid } from '@/components/recommendation-card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Filter } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Recommendation } from '@/lib/types'

interface DashboardLayoutProps {
  recommendations: Recommendation[]
}

export function DashboardLayout({ recommendations }: DashboardLayoutProps) {
  const isMobile = useIsMobile()
  const [year, setYear] = useState(2020)
  const [rating, setRating] = useState(7)

  const filterContent = (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-4 block">Year Range</Label>
        <Slider
          value={[year]}
          onValueChange={(val) => setYear(val[0])}
          min={2000}
          max={2024}
          step={1}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground mt-2">{year}+</p>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold mb-4 block">Minimum Rating</Label>
        <Slider
          value={[rating]}
          onValueChange={(val) => setRating(val[0])}
          min={0}
          max={10}
          step={0.5}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground mt-2">{rating.toFixed(1)}+</p>
      </div>

      <Separator />

      <div className="space-y-3">
        <Button variant="outline" className="w-full">
          Reset Filters
        </Button>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Apply
        </Button>
      </div>
    </div>
  )

  return (
    <div className="mt-16 h-[calc(100vh-64px)] flex overflow-hidden flex-col lg:flex-row">
      {/* Desktop Filter Panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-[30%] border-r border-border bg-card/50 p-6 overflow-y-auto flex-col">
        <h2 className="text-lg font-semibold text-foreground mb-6">Filters</h2>
        {filterContent}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Title and Mobile Filter Button */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-6 border-b border-border">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Your Recommendations</h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">Last updated today</p>
          </div>
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-foreground mb-6">Filters</h2>
                  {filterContent}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Recommendations Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <RecommendationCardGrid recommendations={recommendations} />
        </div>
      </div>
    </div>
  )
}
