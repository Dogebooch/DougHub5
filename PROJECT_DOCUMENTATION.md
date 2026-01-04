# DougHub - Project Documentation
**Medical Study Application for Exhausted Medical Residents**

Generated: January 4, 2026

---

## Project Overview

**Type:** Next.js 13.5.1 Client-Side Application  
**Deployment:** Netlify (Static Export)  
**State Management:** Zustand with IndexedDB persistence  
**Styling:** Tailwind CSS with shadcn/ui components  
**Storage:** localforage (IndexedDB/WebSQL/LocalStorage fallback)

---

## File Structure

### TypeScript/TSX Files (First 40)
```
./.next/types/app/review/page.ts
./.next/types/app/settings/page.ts
./.next/types/app/layout.ts
./.next/types/app/page.ts
./app/review/page.tsx
./app/settings/page.tsx
./app/layout.tsx
./app/page.tsx
./components/capture/CaptureInterface.tsx
./components/layout/AppLayout.tsx
./components/layout/Header.tsx
./components/layout/QuickActionsBar.tsx
./components/layout/SearchBar.tsx
./components/modals/CommandPalette.tsx
./components/modals/QuickDumpModal.tsx
./components/review/ReviewInterface.tsx
./components/ui/[47 UI components]
./hooks/use-toast.ts
./lib/storage.ts
./lib/utils.ts
./stores/useAppStore.ts
./types/index.ts
./data/sampleData.ts
```

---

## Dependencies

### Core Framework
- **next**: 13.5.1
- **react**: 18.2.0
- **react-dom**: 18.2.0
- **typescript**: 5.2.2

### State Management & Storage
- **zustand**: ^5.0.9 (with persist middleware)
- **localforage**: ^1.10.0 (IndexedDB wrapper)

### Form Handling
- **react-hook-form**: ^7.53.0
- **@hookform/resolvers**: ^3.9.0
- **zod**: ^3.23.8 (schema validation)

### UI Component Library (Radix UI Primitives)
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip

### Styling
- **tailwindcss**: 3.3.3
- **tailwindcss-animate**: ^1.0.7
- **tailwind-merge**: ^2.5.2
- **class-variance-authority**: ^0.7.0
- **clsx**: ^2.1.1
- **autoprefixer**: 10.4.15
- **postcss**: 8.4.30

### Additional UI Libraries
- **lucide-react**: ^0.446.0 (icons)
- **cmdk**: ^1.0.0 (command palette)
- **sonner**: ^1.5.0 (toast notifications)
- **vaul**: ^0.9.9 (drawer component)
- **react-day-picker**: ^8.10.1
- **date-fns**: ^3.6.0
- **embla-carousel-react**: ^8.3.0
- **react-resizable-panels**: ^2.1.3
- **recharts**: ^2.12.7
- **input-otp**: ^1.2.4
- **next-themes**: ^0.3.0

### Cloud Services (Installed but NOT Implemented)
- **@supabase/supabase-js**: ^2.58.0 ⚠️ **NOT IN USE**

### Deployment
- **@netlify/plugin-nextjs**: ^5.15.1
- **@next/swc-wasm-nodejs**: 13.5.1

---

## Component Structure

### App Routes (Next.js 13 App Directory)
- `/` - Home/Capture page
- `/review` - Review Interface page (flashcard review with spaced repetition)
- `/settings` - Settings page (placeholder implementation)
- `layout.tsx` - Root layout with dark mode

### Custom Components

#### Capture Module (`components/capture/`)
- **CaptureInterface** - Main input interface for capturing medical notes and flashcards
  - Features: Text input, hardcoded suggestion system (not AI-generated), format selection (Cloze/Q&A), "Create Cards" button with ⌘+Enter shortcut

#### Layout Module (`components/layout/`)
- **AppLayout** - Main application wrapper with keyboard shortcuts (Cmd/Ctrl+K for command palette)
- **Header** - Top navigation bar
- **QuickActionsBar** - Action buttons for quick access
- **SearchBar** - Search functionality component

#### Modals Module (`components/modals/`)
- **CommandPalette** - Keyboard-driven command interface
- **QuickDumpModal** - Quick note capture modal

#### Review Module (`components/review/`)
- **ReviewInterface** - Flashcard review system
  - Features: Card flipping, progress tracking, keyboard navigation (Space/Escape)
  - Filters cards by due date
  - Displays associated note context
  - Session completion handling

#### UI Module (`components/ui/`) - 47 shadcn/ui Components
- accordion, alert-dialog, alert, aspect-ratio, avatar
- badge, breadcrumb, button
- calendar, card, carousel, chart, checkbox, collapsible, command, context-menu
- dialog, drawer, dropdown-menu
- form
- hover-card
- input, input-otp
- label
- menubar
- navigation-menu
- pagination, popover, progress
- radio-group, resizable
- scroll-area, select, separator, sheet, skeleton, slider, sonner, switch
- table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip

