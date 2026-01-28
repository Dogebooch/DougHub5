# Notebook System v2: Implementation Plan

> **Status:** Ready for Implementation
> **Last Updated:** 2026-01-27
> **Goal:** Replace current "Add to Notebook" workflow with Intake Quiz system + Smart Card Activation

---

## Executive Summary

This plan transforms the "Add to Notebook" flow from a passive insight-writing modal into an **active learning quiz** that:
1. Tests prerequisite knowledge BEFORE showing the explanation
2. Auto-generates cards for ALL facts, with smart activation tiers
3. Tracks intake quiz results to prioritize what you actually need to learn

**Key Philosophical Shift:**
- OLD: "Write what you learned" (passive, post-reading)
- NEW: "What did you need to know?" (active, pre-reading, identifies actual gaps)

---

## Scope Decisions (Finalized)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-topic support | **Yes, implement now** | Junction table `BlockTopicAssignment`. Same card serves all assigned topics. |
| Source type flows | **Different per type** | QBank gets full quiz. Others per Section 9 definitions. |
| Topic Entry Quiz | **7 days** | Matches FSRS first major interval. Make configurable later. |
| Elaboration Prompts | **Defer to post-MVP** | Adds cognitive load. Focus on core quiz flow first. |
| Leech threshold | **6 lapses** | Lower than Anki's 8 for busy residents. |
| Daily limits | **Defer** | Implement when users hit scale issues. |

---

## Current State Analysis

### What Exists
| Component | Status | Location |
|-----------|--------|----------|
| AddToNotebookWorkflow | Modal with topic select + insight writing | `AddToNotebookWorkflow.tsx` |
| TopicArticleView | Prose-based topic page with blocks | `article/TopicArticleView.tsx` |
| Card Generation | Single-block + batch topic generation | `CardGenerationModal.tsx`, `TopicCardGeneration.tsx` |
| Cards Table | FSRS fields, no activation tiers | `cards` table (v23) |
| NotebookBlock | Has relevance scoring, no quiz tracking | `notebook_blocks` table (v22) |

### What Doesn't Exist (Must Build)
- Intake Quiz UI
- Quiz question generation from facts
- Card activation tiers (dormant/suggested/auto-active)
- `IntakeQuizAttempt` table
- Priority scoring system
- Topic Entry Quiz (spaced retrieval)

---

## Architecture Decisions

### 1. Fact Extraction Timing
**Decision:** Extract facts from source BEFORE quiz, not during
**Rationale:** User needs to see questions to answer them; facts come from AI analysis of source content

### 2. Card Creation Timing
**Decision:** Create dormant cards for ALL facts immediately on add-to-notebook
**Rationale:** Cards exist for everything; activation is the decision, not creation

### 3. Quiz Question Style
**Decision:** Extractive blanking (exact quotes) for reliability
**Rationale:** AI-generated open questions risk ambiguity; blanking is deterministic

### 4. Activation Tiers
```
TIER 1 AUTO-ACTIVATE: Quiz wrong/skipped + signal (numbers, cross-source, confusion, from wrong Q)
TIER 2 SUGGESTED: Quiz wrong/skipped, no signals (user decides)
TIER 3 DORMANT: Quiz correct (sleeps until entry quiz shows forgotten)
```

---

## Schema Changes (v24 Migration)

