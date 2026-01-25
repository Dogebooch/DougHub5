# Notebook Redesign Handoff Document

**Created:** January 25, 2026
**Purpose:** Continue Notebook redesign implementation in a new chat session

---

## Executive Summary

The Notebook module is being redesigned from a block-card UI to an AMBOSS-inspired prose-based reading experience. This is a **UX layer change**, not a data model change. The current block-based architecture supports this redesign - blocks simply render as flowing content without visible boundaries.

**Tasks Created:** T139-T143 (all pending)
**Dependencies:** T139 → T140 → T141, T140 → T142, T143 has no dependencies

---

## Design Philosophy

### Inspirations
- **AMBOSS**: Topic pages, board relevance badges, clean prose
- **Bear**: Typography, warm colors, focused writing
- **Notion**: Slash commands, inline editing
- **Things 3**: Hover actions, subtle interactions

### Core Principles
1. **Reading-focused** - Content flows like medical articles, not flashcard piles
2. **Surfaces weak areas automatically** - Smart sections show topics needing attention
3. **One decision point** - Batch card generation instead of per-block decisions
4. **User in control** - AI assists but never overrides

---

## Three-Screen Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  TOPIC BROWSER  │ ──▶  │  TOPIC ARTICLE  │ ──▶  │ CARD GENERATION │
│    (Screen 1)   │      │    (Screen 2)   │      │    (Screen 3)   │
│                 │      │                 │      │                 │
│ Smart sections: │      │ AMBOSS-style    │      │ AI suggests     │
│ - Needs Attn    │      │ prose with:     │      │ multiple cards  │
│ - Recently Upd  │      │ - Callouts      │      │ User batch      │
│ - All Topics    │      │ - Footnotes     │      │ selects/creates │
│   by domain     │      │ - Board stats   │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Screen 1: Topic Browser (T139)

**Replaces:** `TopicPageList.tsx`
**Creates:** `TopicBrowser.tsx` + section components

### Layout Mockup
```
┌─────────────────────────────────────────────────────────────────┐
│  Notebook                                   [Search] [+ New Topic] │
├─────────────────────────────────────────────────────────────────┤
│  Search topics...                                        [Cmd+K] │
│                                                                 │
│  NEEDS ATTENTION                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Acute MI              62% accuracy • 3 new sources     │   │
│  │  Status Epilepticus    45% accuracy • Low-ease cards    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECENTLY UPDATED                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CHF Management            Updated 2h ago • 15 cards    │   │
│  │  Pneumonia Workup          Updated yesterday • 8 cards  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ALL TOPICS                                          [A-Z v]   │
│  > Cardiology (4)                                              │
│      Acute MI • CHF • Arrhythmias • HOCM                       │
│  > Neurology (3)                                               │
│  > Pulmonology (2)                                             │
│                                                                 │
│  47 topics • 156 cards • 89% retention                         │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Sections Logic
- **Needs Attention:** `accuracy < 70%` OR `has low-ease cards (ease < 2.0)` OR `unprocessed sources`
- **Recently Updated:** `updatedAt` within last 7 days
- **All Topics:** Grouped by `CanonicalTopic.domain`, collapsible tree

### Subtasks (9 total)
1. IPC: `getTopicsWithStats` query
2. IPC: `getLowEaseTopics` query
3. TopicBrowser container component
4. NeedsAttentionSection component
5. RecentlyUpdatedSection component
6. DomainGroupedTopics component
7. TopicRow component with hover actions
8. Topic search filtering
9. Footer stats aggregation

### Data Sources
- `getBoardRelevanceForTopic()` - accuracy stats
- `CanonicalTopic.domain` - specialty grouping (already exists in schema)
- `NotebookTopicPage.updatedAt` - recency
- FSRS card data - low-ease detection

---

## Screen 2: Topic Article View (T140)

**Replaces:** `TopicPageView.tsx`
**Creates:** `TopicArticleView.tsx` + content components

### Layout Mockup
```
┌─────────────────────────────────────────────────────────────────┐
│  <- Back to Topics          Acute MI              [Menu] [Gen]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ BOARD RELEVANCE ─────────────────────────[Hide v]────┐     │
│  │  You've seen 8 questions on this topic.               │     │
│  │  Your accuracy: 62% (5/8)                             │     │
│  │  Common exam traps: Troponin timing (missed 2x)       │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  # Acute Myocardial Infarction                                 │
│  _Also known as: STEMI, MI, Heart Attack_                      │
│  _12 cards • 4 sources • Last updated 2h ago_                  │
│                                                                 │
│  ## Biomarkers                                                 │
│                                                                 │
│  Troponin I is the most specific marker for myocardial         │
│  injury, with levels rising **3-6 hours** after onset.^1       │
│                                                                 │
│  ┌─ CLINICAL PEARL ─────────────────────────────────────┐      │
│  │  In renal failure, troponin can be chronically       │      │
│  │  elevated. Look for a rising pattern (>20% change).^2│      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─ EXAM TRAP ──────────────────────────────────────────┐      │
│  │  Always consider posterior MI if inferior STEMI with │      │
│  │  ST depression in V1-V3. Get posterior leads.^4      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ═══════════════════════════════════════════════════════       │
│  SOURCES                                                       │
│  ^1 UWorld Q#1234 - Troponin Timing            [View Source]   │
│  ^2 Clinical Pearl - Dr. Smith                 [View Source]   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [+ Add Content]                         [Generate Cards]       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions
1. **No visible block boundaries** - content flows as prose
2. **Markdown rendering** with headers, bold, lists
3. **Max-width ~720px** for optimal readability
4. **Generous whitespace** (Bear-inspired)

