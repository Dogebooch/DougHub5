# DougHub Vision - Final Executive Decisions

## Vision Statement
FOR medical residents with ADHD WHO lose 10+ minutes per study session to 
organizational decisions, DougHub is an active encoding tool THAT makes concept 
extraction the learning moment. UNLIKE Anki, Notion, or RemNote, our product 
guides extraction with AI suggestions while preserving user agency over what 
matters.

## Problem
The bottleneck isn't content quality or tool features—it's the 10+ minutes lost 
per session answering:
- "Where does this go?"
- "How do I connect this to what I already know?"
- "What format should this card be?"

These decisions prevent studying from starting.

## Core Insight
Extraction IS the learning. Active recall during capture embeds knowledge better
than passive saving. AI reduces friction by suggesting concepts and formats—user
confirms, edits, or adds. Exhaustion escape hatch (Quick Capture) ensures capture
still happens when energy is zero.

## v2 Architecture: 3-Layer System
**Primary Anxiety Addressed:** Extracting information from multiple sources → compiling into one readable place → extracting high-yield content for boards/bedside → converting to effective flashcards.

```
LAYER 1: KNOWLEDGE BANK (Inbox/Library)
├── SourceItems: Raw captures from any source (qbank, article, pdf, image, audio, quickcapture)
├── Status flow: inbox → processed → curated
├── AI auto-tags, user confirms/edits via single Save
├── Searchable, filterable via Smart Views
└── CANNOT create cards here (enforced)
         ↓
    User selects, adds to topic
         ↓
LAYER 2: PERSONAL NOTEBOOK (Curated Topics)
├── NotebookTopicPages: User-created canonical topics
├── Contains excerpts/blocks from SourceItems (deep-linked)
├── Topic aliasing: HOCM = "Hypertrophic Cardiomyopathy"
├── THIS is where flashcards are created
└── Card-worthiness gate before creation
         ↓
    AI generates, user confirms
         ↓
LAYER 3: FLASHCARDS (Study Deck)
├── Cards linked to NotebookTopicPage (provenance)
├── FSRS scheduling, zero-decision review
├── Low-ease detection → "fix card" flow
└── Board-miss tracking → topic suggestions
```

### Key Principles
- **Minimize card burden:** Card-worthiness gate evaluates every card before creation
- **Notebook-only card creation:** Enforced constraint—prevents low-yield card anxiety
- **Topic standardization:** CanonicalTopic with alias normalization (never raw strings)
- **Deep links everywhere:** Card → Notebook → Source always traceable

## Target User
IM/EM residents with ADHD studying for boards. Post-shift exhaustion, zero 
tolerance for admin work, need to capture before forgetting.

## Long-term Vision
Achieve 20-30% reduction in daily flashcard workload while improving retention 
through AI-personalized scheduling—enabled by evidence-based design and data 
collected from day one.

## MVP Scope - v2 Architecture (Revised Build Order)

> **Build Philosophy:** Layer-by-layer, dependency-driven. Complete each layer before moving to the next.

### Phase 1: Foundation ✅ COMPLETE
- Database schema v3 (SourceItem, CanonicalTopic, NotebookTopicPage, Card with provenance)
- AI service integration layer
- Zero-decision review interface (FSRS scheduling)
- UI theme system (Midnight Teal)
- Sidebar with Smart View navigation stubs

### Phase 2: Layer 1 - Knowledge Bank (BUILD NEXT)
| # | Feature | Task | Status |
|---|---------|------|--------|
| 1 | Capture pipeline | Quick Capture → SourceItem (inbox), text support | T38 |
| 2 | Inbox UI | Persistent indicator, count badge, batch triage | T39 |
| 3 | Knowledge Bank UI | Vertical list grouped by status, filters | T40 |
| 4 | Smart Views engine | System views filter logic | T44 |

### Phase 3: Layer 2 - Personal Notebook
| # | Feature | Task | Status |
|---|---------|------|--------|
| 5 | Topic normalization | CanonicalTopic with alias table, matching rules | T36 |
| 6 | Notebook UI | Topic pages, add blocks from sources | T41 |
| 7 | Deep-linked excerpts | Notebook blocks link back to SourceItems | (in T41) |

### Phase 4: Layer 3 - Card Generation
| # | Feature | Task | Status |
|---|---------|------|--------|
| 8 | Card generation from notebook | AI suggests cards from Notebook blocks | T42 |
| 9 | Card-worthiness gate | Deferred to POST-MVP (F6) | - |
| 10 | FSRS integration | Response time tracking, provenance display | T45 |

> **Note:** Card-worthiness gate (F6) and low-ease detection deferred to post-MVP. Core FSRS review works without them.

### Phase 5: Cross-Cutting Polish (POST-MVP)
| # | Feature | Status |
|---|---------|--------|
| 11 | Global search (<200ms via command palette) | Deferred |
| 12 | Medical list processing (clinical vignettes) | Deferred |
| 13 | Ollama auto-start | ✅ Complete (T17 done) |

> **Note:** Phase 5 features are post-MVP polish. Core v2 architecture (Phases 2-4) takes priority.

### Data Migration Note
The `quick_dumps` table is superseded by `source_items` with `sourceType='quickcapture'`.
Quick Capture modal should save to `source_items` table directly. Migration already handles
existing data in `migrateToV3()`.

## Technical Stack Requirements - Executive Mandated
- **Frontend:** Electron + React + TypeScript + TailwindCSS
- **Database:** SQLite with better-sqlite3 (local-first architecture)
- **Scheduling:** ts-fsrs library implementation (mandatory for competitive advantage)
- **AI Integration:** Local processing where possible, API for advanced features
- **Performance:** <200ms search response, <20 second capture workflow
- **Data Collection:** Silent tracking of all review interactions for future personalization

## Out of Scope (MVP) - Hard Boundaries
- Picture editor / mnemonic editing workflow
- Browse/navigation views (search-first philosophy)
- Graph view visualization
- AI librarian (duplicate detection, merging, quality checks)
- **Personalized scheduling UI** (happens silently in background)
- **Performance analytics dashboard** (data collected, not displayed)
- Mobile app (desktop-first for exhausted users)
- Cloud sync (local-first for reliability)
- Import from Anki (clean start approach)
- Progress dashboard / gamification
- Multiple scheduler options (FSRS only)
- **Browser extension / web clipper** (deferred to post-MVP, Task 82)
- **Superhuman-style split view** (deferred, Task 79)
- **Breadcrumb navigation** (deferred, Task 80)
- **Badge pulse animations** (deferred, Task 81)

## Anti-Patterns - Evidence-Based Prohibitions
- **No folder hierarchies** - Tags only, search-first navigation
- **No grading buttons** - FSRS handles all scheduling decisions automatically
- **No basic list cards** - All medical lists get clinical context conversion or overlapping cloze
- **No pattern-matching cards** - AI validation prevents "recognizing the card format" vs knowing the concept
- **No complex onboarding** - Works immediately, learns user preferences through usage
- **No feature decisions during capture** - AI suggests, user confirms with minimal choices
- **No manual scheduling decisions** - Complete automation of review timing

## Medical Education Research Applied
1. **Minimum Information Principle:** AI enforces one discrete fact per card
2. **Clinical Context over Lists:** Transform "5 causes of X" into "Patient presents with Y..."
3. **FSRS Algorithm:** 99.6% superiority over SM-2, 20-30% workload reduction validated
4. **Medical List Handling:** Overlapping cloze or clinical scenarios prevent sibling contamination

*Detailed metrics in `docs/DougHub Success Metrics.md`. Implementation tasks in Taskmaster.*