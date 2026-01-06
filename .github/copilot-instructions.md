# DougHub AI Coding Instructions

## Project Overview
DougHub is a **flashcard app for medical residents with ADHD** studying for boards. The core problem: users lose 10+ minutes per study session to organizational decisions. DougHub eliminates this through AI-guided concept extraction with FSRS spaced repetition.

**Target user:** IM/EM residents, post-shift exhaustion, zero tolerance for admin work.

## Architecture

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
- `src/types/index.ts`: Domain types (`Card`, `Note`, `CardWithFSRS`)

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

## AI-Assisted Workflows (Planned)

### Capture Flow
1. User pastes content → AI analyzes and suggests extractable concepts
2. AI recommends card format (cloze vs Q&A) per concept
3. User confirms/rejects/edits via checkboxes → cards created with auto-linked notes
4. AI suggests related existing notes and medical domain tags

### Card Validation
- AI enforces minimum information principle (one concept per card)
- Medical lists ("5 causes of X") converted to clinical vignette scenarios
- Warnings for pattern-matching cards that test format recognition vs knowledge

### Quick Capture → Queue
- Emergency capture when exhausted (no AI processing)
- Later: process from queue with same AI-guided workflow

## Domain Rules (Non-Negotiable)

### Never Implement
- Folder hierarchies (tags only, search-first)
- Grading buttons (FSRS automates scheduling)
- Basic list cards (must become clinical scenarios)
- Manual scheduling decisions

### Always Implement
- Cards ↔ Notes bidirectional linking (`noteId` / `cardIds[]`)
- Quick Capture escape hatch (always accessible)
- FSRS via `ts-fsrs` library (89% retention target, zero user decisions)

## UI Conventions
- shadcn/ui components from `src/components/ui/`
- `cn()` from `@/lib/utils` for Tailwind class merging
- Path alias: `@/` → `src/`
- Zustand for state; persist to SQLite first, then update local state

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
