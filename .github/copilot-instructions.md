# DougHub - Copilot Instructions

## Project Overview

This is a **monorepo** containing two related applications for medical study flashcards:

| App | Path | Framework | Purpose |
|-----|------|-----------|---------|
| **Next.js Web App** | `project-bolt-sb1-adzuacsm/project/` | Next.js 13.5 (App Router) | Main web application |
| **Electron Desktop** | `doughub --template react-ts/` | Electron + Vite + React | Desktop wrapper (scaffold only) |

## Architecture: Next.js Web App

### Data Flow
```
User Input → Zustand Store → localforage (IndexedDB) → Persistence
                 ↓
            React Components (auto-rerender on state change)
```

### Key Files
- `stores/useAppStore.ts` - Central Zustand store with IndexedDB persistence
- `lib/storage.ts` - localforage adapter for Zustand persist middleware
- `types/index.ts` - Core `Card` and `Note` interfaces
- `data/sampleData.ts` - Seed data loaded on first run

### State Management Pattern
Uses **Zustand with persist middleware** and async IndexedDB storage:
```typescript
// Always use the store hook for state access
const { cards, addCard, isHydrated } = useAppStore();

// IMPORTANT: Check isHydrated before rendering data-dependent UI
if (!isHydrated) return <Loading />;
```

### Component Organization
- `components/ui/` - 47 shadcn/ui primitives (do not modify directly)
- `components/capture/` - Input interfaces for creating cards
- `components/review/` - Flashcard review (spaced repetition)
- `components/layout/` - App shell, header, keyboard shortcuts
- `components/modals/` - Command palette, quick dump modal

## Developer Commands

### Next.js Web App (`project-bolt-sb1-adzuacsm/project/`)
```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run typecheck  # TypeScript check (tsc --noEmit)
```

### Electron App (`doughub --template react-ts/`)
```bash
npm run dev        # Vite dev with Electron
npm run build      # Build + electron-builder package
```

## Project Conventions

### Client Components
All interactive components use `'use client'` directive at the top. Pages import layout and feature components.

### Keyboard Shortcuts
Global shortcuts are registered in `AppLayout.tsx`:
- `Cmd/Ctrl+K` - Command palette
- `Cmd/Ctrl+Enter` - Submit in capture interface
- `Space` / `Escape` - Review navigation

### Import Aliases
Use `@/` prefix for imports (configured in tsconfig.json):
```typescript
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
```

### UI Component Usage
Use existing shadcn/ui components from `components/ui/`. For icons, use `lucide-react`:
```typescript
import { ArrowLeft, Plus } from 'lucide-react';
```

### Toast Notifications
Use `sonner` library (already configured):
```typescript
import { toast } from 'sonner';
toast.success('Cards created!');
```

## Known Gaps (Not Implemented)

- **Form validation**: react-hook-form and Zod are installed but unused
- **Backend/Supabase**: @supabase/supabase-js is installed but not connected
- **Spaced repetition algorithm**: Due dates exist but no SM-2 or similar algorithm
- **CaptureInterface**: Shows hardcoded suggestions, not AI-generated

## Testing & Linting
```bash
npm run lint       # ESLint check
npm run typecheck  # TypeScript validation
```
No test framework is currently configured.
