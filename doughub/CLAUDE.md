# DougHub

Flashcard app for medical residents with ADHD. Eliminates decision paralysis through AI-guided concept extraction + FSRS spaced repetition.

Target user: IM/EM residents, post-shift exhaustion, zero tolerance for admin work.

## Commands

```bash
npm run dev      # Vite + Electron with hot reload
npm run build    # TypeScript + Vite + electron-builder
npm run lint     # ESLint (zero warnings policy)
```

## Architecture

```
React → useAppStore (Zustand) → window.api.* → IPC Handler → database.ts → SQLite
```

Key files: `electron/database.ts` (queries), `electron/ipc-handlers.ts` (IPC), `src/stores/useAppStore.ts` (Zustand), `src/types/index.ts` (Card, Note, CardWithFSRS).

All IPC returns `IpcResult<T>`: `{ data: T, error: null } | { data: null, error: string }`.

## Code Style

- ES modules (import/export), path alias `@/` → `src/`
- UI: shadcn/ui components in `src/components/ui/`, use `cn()` for class merging
- IPC channels: `entity:action` format (e.g., `cards:getAll`, `notes:create`)

## Adding Database Operations

1. Query in `electron/database.ts` → 2. IPC handler in `ipc-handlers.ts` → 3. Method in `preload.ts` → 4. Type in `src/types/electron.d.ts` → 5. Store action in `useAppStore.ts`

## Domain Rules - IMPORTANT

NEVER: folder hierarchies (tags only), grading buttons (FSRS automates), basic list cards ("5 causes of X" → clinical vignettes), manual scheduling.

ALWAYS: Cards ↔ Notes bidirectional linking (noteId/cardIds[]), Quick Dump escape hatch, FSRS via ts-fsrs (89% retention).

## Performance

Capture <20s with ≤2 clicks, search <200ms, save feedback <500ms.

## Keyboard Shortcuts (Implemented)

- `Cmd+K` / `Ctrl+K`: Command palette
- `Space`: Show answer / continue (review screen)
- `Escape`: Return to capture view

## AI Workflows (Planned)

Paste → AI suggests concepts → user confirms checkboxes → auto-linked cards/notes. AI enforces one concept per card, converts medical lists to clinical scenarios. Quick Dump for exhausted users, process later from queue.

## Reference

Full specs: `docs/DougHub Vision.md`, `DougHub MVP Screens and Design.md`, `DougHub User Profile.md`, `DougHub Success Metrics.md`
- DougHub Success Metrics.md
