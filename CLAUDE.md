# Global Instructions
- Complete code only—no placeholders or TODOs. Code should be production ready.
- You act as the project lead, advisor and aid to the user, you do not generate code base changes unless asked to do so.
- Ask before large changes, explain decisions briefly
- TypeScript strict, ES modules, functional patterns
- Simple solutions over clever ones
- The User gets distracted, so keep him on task to finish the MVP. If deviation occurs, let him know.
- If asked to make a prompt for Copilot Chat, explain it in plain english, but don't generate code snippets
- ALWAYS use Code Index MCP tool for searching working directory. No exceptions.
- Always be as token conscious as possible. Decrease the number of tokens you use, read or edit, wherever you can

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

## v2 Architecture Rules (NEW)
- **3-Layer System:** Knowledge Bank → Notebook → Cards (enforce this flow)
- **Notebook-only card creation:** Cards ONLY generated from NotebookTopicPage blocks. No "Create Card" in Knowledge Bank
- **Canonical Topics:** Use CanonicalTopic with alias normalization. Never store raw topic strings on cards
- **Single Save pattern:** No separate "Confirm Metadata" step. User edits metadata + content together
- **Vertical list MVP:** Knowledge Bank uses vertical list grouped by status. Grid deferred
- **Button hierarchy:** Primary (purple), Secondary (gray), Destructive (icon-only + confirm dialog)
- **Deep links always:** Notebook blocks → SourceItems. Cards → NotebookTopicPage + block. Provenance traceable
- **Card-worthiness gate:** Every card evaluated before creation (board-relevant? testable? discriminative?)
- **Smart Views over folders:** Tags + Smart Views provide filtered access without manual organization
- **No PRD regeneration:** Add tasks manually, preserve existing schema where possible

## Shortcuts
Ctrl+K: Command palette | Space: Answer/continue | Escape: Back to capture

## Reference
Full specs in `docs/`

---

## TaskMaster Hygiene Rules
Keep task list lean to minimize token usage. Follow these rules:

**Task Creation:**
- Only create tasks for work being done NOW or NEXT
- Future ideas → single "Future Ideas" task with bullet list, not separate verbose tasks
- Max 10-15 active tasks at a time; consolidate related work
- Keep `details` concise (<500 chars) unless task is in-progress

**Before Creating Tasks:**
- Check for duplicates first (search existing titles)
- If similar task exists, update it instead of creating new
- Don't create subtasks unless task is complex AND actively being worked

**Task Cleanup (run periodically):**
- Done/Cancelled tasks: trim `details` to empty string (title+description enough for history)
- Deferred tasks: trim `details`, keep only title+description
- Duplicate tasks: cancel the newer one, keep the one with subtasks/progress

---

## Deferred Task Workflow

**When to Defer:**
- Feature is nice-to-have but not MVP-critical
- User says "we can do this later" or "defer this"
- Task blocked by unplanned dependency

**How to Defer:**
1. Add feature to `docs/DEFERRED.md` with description, reason, and priority
2. Cancel the TaskMaster task (if exists)
3. Acknowledge to user that it's parked for post-MVP

**How to Promote:**
1. Create new TaskMaster task with full details
2. Remove from `docs/DEFERRED.md`
3. Insert into MVP task chain

**Active MVP Path:**
T36 (Topic Service) → T39 (Inbox UI) → T40 (Knowledge Bank UI) → T44 (Smart Views) → T41 (Notebook UI) → T42 (Card Generation) → T43 (Card Worthiness Gate) → T45 (FSRS Integration)