### Callout Types (3)
| Type | Color | Icon | Border |
|------|-------|------|--------|
| Clinical Pearl | emerald-50 | Lightbulb | emerald-500 |
| Exam Trap | amber-50 | AlertTriangle | amber-500 |
| Caution | red-50 | AlertCircle | red-500 |

### Schema Change Required
```sql
-- Migration v19
ALTER TABLE notebook_blocks ADD COLUMN calloutType TEXT;
-- Values: 'pearl' | 'trap' | 'caution' | null
```

### Subtasks (8 total)
1. Schema migration: Add calloutType column
2. TopicArticleView container component
3. ArticleContent prose renderer
4. CalloutBlock component
5. SourceFootnotes component
6. Topic header with aliases and stats
7. Board Relevance Panel integration
8. Add Content and Generate Cards footer

### Rendering Logic
- Blocks with `aiEvaluation.examTrapType` → render as EXAM TRAP callout
- Blocks with `calloutType` set → render as that callout type
- Blocks without callout → regular prose paragraphs
- Source references → footnote superscripts

---

## Screen 3: Card Generation (T142)

**Trigger:** Click [Generate Cards] button on Topic Article
**Creates:** `TopicCardGeneration.tsx` + card components

### Layout Mockup
```
┌─────────────────────────────────────────────────────────────────┐
│  GENERATE CARDS: Acute MI                                 [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI analyzed your topic and suggests these cards:              │
│                                                                 │
│  [x]  CARD 1 - Q&A                                 [Edit] [x]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Q: What is the most specific cardiac biomarker for MI? │   │
│  │  A: Troponin I (rises 3-6h, peaks 12-24h)               │   │
│  │  Source: UWorld Q#1234                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [x]  CARD 2 - Clinical Vignette                   [Edit] [x]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Q: 58M with inferior STEMI. ECG shows ST depression    │   │
│  │     V1-V3. What additional leads should you obtain?     │   │
│  │  A: Posterior leads V7-V9                               │   │
│  │  Source: MKSAP Case                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ ]  CARD 3 - Cloze                               [Edit] [x]  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Door-to-balloon time should be {{c1::<90 minutes}}     │   │
│  │  Source: UpToDate                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Tip: Uncheck cards you don't want. Click Edit to modify.      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Cancel]          Selected: 2 of 3      [Create Selected Cards]│
└─────────────────────────────────────────────────────────────────┘
```

### Key Difference from Current
- **Current:** Generate one card at a time per block, decide per-block
- **New:** Generate all cards for topic at once, batch select, one decision

### Card Types
- **Q&A** - Factual statements
- **Cloze** - Fill-in-the-blank memorization
- **Clinical Vignette** - Exam-style scenarios

### Subtasks (6 total)
1. AI Service: `generateCardsFromTopic` function
2. IPC handlers for topic card generation
3. TopicCardGeneration modal component
4. SuggestedCardItem component
5. CardEditInline component
6. Batch card creation flow

### IPC Needed
```typescript
// AI generates card suggestions from all topic blocks
window.api.generateCardsFromTopic(topicId: string): Promise<SuggestedCard[]>

// Create multiple cards in single transaction
window.api.batchCreateCards(cards: CreateCardParams[]): Promise<Card[]>
```

