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
- Cards ONLY from Notebook blocks, never direct from KB
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

**MVP Path:** T112 (Sidebar) → T41 (Notebook) → T42 (Card Gen) → T43 (Worthiness) → T45 (FSRS)

---

## Reference
Full specs in `docs/` | Deferred features in `docs/DEFERRED.md`