```sql
-- 1. Add activation fields to cards table
ALTER TABLE cards ADD COLUMN activationStatus TEXT NOT NULL DEFAULT 'dormant';
  -- 'dormant' | 'suggested' | 'active' | 'suspended' | 'graduated'
ALTER TABLE cards ADD COLUMN activationTier TEXT;
  -- 'auto' | 'suggested' | 'user_manual'
ALTER TABLE cards ADD COLUMN activationReasons TEXT;
  -- JSON array: ["Contains numbers", "From wrong question"]
ALTER TABLE cards ADD COLUMN activatedAt TEXT;
ALTER TABLE cards ADD COLUMN suspendReason TEXT;
  -- 'user' | 'leech' | 'rotation_end'
ALTER TABLE cards ADD COLUMN suspendedAt TEXT;

-- 2. Add intake quiz tracking to notebook_blocks
ALTER TABLE notebook_blocks ADD COLUMN intakeQuizResult TEXT;
  -- 'correct' | 'wrong' | 'skipped' | null
ALTER TABLE notebook_blocks ADD COLUMN intakeQuizAnswer TEXT;
  -- User's actual answer (for review)
ALTER TABLE notebook_blocks ADD COLUMN priorityScore INTEGER DEFAULT 50;
ALTER TABLE notebook_blocks ADD COLUMN priorityReasons TEXT;
  -- JSON array of why this has priority

-- 3. Multi-topic support (facts can belong to multiple topics)
CREATE TABLE block_topic_assignments (
  id TEXT PRIMARY KEY,
  blockId TEXT NOT NULL,
  topicPageId TEXT NOT NULL,
  isPrimaryTopic INTEGER DEFAULT 0,  -- 1 = main topic, 0 = secondary
  createdAt TEXT NOT NULL,
  FOREIGN KEY (blockId) REFERENCES notebook_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (topicPageId) REFERENCES notebook_topic_pages(id) ON DELETE CASCADE,
  UNIQUE(blockId, topicPageId)
);

-- 4. Intake quiz attempt tracking
CREATE TABLE intake_quiz_attempts (
  id TEXT PRIMARY KEY,
  sourceItemId TEXT NOT NULL,
  notebookTopicPageId TEXT NOT NULL,
  blockId TEXT NOT NULL,
  questionText TEXT NOT NULL,
  userAnswer TEXT,
  isCorrect INTEGER,  -- 0 or 1
  wasSkipped INTEGER DEFAULT 0,
  attemptedAt TEXT NOT NULL,
  FOREIGN KEY (sourceItemId) REFERENCES source_items(id),
  FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id),
  FOREIGN KEY (blockId) REFERENCES notebook_blocks(id)
);

-- 5. Topic entry quiz tracking (for spaced retrieval, 7-day threshold)
CREATE TABLE topic_quiz_attempts (
  id TEXT PRIMARY KEY,
  notebookTopicPageId TEXT NOT NULL,
  blockId TEXT NOT NULL,
  questionText TEXT NOT NULL,
  isCorrect INTEGER,
  attemptedAt TEXT NOT NULL,
  daysSinceLastVisit INTEGER,
  FOREIGN KEY (notebookTopicPageId) REFERENCES notebook_topic_pages(id),
  FOREIGN KEY (blockId) REFERENCES notebook_blocks(id)
);

-- 6. Confusion pattern detection
CREATE TABLE confusion_patterns (
  id TEXT PRIMARY KEY,
  conceptA TEXT NOT NULL,
  conceptB TEXT NOT NULL,
  topicIds TEXT NOT NULL,  -- JSON array
  occurrenceCount INTEGER DEFAULT 1,
  lastOccurrence TEXT NOT NULL,
  disambiguationCardId TEXT,
  UNIQUE(conceptA, conceptB)
);

-- 7. Topic last visit tracking (for entry quiz 7-day threshold)
ALTER TABLE notebook_topic_pages ADD COLUMN lastVisitedAt TEXT;

-- 8. Indexes
CREATE INDEX idx_cards_activation ON cards(activationStatus);
CREATE INDEX idx_cards_activation_due ON cards(activationStatus, dueDate);
CREATE INDEX idx_blocks_priority ON notebook_blocks(notebookTopicPageId, priorityScore DESC);
CREATE INDEX idx_block_topic_assignments ON block_topic_assignments(blockId);
CREATE INDEX idx_block_topic_by_page ON block_topic_assignments(topicPageId);
CREATE INDEX idx_intake_quiz_source ON intake_quiz_attempts(sourceItemId);
CREATE INDEX idx_topic_quiz_page ON topic_quiz_attempts(notebookTopicPageId);
```

