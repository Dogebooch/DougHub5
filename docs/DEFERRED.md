# DougHub Deferred Features

> **Purpose:** Parking lot for post-MVP features. NOT in TaskMaster to keep the active task list focused.

---

## How to Use This File

**Adding:** "Defer this task: [description]" → Claude adds here
**Promoting:** "Promote [feature] to active tasks" → Claude creates TaskMaster task

---

## TIER 1: Post-MVP Priority

> First in line after MVP. High value, realistic scope.

### Image Capture Support
**Description:** Image paste/drop in capture, display in Library/Notebook/Cards.
**Priority:** High
**Notes:** Core text capture works. Images are common in medical content.

### Topic Maturity Dashboard
**Description:** SQL aggregation showing topic progress: cards created, cards mature, retention rate per topic. Progress bars on topic headers.
**Priority:** High
**Dependency:** FSRS Integration (done)
**Notes:** Visual feedback on board prep progress.

### Staleness Alerts
**Description:** Badge/indicator for topics not reviewed in 14+ days. Surface in sidebar to prompt review.
**Priority:** High
**Dependency:** FSRS Integration (done)
**Notes:** Prevents knowledge decay in neglected topics.

### Response Time Interval Modifier
**Description:** Cards answered fast (<5s) get +15% interval boost; slow answers (>15s) get -15% reduction. Applied on top of FSRS.
**Priority:** High
**Dependency:** FSRS Integration (done)
**Notes:** Groundwork laid in FSRS. Just needs the modifier in scheduleReview().

### FSRS Parameter Optimization
**Description:** After 400+ reviews, trigger MLE training to personalize FSRS parameters to user's memory patterns.
**Priority:** High
**Dependency:** FSRS Integration (done)
**Notes:** Settings table and review_count tracking exist. Needs MLE algorithm.

### Pre-Test Diagnostic
**Description:** Before generating cards from topic, run quick diagnostic. If >80% accuracy, skip or reduce card count.
**Priority:** High
**Notes:** Saves time on already-known material.

### Anki Import (.apkg)
**Description:** Import Anki decks into DougHub. Parse SQLite, map fields, preserve scheduling.
**Priority:** High
**Notes:** Critical for users migrating from Anki.

---

## TIER 2: High Value Enhancements

> Solid features that improve the experience meaningfully.

### Confusion Detection System
**Description:** Detect patterns where user confuses similar concepts. Includes:
- Embedding-based semantic clustering
- Cross-topic confusion pair detection
- Auto-generated comparison cards when confusion detected N times
- Aggregated weekly reports after 1000+ reviews
**Priority:** High
**Dependency:** Embeddings infrastructure, FSRS data
**MVP Status:** Basic confusion tagging in AI Insight Evaluation. This extends it.
**Notes:** High value for medical education - addresses common confusion pairs.

### Exam Trap Coaching (Extended)
**Description:** Track WHY users miss questions. Extends current trap detection with:
- User self-explanation prompt ("Why did you miss this?")
- Cross-session trap pattern aggregation
- AI-generated practice questions targeting weak trap types
**MVP Status:** Basic trap classification implemented. This adds remediation.
**Notes:** Distinguishes test-taking errors from knowledge gaps.

### Board-Informed Card Generation
**Description:** Card generation prompt includes user's practice Q history. AI receives:
- User accuracy on this topic
- Commonly tested concepts from qbank SourceItems
- User's weak spots on this topic
**Priority:** High
**Dependency:** testedConcepts logging on SourceItems
**Notes:** Cards target YOUR gaps, not generic content.

### Archive Full-Text Search
**Description:** Search rawContent field, not just title. SQLite FTS5.
**Priority:** Medium
**Notes:** Add when users have 500+ items.

### Archive RAG Chat
**Description:** Chat interface grounded on Archive content. User question → FTS search → inject into LLM → grounded response with citations.
**Priority:** Medium
**Notes:** "Discuss with your notes" without hallucination.

### Typed Answer Mode
**Description:** Optional mode where user types answer before reveal. Logs userAnswer for confusion analysis.
**Priority:** Medium
**Dependency:** Learning Mode
**Notes:** Active recall (typing > recognition). Rich data for confusion detection.

### Review Sessions Table
**Description:** Persistent session tracking: startedAt, endedAt, cardsReviewed, accuracy, totalTimeMs. Enables session history and analytics.
**Priority:** Medium
**Dependency:** Learning Mode (done)
**Notes:** MVP uses in-memory. This adds persistence.

### Undo Functionality (Ctrl+Z)
**Description:** Global undo for edits and review grades. 10-20 action stack.
**Priority:** Medium
**Notes:** Important safety net.

### Medical List → Overlapping Cloze
**Description:** Convert medical lists into overlapping cloze cards to prevent sibling contamination.
**Priority:** Medium
**Notes:** Per CLAUDE.md guidelines.

