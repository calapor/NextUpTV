# Manage Favourites Page Implementation

## Overview
The Manage Favourites page allows users to upload text/CSV files and add keyword preferences to generate personalized TV recommendations. It includes comprehensive validation, error handling, and responsive design.

## Component Structure

### State Management
- **uploadState**: Tracks file selection, validation errors, and upload progress
- **keywords**: Stores textarea input with 1000 character limit
- **formState**: Tracks submission states (idle, loading, error, success)
- **submitError**: Displays form-level validation errors

### File Upload Features
- **Drag & Drop**: Users can drag files directly onto the upload zone
- **Click to Browse**: Native file selector opens on click
- **File Validation**:
  - Accepts: `.txt` and `.csv` only
  - Maximum size: 5MB
  - Shows inline errors for invalid files
- **Visual Feedback**:
  - Default state: Upload prompt
  - Success state: Green checkmark with filename and size
  - Error state: Red alert with error message
  - Loading state: Spinner with "Uploading..." label

### Keywords Textarea
- Real-time character counter (1000 max)
- Prevents exceeding character limit
- Red border when at limit
- Auto-disabled during form submission

### Form Validation
- Button disabled if both file and keywords are empty
- Shows helpful hint text when form is invalid
- Both inputs disabled during submission

### Responsive Layout
- **Desktop (lg+)**: Two-column layout (file upload left, keywords right)
- **Mobile**: Single column, stacked vertically
- Maintains proper spacing and readability on all screen sizes

## File Processing (Production)

### Current Implementation (Placeholder)
```typescript
// Simulates 2-second processing delay
await new Promise(resolve => setTimeout(resolve, 2000))
```

### Production Implementation Needed
1. Read file content using FileReader API or FormData
2. Send to `/api/recommendations` endpoint with:
   - File content or keywords
   - Support streaming response from AI
3. Parse and store recommendations in client state
4. Navigate to recommendations tab

## UI States

### File Upload States
| State | Visual | Behavior |
|-------|--------|----------|
| Default | Upload icon, prompt text | Click or drag to upload |
| Selected | Green checkmark, filename | Can remove or submit |
| Error | Red alert, error message | Can try again |
| Loading | Spinner | Button disabled |

### Keywords States
| State | Visual | Behavior |
|-------|--------|----------|
| Empty | Placeholder visible | Normal input |
| Active | Text input | Real-time validation |
| Over limit | Red border, red counter | Text won't be added |

### Form Button States
| State | Style | Behavior |
|-------|-------|----------|
| Disabled | Muted, not clickable | When no file and no keywords |
| Active | Blue primary | Submit form |
| Loading | Spinner, disabled | Shows "Generating..." |

## Accessibility
- Form labels properly associated with inputs
- File input hidden but functional (hidden attr)
- Aria labels for screen readers on file input
- Semantic HTML throughout
- Error messages clearly communicated

## Future Enhancements
1. **File Preview**: Show CSV headers or file content preview
2. **Validation Indicators**: Real-time feedback as user types
3. **Export**: Allow users to export recommendations as CSV
4. **History**: Save previous recommendation sets
5. **Streaming UI**: Show recommendations as they arrive from AI API

## Component Integration
- Uses existing shadcn/ui components (Card, Button, Label, Textarea, Alert)
- Integrates with app routing (`useRouter` for navigation)
- Follows design system (dark mode, blue accent, cinematic styling)
- Mobile-responsive using Tailwind breakpoints