---

## Inline Editing (T141)

**Priority:** Medium (MVP can use existing modal editing)
**No subtasks** - self-contained medium complexity

### Concept
- Click anywhere in content to enter edit mode
- Slash commands for callouts: `/pearl`, `/trap`, `/caution`
- `/source` opens Archive picker to link sources
- Escape to cancel, Cmd+S to save

### MVP Alternative
For initial implementation, keep using existing `BlockEditModal`. Inline editing is a UX enhancement for Phase 2.

---

## Visual Design System (T143)

**Priority:** Medium
**No subtasks** - low complexity, CSS-focused

### Color Palette (CSS Variables)
```css
--notebook-bg: #FAFAF9;      /* warm off-white, stone-50 */
--notebook-card: #FFFFFF;
--notebook-sidebar: #F5F5F4; /* stone-100 */
--notebook-text: #1C1917;    /* stone-900 */
--notebook-muted: #78716C;   /* stone-500 */
--notebook-accent: #7C3AED;  /* purple-600 */
--notebook-pearl: #059669;   /* emerald-600 */
--notebook-trap: #D97706;    /* amber-600 */
--notebook-caution: #DC2626; /* red-600 */
--notebook-board: #EFF6FF;   /* blue-50 */
```

### Typography Scale
| Element | Class | Size |
|---------|-------|------|
| H1 (Topic) | text-3xl font-bold | 28px |
| H2 (Section) | text-xl font-semibold | 22px |
| Body | text-base leading-relaxed | 16px, 1.6 line-height |
| Meta | text-sm text-muted-foreground | 14px |
| Footnote | text-xs | 12px |

### Content Width
- Max: `max-w-3xl` (720px) for optimal readability
- Padding: `px-6` (24px horizontal)

---

## Implementation Order

### Recommended Sequence
1. **T143** (Visual Design) - Add CSS variables first, minimal effort
2. **T139** (Topic Browser) - Build navigation, surfaces data issues early
3. **T140** (Topic Article) - Core reading experience, depends on T139
4. **T142** (Card Generation) - Depends on T140 being done
5. **T141** (Inline Editing) - Enhancement, can defer if needed

### Critical Path
```
T143 ─┬─> T139 ──> T140 ──> T141
      │            │
      │            └──> T142
      │
      └─> (Can start T143 anytime, no dependencies)
```

---

## Current Architecture Reference

### Key Files
| File | Purpose |
|------|---------|
| `src/components/notebook/TopicPageList.tsx` | Replace with TopicBrowser |
| `src/components/notebook/TopicPageView.tsx` | Replace with TopicArticleView |
| `src/components/notebook/BoardRelevancePanel.tsx` | Keep, reposition |
| `electron/database/notebook-blocks.ts` | Block queries, searchByContent exists |
| `electron/database/canonical-topics.ts` | Topic queries, has domain field |

### Existing Queries to Leverage
```typescript
// Already exists - use for board relevance
getBoardRelevanceForTopic(topicId)

// Already exists - search blocks
searchByContent(query)

// Already exists - topic with aliases
getCanonicalTopicById(id) // includes domain field
```

### Schema (No Changes Except calloutType)
```
CanonicalTopic
├── id, name, domain, aliases, createdAt, updatedAt

NotebookTopicPage
├── id, canonicalTopicId, title, updatedAt

NotebookBlock
├── id, notebookTopicPageId, sourceItemId, content
├── aiEvaluation (JSON with examTrapType, etc.)
├── calloutType (NEW - 'pearl' | 'trap' | 'caution' | null)
└── createdAt, updatedAt
```

---

## Quick Start for New Session

1. **Read this document** to understand the redesign
2. **Check T139 subtasks** in tasks.json for detailed implementation steps
3. **Start with T143** (CSS variables) as a quick win
4. **Then T139.1** (IPC: getTopicsWithStats query) to build data foundation
5. **Build components** following the subtask order

### Useful Commands
```bash
# View pending tasks
npx task-master list --status pending

# Get task details
npx task-master show 139

# Set task status
npx task-master set-status --id 139.1 --status in-progress
```

---

## Reference Files

- **Design Spec:** This document
- **Task Details:** `.taskmaster/tasks/tasks.json` (T139-T143)
- **Workflow Guide:** `docs/Workflow_Guide.ini`
- **Deferred Features:** `docs/DEFERRED.md`
- **Project Instructions:** `CLAUDE.md`
