# Architecture Migration: Library and High Yield System

**Date:** January 26, 2026
**Status:** Complete Plan - Ready for Implementation
**Type:** Major Architecture Revision
**Files Affected:** 27 (2 new, 25 modified)
**Phases:** 8 (P0: 2, P1: 2, P2: 2, P3: 2)

---

## Executive Summary

This document outlines a fundamental shift in DougHub's architecture from **location-based importance** (Archive vs Notebook) to **property-based importance** (High Yield toggle). This change reduces cognitive load during capture, aligns with how learning actually works, and matches patterns from successful reference apps.

---

## The Problem We're Solving

DougHub currently asks users to make a **judgment call at capture time**: "Is this Archive material or Notebook material?" This violates our core principle of zero-friction capture for exhausted residents. The mental overhead of deciding "is this high-yield enough?" creates decision paralysis and slows down the capture-to-learning loop.

Additionally, the term "Archive" implies "storage I'll never look at again" (like email archives), when we actually mean "reference library of source materials."

---

## The Conceptual Shift

### Current Mental Model (Problematic)

```
Archive (lesser stuff) ──vs──> Notebook (important stuff)
                                    │
                                    ▼
                                  Cards
```

User must decide importance **at capture time**, when they're least equipped to judge.

### New Mental Model (Property-Based)

```
Library (all sources)  ────────>  Notebook (all your notes by topic)
                                       │
                                       │ ⭐ = High Yield (toggle anytime)
                                       │
                                       ▼
                              Cards (prefer ⭐ blocks)
```

User writes freely, marks importance **as understanding develops**.

---

## What Each Layer Becomes

### Layer 1: Library (renamed from Archive)

**What it is:** Your reference collection of source materials.

**Mental model:** Like a medical library shelf - textbooks, articles, QBank screenshots. You pull from it, but you don't write annotations directly on library books.

**Contains:**
- QBank question captures
- Uploaded PDFs with OCR text
- Article links and web captures
- Quick captures that haven't been processed yet
- Audio recordings with transcriptions

