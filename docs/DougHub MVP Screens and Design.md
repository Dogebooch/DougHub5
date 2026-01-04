# DougHub MVP Screens & Design - Final Specifications

## Design Philosophy & Research Foundation

### Core Design Principle
**Eliminate 10+ minutes of decision paralysis per study session through AI suggestions + instant confirmation while preserving user agency.**

### User Reality Constraints
- **Post-shift exhaustion:** Zero tolerance for admin work, complex decisions
- **<20 second capture requirement:** Hard constraint for session initiation  
- **≤2 clicks maximum:** For any core workflow
- **Decision fatigue:** Must work when cognitively depleted

### Research-Based Design Insights
- **5-7 navigation options max** to avoid overwhelming users
- **Single adaptive screen** preferred over multiple separate screens
- **Search-first interfaces** eliminate folder hierarchies  
- **Command palette patterns** (Cmd+K) for power users
- **Progressive disclosure** reveals complexity only when requested

---

## MVP Screen Architecture

### DECISION: 2 Primary Screens + Overlay System
*Based on Apple's design consolidation principles and exhausted user constraints*

---

## Screen 1: Unified Workspace (Primary Interface)

### Layout Philosophy
**Things 3 + Linear hybrid:** Single adaptive interface that changes context while maintaining consistent navigation

### Screen Structure
```
┌─ Global Search Bar (Always Visible) ───────────────┐
├─ Quick Actions Row ─────────────────────────────────┤
│  [Quick Dump] [Today's Reviews: 5] [Settings]      │
├─ Main Content Area (Context-Sensitive) ────────────┤
│                                                     │
│  DEFAULT STATE: Capture Interface                  │
│  • Large paste area (prominent focus)              │
│  • AI suggestions appear below paste               │
│  • One-click confirmation workflow                 │
│                                                     │
│  SEARCH STATE: Unified Results                     │
│  • Cards + Notes in single list                    │
│  • Preview on hover, click to open                 │
│                                                     │
│  QUEUE STATE: Extraction Queue                     │
│  • Batch process Quick Dumps                       │
│  • Same guided capture flow                        │
│                                                     │
└─ Status Bar ───────────────────────────────────────┘
   Extraction count • Connection suggestions • Progress
```

### State Management & Transitions
- **Default State:** Capture interface (80% of usage)
- **Search State:** Global search overlays content area  
- **Queue State:** Processing saved Quick Dumps
- **All states preserve:** Search bar + Quick actions always accessible
- **No tabs or complex navigation:** Context switches within same screen

### Navigation Patterns
- **Search-first:** Global search from any state (Cmd+F)
- **One-click Quick Dump:** Always accessible emergency capture
- **Keyboard shortcuts:** Cmd+K command palette for power users
- **Context preservation:** Never lose place when switching states

---

## Screen 2: Review Interface (Secondary Focus)

### Layout Philosophy  
**Dedicated distraction-free space** - no organizational decisions, pure focus on content

### Screen Structure
```
┌─ Progress Indicator ─────────────────────────────────┐
│  Card 3 of 15 • Cardiology • 47% Complete          │
├─ Card Display Area ─────────────────────────────────┤
│                                                      │
│              [CARD CONTENT]                          │
│                                                      │
│         Front: "HOCM Causes"                         │
│         Back: [Hidden until revealed]                │
│                                                      │
├─ Source Context (Subtle Reference) ─────────────────┤
│  From: "Heart Failure Workup" note • 3 related cards│
├─ Review Actions ────────────────────────────────────┤
│  [Show Answer] [Continue] [Edit Source] [Skip]       │
└─ Quick Return ──────────────────────────────────────┘
   [← Back to Workspace]
```

### Key Review Features
- **No grading buttons:** FSRS handles all scheduling automatically
- **Source context:** Always shows linked note for context
- **Partial credit tracking:** Automatic for list cards (3/5, 1/5)
- **Gesture support:** Swipe for next, tap to reveal (future mobile)
- **One-click navigation:** Instant return to Workspace