---

## Component Architecture

### New Components

```
src/components/notebook/intake-quiz/
├── IntakeQuizModal.tsx         # Main modal orchestrator
├── QuizQuestionCard.tsx        # Single question display
├── QuizResultsScreen.tsx       # Results with activation controls
├── FactCard.tsx                # Fact display with card status indicator
└── types.ts                    # Quiz-specific types

src/components/notebook/topic-quiz/
├── TopicEntryQuizPrompt.tsx    # "Welcome back, quiz?" prompt
├── TopicQuizModal.tsx          # Quick retention quiz
└── TopicQuizResults.tsx        # Results update priority

src/components/notebook/article/
├── TopicArticleView.tsx        # MODIFY: Add card status inline
├── PriorityIndicator.tsx       # NEW: Red/orange/yellow highlights
├── FactDetailPopover.tsx       # NEW: Click on highlight for details
└── CardStatusBadge.tsx         # NEW: Inline card activation status
```

### Modified Components

| Component | Changes |
|-----------|---------|
| `AddToNotebookWorkflow.tsx` | Replace with IntakeQuizModal entry point |
| `TopicArticleView.tsx` | Add priority highlighting, card status inline |
| `CardGenerationModal.tsx` | Remove - cards created automatically |
| `TopicCardGeneration.tsx` | Remove - cards created on intake |

### Deprecated (Delete)

| Component | Reason |
|-----------|--------|
| `InsightTextarea.tsx` | No longer writing insights manually |
| `CardWorthinessPanel.tsx` | Worthiness replaced by activation tiers |
| `PolishInsight` flow | No insights to polish |

---

## AI Integration

### New AI Tasks

```typescript
// 1. Extract testable facts from source content
interface ExtractFactsResult {
  facts: Array<{
    text: string;           // The fact itself
    keyTerm: string;        // Testable term to blank
    keyTermStart: number;   // Position for blanking
    keyTermEnd: number;
    containsNumbers: boolean;
    conceptType: 'definition' | 'mechanism' | 'values' | 'procedure' | 'association';
  }>;
}

// 2. Generate quiz question by blanking
interface QuizQuestion {
  questionText: string;     // Fact with ____ blank
  answerText: string;       // Exact term (from source)
  factIndex: number;
}

// 3. Grade user answer (fuzzy match)
interface GradeResult {
  isCorrect: boolean;
  similarity: number;       // 0-1, for partial credit
  explanation?: string;     // If wrong, what's the difference
}

// 4. Detect confusion patterns
interface ConfusionCheck {
  isConfusion: boolean;
  conceptA?: string;
  conceptB?: string;
}

// 5. Calculate priority score
interface PriorityResult {
  score: number;            // 0-100
  reasons: string[];
}
```

### AI Task Files

```
electron/ai/tasks/
├── extract-facts.ts        # NEW: Parse source into testable facts
├── generate-quiz.ts        # NEW: Create blanked questions
├── grade-answer.ts         # NEW: Fuzzy answer matching
├── detect-confusion.ts     # NEW: Track concept confusion
├── calculate-priority.ts   # NEW: Priority scoring
└── ... (existing tasks)
```

---

## IPC Handlers

### New Handlers

