'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Upload, X, CheckCircle, AlertCircle, Trash2, Info } from 'lucide-react'
import type { PendingRequest, CachedFavouritesInput } from '@/lib/types'
import { getTestShowsDisplay } from '@/lib/test-data/sample-shows'
import demoRecsData from '@/lib/test-data/demo-recommendations.json'

const MAX_FILE_SIZE = 64 * 1024 // 64KB
const ALLOWED_FILE_TYPES = ['.txt', '.csv']
const MAX_KEYWORDS_LENGTH = 1000
const MAX_FILE_CHARS = 12_000

interface UploadState {
  file: File | null
  error: string | null
  isUploading: boolean
}

interface FavouritesPageProps {
  onNavigate?: (page: 'recommendations' | 'favourites' | 'library') => void
  onSubmit?: (req: PendingRequest) => void
  cachedInput?: CachedFavouritesInput | null
  onClearAll?: () => void
}

export function FavouritesPage({ onNavigate, onSubmit, cachedInput, onClearAll }: FavouritesPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // File upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    error: null,
    isUploading: false,
  })

  const [cachedFile, setCachedFile] = useState<{ fileName: string; fileContent: string } | null>(
    cachedInput?.fileContent ? { fileName: cachedInput.fileName, fileContent: cachedInput.fileContent } : null
  )

  // Keywords state
  const [keywords, setKeywords] = useState(cachedInput?.keywords ?? '')
  const keywordsLength = keywords.length

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fileTruncated, setFileTruncated] = useState(false)
  const [sampleShowsDisplay, setSampleShowsDisplay] = useState<string[]>([])

  const isDemoReady = (demoRecsData as unknown[]).length > 0

  useEffect(() => {
    setSampleShowsDisplay(getTestShowsDisplay())
  }, [])

  // File validation
  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return `Invalid format. Please upload a .txt or .csv file`
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 64KB`
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
      setCachedFile(null)
      setSubmitError(null)
    }
  }

  const handleRemoveCachedFile = () => setCachedFile(null)

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
  const isFormValid = uploadState.file !== null || cachedFile !== null || keywords.trim().length > 0
  const isOverCharLimit = keywordsLength === MAX_KEYWORDS_LENGTH

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid) return

    setSubmitError(null)

    try {
      let fileContent = ''
      let fileName = ''
      if (uploadState.file) {
        fileName = uploadState.file.name
        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(uploadState.file!)
        })
      } else if (cachedFile) {
        fileName = cachedFile.fileName
        fileContent = cachedFile.fileContent
      }

      if (fileContent.length > MAX_FILE_CHARS) {
        fileContent = fileContent.slice(0, MAX_FILE_CHARS)
        setFileTruncated(true)
      } else {
        setFileTruncated(false)
      }

      onSubmit?.({ fileContent, keywords, fileName })
    } catch {
      setSubmitError('Failed to read the uploaded file. Please try again.')
    }
  }

  const handleClearAll = () => {
    setUploadState({ file: null, error: null, isUploading: false })
    setCachedFile(null)
    setKeywords('')
    setSubmitError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClearAll?.()
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
                  onClick={() => !uploadState.file && !cachedFile && !uploadState.isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                    uploadState.file || cachedFile
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

                  {uploadState.file ? (
                    // File selected state
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                      <p className="text-foreground font-medium truncate max-w-xs mb-1">
                        {uploadState.file.name}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {(uploadState.file.size / 1024).toFixed(1)} KB
                      </p>
                      {fileTruncated && (
                        <p className="text-xs text-amber-600 mb-2">
                          File trimmed to 12,000 characters to stay within processing limits.
                        </p>
                      )}
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
                  ) : cachedFile ? (
                    // Previously uploaded file from cache
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                      <p className="text-xs text-muted-foreground mb-1">Previously uploaded</p>
                      <p className="text-foreground font-medium truncate max-w-xs mb-3">
                        {cachedFile.fileName || 'favourites file'}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveCachedFile()
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear
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
                  placeholder="e.g. Breaking Bad, Matthew Rhys, sci-fi, psychological thrillers"
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
              disabled={!isFormValid}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:hidden">Update &amp; Get Recommendations</span>
              <span className="hidden sm:inline">Update Preferences &amp; Get Recommendations</span>
            </Button>

            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onSubmit?.({ fileContent: '', keywords: '', isTest: true })}
              >
                {isDemoReady ? 'Test with Sample Data' : 'Demo not set up — visit /admin'}
              </Button>
              {isDemoReady && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="lg" aria-label="See sample shows">
                      <Info className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs text-left" side="top">
                    <p className="font-semibold mb-1 text-xs">Sample favourites list:</p>
                    <ul className="space-y-0.5">
                      {sampleShowsDisplay.map(show => (
                        <li key={show} className="text-xs">{show}</li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Form hints */}
            {!isFormValid && (
              <p className="text-sm text-muted-foreground text-center">
                Please upload a file or add keywords to continue
              </p>
            )}

            <div className="border-t border-border pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear all data &amp; reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your uploaded favourites, keywords, cached recommendations, and library shows. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear all data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