---

## Tailwind CSS Configuration

### Theme Extensions
- **Colors**: HSL-based custom color system
  - background, foreground
  - card, popover
  - primary, secondary, muted, accent, destructive
  - border, input, ring
  - chart (5 variants)
  
- **Border Radius**: CSS variable-based (lg, md, sm)
- **Animations**: accordion-down, accordion-up
- **Background Images**: gradient-radial, gradient-conic

### Plugins
- tailwindcss-animate

### Dark Mode
- Class-based dark mode enabled
- Applied by default in root layout

---

## Layout Structure

### Application Hierarchy
1. **RootLayout** (`app/layout.tsx`)
   - Inter font family
   - Dark mode class on HTML
   - Global styles from `globals.css`
   - Toaster component (sonner)

2. **AppLayout** (`components/layout/AppLayout.tsx`)
   - Header component
   - QuickActionsBar
   - Main content area (max-w-7xl, centered)
   - CommandPalette overlay
   - QuickDumpModal overlay
   - Keyboard shortcuts handler

3. **Pages**
   - Home: CaptureInterface wrapped in AppLayout
   - Review: ReviewInterface
   - Settings: Settings page

---

## Form Logic

### Form Management
- **Library**: react-hook-form v7.53.0 (installed but unused)
- **Validation**: Zod ^3.23.8 and @hookform/resolvers ^3.9.0 (installed but unused)
- **Components**: Form wrapper UI component exists (`components/ui/form.tsx`) but is NOT used by any custom components

### Status: ⚠️ **INSTALLED BUT NOT IMPLEMENTED**
- No `useForm()` calls in any custom component
- No Zod schemas defined anywhere in the codebase
- Form UI wrapper provides FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
- These are shadcn/ui boilerplate components ready for future use

### Available Input Components (UI only, not wired to forms)
- Text input, textarea
- Checkbox, radio-group, switch
- Select dropdowns
- Calendar/date-picker
- OTP input
- Slider controls

---

## State Management

### Zustand Store (`stores/useAppStore.ts`)

**State Shape:**
- `cards`: Card[] - Flashcard collection
- `notes`: Note[] - Note collection
- `isHydrated`: boolean - Rehydration status
- `isSeeded`: boolean - Sample data status

**Actions:**
- `addCard(card)` - Add new flashcard
- `addNote(note)` - Add new note
- `getCardsDueToday()` - Filter cards by due date
- `setHydrated()` - Mark store as hydrated
- `seedSampleData()` - Load initial sample data

**Persistence:**
- Uses Zustand persist middleware
- Storage adapter: custom localforage wrapper
- Auto-rehydration on app load
- Auto-seeds sample data if empty

---

## Data Models (`types/index.ts`)

### Card Interface
- id: string
- front: string
- back: string
- noteId: string
- tags: string[]
- dueDate: string
- createdAt: string

### Note Interface
- id: string
- title: string
- content: string
- cardIds: string[]
- tags: string[]
- createdAt: string

---

## LocalForage/IndexedDB Implementation

### Storage Module (`lib/storage.ts`)

**Configuration:**
- Instance name: `doughub-storage`
- Driver priority: IndexedDB → WebSQL → LocalStorage
- Description: "DougHub flashcard and notes storage"

**Storage Keys:**
- `cards` - Flashcard data
- `notes` - Note data

**Storage Adapter:**
Custom wrapper providing:
- `getItem(name)` - Async read with error handling
- `setItem(name, value)` - Async write with error handling
- `removeItem(name)` - Async delete with error handling

**Integration:**
- Connected to Zustand via `createJSONStorage`
- Automatic persistence of all state changes
- Client-side only, no server synchronization

### Utility Functions (`lib/utils.ts`)
- **cn()** - Tailwind class merging utility using clsx and tailwind-merge

---

## Supabase Client/Auth

### Status: ⚠️ **NOT IMPLEMENTED**

**Package Installed:**
- @supabase/supabase-js v2.58.0

**Current State:**
- Dependency exists in package.json
- NO Supabase client initialization found
- NO authentication implementation
- NO API calls to Supabase
- Empty .env file (no Supabase credentials)

**Conclusion:**
Package installed but completely unused. Application is currently 100% client-side with local storage only.

---

## Sample Data

### Medical Content (`data/sampleData.ts`)

**Pre-loaded Sample Data:**
- 2 Medical Notes (Acute Coronary Syndrome, Heart Failure)
- 4 Flashcards covering:
  - STEMI diagnostic criteria
  - Troponin timing and interpretation
  - BNP/NT-proBNP in heart failure
  - Ejection fraction classifications

**Note Topics:**
1. **Acute Coronary Syndrome**
   - STEMI diagnostic criteria
   - Lead groupings (Inferior, Lateral, Anterior)
   - Troponin timing (rise, peak, duration)
   - Clinical approach workflow
   - Tags: cardiology, diagnostics, emergency