```typescript
// Fact extraction
'ai:extractFacts': (sourceContent: string, sourceType: string) => IpcResult<ExtractFactsResult>

// Quiz grading
'ai:gradeAnswer': (userAnswer: string, correctAnswer: string) => IpcResult<GradeResult>

// Confusion detection
'ai:checkConfusion': (userAnswer: string, correctAnswer: string, factContent: string) => IpcResult<ConfusionCheck>

// Priority calculation
'ai:calculatePriority': (blockId: string) => IpcResult<PriorityResult>

// Intake quiz
'intakeQuiz:saveAttempt': (attempt: IntakeQuizAttempt) => IpcResult<void>
'intakeQuiz:getBySource': (sourceId: string) => IpcResult<IntakeQuizAttempt[]>

// Topic quiz
'topicQuiz:saveAttempt': (attempt: TopicQuizAttempt) => IpcResult<void>
'topicQuiz:getRecentForTopic': (pageId: string) => IpcResult<TopicQuizAttempt[]>
'topicQuiz:shouldPrompt': (pageId: string) => IpcResult<{ shouldPrompt: boolean; daysSince: number }>

// Card activation
'cards:activate': (cardId: string) => IpcResult<Card>
'cards:suspend': (cardId: string, reason: string) => IpcResult<Card>
'cards:bulkActivate': (cardIds: string[]) => IpcResult<void>
'cards:bulkSuspend': (cardIds: string[], reason: string) => IpcResult<void>

// Confusion patterns
'confusion:create': (pattern: ConfusionPattern) => IpcResult<ConfusionPattern>
'confusion:increment': (id: string) => IpcResult<void>
'confusion:find': (conceptA: string, conceptB: string) => IpcResult<ConfusionPattern | null>
```

---

## User Flow

### Primary Flow: Add to Notebook (QBank Question)

```
1. User answers QBank question incorrectly
2. Clicks "Add to Notebook"
3. Modal opens:
   ┌─────────────────────────────────────────┐
   │ STEP 1: Topic Selection                 │
   │ [AI suggests topics based on content]   │
   │ ☑ Neonatal Resuscitation                │
   │ ☐ Congenital Heart Disease              │
   └─────────────────────────────────────────┘
4. Clicks "Next" → AI extracts facts (1-2 sec)
5. Quiz Screen shows 3-5 questions:
   ┌─────────────────────────────────────────┐
   │ Q1: Where should you place the pulse    │
   │     oximeter during neonatal resus?     │
   │     [__________] or [Don't know yet]    │
   │                                         │
   │ Q2: SpO2 targets at 1 min and 10 min?   │
   │     [__________] or [Don't know yet]    │
   └─────────────────────────────────────────┘
6. User answers (or skips with "Don't know yet")
7. Clicks "Check Answers"
8. Results Screen:
   ┌─────────────────────────────────────────┐
   │ ✓ Q1: Right upper extremity             │
   │   🃏 Dormant (you know this) [Activate] │
   │                                         │
   │ ✗ Q2: SpO2 targets                      │
   │   You said: "50% to 95%"                │
   │   Actually: 60-65% at 1 min → 85-95%    │
   │   🃏 AUTO-ACTIVE                        │
   │   Why: Contains numbers                 │
   │                              [Suspend]  │
   └─────────────────────────────────────────┘
9. Clicks "Add to Topic"
10. Creates:
    - NotebookBlocks for each fact (with quiz results)
    - Cards for each fact (with activation tier)
    - Updates SourceItem status to 'curated'
```

### Secondary Flow: Topic Entry Quiz

```
1. User opens topic page after 5+ days
2. Prompt appears:
   ┌─────────────────────────────────────────┐
   │ Welcome back to Neonatal Resuscitation  │
   │ It's been 5 days. Quick 3-question      │
   │ check? (1 minute)                       │
   │ [Skip for now]          [Start Quiz →]  │
   └─────────────────────────────────────────┘
3. If accepted: Quick quiz on dormant/priority facts
4. Results update priority scores
5. Forgotten dormant cards → activated
```

### Escape Hatches

| Situation | Escape | Result |
|-----------|--------|--------|
| Too tired for quiz | "Skip quiz" checkbox | Facts added, all dormant, no priority data |
| Topic entry quiz | "Skip for now" | Direct to topic, prompted next visit |
| Wrong auto-activation | [Suspend] button | Card suspended, won't review |
| Dormant card needed | [Activate] button | Card becomes active |

---

## Source Type Handling (Different Flows)

