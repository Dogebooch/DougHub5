# DougHub Vision

## Vision Statement

FOR medical residents with ADHD WHO lose 10+ minutes per study session to organizational decisions, DougHub is an active encoding tool THAT makes concept extraction the learning moment. UNLIKE Anki, our product guides extraction with AI confirmation, surfaces weak topics via Board Relevance, and delivers 20-30% review time reduction through FSRS.

## Problem

The bottleneck isn't content quality—it's decisions:
- "Where does this go?"
- "Is this worth a flashcard?"
- "What format should this card be?"

These prevent studying from starting.

## Core Insight



**Extraction IS the learning.** Active recall during capture embeds knowledge better than passive saving. Quick Capture ensures capture happens when energy is zero; Board Relevance surfaces what matters when energy returns.

---

## 6-Step QBank Flow (MVP)

```
1. Capture → 2. Inbox → 3. Add to Notebook → 4. Topic Page → 5. Generate Card → 6. Review
```

See `docs/Workflow_Guide.ini` for detailed mockups and implementation.

---

## 3-Layer Architecture

```
LAYER 1: ARCHIVE
├── Raw captures, status: inbox → processed → curated
└── CANNOT create cards here (enforced)
         ↓
LAYER 2: NOTEBOOK (Curated Topics)
├── User insights deep-linked to sources
├── Board Relevance Panel shows weak topics
└── Card-worthiness gate before creation
         ↓
LAYER 3: FLASHCARDS
├── Cards linked to Notebook (provenance)
└── FSRS scheduling, zero-decision review
```

**Constraints:** Notebook-only card creation, deep links everywhere, CanonicalTopic normalization.

---

## Anti-Patterns

- **No folder hierarchies** — Tags only, search-first
- **No grading buttons** — FSRS auto-schedules
- **No feature decisions during capture** — AI confirms, user decides
- **No manual scheduling** — Complete automation

---

## Interaction Design Principles

### 1. Action Placement by Cognitive Load

| Load Level | Examples | Placement |
|------------|----------|-----------|
| Zero-thought | archive, delete, select, star/flag | Hover or batch bar |
| Light-decision | open, confirm | Visible buttons in detail view |
| Deliberate-work | categorize, write, generate | Modal or dedicated screen |

**Rule:** If it needs a dropdown, text input, or "which one?" → not on hover

### 2. Progressive Disclosure

- Show only what's needed at each layer
- Simple first, complex one level deeper
- Exception: If users do it every session → ≤2 clicks

### 3. Consistent Interaction Patterns

- **Click row** = open detail (never require a button)
- **Hover** = quick triage actions only
- **Modals** = focused, single-purpose tasks
- **Escape** = close/cancel at any level

### 4. Reference Apps

| App | Pattern to Steal |
|-----|------------------|
| Gmail | triage → detail → organize |
| Things 3 | inbox → project → task detail |
| Superhuman | keyboard-first, minimal UI |
| Anki Browse | **Anti-pattern:** too dense, overwhelming |

### 5. ADHD/Fatigue-Specific

- Fewer choices = faster action
- Default to most common choice (pre-select when obvious)
- Undo over "Are you sure?" (no confirmation for reversible actions)
- No dead-ends (always a clear next step or escape)
- Auto-save everywhere
- Visual feedback within 500ms

---

## Technical Stack

Electron + React + TypeScript + SQLite (local-first) + ts-fsrs

---

## Out of Scope (MVP)

Mobile, cloud sync, Anki import, graph view, analytics dashboard (data collected, not displayed)
