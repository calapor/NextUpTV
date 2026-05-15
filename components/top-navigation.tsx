'use client'

import { Play } from 'lucide-react'
import { Tv2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Page = 'recommendations' | 'favourites'

interface TopNavigationProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

export function TopNavigation({ currentPage, onPageChange }: TopNavigationProps) {
  const tabs = [
    { name: 'Recommendations', id: 'recommendations' as const },
    { name: 'Manage Favourites', id: 'favourites' as const },
  ]
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <img
  src="nextuptv-logo-v3.png"
  alt="NextUpTV logo"
  className="h-30 w-auto"
/>
        
        {/* Navigation Tabs */}
        <nav className="flex gap-1 ml-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onPageChange(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors rounded-md cursor-pointer',
                currentPage === tab.id
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
              style={{ pointerEvents: 'auto' }}
            >
              {tab.name}
            </button>
          ))}
        </nav>
        
        {/* Right spacer */}
        <div className="w-10 flex-shrink-0" />
      </div>
    </header>
  )
}
