# T208: Cleanup + Deprecation - Implementation Prompts

> **Goal:** Remove deprecated components and IPC handlers that are no longer used after Notebook v2 implementation.

---

## Overview

Phase 8 cleans up legacy code that has been replaced by the new Intake Quiz system:

| Category | Items to Remove |
|----------|-----------------|
| **Components** | `InsightTextarea`, `CardWorthinessPanel`, `ExistingBlocksList`, `AddToNotebookWorkflow` |
| **IPC Handlers** | `ai:evaluateInsight`, `ai:polishInsight`, `ai:generateCards`, `ai:generateCardsFromTopic` |
| **Modals** | `CardGenerationModal`, parts of `AddSourceToTopicModal` |

---

## Dependency Analysis

Before deletion, we need to update components that still import deprecated code:

| File | Uses | Action |
|------|------|--------|
| `BlockEditModal.tsx` | `InsightTextarea` | Replace with simple `Textarea` |
| `AddSourceToTopicModal.tsx` | `InsightTextarea` | Replace with simple `Textarea` |
| `CardGenerationModal.tsx` | `CardWorthinessPanel`, `ai:generateCards` | **Delete entire file** |
| `AddToNotebookWorkflow.tsx` | Multiple deprecated | **Delete entire file** |
| `TopicCardGeneration.tsx` | `ai:generateCardsFromTopic` | Keep but update to use new card creation |
| `QuickCaptureModal.tsx` | References `AddToNotebookWorkflow` in comments | Update comments |

---

## PROMPT GROUP A: Update BlockEditModal.tsx

**File:** `src/components/notebook/BlockEditModal.tsx`

### Task:
Replace `InsightTextarea` import with standard shadcn `Textarea`. The `InsightTextarea` was just a styled wrapper - we can use `Textarea` directly.

### Changes:

1. Remove import:
```typescript
// DELETE THIS LINE:
import { InsightTextarea } from "./InsightTextarea";
```

2. Add import:
```typescript
import { Textarea } from "@/components/ui/textarea";
```

3. Replace the `<InsightTextarea>` usage with `<Textarea>`:

Find:
```tsx
<InsightTextarea
  value={content}
  onChange={setContent}
  placeholder="What did you learn from this?"
  className="min-h-[120px]"
/>
```

Replace with:
```tsx
<Textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="What did you learn from this?"
  className="min-h-[120px] resize-none"
/>
```

Note: `InsightTextarea` used `onChange={setValue}` directly, but `Textarea` uses standard React `onChange={(e) => setValue(e.target.value)}`.

---

## PROMPT GROUP B: Update AddSourceToTopicModal.tsx

**File:** `src/components/notebook/AddSourceToTopicModal.tsx`

### Task:
Replace `InsightTextarea` with standard `Textarea`.

### Changes:

1. Remove import:
```typescript
// DELETE THIS LINE:
import { InsightTextarea } from "./InsightTextarea";
```

2. Add import (if not present):
```typescript
import { Textarea } from "@/components/ui/textarea";
```

3. Replace `<InsightTextarea>` usage:

Find:
```tsx
<InsightTextarea
  value={insight}
  onChange={setInsight}
  placeholder="What's the key takeaway?"
  className="min-h-[100px]"
/>
```

Replace with:
```tsx
<Textarea
  value={insight}
  onChange={(e) => setInsight(e.target.value)}
  placeholder="What's the key takeaway?"
  className="min-h-[100px] resize-none"
/>
```

---

## PROMPT GROUP C: Update TopicCardGeneration.tsx

**File:** `src/components/notebook/cardgen/TopicCardGeneration.tsx`

### Task:
The `ai:generateCardsFromTopic` handler is being deprecated. However, `TopicCardGeneration` is still useful for batch card generation from topic pages. We need to update it to use the new card creation flow.

### Option 1: Keep and Update (Recommended)
Update to use `window.api.cards.create()` directly instead of the AI batch generator. The component can iterate through selected blocks and create cards.

### Option 2: Delete
If batch generation from topic pages is no longer needed (since cards are created during intake), delete the entire `cardgen/` folder.

### For Option 1 - Update the generation logic:

Replace:
```typescript
const result = await window.api.ai.generateCardsFromTopic(topicName, blocks);
```

With direct card creation logic that:
1. For each selected block, extract key content
2. Create cards with appropriate activation status
3. Use `window.api.cards.create()` for each card

**Note:** This is a larger refactor. If the feature is not critical, consider Option 2 (deletion) for now and re-implement later if needed.

---

