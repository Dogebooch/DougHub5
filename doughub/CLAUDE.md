# Global Instructions
- Complete code only—no placeholders or TODOs
- Ask before large changes, explain decisions briefly
- TypeScript strict, ES modules, functional patterns
- Simple solutions over clever ones

---

# DougHub - Electron + React + TypeScript

Flashcard app for medical residents. FSRS auto-scheduling, zero decision paralysis.

## Stack
Electron 29+ (main: better-sqlite3), React 18, Zustand
TypeScript 5.4 strict, TailwindCSS, shadcn/ui

## Structure
electron/       → main.ts, database.ts, ipc-handlers.ts, preload.ts, fsrs-service.ts
src/            → React app (App.tsx, main.tsx)
src/components/ → capture/, review/, layout/, modals/, ui/ (shadcn)
src/stores/     → useAppStore.ts (Zustand)
src/types/      → index.ts, electron.d.ts
docs/           → Vision, User Profile, Success Metrics, MVP Screens

## Commands
npm run dev | npm run build | npm run lint
MCP Code Index Tools available. Prefer when searching codebase
TaskMaster MCP Tools Available

## Architecture
React → useAppStore → window.api.* → IPC Handler → database.ts → SQLite
IPC returns `IpcResult<T>`: `{ data, error: null } | { data: null, error }`

## Adding DB Operations
database.ts → ipc-handlers.ts → preload.ts → electron.d.ts → useAppStore.ts

## Critical Rules
- IPC: invoke/handle only, never sendSync
- DB: transactions for mutations, UUID for IDs
- No grading buttons—FSRS auto-schedules everything
- No folder hierarchies—tags only, search-first
- Medical lists → clinical vignettes or overlapping cloze
- <200ms search, <20s capture, <500ms save feedback

## Shortcuts
Ctrl+K: Command palette | Space: Answer/continue | Escape: Back to capture

## Reference
Full specs in `docs/`