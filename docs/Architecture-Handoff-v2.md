# DougHub v2 Architecture Handoff

> **Purpose:** Complete context for a future agent to implement the v2 architecture changes.
> **Created:** 2026-01-05
> **Status:** Ready for implementation (docs + Taskmaster updates pending)

---

## Context Summary

Doug (IM/EM resident with ADHD) has redefined the core motivation for DougHub:

**Primary Anxiety:** Extracting information from multiple sources → compiling into one readable place → extracting high-yield content for boards/bedside → converting to effective flashcards.

**New Architecture:** Three-layer system replacing the current single-capture flow:
1. **Knowledge Bank** — Raw capture inbox (multi-source)
2. **Personal Notebook** — Curated topic pages (where learning happens)
3. **Flashcards** — Generated ONLY from Notebook (enforced constraint)

---

## Executive Decisions (D1-D5)

| ID | Decision | Choice | Justification |
|----|----------|--------|---------------|
| **D1** | Data organization | **Smart Views + Tags** (no folders) | Original docs prohibit folder hierarchies. Tags already in schema. Smart Views provide filtered access without manual organization. Aligns with Things 3 paradigm. |
| **D2** | Card creation location | **Notebook-only (enforced)** | User requirement. Prevents low-yield card anxiety. Forces learning through curation. Clean provenance: Source→Notebook→Card |
| **D3** | Screen architecture | **2-screen + deep links** | Wireframes show this. Different mental states (capture vs review) per User Profile. Linear validates pattern. |
| **D4** | Metadata confirmation | **Single "Save" (no separate confirm)** | Reduces decisions. AI formats consistently. User can edit but doesn't have to confirm. Zero admin work. |
| **D5** | MVP list layout | **Vertical list grouped by status** | Research shows lists better for scanning homogeneous items. Easier MVP. Grid deferred. |

---

## Finalized Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: KNOWLEDGE BANK (Inbox/Library)                        │
│  ───────────────────────────────────────────────────────────    │
│  • SourceItems: Raw captures from any source                    │
│  • Statuses: inbox → processed → curated                        │
│  • AI auto-tags, user confirms/edits via single Save            │
│  • Searchable, filterable via Smart Views                       │
│  • CANNOT create cards here (enforced)                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   User selects, adds to topic
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: PERSONAL NOTEBOOK (Curated Topics)                    │
│  ───────────────────────────────────────────────────────────    │
│  • NotebookTopicPages: User-created canonical topics            │
│  • Contains excerpts/blocks from SourceItems (deep-linked)      │
│  • Topic aliasing: HOCM = "Hypertrophic Cardiomyopathy"         │
│  • THIS is where flashcards are created                         │
│  • Card-worthiness gate before creation                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   AI generates, user confirms
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: FLASHCARDS (Study Deck)                               │
│  ───────────────────────────────────────────────────────────    │
│  • Cards linked to NotebookTopicPage (provenance)               │
│  • FSRS scheduling, zero-decision review                        │
│  • Low-ease detection → "fix card" flow                         │
│  • Board-miss tracking → topic suggestions                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model v3 (Entities & Relations)

```typescript
// NEW: Raw capture from any source
interface SourceItem {
  id: string;
  sourceType: 'qbank' | 'article' | 'pdf' | 'image' | 'audio' | 'quickcapture' | 'manual';
  sourceName: string;           // "UWorld", "UpToDate", "Sketchy"
  sourceUrl?: string;
  title: string;                // AI-suggested, user-editable
  rawContent: string;           // Original text/markdown
  mediaPath?: string;           // For binary files (images, audio)
  transcription?: string;       // OCR/audio transcription (deferred)

  // Metadata (AI-suggested, user-editable)
  canonicalTopicIds: string[];  // Links to CanonicalTopic
  tags: string[];
  questionId?: string;          // For QBank sources

  // Status
  status: 'inbox' | 'processed' | 'curated';

  // Timestamps
  createdAt: string;
  processedAt?: string;
}

// NEW: Canonical topic with alias normalization
interface CanonicalTopic {
  id: string;
  canonicalName: string;        // "Hypertrophic Cardiomyopathy"
  aliases: string[];            // ["HOCM", "HCM", "hypertrophic cardiomyopathy"]
  domain: string;               // "cardiology"
  parentTopicId?: string;       // For hierarchy (optional)
  createdAt: string;
}

// NEW: Curated topic page in Notebook
interface NotebookTopicPage {
  id: string;
  canonicalTopicId: string;     // Links to CanonicalTopic
  blocks: NotebookBlock[];      // Excerpts from sources
  cardIds: string[];            // Cards generated from this page
  createdAt: string;
  updatedAt: string;
}

interface NotebookBlock {
  id: string;
  sourceItemId: string;         // Deep link to source
  content: string;              // Excerpt text
  annotations?: string;         // User notes
  mediaPath?: string;           // Image with annotations
  position: number;             // Order in page
}

// UPDATED: Card with provenance
interface Card {
  id: string;
  front: string;
  back: string;
  notebookTopicPageId: string;  // REQUIRED: Where it was created
  sourceBlockId?: string;       // Specific block it came from
  cardType: CardType;
  tags: string[];
  // ... existing FSRS fields
}

// NEW: Smart View definition
interface SmartView {
  id: string;
  name: string;
  icon: string;
  filter: SmartViewFilter;
  sortBy: string;
  isSystem: boolean;            // Built-in vs user-created
}

interface SmartViewFilter {
  status?: string[];
  sourceType?: string[];
  topicIds?: string[];
  tags?: string[];
  hasLowEase?: boolean;
  isBoardMiss?: boolean;
}
```