### Modern Cloze UI
**Description:** Replace {{c1::text}} syntax with click-based cloze creation. Select text → "Make Cloze".
**Priority:** Medium
**Notes:** Current syntax works but feels technical.

### Loading States in Store Actions
**Description:** Add isLoading flags to useAppStore. Show spinners during API calls, success toasts on completion.
**Priority:** Medium
**Notes:** High anxiety reduction for exhausted users.

---

## TIER 3: Nice to Have

> Good ideas, lower priority. Implement if time permits.

### Semantic Interference Spacing
**Description:** Space similar cards apart in review queue using embeddings. Prevents reviewing related cards back-to-back.
**Priority:** Medium
**Dependency:** Embeddings infrastructure
**Notes:** Evidence-based - semantic similarity causes retrieval interference.

### Batch Relevance Review Smart View
**Description:** Smart View surfacing all NotebookBlocks/Cards with relevanceScore='low' for batch cleanup.
**Priority:** Low
**Notes:** Monthly cleanup safety net.

### AI Duplicate Detection
**Description:** Detect duplicate/near-duplicate content in Archive and Notebook before creating redundant entries.
**Priority:** Medium
**Dependency:** Embeddings infrastructure
**Notes:** Requires embeddings for similarity search.

### Persistent Unreviewed Mistakes Queue
**Description:** "Review Later" saves mistakes to queue for next session. Sidebar badge shows count.
**Priority:** Low
**Dependency:** Learning Mode, Review Sessions Table
**Notes:** MVP shows mistakes immediately. This adds persistence.

### Resume Where I Left Off
**Description:** When app closes mid-review, restore exact state on reopen.
**Priority:** Medium
**Notes:** Residents get interrupted by pages.

### Smart Queue Ordering by Cognitive Load
**Description:** Order queue to prevent fatigue: warm-up cards first, interleave difficulty, end positive.
**Priority:** Low
**Notes:** "First card is brutal, I quit" phenomenon.

### Notebook Block Excerpt Selection
**Description:** When adding block from Archive, allow text selection to capture specific excerpt.
**Priority:** Low
**Notes:** MVP uses full rawContent.

### Notebook Block Drag-to-Reorder
**Description:** Drag and drop blocks within topic page. Position field exists in schema.
**Priority:** Low
**Notes:** Blocks display fine in creation order.

### AI Image Analysis for Board Questions
**Description:** Vision model describes images (ECGs, X-rays) for searchability. Store aiDescription.
**Priority:** Medium
**Dependency:** Vision model (llava or Claude Vision)
**Notes:** "Show me all ECG questions" requires image descriptions.

### Illness Script Template
**Description:** Scaffold for medical content: Etiology → Risk Factors → Presentation → Diagnosis → Treatment.
**Priority:** Low
**Notes:** Medical-specific organization pattern.

### Card Maturity Tracking
**Description:** Track which cards are "mature" vs "learning". Show exam readiness percentage.
**Priority:** Low
**Notes:** Valuable for board prep timeline planning.

---

## TIER 4: Someday/Maybe

> Speculative or high-complexity. Revisit later.

### Adaptive Learning Assistant (AI Jarvis)
**Description:** AI tutor that proactively detects patterns and offers interventions:
- "You confuse X and Y - want a contrast card?"
- "You struggle with ethics - want practice questions?"
- "You have gaps on RTA - review these resources?"
**Priority:** Low (high complexity)
**Dependency:** Embeddings, confusion detection, session history, answer logging
**Notes:** The long-term vision. Requires significant ML infrastructure.

### AI Context Optimization
**Description:** Fix "lost in the middle" problem where AI ignores context in long prompts.
**Priority:** Low
**Notes:** Affects extraction quality with long content.

### Procedural Simulation Mode
**Description:** Advanced procedure review: voice-activated equipment reveal, split-screen UI, step-by-step with timer.
**Priority:** Low
**Dependency:** Basic procedural cards (done)
**Notes:** Cool but high complexity.

### AI Settings UI
**Description:** Settings page for AI provider selection, API keys, model dropdowns.
**Priority:** Low
**Notes:** Current defaults work. Power user feature.

---

## Archive (Completed/Obsolete)

### Command Palette (Ctrl+K) ✓
**Status:** Completed in `src/components/CommandPalette.tsx`

### Auto Note Creation from AI Extraction - OBSOLETE
**Status:** Superseded by v2 architecture (SourceItem → NotebookTopicPage → Card)

### AI Model Selection ✓
**Winner:** `qwen2.5:7b-instruct`

### AI Task Configuration Framework ✓
**Location:** `electron/ai/tasks/*.ts`

---

*Last updated: 2026-01-27 (Major cleanup: removed low-value items, consolidated duplicates, reorganized into priority tiers)*