---

## Overlay System (Modal Context)

### Quick Dump Modal
```
┌─ Quick Save ──────────────────┐
│                               │
│  Paste or type anything       │
│  ┌─────────────────────────┐  │
│  │                         │  │
│  │  [Large content area]   │  │
│  │                         │  │
│  └─────────────────────────┘  │
│                               │
│  [Save for Later] [Cancel]    │
│  ✓ Saved automatically       │
└───────────────────────────────┘
```
**Purpose:** Zero-friction capture when exhausted
**Trigger:** Global button, keyboard shortcut (Cmd+Shift+S)
**Flow:** Paste → Auto-save → Adds to extraction queue → Close

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

### Command Palette (Power Users)
```
┌─ Quick Actions ───────────────┐
│ > search cardiac              │
│                               │
│ ○ Search cards: "cardiac"     │
│ ○ Search notes: "cardiac"     │
│ ○ Create card                 │
│ ○ Quick Dump                  │
│ ○ Settings                    │
└───────────────────────────────┘
```
**Trigger:** Cmd+K (universal shortcut)
**Purpose:** Keyboard-first navigation for efficiency

---

## Primary User Journeys & Flow Mapping

### Journey 1: Standard Capture (80% of usage)
```
Launch → Workspace (Capture State) 
       → Paste content → AI analysis (2-3 seconds)
       → AI suggestions appear → Review/confirm (checkboxes)
       → Save (1 click) → Ready for next capture
       → Stays in capture state
```
**Time Target:** <20 seconds total
**Click Count:** ≤2 (paste=0, confirm=1)

### Journey 2: Daily Reviews  
```
Launch → "Today's Reviews: 5" → Review Screen
       → Card 1 → [Show Answer] → [Continue]
       → Card 2 → ... → Card 5
       → Auto-return to Workspace
```
**Flow:** Sequential, no decisions, automatic return

### Journey 3: Exhaustion Safety Net
```
Any Screen → Quick Dump button → Paste → Auto-save
          → Confirmation toast → Return to previous state
```
**Purpose:** Guarantee capture even when too tired to extract properly

### Journey 4: Queue Processing (When rested)
```
Workspace → Search "unprocessed" OR queue indicator
         → Queue State → Select dumps → Process like normal capture  
         → Queue cleared → Return to default capture state
```

---

## Visual Design System

### Color Psychology for Medical Context
- **Primary blues/grays:** Calm, reduce stress during high-pressure sessions
- **Subtle success greens:** Positive reinforcement without overwhelm  
- **Warning oranges:** Clear but non-alarming error states
- **Medical familiar:** Colors appropriate for healthcare context
- **High contrast:** Readable when tired/stressed

### Typography & Accessibility
- **Font system:** Inter or similar for medical terminology readability
- **High contrast ratios:** Minimum 4.5:1 for all text
- **Consistent hierarchy:** Clear information prioritization  
- **Medical terminology friendly:** Handles complex medical terms well
- **Zoom tolerance:** Works well at various zoom levels

### Spacing & Interaction Design
- **Generous whitespace:** Reduces visual overwhelm for exhausted users
- **Large touch targets:** Easy to hit when motor skills impaired by fatigue  
- **Clear content boundaries:** Obvious sections prevent confusion
- **Breathing room:** Interface doesn't feel cramped or aggressive

### Microinteractions & Feedback
- **Immediate feedback:** "Saved ✓" appears for 2 seconds after any action
- **AI processing indicators:** Subtle animation while analyzing content
- **Connection discoveries:** Gentle highlight when AI finds related notes
- **Error prevention:** Real-time warnings for problematic card structures
- **Progress indicators:** Clear status during multi-step processes

---

## Desktop-Specific Interaction Patterns

