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
LAYER 1: KNOWLEDGE BANK
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

## Technical Stack

Electron + React + TypeScript + SQLite (local-first) + ts-fsrs

---

## Out of Scope (MVP)

Mobile, cloud sync, Anki import, graph view, analytics dashboard (data collected, not displayed)
