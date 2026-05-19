'use client'

import { RecommendationCardGrid } from '@/components/recommendation-card'
import { MOCK_RECOMMENDATIONS } from '@/lib/mock-data'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Streaming Platform Icons Test</h1>
        <RecommendationCardGrid recommendations={MOCK_RECOMMENDATIONS} />
      </div>
    </div>
  )
}
