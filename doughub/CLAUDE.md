# DougHub

Flashcard app for medical residents with ADHD. Eliminates decision paralysis through AI-guided concept extraction + FSRS spaced repetition.

**Target user:** IM/EM resident, post-shift exhaustion, zero tolerance for admin work, ≤2 clicks for any action.

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

**Key files:** `electron/database.ts` (queries), `electron/ipc-handlers.ts` (IPC), `src/stores/useAppStore.ts` (state), `src/types/index.ts` (Card, Note, CardWithFSRS).

All IPC returns `IpcResult<T>`: `{ data: T, error: null } | { data: null, error: string }`.

## Code Style
- ES modules, path alias `@/` → `src/`
- UI: shadcn/ui in `src/components/ui/`, use `cn()` for class merging
- IPC channels: `entity:action` format (e.g., `cards:getAll`)
- Complete implementations only—no placeholders or TODOs

## Adding Database Operations
1. Query in `database.ts` → 2. Handler in `ipc-handlers.ts` → 3. Method in `preload.ts` → 4. Type in `electron.d.ts` → 5. Store action in `useAppStore.ts`

## Domain Rules (Never Violate)
- **No folder hierarchies** — tags only, search-first navigation
- **No grading buttons** — FSRS handles all scheduling automatically
- **No basic list cards** — "5 causes of X" → clinical vignettes or overlapping cloze
- **No manual scheduling** — complete automation of review timing
- **Cards ↔ Notes bidirectional linking** — noteId on cards, cardIds[] on notes
- **Quick Dump escape hatch** — raw save when too tired to extract

## Constraints
- **Offline-first:** Core features work without internet
- **Desktop-only (MVP):** No mobile, no cloud sync
- **Local SQLite:** No external database dependencies
- **Medical accuracy:** AI must understand clinical terminology

## Performance Targets
| Metric | Target |
|--------|--------|
| Capture workflow | <20s, ≤2 clicks |
| Search response | <200ms |
| Save feedback | <500ms |
| App launch | <3 seconds |

## AI Instructions
- Explain architectural decisions before implementing
- Ask clarifying questions if requirements are ambiguous
- Start with simplest solution that works
- Generate complete, working code—no stubs
- Consider exhausted user state for all UX decisions
- Reference `docs/` folder for full specs

## Keyboard Shortcuts (Implemented)
- `Cmd+K` / `Ctrl+K`: Command palette
- `Space`: Show answer / continue (review)
- `Escape`: Return to capture view

## Workflow Context
Using Overseer model: Claude = Architect/PM, Copilot = Developer.
- Claude generates briefs → User pastes to Copilot → Copilot implements → Claude reviews
- Foundation docs in `/docs`: vision, user profile, success metrics, features

## Reference
Full specs in `docs/`: `DougHub Vision.md`, `DougHub User Profile.md`, `DougHub Success Metrics.md`, `DougHub MVP Screens and Design.md`