| Source Type | Intake Quiz? | Card Auto-Create? | Flow |
|-------------|--------------|-------------------|------|
| **QBank Question** | Full quiz | Yes, all facts | Quiz → Results → Add to Topics → Cards |
| **Clinical Pearl** | Quiz + application prompt | Yes | Quiz + "When would you use this?" |
| **Textbook Chapter** | No (unless extract) | No | Reference mode OR extract specific facts |
| **Journal Article** | No (unless extract) | No | Reference mode OR extract findings |
| **Lecture/Video** | Optional (key takeaways) | Optional | "What were your takeaways?" prompt |
| **Web Resource** | No | No | Reference mode, AI uses for enrichment |
| **Procedure/Skill** | Checklist verification | Step cards | Verify steps → sequence cards |
| **Handwritten Note** | Yes | Yes | OCR → "What did you learn?" quiz |

### Flow Detection

```typescript
function getIntakeFlow(sourceType: SourceType): IntakeFlow {
  switch (sourceType) {
    case 'qbank':
    case 'pearl':
    case 'handwritten':
      return 'full_quiz';  // Full intake quiz with card generation
    case 'lecture':
    case 'video':
      return 'takeaways';  // "Key takeaways?" prompt, optional quiz
    case 'procedure':
      return 'checklist';  // Step verification, sequence cards
    case 'textbook':
    case 'journal':
    case 'web':
    default:
      return 'reference';  // Reference mode, user can extract later
  }
}
```

---

## Implementation Phases

### Phase 1: Schema + Core Infrastructure
**Tasks:**
1. v24 migration: card activation fields, block quiz tracking, new tables
2. IPC handlers: quiz attempts CRUD, card activation/suspension, confusion patterns
3. Multi-topic support: `block_topic_assignments` table + queries

### Phase 2: AI Tasks
**Tasks:**
4. Fact extraction task (`extract-facts.ts`) - parse source into testable facts
5. Quiz generation task - create blanked questions from facts
6. Answer grading task - fuzzy matching with similarity score

### Phase 3: Intake Quiz UI (QBank Flow)
**Tasks:**
7. IntakeQuizModal - orchestrates topic selection → quiz → results
8. QuizQuestionCard - single question with answer input + "Don't know" button
9. QuizResultsScreen - shows results with activation tier indicators + [Activate]/[Suspend] buttons

### Phase 4: Card Activation Logic
**Tasks:**
10. `determineActivationTier()` function with all signals
11. Card activation/suspension IPC handlers
12. Leech detection in review flow (6 lapse threshold)

### Phase 5: Topic Page Updates
**Tasks:**
13. Priority highlighting in TopicArticleView (red/orange/yellow inline)
14. Inline card status badges (dormant/active/suggested indicators)
15. FactDetailPopover - click highlight to see priority reasons

### Phase 6: Topic Entry Quiz (7-day threshold)
**Tasks:**
16. `lastVisitedAt` tracking + "should prompt" logic
17. TopicEntryQuizPrompt - "Welcome back, quick quiz?" modal
18. TopicQuizModal - quiz on dormant/priority facts, results update priority

### Phase 7: Source Type Flows
**Tasks:**
19. Reference mode for textbook/journal/web sources
20. Takeaways prompt for lecture/video sources
21. Checklist verification for procedure sources

### Phase 8: Cleanup + Deprecation
**Tasks:**
22. Delete deprecated components (InsightTextarea, CardWorthinessPanel, etc.)
23. Delete deprecated IPC handlers (ai:evaluateInsight, ai:polishInsight, etc.)
24. Update InboxView/KnowledgeBankView to use new IntakeQuizModal

---

## Deprecation List

### Components to Delete
```
src/components/notebook/
├── InsightTextarea.tsx           # No manual insight writing
├── CardWorthinessPanel.tsx       # Replaced by activation tiers
├── ExistingBlocksList.tsx        # Quiz replaces this context
└── (parts of AddToNotebookWorkflow.tsx)

src/components/cards/
├── CardGenerationModal.tsx       # Cards auto-created on intake
└── TopicCardGeneration.tsx       # Batch generation obsolete
```

