'use client'

import { Play, Tv2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

type Page = 'recommendations' | 'favourites' | 'library'

interface TopNavigationProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

export function TopNavigation({ currentPage, onPageChange }: TopNavigationProps) {
  const tabs = [
    { name: 'Recommendations', shortName: 'For You', icon: Play, id: 'recommendations' as const },
    { name: 'My Shows', shortName: 'My Shows', icon: CalendarDays, id: 'library' as const },
    { name: 'Manage Favourites', shortName: 'Favourites', icon: Tv2, id: 'favourites' as const },
  ]

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center h-16 px-3 sm:px-6">
          {/* Logo */}
          <img
            src="nextuptv-logo-v3.png"
            alt="NextUpTV logo"
            className="h-7 sm:h-10 w-auto"
          />

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden sm:flex gap-1 ml-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPageChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors rounded-md cursor-pointer whitespace-nowrap',
                  currentPage === tab.id
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>

          <a
            href="/admin"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </a>
        </div>
      </header>

      {/* Mobile bottom tab bar — hidden on sm+ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border sm:hidden">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPageChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors cursor-pointer',
                currentPage === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon
                className={cn(
                  'w-5 h-5',
                  currentPage === tab.id ? 'text-foreground' : 'text-muted-foreground'
                )}
                aria-hidden
              />
              {tab.shortName}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
