# NextUpTV - AI-Powered TV Recommendation Platform

A cinematic streaming-inspired UI for an AI-powered TV recommendation platform. Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## 🎬 Design & Architecture

### Design System
- **Dark mode first** cinematic aesthetic inspired by Netflix + Spotify + Letterboxd
- **Blue accent color** for primary interactions
- **Neutral palette** with dark backgrounds for immersive viewing
- **Inter typography** for modern, readable presentation
- **Rounded corners** and subtle shadows for polish

### Theme Colors
- **Background**: Deep charcoal (`oklch(0.13 0 0)`)
- **Foreground**: Off-white text (`oklch(0.98 0 0)`)
- **Card**: Slightly lighter background (`oklch(0.16 0 0)`)
- **Accent**: Electric blue (`oklch(0.35 0.15 256)`)

## 📐 Application Shell

### Top Navigation
- Fixed header with app logo and tab navigation
- Two main navigation tabs:
  - **Recommendations** (default): Shows personalized recommendations
  - **Manage Favourites**: Upload preferences and keywords
- Clean, minimal design matching streaming platforms

### Layout System
- **Desktop** (>1024px): 30% filter panel + 70% content
- **Tablet** (768-1024px): 35% filter panel + 65% content  
- **Mobile** (<768px): Full-width with filter drawer

## 📁 Component Structure

### Core Application
- `components/app-shell.tsx` - Main app wrapper with routing
- `components/top-navigation.tsx` - Fixed header with tab navigation

### Pages
- `components/pages/recommendations.tsx` - Recommendations page with state management
- `components/pages/favourites.tsx` - Manage favourites upload & form

### Dashboard
- `components/dashboard-layout.tsx` - Split layout with filters and content
- `components/recommendation-card.tsx` - Placeholder recommendation cards with hover effects
- `components/loading-skeleton.tsx` - Animated skeleton loading states

## 🔄 Recommendation States

### Empty State
- Centered message when no recommendations exist
- CTA button to navigate to Manage Favourites tab
- Friendly, encouraging UI

### Loading State
- Animated skeleton grid for perceived performance
- Displays "Generating recommendations..." message
- Hides filter panel during loading

### Success State
- Dashboard with filter panel and recommendation grid
- Shows "Last updated [date]" label
- Interactive filter sliders (Year Range, Minimum Rating)

### Error State
- Full-width error banner with retry button
- Clear error messaging
- Preserves any previously loaded recommendations

## 🎨 UI Components Used

- **shadcn/ui Cards** - Recommendation display
- **Sliders** - Year range and rating filters
- **Buttons** - Navigation and interactions
- **Skeleton** - Loading placeholders
- **Alert** - Error messaging
- **Sheet** - Mobile filter drawer
- **Textarea** - Keywords input
- **Label** - Form labels

## 📱 Responsive Breakpoints

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | <768px | Full-width, filter drawer |
| Tablet | 768-1024px | 35/65 split |
| Desktop | >1024px | 30/70 split |

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The application will be available at `http://localhost:3000`

## 🛠️ Key Features

- ✅ Responsive sidebar navigation (filter panel)
- ✅ Fixed top navigation with tab routing
- ✅ Dashboard layout with content grid
- ✅ Recommendation card component with placeholders
- ✅ Placeholder loading states with skeletons
- ✅ Empty state UI
- ✅ Error state handling
- ✅ Mobile-friendly filter drawer
- ✅ Dark mode first design
- ✅ Cinematic streaming-inspired aesthetic

## 📝 Notes

- No backend logic implemented yet (placeholder only)
- No mock APIs (prepare for real backend integration)
- File upload and form submission are non-functional placeholders
- Filter sliders are interactive but don't filter recommendations yet
- Recommendation states can be manually triggered via state changes

## 🎯 Next Steps

When implementing backend functionality:
1. ~~Connect to AI recommendation API~~
2. Implement file upload handling
3. Add real filtering logic
4. Connect to database for persistence
5. Add user authentication (optional)
6. Implement localStorage persistence for filter state
