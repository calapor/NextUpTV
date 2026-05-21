'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ShowDetailSheet } from '@/components/show-detail-sheet'
import type { LibraryShow, PartialRecommendation } from '@/lib/types'

type Page = 'recommendations' | 'favourites' | 'library'

interface LibraryPageProps {
  shows: LibraryShow[]
  loading: boolean
  hasLibrary: boolean
  onNavigate: (page: Page) => void
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtEp(ep: { season: number; number: number }): string {
  return `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function DaysPill({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  if (days === 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
        Today
      </span>
    )
  if (days < 0)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        {Math.abs(days)}d ago
      </span>
    )
  if (days <= 6)
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500">
        {days} {days === 1 ? 'day' : 'days'}
      </span>
    )
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      {days} days
    </span>
  )
}

function ShowRow({
  show,
  onClick,
  showNextCols,
}: {
  show: LibraryShow
  onClick: () => void
  showNextCols: boolean
}) {
  return (
    <tr
      className="border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="py-2 pl-4 pr-3 w-12">
        {show.poster ? (
          <img
            src={show.poster}
            alt={show.title}
            className="w-9 h-14 object-cover rounded shrink-0"
          />
        ) : (
          <div className="w-9 h-14 rounded bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white/80">
              {show.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </td>
      <td className="py-2 px-3">
        <span className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {show.title}
        </span>
      </td>
      <td className="py-2 px-3 hidden sm:table-cell">
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {show.last_aired ? fmtDate(show.last_aired) : '—'}
        </div>
      </td>
      <td className="py-2 px-3 hidden sm:table-cell">
        <div className="text-xs text-muted-foreground">
          {show.last_episode ? fmtEp(show.last_episode) : '—'}
        </div>
      </td>
      {showNextCols && (
        <>
          <td className="py-2 px-3">
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {show.next_aired ? fmtDate(show.next_aired) : 'TBA'}
            </div>
            {show.next_episode && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {fmtEp(show.next_episode)}
              </div>
            )}
          </td>
          <td className="py-2 px-3 pr-4">
            {show.next_aired ? (
              <DaysPill dateStr={show.next_aired} />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </td>
        </>
      )}
      {!showNextCols && <td className="pr-4" />}
    </tr>
  )
}

function TableHeader({ showNextCols }: { showNextCols: boolean }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        <th className="py-2 pl-4 pr-3 text-left text-xs font-medium text-muted-foreground w-12">
          Thumb
        </th>
        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">Name</th>
        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
          Last Aired
        </th>
        <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">
          Last Ep
        </th>
        {showNextCols && (
          <>
            <th className="py-2 px-3 text-left text-xs font-medium text-muted-foreground">
              Next Aired
            </th>
            <th className="py-2 px-3 pr-4 text-left text-xs font-medium text-muted-foreground">
              Days Until
            </th>
          </>
        )}
      </tr>
    </thead>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2 border-b border-border last:border-0">
          <Skeleton className="w-9 h-14 rounded shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
        </div>
      ))}
    </div>
  )
}

function ShowTable({
  shows,
  showNextCols,
  onRowClick,
  emptyMessage,
}: {
  shows: LibraryShow[]
  showNextCols: boolean
  onRowClick: (show: LibraryShow) => void
  emptyMessage: string
}) {
  if (shows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <TableHeader showNextCols={showNextCols} />
        <tbody>
          {shows.map((show) => (
            <ShowRow
              key={show.id}
              show={show}
              showNextCols={showNextCols}
              onClick={() => onRowClick(show)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LibraryPage({ shows, loading, hasLibrary, onNavigate }: LibraryPageProps) {
  const [selectedShow, setSelectedShow] = useState<PartialRecommendation | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (show: LibraryShow) => {
    setSelectedShow({
      id: show.id,
      title: show.title,
      tvdb_poster_thumbnail_url: show.poster,
      tvdb_show_url: show.tvdb_url,
    })
    setSheetOpen(true)
  }

  if (!hasLibrary) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">No library uploaded</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upload your TV favourite TV shows  in the Manage Favourites tab to see their current status and when you can watch them next.
        </p>
        <button
          onClick={() => onNavigate('favourites')}
          className="text-sm text-primary hover:underline"
        >
          Go to Manage Favourites →
        </button>
      </div>
    )
  }

  const upcoming = shows
    .filter((s) => s.status !== 'Ended' || !!s.next_aired)
    .sort((a, b) => {
      if (a.next_aired && b.next_aired)
        return new Date(a.next_aired).getTime() - new Date(b.next_aired).getTime()
      if (a.next_aired) return -1
      if (b.next_aired) return 1
      return a.title.localeCompare(b.title)
    })

  const ended = shows
    .filter((s) => s.status === 'Ended' && !s.next_aired)
    .sort((a, b) => {
      if (a.last_aired && b.last_aired)
        return new Date(b.last_aired).getTime() - new Date(a.last_aired).getTime()
      if (a.last_aired) return -1
      if (b.last_aired) return 1
      return a.title.localeCompare(b.title)
    })

  const hasShows = shows.length > 0

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-xl font-bold text-foreground mb-4">My Shows</h1>

          <Tabs defaultValue="upcoming">
            <TabsList className="mb-4">
              <TabsTrigger value="upcoming">
                Upcoming
                {upcoming.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({upcoming.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ended">
                Ended
                {ended.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({ended.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            {!hasShows && loading ? (
              <TableSkeleton />
            ) : (
              <>
                <TabsContent value="upcoming" className="mt-0">
                  <ShowTable
                    shows={upcoming}
                    showNextCols={true}
                    onRowClick={handleRowClick}
                    emptyMessage={loading ? 'Loading shows…' : 'No upcoming shows found.'}
                  />
                  {loading && hasShows && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Loading more shows…
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="ended" className="mt-0">
                  <ShowTable
                    shows={ended}
                    showNextCols={false}
                    onRowClick={handleRowClick}
                    emptyMessage={loading ? 'Loading shows…' : 'No ended shows found.'}
                  />
                  {loading && hasShows && ended.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Loading more shows…
                    </p>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>

      <ShowDetailSheet
        recommendation={selectedShow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
