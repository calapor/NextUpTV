# Recommendations tab 

## Purpose
Displays recommended shows after successful generation with filters.


## Stack assumptions
Inherits from parent app. AI via /api/recommendations using 
Anthropic streaming. File parsing server-side.

---

## Layout

### Page layout
- there are two sections left and right
- the left section contains the sliders to filter TV shows
- the right section contains the results of the recommendations in a data grid
- the left section is around 30% of the width of the page with the balance being the right section.


### Right section


- Section heading: "Your Recommendations"
- Renders as a list of cards or table
- Each card: Thumb nail, Title,1-line synopsis,genre tags, year, show a rollover showing 1-line reason why recommended over the Title field.
- Save recommendations between sessions
- Thumbnail: fetched from TMDB API using the show title as search key. If no result found, show a grey placeholder with the show title initials.
- **States**:
  - Hidden: before first submission
  - Loading: skeleton cards, animated pulse
  - Populated: card grid
  - Empty: "We couldn't find recommendations — try adding 
    more keywords" with a link to the manage favourites tab

### Left section


Each slider group: Label, min label, max label, range input
Sliders are grouped under the "Preferences" heading, no cards needed — 
just clean labelled range inputs stacked vertically.


### Responsive behaviour
- Mobile: left filter panel collapses into a "Filters" button that 
  opens a bottom drawer. Right section is full width.
- Tablet (768px+): left panel visible, 35/65 split
- Desktop (1024px+): 30/70 split as described

---

## Filtering behaviour
All filtering is client-side. The AI returns up to 10 recommendations 
on generation. Sliders filter and rank the visible results in real time 
without triggering a new API call. No loading state needed on slider change.

---

## Persistence
- Recommendations: saved to localStorage on generation, 
  restored on page load
- Slider positions: saved to localStorage on change, 
  restored on page load
- If no saved recommendations exist, right section shows hidden state

---

## Sliders

1. Label: "Runtime", min label is "Short", max label is "long"
- the metric behind the slider is the runtime minutes on average of each show
- short is defined as 30 minutes or under
- medium is defined as between 30 and 40 minutes
- long is defined as greater than 40 minutes

2. Label: "Rating", min label is 0 max is 10
- the metric behind the slider is the IMDB rating for each show

3. Label: "Comedy Level", based on how reviews and genre rate the show in comedy value
- the min value is not funny, max value is very funny.

4. Label: "Horror Level", based on how reviews and genre rate the show in horror value
- the min value is not scary, max value is very scary/intense.

5. Label: "Age", based on the year the tv show was released
- the min value based on the earliest years in the recommendations returned.
- the max value based on the most recent years in the recommendations returned.

6. Label: "List"
- Controls how many recommendations are shown in the results grid
- Min: 1 (show top 1 result only)
- Max: 10 (show all 10 results)
- Default: 10


## What NOT to build
- Do not fetch real IMDB ratings — the AI returns a rating estimate
- Do not trigger new API calls on slider change — all filtering is client-side  
- Do not build a user account system — use localStorage for persistence
- Do not add sorting controls beyond the sliders
- Do not paginate — max 10 results, all shown at once

