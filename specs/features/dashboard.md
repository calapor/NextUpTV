# Application Layout

## Shell structure
- Full-height single page application
- Top navigation bar (fixed, full width) containing:
  - Left: App logo/name "[Your App Name]"
  - Centre: Tab navigation (see tabs below)
  - Right: placeholder for future user account icon (do not build auth)
- Below navbar: full-width, full-height tab content area
- No sidebar
- Background: neutral dark or light (inherit from shadcn theme)

## Navigation tabs
Two tabs, always visible in the navbar:

### Tab 1: "Recommendations" (default/landing tab)
- Route: / (root)
- This is the page the user lands on by default
- **First load state** (no recommendations yet):
  - Show a centred empty state in the content area
  - Heading: "No recommendations yet"
  - Subtext: "Go to Manage Favourites to upload your 
    preferences and generate recommendations"
  - CTA button: "Go to Manage Favourites" — navigates to Tab 2
  - Left filter panel is hidden entirely until recommendations exist

### Tab 2: "Manage Favourites"
- Route: /favourites
- Contains file upload, keywords text area, and submit button
- On successful submission:
  - Navigate automatically to the Recommendations tab
  - Trigger the recommendations loading state
  - Do not stay on Manage Favourites after submit

## Tab behaviour
- Tabs are Next.js App Router routes, not client-side state
- Active tab is visually highlighted in the navbar
- Tab content is not preserved when switching 
  (recommendations persist via localStorage, not tab state)
- No animations between tab transitions

## Global states

### Loading (after submit, before recommendations return)
- Recommendations tab shows skeleton cards in the right panel
- Left filter panel remains hidden during loading
- Navbar tabs remain accessible but Manage Favourites 
  submit button is disabled during active generation

### Error (API call fails)
- Full-width error banner below navbar
- Message: "Something went wrong generating your recommendations. 
  Please try again."
- Retry button that re-submits the last request
- Does not clear any previously loaded recommendations

### Returning user (recommendations in localStorage)
- Recommendations tab loads with previous results immediately
- Filter sliders restore to last saved positions
- Small "Last updated [date]" label below the 
  "Your Recommendations" heading

## Responsive breakpoints
- Mobile (<768px): single column, filter panel hidden 
  behind "Filters" button
- Tablet (768–1024px): 35/65 split
- Desktop (>1024px): 30/70 split

## What NOT to build
- Do not build authentication or user accounts
- Do not build a settings page or profile page  
- Do not add a third tab or any additional navigation items
- Do not add a footer
- Do not add onboarding or tutorial overlays