### IPC Handlers to Remove
```
'ai:evaluateInsight'      # No insights to evaluate
'ai:polishInsight'        # No insights to polish
'ai:generateCards'        # Cards auto-created
'ai:generateCardsFromTopic' # Batch obsolete
```

### Database Columns (Keep but Unused)
- `notebook_blocks.userInsight` - Could repurpose for user notes
- `notebook_blocks.aiEvaluation` - Could repurpose for quiz feedback

---

## Testing Checklist

### Unit Tests
- [ ] Activation tier determination with various signal combinations
- [ ] Priority score calculation
- [ ] Answer grading fuzzy matching

### Integration Tests
- [ ] Full intake quiz flow: extract → quiz → grade → create blocks + cards
- [ ] Card activation state transitions
- [ ] Topic entry quiz triggering

### Manual Testing
- [ ] Quiz with 0 facts extracted (edge case)
- [ ] Quiz with all correct answers (all dormant)
- [ ] Quiz with all skipped (all suggested)
- [ ] Card leech detection after 6 lapses
- [ ] Topic entry quiz after various day gaps

---

## Smart Card Activation Logic (Complete)

### Research-Backed Principles

| Finding | Implication |
|---------|-------------|
| 85-90% retention is the sweet spot | 95% retention requires exponentially more reviews for marginal gains |
| FSRS achieves 20-30% fewer reviews than SM-2 | Already using FSRS - good |
| Cards failed 8+ times take 10x more reviews | Lower leech threshold to 6 for busy residents |
| Students strategic about activation outperform | Conservative activation with user override |
| 30-40% of Anki time is card creation | DougHub eliminates this - cards auto-created |

### What Actually Needs Cards

| Needs Cards | Doesn't Need Cards |
|-------------|-------------------|
| Arbitrary associations (no logic) | Concepts understood after explanation |
| Numbers, doses, exact values | Contextual understanding |
| Things you keep confusing | Low-yield details |
| Board-tested facts | One-time reference info |

### Activation Tier Detection

```typescript
interface ActivationDecision {
  tier: 'auto' | 'suggested' | 'dormant';
  reasons: string[];
  confidence: number;  // 0-1
}

function determineActivationTier(
  fact: NotebookBlock,
  quizResult: 'correct' | 'wrong' | 'skipped' | null,
  sourceItem: SourceItem
): ActivationDecision {

  // TIER 3: Dormant — user knows this
  if (quizResult === 'correct') {
    return {
      tier: 'dormant',
      reasons: ['You knew this'],
      confidence: 0.9
    };
  }

  // Check for auto-activate signals
  const signals: string[] = [];

  // Signal 1: Contains memorizable values
  if (containsNumbers(fact.content)) {
    signals.push('Contains numbers/values (hard to memorize)');
  }

  // Signal 2: From wrong question
  if (sourceItem.correctness === 'incorrect') {
    signals.push('From a question you got wrong');
  }

  // Signal 3: Cross-source frequency
  const crossSourceCount = db.countSourcesWithSimilarFact(fact.content);
  if (crossSourceCount >= 2) {
    signals.push(`Tested in ${crossSourceCount} sources`);
  }

  // Signal 4: Confusion pattern
  const confusion = db.findConfusionPattern(fact.content);
  if (confusion) {
    signals.push(`You confuse this with "${confusion.conceptB}"`);
  }

  // Signal 5: Low peer correct rate
  if (sourceItem.peerCorrectRate && sourceItem.peerCorrectRate < 0.5) {
    signals.push(`Only ${Math.round(sourceItem.peerCorrectRate * 100)}% of peers get this`);
  }

  // TIER 1: Auto-activate if wrong/skipped AND has signals
  if ((quizResult === 'wrong' || quizResult === 'skipped') && signals.length > 0) {
    return {
      tier: 'auto',
      reasons: signals,
      confidence: Math.min(0.5 + signals.length * 0.15, 0.95)
    };
  }

  // TIER 2: Suggested if wrong/skipped but no signals
  if (quizResult === 'wrong' || quizResult === 'skipped') {
    return {
      tier: 'suggested',
      reasons: ['You missed this, but may not need drilling'],
      confidence: 0.4
    };
  }

  // Default: Dormant
  return {
    tier: 'dormant',
    reasons: ['No activation signals'],
    confidence: 0.3
  };
}

function containsNumbers(text: string): boolean {
  const patterns = [
    /\d+%/,                          // Percentages
    /\d+\s*(mg|mL|mcg|g|kg|mm|cm)/i, // Doses/measurements
    /\d+[-–]\d+/,                    // Ranges (60-65)
    /\b\d{2,}\b/,                    // Numbers 10+
  ];
  return patterns.some(p => p.test(text));
}
```

