# DougHub AI Coding Instructions

## Project Overview
DougHub is a **flashcard app for medical residents with ADHD** studying for boards. The core problem: users lose 10+ minutes per study session to organizational decisions. DougHub eliminates this through AI-guided concept extraction with FSRS spaced repetition.

**Target user:** IM/EM residents, post-shift exhaustion, zero tolerance for admin work.

## Architecture

### v2 Architecture: 3-Layer System
```
Layer 1: Knowledge Bank (SourceItems) - Raw captures, inbox → processed → curated
Layer 2: Personal Notebook (NotebookTopicPages) - Curated topics with blocks
Layer 3: Flashcards (Cards) - Generated ONLY from Notebook blocks
```

### Data Flow
```
React Component → useAppStore → window.api.* → IPC Handler → database.ts → SQLite
```
- **Electron Main** (`electron/`): SQLite via `better-sqlite3`
- **Preload** (`electron/preload.ts`): Typed `window.api` bridge
- **Renderer** (`src/`): React UI, no direct DB access
- All IPC returns `IpcResult<T>`: `{ data: T; error: null } | { data: null; error: string }`

### Key Files
- `electron/database.ts` / `ipc-handlers.ts`: Data layer
- `src/stores/useAppStore.ts`: Zustand store (single source of truth)
- `src/types/index.ts`: Domain types (`Card`, `SourceItem`, `NotebookTopicPage`, `CanonicalTopic`)

## Commands
```bash
npm run dev      # Vite + Electron with hot reload
npm run build    # TypeScript + Vite + electron-builder
npm run lint     # ESLint (zero warnings)
```

## Performance Targets
- Capture: <20 seconds paste-to-saved, ≤2 clicks
- Search: <200ms response
- Save feedback: <500ms visible confirmation

## Capture & Card Workflows (v2)

### Capture Flow
1. User pastes content → AI auto-titles → Save to Inbox (SourceItem)
2. Later: Triage from Inbox → Add to Notebook topic page
3. Card generation: From Notebook blocks (or Card Browser "New Card")

### Quick Capture → Inbox
- Zero-friction capture when exhausted (status: inbox)
- Process later via Inbox view when mentally fresh

## Domain Rules (Non-Negotiable)

### Never Implement
- Folder hierarchies (tags only, search-first)
- Grading buttons (FSRS automates scheduling)
- Basic list cards (must become clinical scenarios)
- Manual scheduling decisions

### Always Implement
- Cards link to NotebookTopicPage (provenance tracking)
- Quick Capture escape hatch (always accessible, saves to SourceItem with status: inbox)
- FSRS via `ts-fsrs` library (89% retention target, zero user decisions)

### v2 Constraints
- **Notebook-only card creation:** Cards generated ONLY from NotebookTopicPage blocks
- **Canonical Topics:** Use CanonicalTopic with alias normalization, never raw topic strings
- **Quick Capture:** Always accessible, saves to SourceItem (sourceType: 'quickcapture', status: 'inbox')

## UI Conventions
- shadcn/ui components from `src/components/ui/`
- `cn()` from `@/lib/utils` for Tailwind class merging
- Path alias: `@/` → `src/`
- Zustand for state; persist to SQLite first, then update local state
- **Colors:** Always use theme variables (`bg-destructive`, `text-warning-foreground`) defined in `src/index.css`, never hardcoded Tailwind colors (`bg-red-500`, `text-amber-600`) to ensure theming consistency

## Adding Database Operations
1. Query function in `electron/database.ts`
2. IPC handler in `electron/ipc-handlers.ts`
3. Method in `preload.ts` api object
4. Type in `src/types/electron.d.ts`
5. Store action in `useAppStore.ts`

Channel format: `entity:action` (e.g., `cards:getAll`, `notes:create`)

## Reference
See `docs/` for full specs: Vision, MVP Screens, User Profile, Success Metrics.
- `DougHub User Profile.md` - Target user constraints and preferences
- `DougHub Success Metrics.md` - Validation criteria and targets