---

## UI/UX Specification

### Screen 1: Unified Workspace

```
┌─ DougHub ─────────────────────────────────────────────────────────┐
│ [≡] [🔍 Search... ⌘K]                              [⚙️] [👤]      │
├───────────────────┬───────────────────────────────────────────────┤
│                   │                                               │
│  SMART VIEWS      │  MAIN CONTENT AREA                           │
│  ─────────────    │  (adapts to selected view)                   │
│  📥 Inbox (5)     │                                               │
│  📅 Today (12)    │  ┌─ INBOX ──────────────────────────────────┐ │
│  📋 Queue         │  │                                          │ │
│  📚 Notebook      │  │  [─ Today ─────────────────────────────] │ │
│  🏷️ Topics        │  │  ┌────────────────────────────────────┐  │ │
│  📊 Stats         │  │  │ 📄 UWorld Q#1234                   │  │ │
│                   │  │  │    Cardiology • inbox              │  │ │
│  ─────────────    │  │  │    [Add to Notebook ▼] [Open] [🗑️] │  │ │
│  WEAK TOPICS      │  │  └────────────────────────────────────┘  │ │
│  ⚠️ HOCM (3)      │  │  ┌────────────────────────────────────┐  │ │
│  ⚠️ HF (2)        │  │  │ 🖼️ Anatomy - Knee                  │  │ │
│                   │  │  │    Orthopedics • inbox             │  │ │
│                   │  │  │    [Add to Notebook ▼] [Open] [🗑️] │  │ │
│                   │  │  └────────────────────────────────────┘  │ │
│                   │  │                                          │ │
│                   │  │  [─ Yesterday ──────────────────────────]│ │
│                   │  │  ...                                     │ │
│                   │  └──────────────────────────────────────────┘ │
│                   │                                               │
├───────────────────┴───────────────────────────────────────────────┤
│  ✓ Auto-saved • 847 cards • 156 sources     [⚡ Quick Capture ⌘⇧S]  │
└───────────────────────────────────────────────────────────────────┘
```

### Sidebar Smart Views (System)

| View | Filter | Badge |
|------|--------|-------|
| **Inbox** | status='inbox' | Count |
| **Today** | Due cards + recent captures | Count |
| **Queue** | Quick Captures pending | Count |
| **Notebook** | All topic pages | - |
| **Topics** | CanonicalTopic browser | - |
| **Stats** | Dashboard | - |
| **Weak Topics** | Topics with low-ease cards | Count |

### Source Item Row (Vertical List)

```
┌──────────────────────────────────────────────────────────────────┐
│ [📄] UWorld Q#1234 - Troponin in Acute MI                        │
│      Cardiology • STEMI • inbox • 2 hours ago                    │
│      [Add to Notebook ▼]  [Open]  [🗑️]                           │
└──────────────────────────────────────────────────────────────────┘
```

- **Icon** indicates source type (📄 text, 🖼️ image, 🎤 audio, ⚡ quick)
- **Title** AI-generated or user-edited
- **Tags** shown as pills, topic as link
- **Actions**: Primary = "Add to Notebook", Secondary = "Open", Destructive = icon + confirm

### Notebook Topic Page View

