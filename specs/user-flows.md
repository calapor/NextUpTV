# User Flow

## First visit (no saved recommendations)

1. User opens the application.
2. Recommendations tab loads with an empty state:
   - Heading: "No recommendations yet"
   - Subtext: "Upload your favourites to get started"
   - CTA: "Go to Manage Favourites" button
3. User navigates to the Manage Favourites tab.
4. User uploads a text-based file (.csv or .txt) containing 
   favourite TV shows, or types keywords directly, or both.
5. User clicks "Update Preferences & Get Recommendations".
6. System validates input (at least one of: file or keywords required).
7. System parses the uploaded file server-side and combines 
   content with any keyword input.
8. Combined input is sent to Claude via /api/recommendations.
9. App automatically navigates to the Recommendations tab.
10. Right panel shows skeleton loading cards during AI processing.
11. AI returns up to 10 recommendations as structured JSON.
12. Recommendations render as cards in the right panel.
13. Left filter panel becomes active and sliders enable.

## Filtering (after recommendations load)

14. User adjusts sliders (Runtime, Rating, Comedy Level, 
    Horror Level, Age, List count).
15. Results filter in real time, client-side — no API call is made.
16. Slider positions and visible results update immediately.
17. If all results are filtered out:
    - Show empty state: "No shows match your current filters"
    - "Reset filters" link restores all sliders to default

## Return visit (saved recommendations exist)

1. User opens the application.
2. Recommendations and slider positions restore from localStorage.
3. Right panel populates immediately — no loading state.
4. "Last updated [date]" label appears below the section heading.
5. User can re-filter using sliders or navigate to 
   Manage Favourites to regenerate with new input.

## Regeneration flow

1. User navigates to Manage Favourites.
2. Previous file and keywords are not pre-populated 
   (user starts fresh each time).
3. User uploads new file and/or edits keywords.
4. User clicks "Update Preferences & Get Recommendations".
5. Previous recommendations are cleared from the right panel.
6. Flow continues from First Visit step 9.

## What the AI does and does not do
- The AI generates show recommendations based solely on 
  user input (file content + keywords)
- Show metadata (title, genre, year, rating estimate, synopsis) 
  is returned by the AI as part of its JSON response
- No external metadata API (TVDB, TMDB) is called in this phase
- Thumbnails are placeholder images in this phase — 
  external poster API is out of scope