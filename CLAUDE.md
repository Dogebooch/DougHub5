# DougHub - Claude Code Instructions

## Behavior

- Complete code only—no placeholders/TODOs
- Act as project lead/advisor; don't generate changes unless asked
- Ask before large changes, explain briefly
- Keep user on MVP track; flag deviations
- ALWAYS use Code Index MCP for codebase searches
- Be token-conscious in reads/edits

## Stack

Electron 29+ (better-sqlite3), React 18, Zustand, TypeScript 5.4 strict, TailwindCSS, shadcn/ui

## Architecture (Capture Hub)

DougHub is an **AI-Powered Capture & Preprocessing Hub** — NOT a learning app.

```
Tampermonkey → POST /capture → Parse → SQLite → AI Analysis → Export to Remnote
```

**Core principle:** DougHub is the kitchen (prep and process), Remnote is the dining room (consume and review).

### What DougHub DOES:

- Capture board questions from MKSAP/PeerPrep via Tampermonkey
- Store raw data with images locally (SQLite)
- AI-analyze content and generate flashcard candidates
- Export to Remnote via clipboard

### What DougHub does NOT do:

- ❌ Flashcard review/practice
- ❌ Spaced repetition scheduling
- ❌ Knowledge Forging/card creation UI
- ❌ FSRS or any scheduling algorithm

## Critical Rules

- IPC: invoke/handle only, never sendSync
- DB: transactions for mutations, UUID for IDs
- **Colors:** Always use theme variables (`bg-destructive`, `text-warning-foreground`) from `src/index.css`, never hardcoded Tailwind colors
- Performance: <200ms search, <20s capture, <500ms save
- AI Client: Connect to Ollama at `http://localhost:11434`

## Adding DB Operations

database.ts → ipc-handlers.ts → preload.ts → electron.d.ts → useAppStore.ts

---

## Reference

- **Philosophy:** `docs/PHILOSOPHY.md` — the canonical source of truth
- **Full specs:** `docs/`
