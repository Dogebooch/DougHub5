# DougHub Success Metrics - Aligned with Flashcard Research

## Target Level
MVP - Minimally viable product that real users can test and Doug can use daily for actual studying.

## Core Success Criteria
| Metric | Target | Why It Matters | How to Measure |
|--------|--------|----------------|----------------|
| Capture time | ≤20 seconds | >20 sec = decision paralysis kicks in, session abandoned | Stopwatch test: paste → saved |
| Capture clicks | ≤2 clicks | Each click is a decision point; 3+ burns executive function | Count clicks in capture flow |
| Search latency | <200ms | >200ms = flow state broken, user starts browsing instead | Performance profiler |
| Data persistence | Zero loss on crash | Lost data = trust destroyed, back to Anki | Force-quit during edit, verify recovery |
| Daily queue generation | Auto on launch | Manual queue = another decision, won't happen post-shift | Launch app, verify queue populated |
| Card-Note linking | 100% of cards show source | Missing context during review = frustration, skipped cards | Audit 20 random cards |
| No grading decisions | Zero Easy/Medium/Hard choices | Eliminates decision paralysis on partial recall | Test: miss 2/5 items, verify FSRS auto-schedules |
| **Clinical context conversion** | **100% of medical lists converted** | **Prevents sibling contamination, builds clinical reasoning** | **Test: "5 causes of X" becomes individual clinical vignettes** |
| **AI card validation** | **>95% cards follow minimum information principle** | **Prevents pattern-matching, ensures concept testing** | **Audit: each card tests single concept, survives rephrasing** |
| **FSRS efficiency target** | **20-30% reduction in daily review time vs SM-2** | **Core value proposition based on medical education research** | **Compare review time before/after 3 months usage** |

## v2 Architecture Metrics (NEW)
| Metric | Target | Why It Matters | How to Measure |
|--------|--------|----------------|----------------|
| **Time-to-capture** | <20s | Quick dump must be instant | Stopwatch: open app → saved to inbox |
| **Inbox zero rate** | >80% processed weekly | Prevent inbox overwhelm | Count inbox items weekly |
| **Cards created per curated hour** | Track baseline | Measure curation efficiency | Cards generated / time in Notebook |
| **% low-ease cards resolved** | >50% resolved within 2 weeks | Fix broken cards quickly | Track low-ease flags cleared |
| **Topic coverage** | All board topics tracked | No blind spots | Count CanonicalTopics vs curriculum |
| **Weak-topic closure rate** | >70% addressed within 1 month | Focus on gaps | Track Weak Topics resolved |

## Performance Requirements
- Search response: <200ms for any query across 1000+ cards
- Save confirmation: "Saved ✓" visible within 500ms of any action
- App launch to usable: <3 seconds
- No lag with 100+ cards in browser view
- **FSRS scheduling**: <100ms to calculate next review date
- **AI card generation**: <3 seconds to process pasted content

## User Experience Thresholds
- Time to complete capture: <20 seconds (paste → confirmed)
- Clicks to capture: ≤2 (paste is 0, confirm is 1, tag adjust is 2)
- Error recovery: Undo available for all destructive actions
- Session recovery: Pick up exactly where left off between sessions
- **AI suggestion accuracy**: >90% useful (medical research shows higher accuracy needed)
- **Card quality validation**: Real-time warnings for pattern-matching cards

## Reliability Requirements
- Auto-save: Every create/edit/delete persists immediately
- Backup: Hourly snapshots to `/backups`, retained 7 days
- Crash recovery: Auto-restore from backup, zero user intervention
- No silent failures: Hard stops and visible messages on all errors
- **FSRS data integrity**: All review interactions captured (stability, difficulty, response time, domain)

## MVP Validation Checklist
- [ ] Can paste content and have it saved in <20 seconds without deciding where it goes
- [ ] Search finds any card in <10 seconds
- [ ] App crashed mid-edit → relaunched → no data lost
- [ ] Used app for 5 consecutive days without abandoning due to friction
- [ ] Found and edited a card from 2+ weeks ago via search (not browsing)
- [ ] Daily review queue appeared automatically on launch (no manual setup)
- [ ] Every card clicked shows source note context
- [ ] **AI converts "5 causes of acute liver failure" into 5 individual clinical scenarios**
- [ ] **During review, getting 3/5 correct auto-schedules without grading decision**
- [ ] **System distinguishes 1/5, 3/5, and 5/5 performance for FSRS scheduling**
- [ ] **All cards follow minimum information principle (one concept per card)**
- [ ] **No sibling contamination during list item reviews**
- [ ] **FSRS data captured silently: response time, domain, accuracy, stability parameters**

## Medical Education Research Targets
| Metric | Target | Research Basis | Timeline |
|--------|--------|----------------|----------|
| **FSRS retention rate** | **89%** | **Medical education optimal (Kerfoot 2010)** | **Immediate (config setting)** |
| **Daily review reduction** | **20-30%** | **FSRS vs SM-2 medical student data** | **3 months** |
| **Practice question accuracy** | **76%+** | **Target for board preparation** | **12 months** |
| **Daily flashcard time** | **1-2 hours** | **Down from current 3+ hours** | **6 months** |
| **Study sessions without paralysis** | **>80%** | **Up from current ~20%** | **3 months** |
| **Card retention (6+ months)** | **>85%** | **Medical education standard** | **6 months** |
| **USMLE correlation** | **1 point per 1,700 cards** | **Lu et al. 2021 research** | **12+ months** |

## Medical List Processing Validation
| Metric | Target | Timeline |
|--------|--------|----------|
| Clinical context conversion | 100% of lists → individual clinical cards | MVP Core |
| Zero sibling contamination | Never see related list items during review | MVP Core |
| Clinical scenario accuracy | >80% realistic bedside presentations | MVP Core |
| Overlapping cloze support | Procedures/algorithms use overlapping format | MVP Core |
| Basic list elimination | Zero "list 5 causes" style cards created | MVP Core |

## FSRS Implementation Validation
| Component | Target | Validation Method |
|-----------|--------|-------------------|
| **Core algorithm** | ts-fsrs v5.2.2+ integration | Code review + unit tests |
| **Medical parameters** | 0.89 retention, 36500 max interval | Configuration audit |
| **Data collection** | All 21 FSRS parameters captured | Database schema validation |
| **Performance tracking** | Response time by medical domain | Analytics audit |
| **No user decisions** | Zero grading buttons, automatic scheduling | UI audit |

## Anti-Pattern Prevention
- [ ] **No basic list cards created** (all converted to clinical context)
- [ ] **No pattern-matching cards** (AI validates concept vs format testing)
- [ ] **No multi-fact cards** (minimum information principle enforced)
- [ ] **No excessive context hints** (cloze deletions minimal context only)
- [ ] **No manual scheduling** (FSRS handles 100% of review timing)

## "MVP is Done" Test
Doug uses this app daily for real studying instead of the current fragmented workflow. The decision paralysis that prevented sessions from starting is gone, medical lists are converted to clinical scenarios that build bedside reasoning, and FSRS delivers the research-validated 20-30% efficiency improvement.