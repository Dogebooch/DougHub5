# DougHub MVP Screens & Design - v2 Architecture

## Design Philosophy & Research Foundation

### Core Design Principle
**3-layer architecture (Knowledge Bank → Notebook → Cards) with enforced card-creation constraint and card-worthiness gating.**

### User Reality Constraints
- **Post-shift exhaustion:** Zero tolerance for admin work, complex decisions
- **<20 second capture requirement:** Hard constraint for session initiation
- **≤2 clicks maximum:** For any core workflow
- **Card anxiety:** Minimize low-yield cards through AI gatekeeping

### Research-Based Design Insights
- **5-7 navigation options max** to avoid overwhelming users
- **Smart Views** provide filtered access without manual organization
- **Search-first interfaces** eliminate folder hierarchies
- **Command palette patterns** (Ctrl+K) for power users
- **Vertical list MVP** - grid deferred (research shows lists better for scanning)

---

## MVP Screen Architecture

### DECISION: 2 Screens + Smart View Sidebar
*Based on Linear UI patterns and Things 3 Smart Lists paradigm*

---

## Screen 1: Unified Workspace

### Layout Structure
```
┌─ DougHub ─────────────────────────────────────────────────────────┐
│ [≡] [🔍 Search... Ctrl+K]                          [⚙️] [👤]      │
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
│                   │  └──────────────────────────────────────────┘ │
├───────────────────┴───────────────────────────────────────────────┤
│  ✓ Auto-saved • 847 cards • 156 sources     [⚡ Quick Capture Ctrl+⇧S]│
└───────────────────────────────────────────────────────────────────┘
```

### Smart Views (Sidebar)
| View | Filter | Badge |
|------|--------|-------|
| **Inbox** | status='inbox' | Count |
| **Today** | Due cards + recent captures | Count |
| **Queue** | Quick Captures pending | Count |
| **Notebook** | All NotebookTopicPages | - |
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
- **Primary action:** "Add to Notebook" (NOT "Create Card")
- **Button hierarchy:** Primary (purple), Secondary (gray), Destructive (icon + confirm)

---

## Notebook Topic Page View

### Layout Structure
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
├──────────────────────────────────────────────────────────────────┤
│  [+ Add from Knowledge Bank]              [Generate All Cards]   │
└──────────────────────────────────────────────────────────────────┘
```
- **Blocks** are excerpts from SourceItems (deep-linked)
- **"Generate Card"** is ONLY available here (enforced constraint)
- **Topic aliasing** shown at top (HOCM = "Hypertrophic Cardiomyopathy")

---

## Card-Worthiness Gate (Before Card Creation)

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
- **Rubric:** Board-relevant? Testable? Discriminative?
- **AI suggestion** but user makes final decision
- **Prevents low-yield card anxiety**

---

## Screen 2: Review Interface

### Layout Structure
```
┌─ REVIEW ──────────────────────────────────────────────────────────┐
│  Card 3/15 • #cardiology • ████████░░░░ 47%          [← Back]    │
├──────────────────────────────────────────────────────────────────┤
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

### Key Review Features
- **No grading buttons:** FSRS handles all scheduling automatically
- **Source context:** Always shows linked NotebookTopicPage
- **Provenance:** Card → Notebook → Source always traceable
- **Low-ease flagging:** Cards with repeated failures flagged for fix

---

## Overlay System (Modal Context)

