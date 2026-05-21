export interface PartialRecommendation {
  title: string
  id?: number
  one_sentence_synopsis?: string
  release_year?: number
  episode_runtime_minutes?: number
  content_rating?: string
  genres?: string[]
  tvdb_poster_thumbnail_url?: string
  tvdb_show_url?: string
  streaming_platforms?: string[]
  average_user_rating?: number
}

export interface Recommendation {
  // TV Show fields (TVDB-sourced when available, Claude fallback otherwise)
  id?: number
  title: string
  one_sentence_synopsis?: string
  release_year: number
  episode_runtime_minutes: number
  content_rating?: string
  genres: string[]
  tvdb_poster_thumbnail_url?: string
  tvdb_show_url?: string
  streaming_platforms?: string[]
  average_user_rating?: number
  imdb_rating: number

  // AI Recommendation Attributes (Claude-generated, 0-10)
  comedy_score: number
  horror_score: number
  action_score: number
  drama_score: number
  suspense_score: number
  romance_score: number

  // Recommendation Metadata (Claude-generated)
  recommendation_score?: number
  matched_keywords?: string[]
  reason: string
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
}

export interface RecommendationsRequest {
  fileContent: string
  keywords: string
  count: number
}

export interface PendingRequest {
  fileContent: string
  keywords: string
  fileName?: string
  isTest?: boolean
}

export interface CachedFavouritesInput {
  fileContent: string
  fileName: string
  keywords: string
}

export interface CastMember {
  actor: string
  character: string
  image?: string
}

export interface ShowDetails {
  status: string
  season_count: number
  cast: CastMember[]
  full_overview: string
}

export interface LibraryShow {
  id: number
  title: string
  poster?: string
  tvdb_url?: string
  status: string
  season_count: number
  last_aired?: string
  last_episode?: { season: number; number: number }
  next_aired?: string
  next_episode?: { season: number; number: number }
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