2. **Heart Failure**
   - Classification systems
   - BNP/NT-proBNP thresholds
   - Ejection fraction categories
   - Clinical management
   - Tags: cardiology, heart-failure, chronic-care

**Card Due Dates:**
- All sample cards have `dueDate` set to current date
- Cards are immediately reviewable upon first launch

**Auto-seeding:**
- Sample data automatically loads on first app launch
- Triggered via Zustand store rehydration
- Only seeds if cards array is empty

---

## Serverless Functions

### Status: ❌ **NONE PRESENT**

**Findings:**
- NO `/app/api` directory
- NO Next.js API routes
- NO serverless functions
- NO backend endpoints

**Deployment:**
- Static export to Netlify
- Uses @netlify/plugin-nextjs for deployment
- No Netlify Functions detected

---

## Cloud-Dependent Hooks

### Status: ❌ **NONE PRESENT**

**Available Hooks:**
- `use-toast.ts` - Client-side toast notifications only

**No Cloud Features:**
- No authentication hooks
- No data fetching hooks (no SWR, React Query, etc.)
- No API integration hooks
- No real-time subscription hooks
- No cloud sync functionality

---

## Configuration Files

### Next.js Config (`next.config.js`)
- **ESLint**: Disabled during builds (`ignoreDuringBuilds: true`)
- **Images**: Unoptimized (for static export)
- **Output**: Static export compatible

### shadcn/ui Config (`components.json`)
- **Style**: default
- **RSC**: Enabled (React Server Components ready)
- **Base Color**: neutral
- **CSS Variables**: Enabled
- **Path Aliases**:
  - @/components → components
  - @/lib → lib
  - @/hooks → hooks
  - @/ui → components/ui

### Tailwind Config
- PostCSS integration
- Custom CSS variables for theming
- shadcn/ui component styles

### TypeScript Config
- Strict mode enabled
- Path mapping for @ alias
- Next.js specific settings

---

## Key Architectural Decisions

### Client-Side First
- Entire application runs in browser
- Zero backend dependencies
- Works offline after initial load
- No authentication/authorization

### Data Persistence Strategy
- LocalForage for cross-browser compatibility
- IndexedDB primary storage
- Automatic fallback to WebSQL/LocalStorage
- No cloud backup or sync

### Deployment Strategy
- Static site generation
- Netlify hosting
- No server-side rendering
- No API backend

### UX Features
- **Keyboard-First Navigation**:
  - Cmd/Ctrl+K: Command palette
  - Space: Reveal answer/Next card
  - Escape: Exit review mode
- **Dark Mode**: Default theme
- **Responsive Design**: Mobile-friendly layouts
- **Toast Notifications**: User feedback via Sonner

---

## Feature Implementation Status

### ✅ Fully Implemented
- Flashcard creation and storage
- Spaced repetition review system
- Medical note management
- Command palette (Cmd/Ctrl+K)
- Quick dump modal for rapid capture
- Keyboard shortcuts
- Dark mode UI
- Local persistence (IndexedDB)
- Sample medical data pre-loading
- Progress tracking in review sessions
- Card filtering by due date

### ⚠️ Placeholder/Incomplete
- **Settings Page** - Only displays title, no actual settings
- **AI Suggestions** - UI present but backend not implemented
- **Search Functionality** - SearchBar component exists but not functional
- **Tag System** - Data model supports tags, but no UI implementation

### ❌ Missing/Planned Features

Based on installed but unused dependencies:

1. **Supabase Integration** - Package installed, not configured
2. **Cloud Sync** - No implementation despite storage being local-only
3. **User Authentication** - No auth system
4. **Multi-device Sync** - Only local storage
5. **Backend API** - Pure frontend application
6. **Card Editing** - No update/delete functionality visible
7. **Note Editing** - No update interface
8. **Export/Import** - No data portability features
9. **Statistics/Analytics** - No review performance tracking
10. **Spaced Repetition Algorithm** - Simple date filtering, no SM-2 or similar

---

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
```

---

## Technology Stack Summary

✅ **Implemented:**
- React 18.2 + Next.js 13.5
- TypeScript 5.2
- Tailwind CSS with 46 UI components
- Zustand state management
- LocalForage/IndexedDB persistence
- React Hook Form with Zod validation
- Dark mode theming
- Keyboard shortcuts (Cmd+K)
- Toast notifications
- Command palette interface

❌ **Not Implemented:**
- Supabase database/auth
- Cloud synchronization
- Backend API
- Serverless functions
- Multi-user support
- Data backup/restore

---

**Project Type:** Offline-First PWA-Ready Medical Study Application  
**Primary Use Case:** Local flashcard and note management for medical residents  
**Deployment:** Static hosting (Netlify)
