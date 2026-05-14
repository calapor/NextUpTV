'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { Recommendation } from '@/lib/types'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['.txt', '.csv']
const MAX_KEYWORDS_LENGTH = 1000

type FormState = 'idle' | 'loading' | 'error' | 'success'

interface UploadState {
  file: File | null
  error: string | null
  isUploading: boolean
}

interface FavouritesPageProps {
  onNavigate?: (page: 'recommendations' | 'favourites') => void
  onRecommendationsReady?: (recs: Recommendation[]) => void
}

export function FavouritesPage({ onNavigate, onRecommendationsReady }: FavouritesPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // File upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    error: null,
    isUploading: false,
  })

  // Keywords state
  const [keywords, setKeywords] = useState('')
  const keywordsLength = keywords.length

  // Form state
  const [formState, setFormState] = useState<FormState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return `Invalid format. Please upload a .txt or .csv file`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 5MB`
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    const error = validateFile(selectedFile)
    
    if (error) {
      setUploadState({ file: null, error, isUploading: false })
    } else {
      setUploadState({ file: selectedFile, error: null, isUploading: false })
      setSubmitError(null)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Remove file
  const handleRemoveFile = () => {
    setUploadState({ file: null, error: null, isUploading: false })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle keywords change
  const handleKeywordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_KEYWORDS_LENGTH) {
      setKeywords(value)
    }
  }

  // Check if form is valid
  const isFormValid = uploadState.file !== null || keywords.trim().length > 0
  const isOverCharLimit = keywordsLength === MAX_KEYWORDS_LENGTH

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid) return

    setFormState('loading')
    setSubmitError(null)

    try {
      let fileContent = ''
      if (uploadState.file) {
        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(uploadState.file!)
        })
      }

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent, keywords, count: 10 }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const data = await res.json()
      onRecommendationsReady?.(data.recommendations)
      setFormState('success')

      setTimeout(() => onNavigate?.('recommendations'), 500)
    } catch (error) {
      setFormState('error')
      setSubmitError('Failed to generate recommendations. Please try again.')
      console.error('[v0] Submission error:', error)
    }
  }

  // Reset form after success
  const handleReset = () => {
    setUploadState({ file: null, error: null, isUploading: false })
    setKeywords('')
    setFormState('idle')
    setSubmitError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="h-full w-full bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Manage Your Favourites</h1>
          <p className="text-muted-foreground leading-relaxed">
            Upload a file of your favourite shows (CSV or TXT), add keywords and genres, then hit Update Preferences to get personalized recommendations based on your taste.
          </p>
        </div>

        {/* Error Alert */}
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Main Form Card */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Two Column Layout - Desktop, Stacked Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: File Upload Section */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Upload Favourites File</Label>
                
                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !uploadState.file && !uploadState.isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                    uploadState.file
                      ? 'border-green-500/50 bg-green-500/5'
                      : uploadState.error
                      ? 'border-red-500/50 bg-red-500/5'
                      : 'border-border hover:border-muted-foreground/50 hover:bg-card/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileInputChange}
                    disabled={uploadState.isUploading}
                    className="hidden"
                    aria-label="Upload favourites file"
                  />

                  {uploadState.isUploading ? (
                    // Uploading state
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                      <p className="text-foreground font-medium">Uploading...</p>
                    </div>
                  ) : uploadState.file ? (
                    // File selected state
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                      <p className="text-foreground font-medium truncate max-w-xs mb-1">
                        {uploadState.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {(uploadState.file.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile()
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : uploadState.error ? (
                    // Error state
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                      <p className="text-foreground font-medium mb-1">Upload failed</p>
                      <p className="text-sm text-red-600">{uploadState.error}</p>
                    </div>
                  ) : (
                    // Default state
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-foreground font-medium mb-1">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">.txt or .csv • Max 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Keywords Section */}
              <div>
                <Label htmlFor="keywords" className="text-base font-semibold mb-3 block">
                  Keywords, Shows, Genres
                </Label>
                
                <Textarea
                  id="keywords"
                  value={keywords}
                  onChange={handleKeywordsChange}
                  disabled={formState === 'loading'}
                  placeholder="e.g. Breaking Bad, sci-fi, psychological thrillers"
                  className={`min-h-48 resize-none transition-colors ${
                    isOverCharLimit ? 'border-red-500' : ''
                  }`}
                />
                
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Add keywords to help refine recommendations
                  </p>
                  <p className={`text-xs font-medium ${
                    isOverCharLimit ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {keywordsLength}/{MAX_KEYWORDS_LENGTH}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={!isFormValid || formState === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Update Preferences & Get Recommendations'
              )}
            </Button>

            {/* Form hints */}
            {!isFormValid && (
              <p className="text-sm text-muted-foreground text-center">
                Please upload a file or add keywords to continue
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
