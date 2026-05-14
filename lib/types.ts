export interface Recommendation {
  title: string
  genres: string[]
  reason: string
  imdb_rating: number
  release_year: number
  episode_runtime_minutes: number
  comedy_score: number
  horror_score: number
  action_score: number
  drama_score: number
  suspense_score: number
  romance_score: number
  tvdb_thumbnail_url?: string
  tvdb_show_url?: string
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
}

export interface RecommendationsRequest {
  fileContent: string
  keywords: string
  count: number
}

// Eval types
export interface CriterionScore {
  score: number
  rationale: string
}

export interface EvalCriteria {
  relevance: CriterionScore
  reasoningQuality: CriterionScore
  diversity: CriterionScore
  metadataAccuracy: CriterionScore
  noOverlap: CriterionScore
}

export type EvalGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface EvalRunResult {
  recommendations: Recommendation[]
  criteria: EvalCriteria
  overallScore: number
  grade: EvalGrade
  rawCritique: string
  reportUrl: string
}