## PROMPT GROUP D: Delete Deprecated Components

**Files to delete:**

```
src/components/notebook/InsightTextarea.tsx
src/components/notebook/CardWorthinessPanel.tsx
src/components/notebook/ExistingBlocksList.tsx
src/components/notebook/AddToNotebookWorkflow.tsx
src/components/notebook/CardGenerationModal.tsx
```

### Bash commands:
```bash
rm src/components/notebook/InsightTextarea.tsx
rm src/components/notebook/CardWorthinessPanel.tsx
rm src/components/notebook/ExistingBlocksList.tsx
rm src/components/notebook/AddToNotebookWorkflow.tsx
rm src/components/notebook/CardGenerationModal.tsx
```

**Important:** Only run these deletions AFTER Groups A and B are complete (they remove the imports).

---

## PROMPT GROUP E: Remove Deprecated IPC Handlers

**File:** `electron/ipc-handlers.ts`

### Task:
Remove the following IPC handler registrations:

1. `ai:evaluateInsight` (around line 2850)
2. `ai:polishInsight` (around line 2900)
3. `ai:generateCards` (around line 2968)
4. `ai:generateCardsFromTopic` (around line 2989)

### How to find them:
Search for each handler name and delete the entire `ipcMain.handle(...)` block including its closing `);`.

Example pattern to delete:
```typescript
ipcMain.handle(
  "ai:evaluateInsight",
  async (_, input: { ... }): Promise<IpcResult<...>> => {
    // ... handler implementation ...
  }
);
```

---

## PROMPT GROUP F: Remove Deprecated Preload API

**File:** `electron/preload.ts`

### Task:
Remove the following from the `ai` object in the preload API:

1. `evaluateInsight` method
2. `polishInsight` method
3. `generateCards` method
4. `generateCardsFromTopic` method

Find the `ai: {` section and remove these methods while keeping the new quiz-related methods (`extractFacts`, `generateQuiz`, `gradeAnswer`).

---

## PROMPT GROUP G: Update electron.d.ts Types

**File:** `src/types/electron.d.ts`

### Task:
Remove the type definitions for deprecated API methods:

1. Remove `evaluateInsight` type definition
2. Remove `polishInsight` type definition (if present)
3. Remove `generateCards` type definition (if present)
4. Remove `generateCardsFromTopic` type definition

Keep the new methods: `extractFacts`, `generateQuiz`, `gradeAnswer`.

---

## PROMPT GROUP H: Clean Up Comments

**File:** `src/components/modals/QuickCaptureModal.tsx`

### Task:
Update or remove comments that reference `AddToNotebookWorkflow`:

Find comments like:
```typescript
// Store the saved item and open AddToNotebookWorkflow
// Show AddToNotebookWorkflow after a brief delay to allow modal transition
```

Update to reference the new `IntakeQuizModal` or remove if no longer relevant.

---

## Parallel Execution Plan

**Phase 1 - Can run in parallel:**
- **Group A** (BlockEditModal update)
- **Group B** (AddSourceToTopicModal update)
- **Group C** (TopicCardGeneration decision/update)
- **Group H** (QuickCaptureModal comments)

**Phase 2 - After Phase 1 completes:**
- **Group D** (Delete deprecated components)

**Phase 3 - Can run in parallel:**
- **Group E** (Remove IPC handlers)
- **Group F** (Remove preload API)
- **Group G** (Update types)

---

## Testing Checklist

After all changes:

- [ ] `npm run typecheck` passes (or `npx tsc --noEmit`)
- [ ] App starts without errors
- [ ] Inbox → Add to Notebook works (uses IntakeQuizModal)
- [ ] Quick Capture → Add to Notebook works
- [ ] Topic Page → Block Edit works (uses updated Textarea)
- [ ] No console errors about missing handlers
- [ ] No imports of deleted components remain

---

## Rollback Plan

If something breaks:
1. All deleted files are in git history
2. Run `git checkout HEAD -- <file>` to restore any file
3. IPC handlers can be restored from git history

---

## Summary

| Group | Files | Action | Dependencies |
|-------|-------|--------|--------------|
| A | BlockEditModal.tsx | Update imports | None |
| B | AddSourceToTopicModal.tsx | Update imports | None |
| C | TopicCardGeneration.tsx | Update or delete | None |
| D | 5 component files | Delete | A, B complete |
| E | ipc-handlers.ts | Remove handlers | D complete |
| F | preload.ts | Remove API methods | D complete |
| G | electron.d.ts | Remove types | D complete |
| H | QuickCaptureModal.tsx | Update comments | None |