**User interaction:**
- Search and browse sources
- "Add to Notebook" to extract insights into topic pages
- Read-only reference (you don't edit the source, you extract from it)

**No behavioral change needed** - this is just a rename for clarity.

---

### Layer 2: Notebook (enhanced)

**What it is:** Your personal knowledge base, organized by medical topic.

**Mental model:** Like your actual notebook from med school - you write everything about a topic in one place. Some notes are detailed context, some are the key "star this for boards" points.

**Contains:**
- Topic pages (one per canonical topic: "DKA", "Heart Failure", etc.)
- Blocks within each page:
  - Extractions from Library sources (with provenance link)
  - Directly authored notes (lecture notes, your own insights)
  - Each block has optional ⭐ "High Yield" marker

**User interaction:**
- Navigate to topic → See all your notes about it
- "Write New Note" → Author directly in the topic page
- "Add from Library" → Pull in source material extractions
- Toggle ⭐ on any block to mark it as high-yield
- Filter view: "All Notes" or "High Yield Only"
- Generate cards (AI prioritizes ⭐ blocks)

**Key insight:** You don't decide "is this Notebook-worthy?" You write everything, then mark what matters as you learn more.

---

### Layer 3: Cards (unchanged, but smarter)

**What it is:** FSRS-scheduled flashcards for active recall.

**Generated from:** Notebook blocks (preferring ⭐ high-yield blocks).

**User interaction:** Same as before - review sessions with automatic FSRS scheduling.

---

## The High Yield Toggle: Why It Matters

### The Learning Reality

**Day 1 of studying DKA:**
- You capture everything because you don't know what's important yet
- "Anion gap = Na - (Cl + HCO3)" - is this high-yield? You're not sure
- "Check ketones q2h" - maybe important?

**Day 7 of studying DKA:**
- After doing 50 QBank questions, you realize: "The insulin/glucose timing is ALWAYS tested"
- Now you can mark ⭐ on the blocks that matter
- Your detailed notes stay for reference, but board prep focuses on ⭐

**Day of board exam prep:**
- Filter to "High Yield Only"
- See just the starred essentials
- Generate cards from those blocks

### Why Property > Location

| Aspect | Location-based (current) | Property-based (proposed) |
|--------|-------------------------|---------------------------|
| Decision timing | At capture (worst time) | Whenever ready (flexible) |
| Reversibility | Must move between Archive/Notebook | Toggle on/off instantly |
| Detailed notes | Awkward fit (too detailed for Notebook?) | Natural home (Notebook, unmarked) |
| Board prep | Hope you moved the right stuff | Filter to ⭐ |
| Cognitive load | "Where does this go?" | "Just write it" |

---

## User Workflows After Migration

### Workflow 1: Quick Capture (unchanged)

**Scenario:** Post-shift, saw interesting QBank question, exhausted.

1. Ctrl+Shift+S → Quick Capture modal
2. Paste content, auto-titles
3. Click "Save to Inbox"
4. Done (goes to Library with status: inbox)

*Later, when mentally fresh:*

5. Open Inbox → See the capture
6. Click "Add to Notebook" → Select "DKA" topic
7. Extract key insight, save as block
8. Optionally mark ⭐ if it's clearly high-yield

---

### Workflow 2: Lecture Notes (new capability)

**Scenario:** Attending noon conference on heart failure, want to take notes.

1. Open Notebook → Navigate to "Heart Failure" topic
2. Click "Write New Note"
3. Full-screen editor opens, pre-titled "Note for Heart Failure"
4. Type notes during lecture (auto-saves every 2 seconds)
5. Click "Done" when finished
6. Notes appear as blocks in the Heart Failure page

*Later, during review:*

7. Re-read notes, mark ⭐ on the key points
8. Generate cards → AI suggests cards from ⭐ blocks first

---

### Workflow 3: Board Prep Review (new capability)

**Scenario:** Dedicated study day, want to review high-yield cardiology.

1. Open Notebook → Navigate to "Cardiology" or specific topic
2. Toggle view to "High Yield Only"
3. See just the ⭐ marked blocks - the essentials
4. Generate cards from this filtered view
5. Review session with FSRS scheduling

---

### Workflow 4: Deep Dive Reference (unchanged)

**Scenario:** Researching a rare condition, need detailed notes.

1. Upload PDF to Library (OCR extracts text)
2. Search Library for related sources
3. Open source → "Add to Notebook" → Select topic
4. Extract detailed notes as blocks (don't mark ⭐ - these are reference)
5. High-yield summary gets ⭐, details stay unmarked
6. During board prep, filter to ⭐ → Details hidden but preserved

---

## Database Changes Required

### 1. Add `isHighYield` to NotebookBlock

```sql
-- Migration v22: Add high yield marker to blocks
ALTER TABLE NotebookBlock ADD COLUMN isHighYield INTEGER NOT NULL DEFAULT 0;

-- Index for filtering (compound for efficient topic page queries)
CREATE INDEX idx_notebook_block_high_yield ON NotebookBlock(notebookTopicPageId, isHighYield);
```

**TypeScript type updates (3 files):**

```typescript
// electron/database/types.ts - DbNotebookBlock interface
interface DbNotebookBlock {
  // ... existing fields
  isHighYield: number; // SQLite boolean: 0 or 1
}

// electron/database/types.ts - NotebookBlockRow interface
interface NotebookBlockRow {
  // ... existing fields
  isHighYield: number | null;
}

// src/types/index.ts - NotebookBlock interface
interface NotebookBlock {
  // ... existing fields
  isHighYield: boolean;
}
```

---

### 2. Database Query Layer Updates

**File: `electron/database/notebook-blocks.ts`**

ALL query methods must add `isHighYield` to their SELECT statements:

| Method | Line | Change |
|--------|------|--------|
| `getByPage()` | ~10 | Add `isHighYield` to SELECT |
| `getById()` | ~22 | Add `isHighYield` to SELECT |
| `getBySourceId()` | ~33 | Add `isHighYield` to SELECT |
| `getBySourceDetailed()` | ~45 | Add `isHighYield` to SELECT |
| `insert()` | ~68 | Add `@isHighYield` param and field to INSERT |
| `update()` | ~93 | Add `isHighYield = @isHighYield` to UPDATE |
| `searchByContent()` | If exists | Add `isHighYield` to SELECT |

**Row Parser Update:**
```typescript
// In parseNotebookBlockRow() or equivalent
isHighYield: row.isHighYield === 1
```

---

### 3. New IPC Handlers

**File: `electron/ipc-handlers.ts`**

```typescript
// Toggle high yield status (NEW)
'notebookBlocks:toggleHighYield': (blockId: string) => IpcResult<NotebookBlock>

// Get blocks with optional high-yield filter (MODIFY existing)
'notebookBlocks:getByPage': (pageId: string, highYieldOnly?: boolean) => IpcResult<NotebookBlock[]>
```

**File: `electron/preload.ts`** - Expose new handler:
```typescript
notebookBlocks: {
  // ... existing methods
  toggleHighYield: (blockId: string) => ipcRenderer.invoke('notebookBlocks:toggleHighYield', blockId),
}
```

**File: `src/types/electron.d.ts`** - Add type:
```typescript
notebookBlocks: {
  // ... existing methods
  toggleHighYield: (blockId: string) => Promise<IpcResult<NotebookBlock>>;
  getByPage: (pageId: string, highYieldOnly?: boolean) => Promise<IpcResult<NotebookBlock[]>>;
}
```

---

### 4. Rename "Archive" to "Library" (UI only)

No database changes - just string replacements in UI components.

**Complete file list with specific locations:**

| File | Lines/Locations | Text to Change |
|------|-----------------|----------------|
| `src/components/layout/Sidebar.tsx` | Navigation item | "Archive" → "Library" label |
| `src/components/inbox/InboxView.tsx` | ~251 | `"Batch Archive Successful"` → `"Batch Move to Library Successful"` |
| `src/components/inbox/InboxView.tsx` | ~256 | `"Batch Archive Partial"` → `"Batch Move to Library Partial"` |
| `src/components/inbox/InboxView.tsx` | ~313 | `title: "Archived"` → `title: "Moved to Library"` |
| `src/components/inbox/InboxView.tsx` | ~321 | `title: "Archive Failed"` → `title: "Move to Library Failed"` |
| `src/components/inbox/InboxView.tsx` | ~350 | `title: "Archived"` → `title: "Moved to Library"` |
| `src/components/inbox/InboxView.tsx` | ~359 | `title: "Archive Failed"` → `title: "Move to Library Failed"` |
| `src/components/inbox/BatchActions.tsx` | ~88-96 | Icon, button label, alert title |
| `src/components/inbox/SourceItemRow.tsx` | ~230-232 | Button title + icon |
| `src/components/source/SourceItemViewerDialog.tsx` | ~175-180 | Button + tooltip |
| `src/components/notebook/article/ArticleContent.tsx` | ~24 | `"Add content from your Archive"` → `"Add content from your Library"` |
| `src/components/CommandPalette.tsx` | ~89 | Add "library" to keywords array |
| `src/components/inbox/StatusGroup.tsx` | ~21 | JSDoc comment |
| `src/components/settings/SettingsView.tsx` | Multiple (~6) | "Purge Raw HTML Archive" → "Purge Raw HTML Library" |
| `src/components/knowledge/KnowledgeBankView.tsx` | UI text | Archive → Library references |

---

## UI Changes Required

### 1. Topic Page Header: View Toggle

Add radio/toggle buttons to switch between "All Notes" and "High Yield Only":

```tsx
// In TopicPageView.tsx and TopicArticleView.tsx header area
<div className="flex items-center gap-2 text-sm">
  <span className="text-muted-foreground">Show:</span>
  <ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
    <ToggleGroupItem value="all">All Notes</ToggleGroupItem>
    <ToggleGroupItem value="highYield">
      <Star className="h-3 w-3 mr-1" />
      High Yield
    </ToggleGroupItem>
  </ToggleGroup>
</div>
```

---

### 2. Block Component: Star Toggle

Add a clickable star icon to each NotebookBlock:

```tsx
// In block rendering (ArticleContent.tsx, NotebookBlock display)
<Button
  variant="ghost"
  size="icon"
  onClick={() => toggleHighYield(block.id)}
  title={block.isHighYield ? "Remove high yield marker" : "Mark as high yield"}
>
  <Star 
    className={cn(
      "h-4 w-4",
      block.isHighYield ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
    )} 
  />
</Button>
```

---

### 3. Topic Page Footer: Write New Note Button

Add a second button alongside "Add from Library":

```tsx
// In TopicPageView.tsx and TopicArticleView.tsx footer
<footer className="p-4 border-t border-border/50 flex items-center gap-3">
  <Button variant="outline" onClick={() => setShowAddBlock(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Add from Library
  </Button>
  
  <Button variant="default" onClick={() => setShowDirectAuthor(true)}>
    <PenLine className="h-4 w-4 mr-2" />
    Write New Note
  </Button>
</footer>
```

---

### 4. New Component: DirectAuthorModal

Full-screen or large modal for writing notes directly into a topic:

```tsx
interface DirectAuthorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicName: string;
  onSave: (block: NotebookBlock) => void;
}

// Features:
// - Large textarea (80% viewport height)
// - Auto-save every 2 seconds
// - Optional callout type selector (clinical pearl, mechanism, etc.)
// - "Done" button
// - Creates NotebookBlock with sourceItemId: null (direct authoring)
```

---

### 5. Navigation Sidebar: Rename Archive → Library

```tsx
// In Sidebar.tsx or navigation component
// Change label from "Archive" to "Library"
<SidebarItem 
  icon={<Library className="h-4 w-4" />}  // Consider changing icon too
  label="Library"  // Was "Archive"
  path="/library"  // Route can stay same or change
/>
```

---

### 6. Card Generation: Prioritize High Yield

When generating cards from a topic page, sort blocks to show ⭐ first:

```typescript
// In card generation logic
const sortedBlocks = [...blocks].sort((a, b) => {
  // High yield blocks first
  if (a.isHighYield && !b.isHighYield) return -1;
  if (!a.isHighYield && b.isHighYield) return 1;
  // Then by position
  return a.position - b.position;
});

// Optional: Show indicator in generation UI
// "5 high-yield blocks will be prioritized for card generation"
```

---

## AI/Card Generation Layer Updates

### 1. AI Task Configuration

**File: `electron/ai/tasks/topic-card-generation.ts`**

**Update Context Interface (~line 14):**
```typescript
export interface TopicCardGenerationContext {
  topicName: string;
  blocks: Array<{
    id: string;
    content: string;
    userInsight?: string;
    calloutType?: 'pearl' | 'trap' | 'caution' | null;
    isHighYield?: boolean;  // NEW
  }>;
}
```

**Update System Prompt (~line 62-104):**
```typescript
systemPrompt: `You are a medical education AI...

Priority Rules:
- Blocks marked as 'pearl', 'trap', OR 'isHighYield' are HIGH PRIORITY
- Always suggest cards for high-yield content first
- Generate 2-3 cards for high-yield blocks, 1-2 for regular blocks
...`
```

**Update buildUserPrompt (~line 106):**
```typescript
buildUserPrompt: ({ topicName, blocks }: TopicCardGenerationContext) => {
  const blocksText = blocks.map((b, i) => {
    const labels = [];
    if (b.calloutType) labels.push(b.calloutType.toUpperCase());
    if (b.isHighYield) labels.push('HIGH-YIELD');  // NEW
    const label = labels.length ? ` [${labels.join(', ')}]` : '';
    return `Block ${i + 1}${label}:\n${b.content}${b.userInsight ? `\n\nUser insight: ${b.userInsight}` : ''}`;
  }).join('\n\n---\n\n');

  return `Topic: ${topicName}\n\nBlocks:\n${blocksText}`;
}
```

---

### 2. AI Service Layer

**File: `electron/ai-service.ts`**

**Update `generateCardsFromTopic()` signature (~line 1355):**
```typescript
export async function generateCardsFromTopic(
  topicName: string,
  blocks: Array<{
    id: string;
    content: string;
    userInsight?: string;
    calloutType?: 'pearl' | 'trap' | 'caution' | null;
    isHighYield?: boolean;  // NEW
  }>,
): Promise<TopicCardSuggestion[]>
```

---

### 3. IPC Handler for Card Generation

**File: `electron/ipc-handlers.ts` (~line 2447)**

The handler receives blocks from UI - no changes needed if blocks array is passed through correctly. Verify the type allows `isHighYield`.

---

### 4. UI Components for Card Generation

**File: `src/components/notebook/cardgen/TopicCardGeneration.tsx` (~line 39)**

```typescript
const fetchSuggestions = useCallback(async () => {
  const blocksPayload = blocks.map((b) => ({
    id: b.id,
    content: b.content,
    userInsight: b.userInsight,
    calloutType: b.calloutType,
    isHighYield: b.isHighYield,  // NEW: Include from block data
  }));

  const result = await window.api.ai.generateCardsFromTopic(topicName, blocksPayload);
  // ... rest of function
}, [blocks, topicName]);
```

---

### 5. Type Definition for IPC

**File: `src/types/electron.d.ts` (~line 374)**

```typescript
generateCardsFromTopic: (
  topicName: string,
  blocks: Array<{
    id: string;
    content: string;
    userInsight?: string;
    calloutType?: 'pearl' | 'trap' | 'caution' | null;
    isHighYield?: boolean;  // NEW
  }>
) => Promise<IpcResult<TopicCardSuggestion[]>>;
```

---

### 6. Optional: Visual Indicator for High-Yield Source

**File: `src/components/notebook/cardgen/SuggestedCardItem.tsx`**

Consider adding a badge when a suggested card comes from a high-yield block:
```tsx
{suggestion.sourceBlockHighYield && (
  <Badge variant="outline" className="text-xs">
    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
    High-Yield Source
  </Badge>
)}
```

This requires adding `sourceBlockHighYield?: boolean` to the `TopicCardSuggestion` type.

---

## Migration Path (Implementation Order)

### Phase 1: Database Foundation (P0 - Must complete first)

| Step | File | Task |
|------|------|------|
| 1.1 | `electron/database/migrations/v22.ts` | Create migration: ADD COLUMN isHighYield, CREATE INDEX |
| 1.2 | `electron/database/migrations/index.ts` | Register v22 in migration runner |
| 1.3 | `electron/database/types.ts` | Add `isHighYield` to `DbNotebookBlock` and `NotebookBlockRow` |
| 1.4 | `src/types/index.ts` | Add `isHighYield: boolean` to `NotebookBlock` interface |
| 1.5 | `electron/database/notebook-blocks.ts` | Update ALL queries: SELECT, INSERT, UPDATE + row parser |

### Phase 2: IPC & Store Layer (P0 - Required for UI)

| Step | File | Task |
|------|------|------|
| 2.1 | `electron/ipc-handlers.ts` | Add `notebookBlocks:toggleHighYield` handler |
| 2.2 | `electron/ipc-handlers.ts` | Modify `notebookBlocks:getByPage` to accept `highYieldOnly` filter |
| 2.3 | `electron/preload.ts` | Expose `toggleHighYield` method |
| 2.4 | `src/types/electron.d.ts` | Add types for new/modified IPC methods |
| 2.5 | `src/store/useAppStore.ts` | Add `toggleBlockHighYield` action (calls IPC, updates local state) |

### Phase 3: Star Toggle UI (P1 - Core feature)

| Step | File | Task |
|------|------|------|
| 3.1 | `src/components/notebook/article/ArticleContent.tsx` | Add star button to block rendering |
| 3.2 | `src/components/notebook/NotebookBlock.tsx` | Add star button (if separate component exists) |
| 3.3 | Wire up store action | Connect star button → `toggleBlockHighYield` |
| 3.4 | Visual feedback | Filled yellow star = high yield, outline = not |

### Phase 4: View Toggle (P1 - Core feature)

| Step | File | Task |
|------|------|------|
| 4.1 | `src/components/notebook/TopicPageView.tsx` | Add view mode state (`'all'` \| `'highYield'`) |
| 4.2 | `src/components/notebook/article/TopicArticleView.tsx` | Add view mode state |
| 4.3 | Add ToggleGroup UI | "All Notes" / "High Yield" toggle in header |
| 4.4 | Filter logic | Filter blocks array based on view mode |
| 4.5 | `src/store/useAppStore.ts` | Persist view preference (or use localStorage) |

### Phase 5: Direct Authoring (P2 - New capability)

| Step | File | Task |
|------|------|------|
| 5.1 | `src/components/notebook/DirectAuthorModal.tsx` | Create new modal component |
| 5.2 | `src/components/notebook/TopicPageView.tsx` | Add "Write New Note" button to footer |
| 5.3 | `src/components/notebook/article/TopicArticleView.tsx` | Add "Write New Note" button to footer |
| 5.4 | `electron/database/notebook-blocks.ts` | Verify INSERT handles `sourceItemId: null` |
| 5.5 | Auto-save | Implement 2-second debounced auto-save |

### Phase 6: AI/Card Generation Updates (P2 - Enhancement)

| Step | File | Task |
|------|------|------|
| 6.1 | `electron/ai/tasks/topic-card-generation.ts` | Update context interface with `isHighYield` |
| 6.2 | `electron/ai/tasks/topic-card-generation.ts` | Update system prompt for priority rules |
| 6.3 | `electron/ai/tasks/topic-card-generation.ts` | Update `buildUserPrompt` to include HIGH-YIELD label |
| 6.4 | `electron/ai-service.ts` | Update `generateCardsFromTopic` signature |
| 6.5 | `src/components/notebook/cardgen/TopicCardGeneration.tsx` | Pass `isHighYield` in blocks payload |
| 6.6 | `src/types/electron.d.ts` | Update IPC type for `generateCardsFromTopic` |

### Phase 7: Archive → Library Rename (P3 - Polish)

| Step | File | Task |
|------|------|------|
| 7.1 | `src/components/layout/Sidebar.tsx` | Change nav label |
| 7.2 | `src/components/inbox/InboxView.tsx` | ~8 string replacements |
| 7.3 | `src/components/inbox/BatchActions.tsx` | Button label, alert title |
| 7.4 | `src/components/inbox/SourceItemRow.tsx` | Button title |
| 7.5 | `src/components/source/SourceItemViewerDialog.tsx` | Button + tooltip |
| 7.6 | `src/components/notebook/article/ArticleContent.tsx` | Help text |
| 7.7 | `src/components/CommandPalette.tsx` | Add "library" keyword |
| 7.8 | `src/components/settings/SettingsView.tsx` | ~6 string replacements |
| 7.9 | `src/components/knowledge/KnowledgeBankView.tsx` | UI text |
| 7.10 | `src/components/inbox/StatusGroup.tsx` | JSDoc comment |

### Phase 8: Polish & Indicators (P3 - Nice to have)

| Step | File | Task |
|------|------|------|
| 8.1 | Topic page header | Show "X high-yield blocks" count indicator |
| 8.2 | `src/components/notebook/cardgen/SuggestedCardItem.tsx` | Optional: High-yield source badge |
| 8.3 | Help text & tooltips | Update throughout app |
| 8.4 | Testing | Verify all workflows end-to-end |

---

## Zustand Store Updates

**File: `src/store/useAppStore.ts`**

Add the following action:

```typescript
// In store interface
toggleBlockHighYield: (blockId: string) => Promise<void>;

// In store implementation
toggleBlockHighYield: async (blockId: string) => {
  const result = await window.api.notebookBlocks.toggleHighYield(blockId);
  if (result.error) {
    console.error('Failed to toggle high yield:', result.error);
    return;
  }

  // Update local state - find and update the block in notebookBlocks array
  set((state) => ({
    notebookBlocks: state.notebookBlocks.map((block) =>
      block.id === blockId ? { ...block, isHighYield: result.data.isHighYield } : block
    ),
  }));
},
```

**Optional: View mode preference**

```typescript
// In store interface
highYieldViewMode: 'all' | 'highYield';
setHighYieldViewMode: (mode: 'all' | 'highYield') => void;

// In store implementation (with localStorage persistence)
highYieldViewMode: (localStorage.getItem('highYieldViewMode') as 'all' | 'highYield') || 'all',
setHighYieldViewMode: (mode) => {
  localStorage.setItem('highYieldViewMode', mode);
  set({ highYieldViewMode: mode });
},
```

---

## What Stays The Same

- **Inbox triage flow:** Quick Capture → Inbox → Process later (unchanged)
- **Source types:** QBank, PDF, article, quickcapture, manual (unchanged)
- **Card generation from Notebook:** Still the only path to cards (unchanged)
- **FSRS scheduling:** Completely unchanged
- **Canonical topics:** Still normalized via CanonicalTopic table (unchanged)
- **Search:** Works across Library and Notebook (unchanged)

---

## Success Criteria

After implementation:

1. **Zero "where does this go?" decisions** - Library is sources, Notebook is notes
2. **Write freely, mark later** - Users can dump everything, star what matters when ready
3. **Board prep mode** - One toggle to see only high-yield material
4. **Smarter card generation** - AI prioritizes starred content
5. **Preserved detail** - Detailed notes don't disappear, just filter out during review
6. **Direct authoring** - Lecture notes go straight to the right topic page

---

## Reference App Patterns

This architecture mirrors successful patterns from:

| App | Pattern We're Adopting |
|-----|------------------------|
| **Notion** | Properties (toggles) over locations |
| **Obsidian** | Write in place, not in staging area |
| **Readwise** | Source library + personal highlights |
| **AMBOSS** | View all ↔ high-yield toggle |

---

## Appendix: Complete File Change List

### Tier 0: Database Layer (8 files)

| File | Change Type | Description |
|------|-------------|-------------|
| `electron/database/migrations/v22.ts` | **NEW** | Migration: ADD COLUMN, CREATE INDEX |
| `electron/database/migrations/index.ts` | Modify | Register v22 migration |
| `electron/database/types.ts` | Modify | Add isHighYield to DbNotebookBlock, NotebookBlockRow |
| `electron/database/notebook-blocks.ts` | Modify | Update 6+ query methods, add row parser |
| `src/types/index.ts` | Modify | Add isHighYield to NotebookBlock interface |
| `electron/ipc-handlers.ts` | Modify | Add toggleHighYield handler, modify getByPage |
| `electron/preload.ts` | Modify | Expose toggleHighYield method |
| `src/types/electron.d.ts` | Modify | Add IPC types for notebookBlocks and ai methods |

### Tier 1: Store Layer (1 file)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/store/useAppStore.ts` | Modify | Add toggleBlockHighYield action, optional viewMode state |

### Tier 2: AI/Card Generation Layer (4 files)

| File | Change Type | Description |
|------|-------------|-------------|
| `electron/ai/tasks/topic-card-generation.ts` | Modify | Update context, prompt, buildUserPrompt |
| `electron/ai-service.ts` | Modify | Update generateCardsFromTopic signature |
| `src/components/notebook/cardgen/TopicCardGeneration.tsx` | Modify | Pass isHighYield in blocks payload |
| `src/components/notebook/cardgen/SuggestedCardItem.tsx` | Optional | Add high-yield source badge |

### Tier 3: Core UI Components (4 files)

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/notebook/TopicPageView.tsx` | Modify | Add view toggle, Write Note button, filter logic |
| `src/components/notebook/article/TopicArticleView.tsx` | Modify | Add view toggle, Write Note button, filter logic |
| `src/components/notebook/article/ArticleContent.tsx` | Modify | Add star toggle button to blocks |
| `src/components/notebook/DirectAuthorModal.tsx` | **NEW** | Full-screen note writing modal |

### Tier 4: Archive → Library Rename (10 files)

| File | Change Type | # Changes |
|------|-------------|-----------|
| `src/components/layout/Sidebar.tsx` | Rename | 1 |
| `src/components/inbox/InboxView.tsx` | Rename | ~8 |
| `src/components/inbox/BatchActions.tsx` | Rename | ~3 |
| `src/components/inbox/SourceItemRow.tsx` | Rename | ~2 |
| `src/components/inbox/StatusGroup.tsx` | Rename | 1 (JSDoc) |
| `src/components/source/SourceItemViewerDialog.tsx` | Rename | ~2 |
| `src/components/notebook/article/ArticleContent.tsx` | Rename | 1 |
| `src/components/CommandPalette.tsx` | Rename | 1 (add keyword) |
| `src/components/settings/SettingsView.tsx` | Rename | ~6 |
| `src/components/knowledge/KnowledgeBankView.tsx` | Rename | ~2 |

### Summary

| Category | New Files | Modified Files | Total |
|----------|-----------|----------------|-------|
| Database Layer | 1 | 7 | 8 |
| Store Layer | 0 | 1 | 1 |
| AI Layer | 0 | 4 | 4 |
| Core UI | 1 | 3 | 4 |
| Rename (Polish) | 0 | 10 | 10 |
| **TOTAL** | **2** | **25** | **27** |

---

## Questions & Decisions Log

**Q: Should high-yield be per-block or per-card?**
A: Per-block. Cards are ephemeral (regeneratable), blocks are the source of truth.

**Q: Default state for new blocks?**
A: Not high-yield (unmarked). User marks as they learn.

**Q: Can users generate cards from non-high-yield blocks?**
A: Yes. High-yield is just sorting priority, not a blocker.

**Q: Should we migrate existing Notebook blocks to high-yield automatically?**
A: No. Start unmarked, let users mark as they review.

**Q: Keep "Archive" in code/database but show "Library" in UI?**
A: Yes. SourceItem status values stay same (`inbox`, `processed`, `curated`), just UI labels change.

**Q: Does the current INSERT handler support `sourceItemId: null` for direct authoring?**
A: VERIFY BEFORE PHASE 5. Check `notebookBlocks:create` handler. If not, modify to allow nullable sourceItemId.

**Q: Where should view mode preference be persisted?**
A: localStorage via Zustand store. Key: `highYieldViewMode`, values: `'all'` | `'highYield'`.

**Q: Should "pearl" and "trap" calloutTypes auto-set isHighYield?**
A: No. Keep them independent. Pearl/trap are semantic labels for card generation prompts. High-yield is a user-controlled filter toggle. A user might have a "pearl" they don't consider high-yield for boards.

---

## Implementation Verification Checklist

Before marking each phase complete, verify:

### Phase 1 Verification
- [ ] Migration runs without error on fresh DB
- [ ] Migration runs without error on existing DB with data
- [ ] `isHighYield` defaults to 0 (false) for existing blocks
- [ ] Index created successfully

### Phase 2 Verification
- [ ] `toggleHighYield` IPC works: toggles 0→1→0
- [ ] `getByPage` returns all blocks when no filter
- [ ] `getByPage` returns only high-yield blocks when `highYieldOnly: true`
- [ ] Store action updates local state correctly

### Phase 3 Verification
- [ ] Star button renders on all blocks
- [ ] Clicking star toggles visual state immediately
- [ ] Database persists the change
- [ ] Page refresh shows correct star state

### Phase 4 Verification
- [ ] Toggle switches between "All" and "High Yield" views
- [ ] Filter correctly hides non-high-yield blocks
- [ ] Empty state shown when no high-yield blocks exist
- [ ] View preference persists across sessions

### Phase 5 Verification
- [ ] DirectAuthorModal opens from button
- [ ] Can type and save a note
- [ ] Block created with `sourceItemId: null`
- [ ] Auto-save works (check network/DB writes)
- [ ] Block appears in topic page after save

### Phase 6 Verification
- [ ] AI prompt includes HIGH-YIELD label for marked blocks
- [ ] Card suggestions prioritize high-yield blocks
- [ ] Non-high-yield blocks still generate cards

### Phase 7 Verification
- [ ] All "Archive" text replaced with "Library"
- [ ] No console errors from missing references
- [ ] Command palette finds Library with "library" keyword

---

## Copilot Implementation Prompts

Use these prompts with GitHub Copilot Chat to implement each phase. Run them in order. After each prompt, verify the changes compile and meet the verification checklist.

---

### Prompt 1.1: Create Migration v22

```
Create a new database migration file at electron/database/migrations/v22.ts

This migration should:
1. Add an `isHighYield` column to the NotebookBlock table (INTEGER NOT NULL DEFAULT 0)
2. Create a compound index on (notebookTopicPageId, isHighYield) for efficient filtering

Follow the exact pattern used in existing migrations like v21.ts or v20.ts in the same folder. The migration should export a function that takes the database instance and runs the ALTER TABLE and CREATE INDEX statements.

Reference the existing migration pattern in electron/database/migrations/ for the correct structure.
```

---

### Prompt 1.2: Register Migration in Index

```
Update electron/database/migrations/index.ts to register the new v22 migration.

Import v22 from './v22' and add it to the migrations array in the correct order (after v21). Follow the existing pattern for how migrations are registered and executed.
```

---

### Prompt 1.3: Update Database Types

```
Update electron/database/types.ts to add the isHighYield field:

1. In the DbNotebookBlock interface, add: isHighYield: number; (SQLite stores booleans as 0/1)
2. In the NotebookBlockRow interface, add: isHighYield: number | null;

These interfaces define the database-level types. The field should NOT be optional since the migration sets a default value.
```

---

### Prompt 1.4: Update Frontend Types

```
Update src/types/index.ts to add isHighYield to the NotebookBlock interface.

Add: isHighYield: boolean;

This is the frontend representation where SQLite's 0/1 is converted to a proper boolean. Make it required (not optional) since all blocks will have this field after migration.
```

---

### Prompt 1.5: Update Notebook Block Queries

```
Update electron/database/notebook-blocks.ts to support the isHighYield field.

Changes needed:

1. Add `isHighYield` to the SELECT column list in ALL query functions:
   - getByPage()
   - getById()
   - getBySourceId()
   - getBySourceDetailed()
   - Any other SELECT queries

2. In the insert() function, add isHighYield to the INSERT statement:
   - Add @isHighYield to the parameter list
   - Add isHighYield to the column list
   - Default to 0 if not provided

3. In the update() function, include isHighYield in the UPDATE statement

4. In the row parser function (where NotebookBlockRow is converted to NotebookBlock), add:
   isHighYield: row.isHighYield === 1

Search for all places where NotebookBlock rows are mapped/parsed and ensure isHighYield is converted from number to boolean.
```

---

### Prompt 2.1: Add Toggle High Yield IPC Handler

```
Add a new IPC handler in electron/ipc-handlers.ts for toggling the high yield status of a notebook block.

Handler name: 'notebookBlocks:toggleHighYield'
Parameter: blockId (string)
Returns: IpcResult<NotebookBlock>

Implementation:
1. Get the current block by ID
2. Toggle the isHighYield value (0 becomes 1, 1 becomes 0)
3. Update the block in the database
4. Return the updated block

Follow the existing IPC handler patterns in the file. Use a try/catch and return { data, error: null } on success or { data: null, error: message } on failure.
```

---

### Prompt 2.2: Modify getByPage for High Yield Filter

```
Modify the existing 'notebookBlocks:getByPage' IPC handler in electron/ipc-handlers.ts to accept an optional highYieldOnly filter parameter.

Current signature: (pageId: string)
New signature: (pageId: string, highYieldOnly?: boolean)

When highYieldOnly is true, add a WHERE clause to filter: WHERE isHighYield = 1

The database query in notebook-blocks.ts may need a new variant or parameter to support this filtering. Choose the cleanest approach - either modify the existing getByPage function or create a getByPageFiltered variant.
```

---

### Prompt 2.3: Expose Toggle in Preload

```
Update electron/preload.ts to expose the new toggleHighYield method.

In the notebookBlocks object within contextBridge.exposeInMainWorld, add:

toggleHighYield: (blockId: string) => ipcRenderer.invoke('notebookBlocks:toggleHighYield', blockId),

Also update the getByPage method signature if needed to pass through the optional highYieldOnly parameter.
```

---

### Prompt 2.4: Add IPC Types

```
Update src/types/electron.d.ts to add TypeScript types for the new/modified IPC methods.

In the notebookBlocks section of the ElectronAPI interface, add/modify:

toggleHighYield: (blockId: string) => Promise<IpcResult<NotebookBlock>>;
getByPage: (pageId: string, highYieldOnly?: boolean) => Promise<IpcResult<NotebookBlock[]>>;

Make sure NotebookBlock is imported if not already.
```

---

### Prompt 2.5: Add Store Action

```
Update src/store/useAppStore.ts to add a toggleBlockHighYield action.

Add to the store interface:
toggleBlockHighYield: (blockId: string) => Promise<void>;

Add to the store implementation:
toggleBlockHighYield: async (blockId: string) => {
  const result = await window.api.notebookBlocks.toggleHighYield(blockId);
  if (result.error) {
    console.error('Failed to toggle high yield:', result.error);
    return;
  }

  // Update local state - find the block in whatever state slice holds notebook blocks
  // and update its isHighYield property to match result.data.isHighYield
  set((state) => ({
    // Update the appropriate state slice that contains notebook blocks
    // This may be notebookBlocks, currentTopicBlocks, or similar - check existing state shape
  }));
},

Look at how other block-related actions update state and follow the same pattern.
```

---

### Prompt 3.1: Add Star Toggle to Block Display

```
Update src/components/notebook/article/ArticleContent.tsx to add a star toggle button to each notebook block.

Add a clickable star icon button to the block header or action area:

1. Import Star from lucide-react
2. Import the toggleBlockHighYield action from useAppStore
3. Add a Button with variant="ghost" size="icon" that calls toggleBlockHighYield(block.id)
4. Style the star based on block.isHighYield:
   - If true: className="fill-yellow-400 text-yellow-400" (filled star)
   - If false: className="text-muted-foreground" (outline star)
5. Add appropriate title/aria-label: "Mark as high yield" or "Remove high yield marker"

Place the star button in a consistent location with other block actions (edit, delete, etc).
```

---

### Prompt 4.1-4.4: Add View Toggle to Topic Page

```
Update src/components/notebook/article/TopicArticleView.tsx to add a view mode toggle for filtering blocks.

1. Add local state for view mode:
   const [viewMode, setViewMode] = useState<'all' | 'highYield'>('all');

2. Add a ToggleGroup in the header area (near the topic title or toolbar):
   <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
     <ToggleGroupItem value="all">All Notes</ToggleGroupItem>
     <ToggleGroupItem value="highYield">
       <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
       High Yield
     </ToggleGroupItem>
   </ToggleGroup>

3. Filter the blocks array before rendering:
   const filteredBlocks = viewMode === 'highYield'
     ? blocks.filter(b => b.isHighYield)
     : blocks;

4. Add an empty state when filtering shows no results:
   {filteredBlocks.length === 0 && viewMode === 'highYield' && (
     <div className="text-center text-muted-foreground py-8">
       No high-yield blocks yet. Click the star icon on any block to mark it as high-yield.
     </div>
   )}

5. Show a count indicator: "{filteredBlocks.length} blocks" or "3 high-yield blocks"

Import ToggleGroup and ToggleGroupItem from shadcn/ui (or create if not exists).
```

---

### Prompt 5.1: Create Direct Author Modal

```
Create a new component at src/components/notebook/DirectAuthorModal.tsx for writing notes directly into a topic page.

Props interface:
interface DirectAuthorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  topicName: string;
  pageId: string;
  onSave: (block: NotebookBlock) => void;
}

Features:
1. Large modal (Dialog from shadcn/ui) with 80% viewport height
2. Header showing "New Note for {topicName}"
3. Large Textarea for content (auto-focus, full width)
4. Optional calloutType selector (pearl, trap, caution, or none)
5. Checkbox to mark as high-yield immediately
6. Auto-save with 2-second debounce (save draft to localStorage)
7. "Done" button that:
   - Creates a NotebookBlock via window.api.notebookBlocks.create()
   - Sets sourceItemId to null (direct authoring)
   - Calls onSave with the new block
   - Closes the modal
8. "Cancel" button that discards and closes

Use existing modal patterns from the codebase. The block should be created with sourceItemId: null to indicate it's directly authored, not extracted from a Library source.
```

---

### Prompt 5.2-5.3: Add Write Note Button

```
Update src/components/notebook/article/TopicArticleView.tsx to add a "Write New Note" button.

1. Import the DirectAuthorModal component
2. Add state for the modal: const [showDirectAuthor, setShowDirectAuthor] = useState(false);
3. Add a button in the footer area (alongside any existing "Add from Library" button):
   <Button variant="default" onClick={() => setShowDirectAuthor(true)}>
     <PenLine className="h-4 w-4 mr-2" />
     Write New Note
   </Button>
4. Render the modal:
   <DirectAuthorModal
     open={showDirectAuthor}
     onOpenChange={setShowDirectAuthor}
     topicId={topic.id}
     topicName={topic.name}
     pageId={page.id}
     onSave={(newBlock) => {
       // Add to local blocks state or refetch
       setShowDirectAuthor(false);
     }}
   />

Import PenLine from lucide-react.
```

---

### Prompt 6.1-6.3: Update AI Task Configuration

```
Update electron/ai/tasks/topic-card-generation.ts to support isHighYield in card generation.

1. Update the context interface to include isHighYield:
   blocks: Array<{
     id: string;
     content: string;
     userInsight?: string;
     calloutType?: 'pearl' | 'trap' | 'caution' | null;
     isHighYield?: boolean;  // Add this
   }>;

2. Update the system prompt to mention high-yield priority:
   Add to the priority rules section:
   "- Blocks marked with isHighYield: true are HIGH PRIORITY for card generation
    - Always suggest cards for high-yield content
    - Blocks marked as 'pearl', 'trap', OR isHighYield are all considered high priority"

3. Update buildUserPrompt to label high-yield blocks:
   In the block mapping, add a [HIGH-YIELD] label:
   const labels = [];
   if (b.calloutType) labels.push(b.calloutType.toUpperCase());
   if (b.isHighYield) labels.push('HIGH-YIELD');
   const labelStr = labels.length ? ` [${labels.join(', ')}]` : '';

   Then include labelStr in the block output.
```

---

### Prompt 6.4-6.6: Update AI Service and UI

```
Update the card generation flow to pass isHighYield through the entire chain:

1. In electron/ai-service.ts, update the generateCardsFromTopic function signature to accept isHighYield in the blocks array parameter.

2. In src/components/notebook/cardgen/TopicCardGeneration.tsx, when building the blocks payload to send to the AI, include isHighYield:
   const blocksPayload = blocks.map((b) => ({
     id: b.id,
     content: b.content,
     userInsight: b.userInsight,
     calloutType: b.calloutType,
     isHighYield: b.isHighYield,  // Add this
   }));

3. In src/types/electron.d.ts, update the generateCardsFromTopic type definition to include isHighYield in the blocks array type.
```

---

### Prompt 7: Archive to Library Rename

```
Rename all user-facing "Archive" text to "Library" across the UI.

Files to update:
1. src/components/layout/Sidebar.tsx - Change navigation label from "Archive" to "Library"
2. src/components/inbox/InboxView.tsx - Replace all "Archive" strings:
   - "Batch Archive Successful" → "Batch Move to Library Successful"
   - "Archived" → "Moved to Library"
   - "Archive Failed" → "Move to Library Failed"
   - Similar patterns throughout
3. src/components/inbox/BatchActions.tsx - Update button label and alerts
4. src/components/inbox/SourceItemRow.tsx - Update button title
5. src/components/source/SourceItemViewerDialog.tsx - Update button and tooltip
6. src/components/notebook/article/ArticleContent.tsx - "Add content from your Archive" → "Add content from your Library"
7. src/components/CommandPalette.tsx - Add "library" to keywords array for the Archive/Library command
8. src/components/settings/SettingsView.tsx - "Purge Raw HTML Archive" → "Purge Raw HTML Library"
9. src/components/knowledge/KnowledgeBankView.tsx - Update any Archive references

Do NOT change:
- Database column names or values
- Code variable names (unless they're user-visible strings)
- SourceItem status values ('inbox', 'processed', 'curated')

Only change user-facing strings that appear in the UI.
```

---

### Prompt 8.1: Add High-Yield Count Indicator

```
Update src/components/notebook/article/TopicArticleView.tsx to show a count of high-yield blocks.

Add a small indicator near the view toggle or in the header that shows:
- When viewing all: "12 blocks (3 high-yield)"
- When viewing high-yield only: "3 high-yield blocks"

Example implementation:
const highYieldCount = blocks.filter(b => b.isHighYield).length;

<span className="text-sm text-muted-foreground">
  {viewMode === 'all'
    ? `${blocks.length} blocks${highYieldCount > 0 ? ` (${highYieldCount} high-yield)` : ''}`
    : `${highYieldCount} high-yield blocks`
  }
</span>
```

---

## Progress Tracking

| Phase | Prompt | Status | Verified |
|-------|--------|--------|----------|
| 1.1 | Migration v22 | [ ] | [ ] |
| 1.2 | Register migration | [ ] | [ ] |
| 1.3 | Database types | [ ] | [ ] |
| 1.4 | Frontend types | [ ] | [ ] |
| 1.5 | Query updates | [ ] | [ ] |
| 2.1 | Toggle IPC handler | [ ] | [ ] |
| 2.2 | getByPage filter | [ ] | [ ] |
| 2.3 | Preload expose | [ ] | [ ] |
| 2.4 | IPC types | [ ] | [ ] |
| 2.5 | Store action | [ ] | [ ] |
| 3.1 | Star toggle UI | [ ] | [ ] |
| 4.1-4.4 | View toggle | [ ] | [ ] |
| 5.1 | DirectAuthorModal | [ ] | [ ] |
| 5.2-5.3 | Write Note button | [ ] | [ ] |
| 6.1-6.3 | AI task config | [ ] | [ ] |
| 6.4-6.6 | AI service/UI | [ ] | [ ] |
| 7 | Archive→Library rename | [ ] | [ ] |
| 8.1 | Count indicator | [ ] | [ ] |