### Quick Capture Modal (Ctrl+Shift+S)
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
│                         Ctrl+Enter                               │
│                                                                  │
│  Zero decisions. Process later when rested.                      │
└──────────────────────────────────────────────────────────────────┘
```
**Purpose:** Zero-friction capture when exhausted
**Trigger:** Ctrl+Shift+S from anywhere
**Flow:** Paste → Save to Inbox → Creates SourceItem (status: inbox) → Close

### Settings Overlay  
```
┌─ Settings ────────────────────┐
│                               │
│ ☑ Dark mode                   │
│ ☑ Auto-backup enabled         │
│ ⚙️ FSRS Parameters (Advanced) │
│                               │
│ Export Data                   │
│ Import from Anki              │
│                               │
│ [Close]                       │
└───────────────────────────────┘
```
**Philosophy:** Hidden by default, minimal configuration
**Focus:** Doug's "zero tolerance for admin work"

### Command Palette (Ctrl+K)
```
┌─ Quick Actions ──────────────────────────────────────────────────┐
│  > search cardiac                                                │
│                                                                  │
│  RECENT                                                          │
│  ○ Open: HOCM Notes                               ↵              │
│  ○ Review: Cardiology                             ↵              │
│                                                                  │
│  NAVIGATION                                                      │
│  ○ Go to Inbox                                   Ctrl+1          │
│  ○ Go to Today                                   Ctrl+2          │
│  ○ Go to Notebook                                Ctrl+3          │
│                                                                  │
│  ACTIONS                                                         │
│  ○ Quick Capture                                    Ctrl+Shift+S    │
│  ○ Start Review                                  Ctrl+R          │
│  ○ New Topic Page                                Ctrl+N          │
│                                                                  │
│  SEARCH RESULTS                                                  │
│  ○ cardiac output calculation                    📄              │
│  ○ cardiac tamponade                             📚              │
└──────────────────────────────────────────────────────────────────┘
```
**Trigger:** Ctrl+K (universal shortcut)
**Purpose:** Keyboard-first navigation, search across all entities

---

## Workflow Modes (v2 Architecture)

### Mode 1: Capture (Zero Friction)
```
Any source → Quick Capture OR Paste/Import
         → SourceItem created (status: inbox)
         → AI auto-suggests: title, topics, tags
         → Single "Save" persists everything
         → Appears in Inbox Smart View
```
**Time Target:** <20 seconds
**Outcome:** SourceItem in Knowledge Bank (inbox)

### Mode 2: Organize/Curate (When Rested)
```
Browse Inbox → Select item → "Add to Notebook"
           → Choose/create Topic
           → Edit excerpt if needed
           → Save to NotebookTopicPage
           → Item status → curated
           → Deep link preserved
```
**When:** User has mental energy to curate

### Mode 3: Create Cards (From Notebook Only)
```
Open Topic Page → Select block(s) → "Generate Card(s)"
              → AI suggests card format
              → Card-worthiness gate evaluates
              → User confirms/edits/discards
              → Card created with provenance links
```
**Constraint:** Cards can ONLY be generated from NotebookTopicPage blocks

### Mode 4: Review (Zero Decisions)
```
Click "Today" or "Start Review" → Review queue
                               → Show Answer (Space)
                               → Continue (Enter) OR I Forgot (F)
                               → FSRS auto-schedules
                               → Low-ease flagged for fix
```
**Flow:** Sequential, no grading decisions, automatic scheduling

---

## Visual Design System

### Palette
- **Nature-inspired olive/sage:** Grounding earth tones reduce cognitive load for post-shift study
- **Manila paper aesthetic:** Pastel olive backgrounds, analog study feel
- **High contrast:** 4.5:1 min for readability when fatigued

### Typography & Layout
- **Font:** Inter, medical terminology friendly
- **Whitespace:** Generous—reduces visual overwhelm
- **Feedback:** "Saved ✓" for 2s, subtle AI processing indicators

---

## Desktop Interaction Patterns

### Keyboard-First
- Every mouse action has keyboard equivalent
- Escape cancels, Enter confirms, Arrow keys navigate

### Discovery
- **Hover:** Show shortcuts, previews, context
- **Right-click:** Edit, link, duplicate, convert actions
- **Drag & drop:** Auto-extract from browser, images, files

*Performance requirements and validation criteria in `docs/DougHub Success Metrics.md`. Implementation tasks in Taskmaster.*