```
┌─ Topic: Acute MI ─────────────────────────────────────────────────┐
│  Aliases: STEMI, Myocardial Infarction                           │
│  Cards: 12 • Sources: 4 • Last updated: 2h ago                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ From: UWorld Q#1234 ───────────────────────────────────────┐ │
│  │ "Troponin I is the most specific marker for myocardial      │ │
│  │  injury, with levels rising 3-6 hours after onset..."       │ │
│  │                                                              │ │
│  │ [Edit] [→ Source] [Generate Card]                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ From: UpToDate ────────────────────────────────────────────┐ │
│  │ "Door-to-balloon time should be <90 minutes..."             │ │
│  │                                                              │ │
│  │ [Edit] [→ Source] [Generate Card]                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Image: 12-Lead ECG ────────────────────────────────────────┐ │
│  │ [ECG image with ST elevation marked]                        │ │
│  │                                                              │ │
│  │ [Annotate] [→ Source] [Generate Card]                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [+ Add from Knowledge Bank]              [Generate All Cards]   │
└──────────────────────────────────────────────────────────────────┘
```

### Card-Worthiness Gate (Before Card Creation)

```
┌─ Card Quality Check ─────────────────────────────────────────────┐
│                                                                  │
│  "What is the most specific marker for myocardial injury?"       │
│  → Troponin I                                                    │
│                                                                  │
│  ┌─ AI Assessment ──────────────────────────────────────────────┐│
│  │ ✓ Board-relevant (high-yield for Step 2/3)                   ││
│  │ ✓ Testable (clear right answer)                              ││
│  │ ✓ Discriminative (distinguishes from similar concepts)       ││
│  │ ⚠️ Consider: "Why troponin vs CK-MB?" for deeper learning    ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Recommendation: ✅ CREATE CARD                                  │
│                                                                  │
│  [Create Card]  [Keep as Note Only]  [Edit First]  [Discard]    │
└──────────────────────────────────────────────────────────────────┘
```

### Screen 2: Review Interface

```
┌─ REVIEW ──────────────────────────────────────────────────────────┐
│  Card 3/15 • #cardiology • ████████░░░░ 47%          [← Back]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│         ┌────────────────────────────────────────────┐           │
│         │                                            │           │
│         │  What causes LVOT obstruction in HOCM?     │           │
│         │                                            │           │
│         │           [ Show Answer ]                  │           │
│         │               Space                        │           │
│         │                                            │           │
│         └────────────────────────────────────────────┘           │
│                                                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  📄 From: "HOCM Notes" • 🔗 4 related cards                      │
└──────────────────────────────────────────────────────────────────┘
```

### After Answer Reveal

```
│         ┌────────────────────────────────────────────┐           │
│         │  What causes LVOT obstruction in HOCM?     │           │
│         │  ─────────────────────────────────────     │           │
│         │  Systolic anterior motion (SAM) of the     │           │
│         │  mitral valve leaflet due to Venturi       │           │
│         │  effect from rapid ejection through        │           │
│         │  narrowed outflow tract.                   │           │
│         │                                            │           │
│         │  [Continue]  [I Forgot]  [Edit]  [Skip]    │           │
│         │    Enter       F          E        S       │           │
│         └────────────────────────────────────────────┘           │
│                                                                  │
│  💡 FSRS handles scheduling automatically                        │
```

### Quick Capture Modal (⌘⇧S)

```
┌─ Quick Capture ─────────────────────────────────────────────────────┐
│                                                          [×]     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Paste anything here...                                      ││
│  │                                                              ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Tags: #cardiology [×]  [+ Add]                                  │
│                                                                  │
│                    [ 💾 Save to Inbox ]                          │
│                         ⌘Enter                                   │
│                                                                  │
│  Zero decisions. Process later when rested.                      │
└──────────────────────────────────────────────────────────────────┘
```

### Command Palette (⌘K)

```
┌─ Quick Actions ──────────────────────────────────────────────────┐
│  > search cardiac                                                │
│                                                                  │
│  RECENT                                                          │
│  ○ Open: HOCM Notes                               ↵              │
│  ○ Review: Cardiology                             ↵              │
│                                                                  │
│  NAVIGATION                                                      │
│  ○ Go to Inbox                                   ⌘1              │
│  ○ Go to Today                                   ⌘2              │
│  ○ Go to Notebook                                ⌘3              │
│                                                                  │
│  ACTIONS                                                         │
│  ○ Quick Capture                                    ⌘⇧S             │
│  ○ Start Review                                  ⌘R              │
│  ○ New Topic Page                                ⌘N              │
│                                                                  │
│  SEARCH RESULTS                                                  │
│  ○ cardiac output calculation                    📄              │
│  ○ cardiac tamponade                             📚              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Workflow Modes

### Mode 1: Capture (Zero Friction)

```
Any source → Quick Capture OR Paste/Import
         → SourceItem created (status: inbox)
         → AI auto-suggests: title, topics, tags
         → Single "Save" persists everything
         → Appears in Inbox Smart View