### Leech Detection (Auto-Suspend)

```typescript
const LEECH_THRESHOLD = 6;  // Lower than Anki's 8 for busy residents

async function checkForLeech(card: Card): Promise<boolean> {
  if (card.lapseCount >= LEECH_THRESHOLD) {
    await db.updateCard(card.id, {
      activationStatus: 'suspended',
      suspendReason: 'leech',
      suspendedAt: new Date().toISOString()
    });

    // Notify user
    await createNotification({
      type: 'leech_detected',
      cardId: card.id,
      message: `Card suspended: "${card.front.slice(0, 50)}..." - You've missed this ${card.lapseCount} times. Consider rewriting or deleting.`,
      actions: ['Rewrite Card', 'Delete Card', 'Keep Trying']
    });

    return true;
  }
  return false;
}
```

### User Controls

**Per-Card Actions:**
- `[Suspend]` — Remove from review queue (can reactivate later)
- `[Activate]` — Move dormant card to active
- `[Rewrite]` — Edit card (for leeches)
- `[Delete]` — Remove permanently

**Bulk Actions (Topic Level):**
- `[Suspend All]` — After rotation ends, suspend all cards for that topic
- `[Activate All Dormant]` — Before exam, activate everything
- `[Quiz Me on Dormant]` — Find hidden gaps

### Key Insight

**Missing a quiz question does NOT automatically mean you need a card.** You need a card when:
1. You missed it AND it's hard to derive (numbers, arbitrary facts)
2. You missed it AND it keeps showing up (cross-source frequency)
3. You missed it AND you keep confusing it with something else
4. You missed it AND most people get it wrong (peer difficulty)

Otherwise, reading the explanation once might be enough.

---

## Success Metrics

After v2 deployment, track:
- **Intake quiz completion rate:** % of add-to-notebook flows that complete quiz vs skip
- **Activation override rate:** How often users [Activate] dormant or [Suspend] auto-active
- **Card efficiency:** Reviews per card before graduation (should decrease with smart activation)
- **Topic coverage:** % of topics with entry quiz completion

---

## Appendix: Type Definitions

```typescript
// Card activation
type ActivationStatus = 'dormant' | 'suggested' | 'active' | 'suspended' | 'graduated';
type ActivationTier = 'auto' | 'suggested' | 'user_manual';
type SuspendReason = 'user' | 'leech' | 'rotation_end';

// Quiz results
type IntakeQuizResult = 'correct' | 'wrong' | 'skipped';

// Priority
interface PriorityResult {
  score: number;  // 0-100
  reasons: string[];
}

// Fact extraction
interface ExtractedFact {
  text: string;
  keyTerm: string;
  keyTermStart: number;
  keyTermEnd: number;
  containsNumbers: boolean;
  conceptType: 'definition' | 'mechanism' | 'values' | 'procedure' | 'association';
}
```
