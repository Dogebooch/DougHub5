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

## Architecture
```
React → useAppStore → window.api.* → IPC → database.ts → SQLite
IPC returns IpcResult<T>: { data, error: null } | { data: null, error }
```

**v2 3-Layer System:**
1. Knowledge Bank (SourceItems) → 2. Notebook (NotebookTopicPages) → 3. Cards
- **Notebook = "What Boards Test" registry** — curated, clinically-relevant content
- Cards ONLY from Notebook blocks (or Card Browser "New Card"), never direct from KB
- Card generation: text selection → AI suggests format + card-worthiness feedback → user confirms
- CanonicalTopic with alias normalization (no raw topic strings)
- Deep links always: Cards → NotebookTopicPage → SourceItem

## Critical Rules
- IPC: invoke/handle only, never sendSync
- DB: transactions for mutations, UUID for IDs
- No grading buttons—FSRS auto-schedules
- No folders—tags + Smart Views only
- Medical lists → overlapping cloze (not naked lists)
- Performance: <200ms search, <20s capture, <500ms save

## Adding DB Operations
database.ts → ipc-handlers.ts → preload.ts → electron.d.ts → useAppStore.ts

## Shortcuts
Ctrl+K: Command palette | Space: Answer/continue | Escape: Back

---

## TaskMaster Rules

**Creation:** Only tasks for NOW/NEXT. Future ideas → `docs/DEFERRED.md`. Max 10-15 pending.

**Cleanup:** Trim done task details. Deferred → DEFERRED.md then cancel. NEVER use parse_prd.

**Defer workflow:** Add to DEFERRED.md → cancel in TaskMaster → acknowledge to user.

**DEFERRED.md format:**
```markdown
### Feature Name
**Description:** What it does
**Priority:** High/Medium/Low
**Source:** Where it came from (Task TX, User request, etc.)
**Notes:** Context, dependencies, or implementation hints
```

**MVP Path:** T42 (Card Gen) ✅ → T45 (FSRS) → T117 (Learning Mode) → T118 (Two-Mode Capture) → T115 (Card Browser)

---

## Session Handoff (2026-01-07)

### Completed This Session
- **T42 (Card Generation from Notebook Blocks)** — All 7 subtasks done
  - T42.1: CardSuggestion types + AI generateCardFromBlock function
  - T42.2: IPC wiring for ai:generateCards
  - T42.3: CardGenerationModal with FormatSelector and preview
  - T42.4: CardWorthinessPanel with traffic-light feedback
  - T42.5: Text selection UI in NotebookBlock
  - T42.6: Modal wired to IPC and card creation flow
  - T42.7: Muted indicator styling for blocks with cards

### Key Files Created/Modified
- `src/components/notebook/CardGenerationModal.tsx` — NEW
- `src/components/notebook/CardWorthinessPanel.tsx` — NEW
- `src/components/notebook/NotebookBlock.tsx` — Selection UI + indicator
- `src/components/notebook/TopicPageView.tsx` — Modal integration
- `src/types/ai.ts` — CardSuggestion, WorthinessResult types
- `electron/ai-service.ts` — generateCardFromBlock function
- `electron/ipc-handlers.ts` — ai:generateCards handler
- `tailwind.config.ts` — pulse-subtle + collapsible animations

### Next Task: T45 (FSRS Integration)
6 subtasks created, ready to start:
- T45.1: Provenance display in ReviewInterface (no deps)
- T45.2: Response-time signal ±15% interval modifier (no deps)
- T45.3: Low-difficulty cards query by topic (no deps)
- T45.4: High-difficulty visual indicator (depends T45.3)
- T45.5: Weak Topics smart view (depends T45.3)
- T45.6: FSRS parameter optimization groundwork (no deps)

**FSRS Phases:** Phase 1 (core) ✅ done | Phase 2 (response time) = T45.2 | Phase 3 (MLE) = T45.6 groundwork

### Patterns Established
- Card-worthiness: 3 criteria (Testable, One Concept, Discriminative)
- Traffic-light UI: green/yellow/red with expandable explanations
- Selection UI: 10+ char minimum, debounced, floating button
- Block indicator: left border + badge for blocks with cards

---

## Reference
Full specs in `docs/` | Deferred features in `docs/DEFERRED.md`
