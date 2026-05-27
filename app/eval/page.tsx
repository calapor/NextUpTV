'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { EvalPanel } from '@/components/admin/eval-panel'

export default function EvalPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back to app"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold">Eval</h1>
      </div>
      <EvalPanel />
    </div>
  )
}