### Keyboard-First Design
- **Every mouse action** has keyboard equivalent
- **Tab navigation** follows logical workflow  
- **Escape always cancels** current operation
- **Enter always confirms** or submits
- **Arrow keys navigate** lists and options

### Hover States for Discovery
- **Sidebar items:** Show shortcuts and descriptions
- **Note titles:** Preview first few lines of content
- **Cards in review:** Show source note context  
- **Tags:** Display related cards count
- **Buttons:** Show keyboard shortcuts

### Context Menus (Right-Click)
- **Notes:** Edit, link, duplicate, convert to cards
- **Cards:** Edit, disable, reschedule, show source
- **Tags:** Rename, merge, show all cards
- **Content areas:** Paste, select all, clear

### Drag & Drop Intelligence
- **Text from browser:** Auto-extract concepts, suggest tags
- **Images:** OCR processing + concept extraction
- **Files:** PDF text extraction + processing
- **Internal:** Reorder, organize, connect content

---

## Mobile Translation Principles (Future)

While MVP is desktop-first, design patterns should translate:

### Responsive Patterns
- **Sidebar → Bottom tabs** for mobile navigation
- **Hover states → Long press** for mobile discovery
- **Keyboard shortcuts → Gesture shortcuts**  
- **Command palette → Swipe-up quick actions**
- **Multi-column → Single column** with maintained hierarchy

---

## Performance Design Requirements

### Speed & Responsiveness  
- **Search results:** <200ms for any query
- **State transitions:** <500ms between contexts
- **Save confirmations:** <500ms visual feedback
- **AI processing:** <3 seconds for content analysis
- **App launch:** <3 seconds to usable state

### Error Prevention & Recovery
- **Auto-save:** Every keystroke, every action
- **Session persistence:** Perfect continuation between sessions
- **Crash recovery:** Auto-restore from backup, zero intervention
- **Undo capability:** All destructive actions reversible
- **Clear error messages:** Never silent failures

### Scalability Considerations
- **Search performance:** Sub-200ms with 1000+ cards
- **Review queues:** Smooth with 100+ daily reviews  
- **Note browsing:** No lag with extensive note collections
- **Connection mapping:** Efficient with complex knowledge graphs

---

## Validation Criteria

### Exhaustion Test
- **Works when Doug is mentally drained?** ✓
- **No complex decisions required?** ✓  
- **Clear next actions always visible?** ✓

### Speed Test  
- **Capture completes in <20 seconds?** ✓
- **Search responds in <200ms?** ✓
- **No waiting for system responses?** ✓

### Decision Test
- **Zero organizational choices during capture?** ✓
- **AI suggests, user confirms only?** ✓
- **No scheduling or grading decisions?** ✓

### Recovery Test
- **All actions easily undoable?** ✓
- **Can resume seamlessly after interruption?** ✓
- **Never lose work, even on crash?** ✓

### Trust Test
- **Completely reliable, predictable behavior?** ✓
- **Clear feedback for all actions?** ✓
- **Doug can rely on this vs. current fragmented workflow?** ✓

---

## Implementation Priorities

### Phase 1: Core Interface (Week 1-2)
1. **Unified Workspace** - Capture interface with AI suggestions
2. **Review Screen** - Basic FSRS-driven review flow  
3. **Quick Dump Modal** - Emergency capture safety net

### Phase 2: Polish & Performance (Week 3-4)  
1. **Search overlay** - Global search within workspace
2. **Queue processing** - Batch extraction workflow
3. **Command palette** - Keyboard power user features

### Phase 3: Enhancement (Month 2)
1. **Advanced microinteractions** - Smooth feedback and transitions
2. **Hover previews** - Content discovery without navigation
3. **Keyboard shortcuts** - Full keyboard-first workflow

This design architecture delivers maximum value with minimum complexity, perfectly aligned with Doug's cognitive constraints and evidence-based medical flashcard principles.