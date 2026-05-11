# Manage Favourites Tab

## Purpose
Allow users to upload a file of their favourites and/or enter 
keywords, TV show names, and genres to generate a personalised 
list of recommendations.

## Stack assumptions
Inherits from parent app. AI via /api/recommendations using 
Anthropic streaming. File parsing server-side.

---

## Layout

### Top section
- Heading: "Manage Your Favourites"
- Subtext: 2–3 sentence explanation of what to do — upload a 
  file (CSV or text), add keywords, then hit Update Preferences 
  to get personalised recommendations.

### Bottom section — two-column on desktop, stacked on mobile

#### Left: Upload
- Upload button labelled "Upload Favourites File"
- Accepts: .csv, .txt only. Max 5MB.
- On click: opens native file selector
- **States**:
  - Default: button with upload icon, no file selected
  - File selected: show filename + size, show remove (×) icon
  - Uploading: spinner, button disabled, "Uploading..." label
  - Upload error: red inline error below button 
    ("File too large" / "Invalid format"), button resets
  - Upload success: green checkmark, filename persists

#### Right: Keywords text area
- Label: "Keywords, Shows, Genres"
- Placeholder: "e.g. Breaking Bad, sci-fi, psychological thrillers"
- No character limit shown, but max 1000 characters enforced
- **States**:
  - Default: empty, placeholder visible
  - Active: normal text input
  - Over limit: red border, character counter shows "980/1000"

---

## Update Preferences button

- Full width, primary style
- Label: "Update Preferences & Get Recommendations"
- Disabled if: no file uploaded AND text area is empty
- **States**:
  - Disabled: muted, not clickable
  - Active: primary colour, clickable
  - Loading: spinner, label changes to "Generating...", 
    button disabled, neither input editable during processing
  - Error: button resets, error banner appears above results area

---

## Recommendations output

Appears on the Recommendations tab after successful generation. 
Does not replace the form — user can re-submit.

- after successful generation, the application navigates to the recommendations tab.

- Section heading: "Your Recommendations"
- Renders as a card grid (2 cols desktop, 1 col mobile)
- Each card: Title, Genre tags, 1-line reason why recommended
- Save recommendations between sessions
- **States**:
  - Hidden: before first submission
  - Loading: 3 skeleton cards, animated pulse
  - Populated: card grid
  - Empty: "We couldn't find recommendations — try adding 
    more keywords" with a retry prompt
  - Error: inline error banner, retry button

---

## AI system prompt (hardcode into /api/recommendations)

You are a personalised entertainment recommendation engine.

The user will provide a list of favourites — TV shows, films, 
genres, or keywords — either as uploaded file content or as 
free text. Your job is to return a curated list of 
recommendations based on those preferences.

Rules:
- Return exactly 6 recommendations
- Never recommend something the user has already listed 
  as a favourite
- Always explain in one sentence why each item is recommended 
  based on their specific inputs
- If input is too vague to generate confident recommendations, 
  return your best attempt and flag uncertainty in the reason field

Respond ONLY in this JSON format:
{
  "recommendations": [
    {
      "title": "Show or film name",
      "genres": ["genre1", "genre2"],
      "reason": "One sentence explanation tied to their input"
    }
  ]
}

---

## Validation rules
- At least one of: file OR text area must have content to enable button
- File must be .csv or .txt, under 5MB
- Text area max 1000 characters
- If file is uploaded but unreadable: show error, do not submit

## What NOT to build
- Do not build a favourites database or persistence layer
- Do not add social sharing or export features
- Do not add pagination to the recommendations grid