```

### Mode 2: Organize/Curate (When Rested)

```
Browse Inbox → Select item → "Add to Notebook"
           → Choose/create Topic
           → Edit excerpt if needed
           → Save to NotebookTopicPage
           → Item status → curated
           → Deep link preserved
```

### Mode 3: Create Cards (From Notebook Only)

```
Open Topic Page → Select block(s) → "Generate Card(s)"
              → AI suggests card format
              → Card-worthiness gate evaluates
              → User confirms/edits/discards
              → Card created with provenance links
```

### Mode 4: Review (Zero Decisions)

```
Click "Today" or "Start Review" → Review queue
                               → Show Answer (Space)
                               → Continue (Enter) OR I Forgot (F)
                               → FSRS auto-schedules
                               → Low-ease flagged for fix
```

---

## Task List for Taskmaster

### Core MVP Tasks (T1-T9)

| ID | Task | Priority | Dependencies | Complexity |
|----|------|----------|--------------|------------|
| **T1** | Data model v3: SourceItem, CanonicalTopic, NotebookTopicPage, SmartView schemas | High | None | Medium |
| **T1.1** | Topic normalization: alias table, matching rules, dedupe prevention | High | T1 | Medium |
| **T1.2** | Metadata schema: minimal fields, AI templates per source type | Medium | T1 | Low |
| **T2** | Capture pipeline: Quick Capture → SourceItem (inbox), text + image support | High | T1 | Medium |
| **T2.1** | Inbox UI: persistent indicator, count badge, batch triage actions | High | T2 | Medium |
| **T3** | Knowledge Bank UI: vertical list grouped by status, search, filters | High | T2.1 | Medium |
| **T3.1** | Node editor: single Save, deep-link support, metadata editing | Medium | T3 | Low |
| **T4** | Notebook UI: topic pages, add blocks from sources, enforce card-creation here only | High | T3 | High |
| **T4.1** | Card generation from notebook: AI suggests, card-worthiness gate | High | T4 | High |
| **T5** | Card-worthiness gate: rubric (board-relevant? testable? discriminative?), UI | High | T4.1 | Medium |
| **T6** | FSRS integration: scheduling fields, review UI, response time tracking | High | T4.1 | Medium |
| **T6.1** | Low-ease detection: flag repeatedly-hard cards, route to fix flow | Medium | T6 | Low |
| **T7** | Board question tracking: ingest missed Q's, map to topics, suggest deep-dive | Medium | T1.1, T4 | Medium |
| **T8** | Smart Views: system views (Inbox, Today, Queue, Weak Topics), filter engine | High | T1 | Medium |
| **T9** | UI/UX rules: button hierarchy, destructive confirmations, naming patterns | Medium | None | Low |

### Deferred Tasks (D-1 to D-10)

| ID | Task | Notes |
|----|------|-------|
| **D-1** | Image transcription OCR, diagram handling, image-occlusion editor | Design now, implement later |
| **D-2** | Audio transcription pipeline | Design schema field now |
| **D-3** | Source material editing: highlighting, selection → notebook | Post-MVP |
| **D-4** | AI "textbook chapter" synthesis per topic | Post-MVP |
| **D-5** | First-run onboarding, best practices guidance | Post-MVP |
| **D-6** | Case discussion mode: input case → AI extracts learning points | Post-MVP |
| **D-7** | Dashboard: mastery heatmap, review stats | Post-MVP |
| **D-8** | Quick Capture from camera (mobile) | Mobile version |
| **D-9** | Advanced prioritization: board-yield estimation | Post-MVP |
| **D-10** | Multi-domain topic mapping, cross-links | Post-MVP |

---

## Document Update Instructions

### Vision Doc Updates
- Reframe around 3-layer architecture: Knowledge Bank → Notebook → Cards
- Add "minimize card burden" as core principle
- Add "notebook-only card creation" as enforced constraint
- Add topic standardization/aliasing strategy
- Update MVP scope to include capture pipeline + inbox triage

### User Profile Updates
- Add dual intent: Board-prep facts + Clinical practice pearls
- Add anxiety about too many low-yield cards
- Add preference for AI card-worthiness gatekeeping

### Success Metrics Updates
- Add: Time-to-capture (<20s)
- Add: Inbox zero rate
- Add: Cards created per curated hour
- Add: % low-ease cards resolved
- Add: Topic coverage + weak-topic closure rate

### CLAUDE.md Updates
Add rules:
- No PRD regeneration
- Preserve minimal schema
- Prioritize canonical topics (use CanonicalTopic, not raw strings)
- Notebook-only card creation
- Single-save node pattern
- Vertical list for MVP
- Button hierarchy (primary purple, secondary gray, destructive icon+confirm)
- User override always available

### MVP Screens Doc Updates
- Replace current screens with Unified Workspace + Review
- Add Knowledge Bank UI spec
- Add Notebook Topic Page spec
- Add Card-worthiness gate spec
- Add Smart Views sidebar spec

---

## Key Constraints Summary (For Future Agents)

1. **Canonical Topics** — All topic references use CanonicalTopic with alias normalization. Never store raw topic strings on cards.

2. **Minimize Card Burden** — Card-worthiness gate evaluates every card before creation. AI + user decide together.

3. **Notebook-Only Card Creation** — Cards can ONLY be generated from NotebookTopicPage blocks. Enforced in UI (no "Create Card" in Knowledge Bank).

4. **Quick Capture Inbox** — All captures go to inbox first. Processing is separate step when user has energy.

5. **Deep Links** — Notebook blocks link back to SourceItems. Cards link to NotebookTopicPage + block. Provenance always traceable.

6. **Single Save Pattern** — No separate "Confirm Metadata" step. User edits metadata + content together, single Save persists both.

7. **Vertical List MVP** — Knowledge Bank uses vertical list grouped by status. Grid deferred.

8. **Button Hierarchy** — Primary (purple), Secondary (gray), Destructive (icon-only + confirm dialog).

9. **FSRS + Low-Ease Flagging** — Track response time, detect "ease hell", route to fix flow.

10. **Board-Miss → Topic Suggestions** — Missed QBank questions map to weak topics, suggest Notebook deep-dive.

---

## Existing Codebase Context

### Current Stack
- Electron 29+ (main: better-sqlite3)
- React 18 + TypeScript 5.4 strict
- Zustand for state
- TailwindCSS + shadcn/ui
- ts-fsrs for scheduling

### Current Views (src/stores/useAppStore.ts)
- `capture` — CaptureInterface
- `review` — ReviewInterface
- `settings` — Placeholder

### Current Schema (electron/database.ts)
- `cards` — With FSRS fields, cardType, parentListId
- `notes` — Title, content, cardIds, tags
- `quick_dumps` — **DEPRECATED** - Superseded by source_items with sourceType='quickcapture'
- `source_items` — v3 Knowledge Bank: sourceType, status, canonicalTopicIds, tags
- `canonical_topics` — Topic normalization with aliases
- `notebook_topic_pages` — Curated topic pages with blocks
- `connections` — Semantic links between notes
- `review_logs` — Rating, responseTimeMs, partialCreditScore

### Data Migration Decision (2026-01-05)
The `quick_dumps` table is superseded by `source_items`. Quick Capture saves should:
1. Create a SourceItem with `sourceType: 'quickcapture'` and `status: 'inbox'`
2. Generate title from first 50 chars of content
3. The migration function `migrateToV3()` already handles existing quick_dumps data

**Recommendation:** Keep `quick_dumps` table for backward compatibility during transition,
but all new Quick Captures should write to `source_items`. The Sidebar "Queue" count should
query `source_items WHERE sourceType='quickcapture' AND status='inbox'`.

### Key Files to Modify
- `electron/database.ts` — Add new tables
- `src/types/index.ts` — Add new interfaces
- `src/stores/useAppStore.ts` — Add new views, actions
- `src/components/layout/AppLayout.tsx` — New sidebar, views
- New components needed: KnowledgeBank, Notebook, SourceItem, TopicPage, SmartViewSidebar

---

## Next Steps for Implementing Agent

1. **Update Taskmaster** — Insert T1-T9 in dependency order. Add D-1 to D-10 as deferred. Do NOT regenerate from PRD.

2. **Update CLAUDE.md** — Add new rules from constraints summary.

3. **Update Vision/User Profile/Success Metrics docs** — Per instructions above.

4. **Update MVP Screens doc** — Replace with new UI specs.

5. **Begin T1** — Data model v3 schema implementation.

---

## Sources Referenced

- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Things 3 Smart Lists](https://culturedcode.com/things/support/articles/4001304/)
- [DEVONthink Knowledge Management](https://www.devontechnologies.com/apps/devonthink)
- [Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)
- [List vs Grid UI Cheat Sheet](https://uxdesign.cc/ui-cheat-sheet-list-vs-grids-48151a7262a7)
- [PKM Goals and Methods 2025](https://www.glukhov.org/post/2025/07/personal-knowledge-management/)
