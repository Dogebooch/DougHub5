# DougHub Vision

## Vision Statement
FOR medical residents with ADHD WHO lose 10+ minutes per study session to organizational decisions, DougHub is an active encoding tool THAT makes concept extraction the learning moment. UNLIKE Anki, Notion, or RemNote, our product guides extraction with AI confirmation while preserving user agency over what matters.

## Problem
The bottleneck isn't content quality or tools—it's decisions:
- "Where does this go?"
- "How do I connect this to what I already know?"
- "What format should this card be?"
- "Is this worth a flashcard?"

These prevent studying from starting.

## Core Insight
**Extraction IS the learning.** Active recall during capture embeds knowledge better than passive saving. User assigns tags and makes decisions; AI confirms, checks duplicates, and maintains organization. Quick Capture ensures capture still happens when energy is zero.

## Target User
IM/EM residents with ADHD studying for boards. Post-shift exhaustion, zero tolerance for admin work, need to capture before forgetting.

## Long-term Vision
20-30% reduction in daily flashcard workload while improving retention through AI-personalized scheduling—enabled by evidence-based design and data collected from day one.

---

## Architecture: 3-Layer System

```
LAYER 1: KNOWLEDGE BANK (Inbox/Library)
├── Raw captures from any source
├── Status: inbox → processed → curated
├── AI auto-tags, user confirms
└── CANNOT create cards here (enforced)
         ↓
LAYER 2: PERSONAL NOTEBOOK (Curated Topics)
├── User-created canonical topic pages
├── Contains excerpts deep-linked to sources
├── THIS is where flashcards are created
└── Card-worthiness gate before creation
         ↓
LAYER 3: FLASHCARDS (Study Deck)
├── Cards linked to Notebook (provenance)
├── FSRS scheduling, zero-decision review
└── Low-ease detection → fix card flow
```

**Key Constraints:**
- Notebook-only card creation (enforced)
- Deep links everywhere: Card → Notebook → Source
- CanonicalTopic with alias normalization (never raw strings)

---

## Technical Stack (Mandated)
- **Frontend:** Electron + React + TypeScript + TailwindCSS
- **Database:** SQLite with better-sqlite3 (local-first)
- **Scheduling:** ts-fsrs (mandatory)
- **Performance:** <200ms search, <20 sec capture

---

## Out of Scope (MVP)
- Picture editor / mnemonic workflow
- Graph view visualization
- AI librarian (duplicate detection, merging)
- Analytics dashboard (data collected, not displayed)
- Mobile, cloud sync, Anki import
- Browser extension / web clipper

---

## Anti-Patterns
- **No folder hierarchies** — Tags only, search-first
- **No grading buttons** — FSRS auto-schedules
- **No basic list cards** — Clinical context conversion required
- **No feature decisions during capture** — AI confirms, user decides
- **No manual scheduling** — Complete automation

---

*Implementation tracking in TaskMaster. Detailed metrics in Success Metrics doc.*