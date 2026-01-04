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
confirms, edits, or adds. Exhaustion escape hatch (Quick Dump) ensures capture 
still happens when energy is zero.

## Target User
IM/EM residents with ADHD studying for boards. Post-shift exhaustion, zero 
tolerance for admin work, need to capture before forgetting.

## Long-term Vision
Achieve 20-30% reduction in daily flashcard workload while improving retention 
through AI-personalized scheduling—enabled by evidence-based design and data 
collected from day one.

## MVP Scope - Executive Final
1. **AI concept highlighting** - Paste content, AI highlights extractable concepts using minimum information principle
2. **User extraction confirmation** - Checkboxes to confirm/reject/edit AI suggestions
3. **AI card format suggestions** - AI recommends cloze vs Q&A per concept based on medical content type
4. **Evidence-based card validation** - Real-time warnings using SuperMemo principles (minimum information, no pattern-matching cards, medical list detection)
5. **Quick Dump** - Raw save when too tired to extract
6. **Extraction queue** - Process Quick Dumps later with same guided workflow
7. **Auto note creation** - Notes created from extractions with bidirectional links
8. **Bidirectional linking** - Cards ↔ Notes always connected, context always available
9. **Connection suggestions** - AI surfaces related notes during extraction using semantic similarity
10. **Tag-based organization** - No folders, tags only, AI suggests medical domain tags
11. **Search-first navigation** - Global search <200ms across cards and notes
12. **FSRS scheduling implementation** - Complete ts-fsrs integration, no grading decisions, 20-30% efficiency target
13. **Medical list processing** - Clinical context conversion for differential diagnoses, overlapping cloze for procedures
14. **Performance data foundation** - Silent collection of response times, domains, accuracy for future AI personalization

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

## Anti-Patterns - Evidence-Based Prohibitions
- **No folder hierarchies** - Tags only, search-first navigation
- **No grading buttons** - FSRS handles all scheduling decisions automatically
- **No basic list cards** - All medical lists get clinical context conversion or overlapping cloze
- **No pattern-matching cards** - AI validation prevents "recognizing the card format" vs knowing the concept
- **No complex onboarding** - Works immediately, learns user preferences through usage
- **No feature decisions during capture** - AI suggests, user confirms with minimal choices
- **No manual scheduling decisions** - Complete automation of review timing

## Success Metrics - Research-Based Targets
### Primary Success (Evidence Required):
- **FSRS efficiency:** 20-30% reduction in daily review time vs SM-2 baseline
- **Capture speed:** <20 seconds from paste to saved (eliminates decision paralysis)
- **Medical retention:** >85% accuracy on 6-month-old cards (medical education standard)
- **Clinical application:** Medical lists converted to realistic bedside scenarios (>80% accuracy)

### Technical Performance (Non-Negotiable):
- **Search response:** <200ms for any query across 1000+ cards
- **Data persistence:** Zero data loss on crash (auto-backup, recovery)
- **Offline capability:** Core features work without internet
- **Platform reliability:** Works on standard resident laptops without setup

### User Adoption (Validation Targets):
- **Daily usage:** Doug uses this instead of current workflow for 2+ weeks
- **Cognitive load:** Can use effectively when post-shift exhausted
- **Trust building:** Never loses work, always predictable behavior

## Medical Education Research Applied
1. **Minimum Information Principle:** AI enforces one discrete fact per card
2. **Clinical Context over Lists:** Transform "5 causes of X" into "Patient presents with Y, what's the diagnosis?"
3. **FSRS Algorithm:** 99.6% superiority over SM-2, 20-30% workload reduction validated
4. **Medical List Handling:** Overlapping cloze or clinical scenarios prevent sibling contamination
5. **Response Time Intelligence:** Foundation for 2-5% retention improvements through personalization

## Implementation Phases
### Phase 1 (MVP Core - Month 1):
- Complete capture workflow with AI assistance
- FSRS implementation with silent data collection
- Evidence-based card validation
- Medical list processing (clinical context conversion)

### Phase 2 (Data-Driven - Month 2):
- Response time intelligence for interval adjustment
- Advanced medical list formats based on content type
- Performance optimization using collected data

### Phase 3 (Personalization - Month 3+):
- Individual forgetting curve optimization
- Domain-specific scheduling (cardiology vs pharmacology)
- Semantic interference detection for similar medical terms

## Key Architectural Decisions
1. **Local-First:** SQLite database, offline-capable, cloud sync later
2. **Evidence-Based AI:** All suggestions follow medical flashcard research
3. **Silent Intelligence:** Data collection and personalization happen transparently
4. **Medical-Specific:** Content processing understands medical terminology and concepts
5. **Exhaustion-Proof:** Every workflow designed for post-shift cognitive state