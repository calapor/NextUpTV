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

export interface PendingRequest {
  fileContent: string
  keywords: string
}
