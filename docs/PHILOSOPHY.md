# DougHub Philosophy

> **Use this document when working on DougHub to align with the system architecture.**

## Context

DougHub5 is an Electron-based medical learning application restructured to work alongside Remnote (a spaced repetition app). This document defines the core philosophy.

---

## The Philosophy Shift

### BEFORE: "All-in-One Learning App"

- Full flashcard system with spaced repetition
- Knowledge Forging UI for creating cards
- Flashcard Simulator for review
- Practice Bank with attempt tracking
- Question capture + storage + review all in one

### AFTER: "AI-Powered Capture & Preprocessing Hub"

- Capture board questions from MKSAP/PeerPrep
- Store raw data with images locally
- AI analyzes content and generates flashcard candidates
- User reviews AI suggestions and exports to Remnote
- **No flashcard review** — Remnote handles all spaced repetition

**Metaphor:** DougHub is the kitchen (prep and process), Remnote is the dining room (consume and review).

---

## Feature Fate Matrix

| Feature                  | Action      | Reason                      |
| ------------------------ | ----------- | --------------------------- |
| Tampermonkey capture     | ✅ KEEP     | Core functionality          |
| board-question-parser.ts | ✅ KEEP     | Core functionality          |
| image-service.ts         | ✅ KEEP     | Core functionality          |
| SQLite storage           | ✅ KEEP     | Needed for reference        |
| Question browser         | ✅ KEEP     | Browse captured questions   |
| Attempt tracking         | ✅ KEEP     | Useful for failure analysis |
| Systems & Satellites nav | ⚡ SIMPLIFY | Less critical               |
| Knowledge Forging        | ❌ REMOVE   | Remnote handles this        |
| Flashcard Simulator      | ❌ REMOVE   | Remnote handles this        |
| Spaced repetition logic  | ❌ REMOVE   | Remnote handles natively    |
| Practice Bank review UI  | ❌ REMOVE   | Remnote handles natively    |
| AI flashcard generation  | ➕ ADD      | New core feature            |
| AI "Why Wrong" analysis  | ➕ ADD      | New core feature            |
| Export to Remnote        | ➕ ADD      | Bridge to Remnote           |

---

## What to ADD

### 1. Ollama AI Client

**Location:** `electron/services/ai-client.ts`

```typescript
interface AIClient {
  generateFlashcards(question: BoardQuestion): Promise<FlashcardSuggestion[]>;
  analyzeWhyWrong(question: BoardQuestion, userAnswer: string): Promise<string>;
  extractKeyConcept(question: BoardQuestion): Promise<string>;
}
```

### 2. AI Insights Panel

**Location:** Add to question detail view

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Insights                                              │
├─────────────────────────────────────────────────────────────┤
│ Key Concept: [AI-extracted one-liner]                       │
│                                                             │
│ Why You Got It Wrong: [AI analysis]                         │
│                                                             │
│ Suggested Flashcards:                                       │
│ ☑️ Front text::Back text                                    │
│ ☑️ Front text::Back text                                    │
│ ☐ Front text::Back text                                     │
│                                                             │
│ [📤 Export Selected to Remnote]                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Export to Remnote

**Format:**

```
[MKSAP-a1b2c3] 45yo man with HTN
  💡 ACE-I first-line for HTN + proteinuria::Reduces glomerular pressure
  💡 Avoid CCB in proteinuric HTN::No renoprotective effect
  🔗 Source: MKSAP-a1b2c3
```

---

## Data Flow

```
1. CAPTURE
   Tampermonkey → POST to DougHub → Parse → Store in SQLite

2. AI ANALYSIS (NEW)
   Question → Ollama → Returns:
   - 2-3 flashcard candidates
   - "Why wrong" explanation (if answered incorrectly)
   - Key concept extraction

3. USER REVIEW (NEW)
   User views question → Sees AI suggestions → Checks/unchecks → Exports

4. EXPORT (NEW)
   Selected cards → Format for Remnote → Clipboard
   User pastes in Remnote → Remnote handles SR from there
```

---

## UI Mockups

### Home Screen

```
┌─────────────────────────────────────────────────────────────┐
│  DOUGHUB                                    [⚙️]            │
├─────────────────────────────────────────────────────────────┤
│  📥 Recent Captures                                         │
│  ├── [MKSAP-x1] HTN in pregnancy...           2 min ago    │
│  ├── [PP-x2] Chest pain workup...             1 hour ago   │
│  └── [MKSAP-x3] Diabetic foot infection       Yesterday    │
│                                                             │
│  📊 Quick Stats                                             │
│  │ 147 questions captured │ 23 wrong │ 45 exported │       │
│                                                             │
│  [📂 Browse All]  [🔍 Search]                               │
└─────────────────────────────────────────────────────────────┘
```

### Question Detail Screen

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                           [MKSAP-a1b2c3]           │
├─────────────────────────────────────────────────────────────┤
│  📝 Vignette                                                │
│  A 45-year-old man presents with newly diagnosed...        │
│                                                             │
│  🖼️ [Image: Chest X-ray]                                   │
│                                                             │
│  ❓ Question                                                │
│  Which medication is most appropriate?                      │
│                                                             │
│  Answers:                                                   │
│  ❌ A. Amlodipine (your answer)                             │
│  ✅ B. Lisinopril (correct)                                 │
│  ○ C. Metoprolol                                            │
│  ○ D. Hydrochlorothiazide                                   │
│                                                             │
│  💡 Explanation                                             │
│  ACE inhibitors are first-line for hypertension...         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🤖 AI Insights                                [Generate]   │
│  (Click to analyze with local AI)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Notes

### Ollama Integration

- **Endpoint:** `http://localhost:11434/api/generate`
- **Model:** User-configurable (default: `llama3` or `mistral`)
- **Streaming:** Yes, for responsive UI

### MCP Bridge (Future Phase)

- DougHub exposes tools: `doughub_get_question`, `doughub_search`
- Enables Remnote plugin to pull data directly
- Not required for MVP — clipboard export works first

---

## Success Criteria

After this redesign, DougHub should:

- ✅ Still capture and store board questions
- ✅ Show AI-generated flashcard suggestions
- ✅ Allow export to Remnote via clipboard
- ❌ NOT have flashcard review functionality
- ❌ NOT have spaced repetition logic
- ✅ Be simpler and faster to navigate
- ✅ Feel like a "capture tool" not a "learning app"

---

## Migration Path

| Phase   | Description                                           |
| ------- | ----------------------------------------------------- |
| Phase 0 | Align documentation (this task)                       |
| Phase 1 | Add AI features (don't remove anything yet)           |
| Phase 2 | Add Export to Remnote                                 |
| Phase 3 | Test end-to-end with Remnote                          |
| Phase 4 | Remove deprecated features once workflow is validated |

---

_Created: 2026-02-04 — DougHub v5 Capture Hub Redesign_
