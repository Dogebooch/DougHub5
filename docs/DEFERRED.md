# DougHub Deferred Features

> **Purpose:** Parking lot for post-MVP features, ideas, and improvements. These are NOT in TaskMaster to keep the active task list focused.

---

## How to Use This File

**Adding a deferred item:**
- Tell Claude Code: "Defer this task: [description]"
- Claude adds it here and removes from TaskMaster (if applicable)

**Promoting to active:**
- Tell Claude Code: "Promote [feature] to active tasks"
- Claude creates TaskMaster task and removes from this file

---

## POST-MVP Priority Features

> **Note:** These features are first in line after MVP completion. They build on core functionality and provide high value.

### Card-Worthiness Gate (F6) — INTEGRATED INTO T42
**Description:** Card-worthiness soft-gate is now integrated into T42 (Card Generation). Traffic-light panel (Testable? One Concept? Discriminative?) shows during card creation, not as a separate gate.
**Status:** Merged into T42 (2026-01-07)
**Remaining for POST-MVP:** Advanced card format templates for uniform patterns: EKG findings, physical exam findings, crossover confusion topics, medication side effects, lab value interpretations, procedural complications.

### AI Duplicate Detection (F2)
**Description:** AI-powered detection of duplicate or near-duplicate content in Knowledge Bank and Notebook. Warns user before creating redundant entries. Prep: Add embedding columns to schema now for future similarity search.
**Priority:** High
**Source:** Canonical MVP Post-MVP list (2026-01-07)
**Notes:** Requires embeddings infrastructure. Add embedding columns in advance during T42 work.

### Topic Maturity Dashboard (F9)
**Description:** SQL aggregation showing topic progress: cards created, cards mature (passed X reviews), retention rate per topic. Progress bars on topic headers in Notebook view.
**Priority:** High
**Source:** Canonical MVP Post-MVP list (2026-01-07)
**Dependency:** T45 (FSRS Integration)
**Notes:** Visual feedback on board prep progress per topic.

### Staleness Alerts (F10)
**Description:** Badge/indicator for topics not reviewed in 14+ days. Surface in sidebar or topic list to prompt review of neglected areas.
**Priority:** High
**Source:** Canonical MVP Post-MVP list (2026-01-07)
**Dependency:** T45 (FSRS Integration)
**Notes:** Prevents knowledge decay in less-practiced topics.

### Confusion Cluster Detection (F12)
**Description:** Detect patterns where user confuses similar concepts (e.g., similar drug names, overlapping symptoms). Requires embeddings + error pattern analysis from review logs.
**Priority:** High
**Source:** Canonical MVP Post-MVP list (2026-01-07)
**Dependency:** T45 (FSRS Integration), F2 (embeddings), F18 (userAnswer logging)
**MVP Status:** Basic confusion tagging implemented in T121 (AI Insight Evaluation). confusionTags[] stored on NotebookBlock.aiEvaluation. Aggregation in T123 (Weak Points Panel).
**Remaining for POST-MVP:** Embedding-based semantic clustering to automatically detect similar concepts without manual AI tagging. Cross-topic confusion pair detection. Integration with F19 (Adaptive Learning Assistant) for "You confuse X and Y - want a contrast card?" interventions.
**Notes:** High-value for medical education - addresses common confusion pairs. Enhanced by F18 typed answer data for richer pattern detection.

### Response Time Signal (F13)
**Description:** Cards answered fast (<5s) get +15% interval boost; slow answers (>15s) get -15% interval reduction. Applied as multiplier on top of base FSRS calculation.
**Priority:** High
**Source:** User request (2026-01-07)
**Dependency:** T45 (FSRS Integration)
**Notes:** Groundwork laid in T45.6. Requires implementing the actual interval modifier in fsrs-service.ts scheduleReview function.

### FSRS Parameter Optimization (F14)
**Description:** After 400+ reviews, trigger MLE (Maximum Likelihood Estimation) training to personalize FSRS parameters to user's memory patterns. Uses review_logs history to optimize w[] weights.
**Priority:** High
**Source:** User request (2026-01-07)
**Dependency:** T45 (FSRS Integration)
**Notes:** T45.6 added settings table, review_count tracking, and shouldTriggerOptimization() hook. Actual MLE algorithm implementation deferred.

### Semantic Interference Spacing (F15)
**Description:** Space similar cards apart in review queue using embeddings. Prevents reviewing "CHF symptoms" immediately after "pulmonary edema symptoms" which causes interference. Requires embedding infrastructure.
**Priority:** High (Optional)
**Source:** User request (2026-01-07)
**Dependency:** F2 (embeddings infrastructure)
**Notes:** Evidence-based feature - semantic similarity in short succession causes retrieval interference. Requires card embeddings and queue reordering logic.

### Review Sessions Table (F16)
**Description:** Persistent session tracking via `review_sessions` table. Schema: id, startedAt, endedAt, cardsReviewed, mistakeCount, accuracy, totalTimeMs. Enables session history, analytics trends, and cross-session mistake tracking.
**Priority:** Medium
**Source:** T117 scope reduction (2026-01-07)
**Dependency:** T117 (Basic Learning Mode)
**Notes:** MVP T117 uses in-memory tracking. This adds database persistence for session history and analytics. Supports Stats view and progress tracking over time.

### Persistent Unreviewed Mistakes Queue (F17)
**Description:** "Review Later" option in MistakesReviewModal saves mistakes to a queue for next session. Adds `unreviewed_mistakes` table or status flag. Sidebar badge shows pending mistake count. Mistakes view shows all unreviewed mistakes across sessions.
**Priority:** Medium
**Source:** T117 scope reduction (2026-01-07)
**Dependency:** T117 (Basic Learning Mode), F16 (Review Sessions Table)
**Notes:** MVP shows mistakes immediately post-session only. This adds persistent queue with "Insights > Mistakes" view access. Higher complexity: needs new table, sidebar badge, dedicated view component.

### Typed Answer Mode (F18)
**Description:** Optional "Study Mode" where user types their answer before reveal. Settings toggle or per-session button activates text input below card. Logs `userAnswer` to review_logs for confusion analysis. Keybindings: Enter submits/reveals (Space types normally), then Enter=Continue, F=Forgot.
**Priority:** Medium
**Source:** User request (2026-01-07)
**Dependency:** T117 (Basic Learning Mode)
**Schema Prep:** Add `userAnswer TEXT` column to review_logs table (nullable, zero-cost prep for future).
**Notes:** Enables active recall (typing > recognition) and provides rich data for F12 (Confusion Clusters) and F19 (Adaptive Learning Assistant). Consider speech-to-text integration (T50) as alternative input mode.

### Card Browser Performance Optimization (F35)
**Description:** Implement dedicated batch IPC channels for card operations (suspend, delete, move). Current implementation uses sequential IPC calls which may lag for 500+ cards.
**Priority:** Low
**Source:** T115.10 implementation (2026-01-08)
**Notes:** Sequential iteration is fine for typical resident workflows (<100 cards), but lacks scalability.

### Card Browser Shift+Click Selection (F21)
**Description:** Support range selection via Shift+Click in the Card Browser.
**Priority:** Low
**Source:** T115.10 implementation (2026-01-08)
**Notes:** More intuitive UX for desktop users. Requires tracking selection anchor and calculating range within filtered/sorted list state.

### Batch IPC Channel for Card Operations (F33)
**Description:** Dedicated batch IPC channels (`cards:batchSuspend`, `cards:batchDelete`) that accept arrays of card IDs and perform operations in a single database transaction. Current implementation iterates sequential IPC calls which may lag for 500+ card selections.
**Priority:** Low
**Source:** T115.10 performance consideration (2026-01-08)
**Notes:** Sequential iteration is acceptable for typical workflows (<100 cards). Optimization candidate if real-world usage shows performance issues with large selections.

### Adaptive Learning Assistant (F19)
**Description:** AI tutor that proactively detects learning patterns and offers targeted interventions. Three intervention types:
1. **Confusion Pairs:** "You confuse Methotrexate and Methylnaltrexone - want a contrast card or mnemonic?"
2. **Topic Weakness:** "You struggle with ethics - want some practice board questions?"
3. **Knowledge Gap Remediation:** "You have poor understanding of Type 4 RTA. I found resources in your Knowledge Bank - review them, then run a targeted flashcard session?"
**Priority:** High
**Source:** User vision (2026-01-07)
**Dependency:** F2 (embeddings), F12 (confusion detection), F16 (session history), F18 (answer logging), F34 (exam traps)
**Components:**
- Confusion pair detection algorithm (embeddings + answer pattern matching)
- Topic weakness aggregation (builds on T45.3 getLowDifficultyCardsByTopic)
- KB resource surfacing (semantic search across source_items)
- Practice question generation (AI generates board-style questions from weak topics)
- Contrast card creation (AI generates cards distinguishing confused concepts)
- Mnemonic suggestion (AI proposes memory aids for confusion pairs)
- Exam trap coaching (F34 pattern → targeted question parsing practice)
**Notes:** This is the "AI Jarvis" vision - an intelligent tutor, not just passive analytics. Requires significant ML/AI infrastructure but is the long-term differentiator for DougHub.

### Exam Trap Detection (F34)
**Description:** Track WHY users miss questions, not just WHAT they missed. AI classifies error types: Knowledge Gap vs Exam Trap. Exam traps categorized: Qualifier Misread, Negation Blindness, Age/Population Skip, Absolute Terms, Best-vs-Correct, Timeline Confusion.
**Priority:** High
**Source:** User vision (2026-01-07)
**Dependency:** T117 (Basic Learning Mode), F18 (answer logging)
**MVP Status:** Basic exam trap classification implemented in T121 (AI Insight Evaluation). examTrapType stored on NotebookBlock.aiEvaluation when source marked incorrect. Aggregation in T123 (Weak Points Panel) shows trap type breakdown.
**Remaining for POST-MVP:**
- User self-explanation prompt ("Why do you think you missed this?") with userExplanation column on review_logs
- Cross-session trap pattern aggregation ("You've misread qualifiers 5 times this month")
- F19 integration: "Want to practice parsing tricky question stems?"
- Advanced trap-specific remediation suggestions
**Exam Trap Categories (implemented in T121):**
1. qualifier-misread - "most common" vs "most common abnormality"
2. negation-blindness - "Which is NOT associated with..."
3. age-population-skip - Missing "in children" or "in pregnant women"
4. absolute-terms - "always", "never", "only" (usually wrong)
5. best-vs-correct - Multiple correct answers, one is "best"
6. timeline-confusion - "initial management" vs "definitive treatment"
**Notes:** Distinguishes test-taking errors from knowledge gaps. Unique differentiator - no competitor does this well. High value for board prep where question parsing is half the battle.

---

## Insights Sidebar Section (POST-MVP)

> **Concept:** Add an INSIGHTS section to sidebar below LIBRARY for analytics and learning feedback. Requires routing, views, and state management for each item.

### Sidebar Insights Section Layout
```
├─ INSIGHTS ─────────────────┤
│  📊 Stats                  │  ← Review analytics, retention trends
│  📚 Mistakes        (3)    │  ← Unreviewed misses from T117
│  ⚠️ Weak Topics            │  ← Topics with low retention
└────────────────────────────┘
```

### Insights: Stats View
**Description:** Dashboard showing review analytics: cards reviewed today/week/month, retention rate trends, time spent studying, FSRS performance metrics.
**Priority:** Medium
**Dependency:** T45 (FSRS Integration)
**Tasks Required:** Stats view component, SQL aggregation queries, chart components (optional), sidebar routing
**Notes:** Data already being collected in review_logs. This is display layer only.

### Insights: Mistakes View
**Description:** Dedicated view for unreviewed mistakes from Learning Mode (T117). Shows cards that were missed with AI elaborated feedback, links back to source.
**Priority:** Medium
**Dependency:** T117 (Learning Mode)
**Tasks Required:** Mistakes view component, mistake tracking state in useAppStore, badge count logic, sidebar routing
**Notes:** T117 shows mistakes in post-review modal. This view provides persistent access to review mistakes later.

### Insights: Weak Topics View
**Description:** Topics and cards with low retention. Two sub-views: (1) Weak Notebook Topics - topics with low overall retention rate or high lapse count, (2) Weak Cards - individual cards with low ease or high lapse count. Shows retention %, card/topic count, last reviewed date. Click to navigate to topic in Notebook or card in Card Browser.
**Priority:** Medium
**Dependency:** T45 (FSRS Integration), F9 (Topic Maturity Dashboard)
**Tasks Required:** Weak topics view component, SQL queries for low-retention topics AND cards, badge count logic, sidebar routing
**Notes:** Helps identify knowledge gaps at both topic and card level. Threshold: retention < 70% or not reviewed in 14+ days.

---

## UI Enhancements

### Single-Item Delete Confirmation
**Description:** Add confirmation dialog for single-item delete in InboxView. Currently deletes immediately on click; batch delete has confirmation but single delete does not.
**Priority:** Low
**Source:** Task 39.1-39.3 review (2026-01-06)
**Notes:** Low risk—user can re-capture if accidental delete. Batch delete (39.4) has confirmation. Align single/batch behavior post-MVP.

### Quick Actions Row
**Description:** Add quick action buttons below capture box: "Paste", "Upload", "Extract Board Question" for faster capture workflows.
**Priority:** Low
**Source:** User request during testing (2026-01-06)
**Notes:** Could reduce clicks for common capture patterns.

### Knowledge Bank Advanced Filters
**Source:** Task 40 scoping (2026-01-06)
**Description:** Additional filter options for Knowledge Bank: topic filter dropdown, tag filter dropdown, date range picker, multi-select status/sourceType filters.
**Priority:** Low
**Notes:** Single-select chips + source dropdown covers 95% of use cases. Add if users request.

### Knowledge Bank Full-Text Search
**Source:** Task 40 scoping (2026-01-06)
**Description:** Search rawContent field in addition to title. Requires new IPC handler `sourceItems:search(query)` with SQLite FTS5.
**Priority:** Medium
**Notes:** Title search covers most cases. Add when users have 500+ items and can't find content.

### Knowledge Bank Keyboard Navigation
**Source:** Task 40 scoping (2026-01-06)
**Description:** Keyboard shortcuts for Knowledge Bank: `/` to focus search, `i/p/c` to filter by status, arrow keys to navigate list, Enter to open item.
**Priority:** Low
**Notes:** Follows Superhuman/Things 3 patterns. Power user polish.

### Hotkey Reliability Investigation
**Description:** Ctrl+Shift+S hotkey intermittently stops working. Manual button always works. May be focus/event bubbling issue.
**Priority:** Low
**Source:** Manual testing (2026-01-06)
**Notes:** Workaround: use FAB button. Investigate after MVP.

---

## Testing & Quality Assurance

### Store Actions Unit Tests
**Description:** Unit tests for batch selection state management in useAppStore: toggleInboxSelection, selectAllInbox, clearInboxSelection, batchAddToNotebook, batchDeleteInbox.
**Priority:** Low
**Source:** Task 39.3 completion (2026-01-06)
**Test Cases:**
- toggleInboxSelection: verify Set updates correctly on add/remove
- selectAllInbox: verify replaces Set with all IDs
- clearInboxSelection: verify resets to empty Set
- batchAddToNotebook: verify Promise.allSettled, refreshCounts, clearInboxSelection called
- batchDeleteInbox: verify same error handling pattern
- Edge cases: empty selection, API unavailable, partial IPC failures
**Notes:** Store logic is simple and manually verified. Defer until post-MVP test suite expansion.

### BatchActions Component Tests
**Description:** Unit tests for BatchActions.tsx toolbar and InboxView integration.
**Priority:** Low
**Source:** Task 39.4 completion (2026-01-06)
**Test Cases:**
- Toolbar hidden when selectedCount === 0
- Toolbar visible with correct count when selectedCount > 0
- Singular/plural text ("item" vs "items")
- Delete button opens AlertDialog
- Cancel closes dialog without firing onDelete
- Confirm fires onDelete and shows loading spinner
- Add to Notebook button fires onAddToNotebook
- Clear Selection button fires onClearSelection
- Select Visible checkbox: checked when all visible selected, indeterminate when partial
**Notes:** Component manually verified. Defer until post-MVP test suite expansion.

### AddToNotebookDialog Component Tests
**Description:** Unit tests for AddToNotebookDialog.tsx topic selection and creation flow.
**Priority:** Low
**Source:** Task 39.5 completion (2026-01-06)
**Test Cases:**
- Dialog displays correct item count in description
- Confirm disabled when no topic selected and input empty
- Debounce triggers after 300ms of typing
- No API call when input < 2 characters
- Suggestions display with aliases
- "Create new topic" option appears when no exact match
- Selecting topic updates button text and enables Confirm
- Creating new topic calls createOrGet before batchAddToNotebook
- Success toast shows topic name and item count
- Error toast on API failure
- State resets after successful submission
**Notes:** Component manually verified. Defer until post-MVP test suite expansion.

---

## Capture & Extraction

### Medical List Processing
**Description:** Convert medical lists (differentials, procedures) into clinical vignettes and overlapping cloze cards to prevent sibling contamination.
**Priority:** Medium
**Source:** Task T4 (Legacy)
**Notes:** Has detailed subtasks in original TaskMaster. Revisit after core v2 flow works.

### Connection Suggestions
**Description:** AI surfaces related notes during extraction based on semantic similarity.
**Priority:** Low
**Source:** Task T7 (Legacy)
**Notes:** Requires embeddings infrastructure. Post-MVP.

### Extraction Queue Enhancements
**Description:** Batch processing support for Quick Dumps, queue indicator in header.
**Priority:** Low
**Source:** Task T8 (Legacy)
**Notes:** Basic inbox flow (T39) covers core need. This is polish.

### Tag-Based Organization
**Description:** AI suggests medical domain tags, tag filtering, tag-based navigation.
**Priority:** Medium
**Source:** Task T9 (Legacy)
**Notes:** Tags exist in schema. This is about AI suggestions and tag management UI.

### Metadata Schema Templates
**Description:** AI prompt templates per source type for extracting metadata (qbank, article, pdf, etc).
**Priority:** Low
**Source:** Task T37 (Legacy)
**Notes:** Nice-to-have for smarter metadata suggestions.

---

## Review & Scheduling

### Response Time Personalization
**Description:** Track response times, use for interval adjustments and domain-specific scheduling.
**Priority:** Medium
**Source:** Task T12 (Legacy)
**Notes:** FSRS already tracks response time. This is about using it for personalization.

### Partial Credit Tracking
**Description:** Track individual list item recall for clinical vignettes (3/5 correct schedules differently than 1/5).
**Priority:** Low
**Source:** Task T13 (Legacy)
**Notes:** Requires medical list processing (T4) first.

### Space Bar Auto-Grade
**Description:** Space bar after answer visible auto-grades as Good and continues.
**Priority:** Low
**Source:** Task T32 (Legacy)
**Notes:** May conflict with zero-decision review design.

### Personalized Response Baselines
**Description:** Grade relative to user's own response patterns rather than fixed thresholds.
**Priority:** Medium
**Source:** Task T49 (Legacy)
**Notes:** Evidence-based feature. Implement after basic review flow stable.

### Voice Answer Capture
**Description:** Speech-to-text answer capture with AI grading comparison.
**Priority:** Low
**Source:** Task T50 (Legacy)
**Notes:** Exploratory. Web Speech API + AI comparison. Privacy considerations.

### Low-Ease Card Detection (T46)
**Description:** Flag cards with difficulty/ease metrics indicating poor retention (ease < 2.0). Surface in Weak Topics smart view, suggest card rewrites or content fixes.
**Priority:** Medium
**Source:** Task T46 from backup, DougHub Vision (deferred)
**Dependency:** T45 (FSRS Integration)
**Notes:** Diagnostic feature for identifying struggling cards. Post-MVP but high value for board prep efficiency.

---

## AI & Settings

### AI Settings UI
**Description:** Settings page for AI provider selection, API keys, model dropdowns, connection testing.
**Priority:** Medium
**Source:** Task T28 (Legacy)
**Notes:** Current defaults work. This is for power users who want to configure providers.

### Recommended Ollama Models
**Description:** Research and document optimal models for medical extraction (GPU and CPU).
**Priority:** Low
**Source:** Task T30 (Legacy)
**Notes:** Depends on T28. Nice documentation to have.

---

## Polish & UX

### Test Suite Fixes
**Description:** Fix 105 failing tests. Issues: missing `fireEvent` imports in QuickCaptureModal.test.tsx, Electron subprocess mocking (`unref`) fails in Vitest environment.
**Priority:** Medium
**Source:** Audit (2026-01-06)
**Notes:** Defer until after T39-T45 UI changes complete. Current tests will need rewriting anyway as UI evolves. Core app functionality works.

### Command Palette Enhancements
**Description:** Fuzzy search, recent actions history, more command categories.
**Priority:** Low
**Source:** Task T11 (Legacy)
**Notes:** Basic command palette exists. These are enhancements.

### UI/UX Rules Documentation
**Description:** Document button hierarchy, confirmation patterns, naming conventions, keyboard shortcuts.
**Priority:** Low
**Source:** Task T47 (Legacy)
**Notes:** Apply incrementally as we build. Don't need a dedicated task.

---

## AI & Extraction

### AI Extraction Pipeline Debugging
**Description:** Troubleshoot Ollama AI extraction integration. Issues include JSON parsing with Ollama responses, model compatibility testing (currently using 7b-instruct), and extractConcepts() return format validation. End-to-end testing needed from CaptureInterface paste → AI extraction → concept display.
**Priority:** Medium
**Source:** TaskMaster AI setup docs (ai-extraction-fix.txt)
**Notes:** Core extraction works with Claude. Ollama is alternative provider for offline/local usage. Not MVP-blocking.

---

## Capture Enhancements (Advanced)

### AI Auto-Title Generation
**Description:** Add AI-powered title generation for Quick Capture content. Debounced 500ms after content change, generates concise title (max 50 chars) using AI prompt. Requires IPC handler ai:generateTitle, ai-service function, caching. Falls back to truncation if AI fails.
**Priority:** Medium
**Source:** T118.2 (simplified for MVP, 2026-01-08)
**Notes:** MVP uses editable title field with truncation only. AI enhancement adds polish but not essential for core capture flow.

### PDF/Document Drag-Drop Support
**Description:** Extend QuickCaptureModal drag-drop to handle PDF files and other document types (docx, txt) beyond images. Save file path to SourceItem.mediaPath, set appropriate sourceType, show file icon + name in preview.
**Priority:** Medium
**Source:** T118.5 (cancelled from MVP scope, 2026-01-08)
**Notes:** Image drag-drop already works. PDF requires file path storage + preview UI updates. Consider OCR extraction for PDFs in future.

### Camera Capture with AI Vision Analysis
**Description:** Add camera/webcam capture to Quick Dump. AI vision model (Claude) analyzes image + surrounding text context to extract diagram/chart content, cross-reference similar images online, identify medical concepts. Enables multimodal learning pipeline.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Notes:** Exploratory. Needs research on multimodal AI integration, image similarity APIs, cost implications.

### Unified Capture Pathway UX Audit
**Description:** Current UI doesn't clearly teach three capture pathways: (1) Quick Dump → Inbox, (2) Main Page → Extract Concepts, (3) Learning Pipeline. Need UX audit, visual cues/onboarding, user testing with residents, potential pathway consolidation.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Notes:** Awaits post-MVP user feedback. May not be an actual problem.

### AI Image Context Understanding
**Description:** Enhance AI service to handle images with rich context. Accept image + text together (multimodal), use surrounding text to disambiguate, identify medical diagrams/charts/algorithms, generate appropriate card formats (labeled diagram → multiple cloze cards). Requires Claude vision API research.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Notes:** Related to Camera Capture feature. Needs prompt engineering for medical images.

---

## Search Enhancements (Advanced)

### OCR Image Text Search
**Description:** Extract text from images for searchability using Tesseract.js or Cloud OCR API. Index extracted text in FTS5 for search.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Notes:** High complexity. Requires OCR infrastructure and FTS5 indexing strategy.

### Video Transcription Search
**Description:** Transcribe video/audio content using Whisper for searchability.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Notes:** Very high complexity. Major scope consideration. Would enable searching recorded lectures.

### Voice Search (Siri-like)
**Description:** Implement voice-to-text search using Web Speech API. Allow users to speak search queries.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Notes:** High complexity. Nice-to-have for accessibility and mobile use.

### Semantic Intent Search
**Description:** Use AI embeddings to understand search intent beyond keyword matching. Leverage Ollama for local embeddings.
**Priority:** Medium
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Notes:** Current TF-IDF approach works. This would enable "find cards about heart failure management" vs exact keyword matching.

### Context-Aware Search Suggestions
**Description:** AI-powered suggestions like "Cards comparing X and Y" based on user context and study patterns.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Notes:** Needs AI inference. Cool feature but not essential.

---

## UI Polish (Post-MVP)

### Superhuman-Style Split View for Notebook
**Description:** Master-detail layout for Notebook view: narrow topic list on left (~280px), content on right. Resizable divider, topic search/filter, smooth transitions, keyboard navigation. Avoids full-page navigation.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Notes:** Nice UX polish. Current full-page navigation works fine for MVP.

### Notion-Style Breadcrumb Navigation
**Description:** Breadcrumb trail in content header showing location ("Capture > New Note", "Review > Cardiology"). Clickable segments, truncation with hover expansion.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Notes:** Helps orientation in complex navigation. Post-MVP polish.

### Things 3 Today Badge Pulse Animation
**Description:** Subtle pulse animation on Today count badge when due cards > 0. Scale 1.0 to 1.05, opacity variation, respects prefers-reduced-motion, stops after review session starts.
**Priority:** Low
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Notes:** Delightful detail. Pure polish.

### Weak Topics in Sidebar
**Description:** Add Weak Topics nav item to sidebar INSIGHTS section showing count of topics with low-ease cards (<2.0). Requires T46 (low-ease detection) to be complete first.
**Priority:** Medium
**Source:** UI/UX Sidebar Analysis (2026-01-06)
**Notes:** Valuable diagnostic signal for Doug. Defer until T46 provides the underlying data. Add to sidebar after low-ease detection works.

### Stats in Sidebar
**Description:** Add Stats nav item to sidebar for review analytics dashboard. Currently not daily-use for exhausted user.
**Priority:** Low
**Source:** UI/UX Sidebar Analysis (2026-01-06)
**Notes:** Move to Settings menu for now. Consider promoting to sidebar post-MVP if users want quick access to stats.


### Dashboard View
**Description:** Aggregated overview showing: cards due today, streak count, weekly review heatmap, retention rate, upcoming workload forecast. Entry point for Stats and Insights. Could replace separate Stats view.
**Priority:** Low
**Source:** Sidebar Consolidation Analysis (2026-01-06)
**Notes:** Not daily-use for exhausted user. Nice-to-have for weekly check-ins and motivation. Post-MVP.

### Sidebar Keyboard Navigation (j/k)
**Description:** Add Vim-style keyboard navigation for sidebar: j/k to move between nav items, Enter to select. Matches Superhuman/Things 3 patterns.
**Priority:** Low
**Source:** UI/UX Sidebar Analysis (2026-01-06)
**Notes:** Power user polish. Not blocking any workflow.

### Collapsible Sidebar Sections
**Description:** Allow DO NOW and LIBRARY sections to collapse/expand independently. Persist state in localStorage.
**Priority:** Low
**Source:** UI/UX Sidebar Analysis (2026-01-06)
**Notes:** Nice-to-have. Current section headers are sufficient without collapse.

---

## Notebook Enhancements (Post-MVP)

### Notebook Block Drag-to-Reorder
**Description:** Drag and drop blocks within a topic page to reorder them. Uses position field in NotebookBlock schema.
**Priority:** Low
**Source:** Task T41 scoping (2026-01-07)
**Notes:** Position field exists in schema. Complex drag-drop UI not MVP-critical. Blocks display fine in creation order.

### Notebook Block Excerpt Selection
**Description:** When adding a block from Knowledge Bank, allow text highlighting/selection to capture specific excerpt instead of full content.
**Priority:** Medium
**Source:** Task T41 scoping (2026-01-07)
**Notes:** MVP uses full rawContent. Excerpt selection needs text selection UI, potentially contenteditable or range selection API. Add when users have long source items.

### Optimistic UI for Block Creation
**Description:** Show newly created blocks immediately before API confirms, then reconcile with server response. Currently T41 uses full refetch after block creation.
**Priority:** Low
**Source:** Task T41.3/T41.5 review (2026-01-07)
**Notes:** Full refetch approach is simpler and acceptable for MVP. True optimistic updates add complexity (temp IDs, rollback on failure). Add when block creation latency becomes noticeable.

### TopicPageView Double-Fetch on Load
**Description:** TopicPageView calls `onRefresh()` at end of `fetchData()`, which triggers parent refetch. This may cause double-fetch on initial load since parent already loaded data.
**Priority:** Low
**Source:** Task T41.3 review (2026-01-07)
**Notes:** Not breaking - just minor inefficiency. Consider only calling `onRefresh()` after mutations (block create/delete), not on initial load. Could use a `skipParentRefresh` flag or separate the refresh trigger.

---

## Navigation & History

### Global Floating Capture Window
**Description:** Ctrl+Enter hotkey to open floating capture window from anywhere in app. Always-accessible quick dump.
**Priority:** Low
**Source:** Task T16 (Legacy)
**Notes:** Current Quick Dump modal covers this. Floating window is UX polish.

### Back Button with Navigation History
**Description:** Persistent back button with navigation history stack. Remember previous views for natural back/forward.
**Priority:** Low
**Source:** Task T33 (Legacy)
**Notes:** Escape key provides basic back. Full history stack is post-MVP.

---

## Cloze & Card Editing

### Modern Cloze UI
**Description:** Replace {{c1::text}} syntax with click-based cloze creation. Select text → click "Make Cloze" or use keyboard shortcut. Cleaner review display without curly braces.
**Priority:** Medium
**Source:** Task T34 (Legacy)
**Notes:** Current syntax works but feels technical. Would improve capture UX significantly.

---

## AI Enhancements

### AI Context Optimization (Lost in the Middle)
**Description:** Research and fix "lost in the middle" problem where AI ignores context in long prompts. Optimize context window usage for extraction.
**Priority:** Medium
**Source:** Task T48 (Legacy)
**Notes:** Affects extraction quality with long source content.

### AI Agent / Jarvis Mode
**Description:** Natural language interface for card retrieval. "Show me cards about heart failure" → filtered view. Voice or text input.
**Priority:** Low
**Source:** Task T51 (Legacy)
**Notes:** Exploratory. Cool but not essential for core learning loop.

### Procedural Simulation Mode (Enhanced)
**Description:** Advanced interactive procedure review beyond T42's basic procedural cards. Features: (1) Voice-activated equipment reveal—user verbally recalls supplies before seeing checklist, (2) Split-screen interface showing equipment on left and steps on right, (3) Sequential step reveal with confirmation, (4) Haptic/audio feedback for correctness, (5) Procedure timer with target ranges.
**Priority:** Low
**Source:** Task T52 (Legacy), T42 implementation narrative (2026-01-07)
**Dependency:** T42 (Card Generation) provides basic procedural card format
**Notes:** T42 MVP includes basic two-part procedural cards (supplies + steps). This entry covers the advanced simulation mode with voice activation, split-screen UI, and gamified step-by-step reveal. Requires Web Speech API research, audio integration.

---

## Review UI Improvements

### Manual Grade Button Contrast
**Description:** Improve color contrast on manual grade override buttons for accessibility.
**Priority:** Low
**Source:** Task T53 (Legacy)
**Notes:** Current colors work but could be more accessible.

### First-Time Review Tutorial
**Description:** Interactive tutorial explaining zero-decision review flow on first use. Show how timing affects auto-grade.
**Priority:** Low
**Source:** Task T55 (Legacy)
**Notes:** Onboarding improvement. Users figure it out but tutorial would help.

### Hide Grade Buttons Until Answer Shown
**Description:** Don't show manual grade buttons until after answer is revealed. Prevents accidental pre-answer grading.
**Priority:** Low
**Source:** Task T56 (Legacy)
**Notes:** Minor UX bug. Low priority.

### Persistent Back Button in Review Header
**Description:** Always-visible back button in review screen header for quick exit without keyboard.
**Priority:** Low
**Source:** Task T57 (Legacy)
**Notes:** Escape works but button adds discoverability.

---

## Data Import/Export

### Anki Import (.apkg)
**Description:** Import Anki decks (.apkg files) into DougHub. Parse SQLite, map fields, preserve scheduling if possible.
**Priority:** High
**Source:** Task T73 (Legacy)
**Notes:** Critical for users migrating from Anki. Major feature.

### Undo Functionality (Ctrl+Z)
**Description:** Global undo for edits and review grades. Undo stack with reasonable depth (10-20 actions).
**Priority:** Medium
**Source:** Task T72 (Legacy)
**Notes:** Important safety net. Implement after core flows stable.

---

## Onboarding & Help

### Queue Onboarding
**Description:** Explain what Queue view is and how cards get there. Tooltip or first-time modal explaining FSRS scheduling.
**Priority:** Low
**Source:** Task T71 (Legacy)
**Notes:** Users may not understand Queue vs Today distinction.

---

## Infrastructure

### Expand Medical Acronym Database
**Description:** Replace current 137-entry acronym list with ~2000+ entries from open-source medical abbreviation datasets.
**Priority:** Low
**Source:** Task T92 (Legacy)
**Notes:** Current list covers common abbreviations. Expand if gaps found.

### Close Ollama on App Exit
**Description:** Gracefully terminate spawned Ollama process when Electron app closes. Prevent orphan processes.
**Priority:** Low
**Source:** Task T93 (Legacy)
**Notes:** Currently Ollama may stay running. Minor cleanup issue.

---

## Learning Mode (Evidence-Based)

> **Note:** This is a comprehensive evidence-based learning enhancement suite. Implement after core MVP is stable. Based on cognitive science research.

### Post-Practice Review Trigger
**Description:** After practice session, offer Quick/Deep review mode choice. Quick = standard FSRS. Deep = elaborated feedback.
**Priority:** Medium
**Source:** Task T94 (Legacy)
**Notes:** Entry point for learning mode features.

### 3-Button Confidence Rating
**Description:** Replace auto-grade with Forgot/Struggled/Knew It buttons. Explicit confidence signal for scheduling.
**Priority:** Medium
**Source:** Task T95 (Legacy)
**Notes:** More granular than time-based auto-grade. Research-backed.

### Elaborated Feedback
**Description:** Show why-right and why-wrong explanations after answer. AI-generated or author-written.
**Priority:** Medium
**Source:** Task T96 (Legacy)
**Notes:** Improves learning vs simple correct/incorrect feedback.

### Adaptive Gating Logic
**Description:** Route cards based on confidence + correctness. Low confidence + correct → "lucky guess" path. High confidence + wrong → "misconception" path.
**Priority:** Medium
**Source:** Task T97 (Legacy)
**Notes:** Sophisticated scheduling based on metacognition.

### Discrimination Training
**Description:** When user confuses similar concepts, surface comparison cards. "You said A but meant B—here's how they differ."
**Priority:** Medium
**Source:** Task T98 (Legacy)
**Notes:** Addresses common medical confusion (e.g., similar drug names).

### Transfer Practice Variants
**Description:** Same concept in different clinical contexts. "You know X for adults—now try pediatric version."
**Priority:** Low
**Source:** Task T99 (Legacy)
**Notes:** Promotes transfer learning. Requires card variants.

### Response Time as Implicit Confidence
**Description:** Use response latency as secondary confidence signal. Fast + correct = high confidence. Slow + correct = retrieval struggle.
**Priority:** Low
**Source:** Task T100 (Legacy)
**Notes:** Already tracking time. This is about using it smarter.

### Confidence-Weighted FSRS Adjustments
**Description:** Multiply FSRS intervals by confidence factor. Low confidence → shorter intervals even if correct.
**Priority:** Medium
**Source:** Task T101 (Legacy)
**Notes:** Research-backed modification to standard FSRS.

### Pre-Test Diagnostic (F11)
**Description:** Before generating cards from topic, run quick diagnostic. If >80% accuracy, skip or reduce card count.
**Priority:** High
**Source:** Task T102 (Legacy), Canonical MVP Post-MVP list
**Notes:** Saves time on already-known material. Efficiency feature. First batch of post-MVP features.

### Illness Script Template
**Description:** Scaffold for medical content consolidation. Etiology → Risk Factors → Presentation → Diagnosis → Treatment structure.
**Priority:** Medium
**Source:** Task T103 (Legacy)
**Notes:** Medical-specific organization pattern. Very useful for clinical reasoning.

### Confusion Alert for Similar Terms
**Description:** Detect when answer matches wrong but similar concept. "You answered Digoxin but that's for atrial fibrillation—this is asking about heart failure."
**Priority:** Medium
**Source:** Task T104 (Legacy)
**Notes:** Powerful feedback for discrimination errors.

### Session Fatigue Detection
**Description:** Monitor accuracy drop during session. Suggest break when performance declines significantly.
**Priority:** Low
**Source:** Task T105 (Legacy)
**Notes:** Evidence-based fatigue management. Nice-to-have.

### Progress Bar UI
**Description:** Thin progress bar at top of screen showing session progress. Duolingo-style motivation without distraction.
**Priority:** Low
**Source:** Task T106 (Legacy)
**Notes:** Simple motivational element.

### Card Maturity Tracking
**Description:** Track which cards are "mature" (passed multiple reviews) vs "learning". Show exam readiness percentage.
**Priority:** Medium
**Source:** Task T107 (Legacy)
**Notes:** Valuable for board prep timeline planning.

---

## Gamification

> **Note:** Motivational features for consistent study habits. Implement after core learning loop is satisfying.

### Daily Streak
**Description:** Track consecutive study days. Visual indicator in sidebar or header. Streak freeze for sick days.
**Priority:** Low
**Source:** Task T108 (Legacy)
**Notes:** Simple motivation. Duolingo-proven pattern.

### XP System
**Description:** Award XP for reviews, new cards, streaks. Session summaries show XP earned. Levels or milestones.
**Priority:** Low
**Source:** Task T109 (Legacy)
**Notes:** Gamification layer. May feel cheesy—test with users.

### Review Heatmap
**Description:** GitHub-style activity calendar showing review history. Green squares for study days. Visualize consistency.
**Priority:** Low
**Source:** Task T110 (Legacy)
**Notes:** Popular in Anki community. Good motivation/accountability.

---

## Archive (Completed or Obsolete)

### Command Palette (Ctrl+K) - IMPLEMENTED ✓
**Status:** Completed in `src/components/CommandPalette.tsx`
**Features:**
- Keyboard shortcut: Ctrl+K / Cmd+K
- Fuzzy search navigation
- Quick actions: Go to Capture, Review, Quick Capture, Settings
- Keyboard navigation (up/down/enter)
- Opens QuickDumpModal for Quick Capture command
**Implementation:** React component with fuzzy search, integrated in App.tsx
**Date Completed:** Pre-2026-01-06
**Notes:** Basic implementation complete. Enhancements (recent history, more commands) deferred to post-MVP.

### Auto Note Creation from AI Extraction - OBSOLETE
**Status:** Superseded by v2 architecture
**Original Idea:** Automatically create Notes from extraction sessions with bidirectional card-note links
**Replacement:** v2 uses SourceItem → NotebookTopicPage → Card flow. "Notes" are a v1 concept. The noteId column on cards is legacy; v2 cards use notebookTopicPageId instead.
**Date Obsoleted:** 2026-01-06 (v2 data model adoption)

---

## Card Browser Enhancements (POST-MVP)

> **Note:** These features were part of the comprehensive Card Browser design (v2.1) but deferred from T115 MVP scope.

### AI-Generated Card Titles (F21)
**Description:** Generate ~30 char AI titles on card creation to make list scanning easier. Example: "Permissive HTN within 72 hours..." → "HTN management: stroke type". Async generation, non-blocking, with truncation fallback.
**Priority:** Medium
**Source:** Card Browser Design v2.1 (T115, 2026-01-08)
**Dependency:** F2 (embeddings infrastructure for quality title generation)
**Notes:** MVP uses simple front text truncation (40 chars). AI titles improve scanability at 60k+ card scale.

### Card Browser Duplicate Detection Box (F22)
**Description:** Collapsible panel in Card Browser showing detected duplicate pairs with one-click resolution: [Keep Left], [Keep Right], [Not Duplicates]. Paginated ("5 of 247"). Detection via title similarity, embedding distance, same topic.
**Priority:** Medium
**Source:** Card Browser Design v2.1 (T115, 2026-01-08)
**Dependency:** F2 (embeddings infrastructure), requires DuplicateCandidate table
**Schema:** `duplicate_candidates` table with card1Id, card2Id, similarityScore (0-1), status (pending/dismissed/merged), detectedAt, resolvedAt.
**Notes:** Requires background scan + on-creation detection. AI learns from "Not Duplicates" dismissals.

### Jump-to-Card Dialog (Ctrl+G) (F23)
**Description:** Modal dialog to jump to specific card by ID or title search. For power users managing 60k+ cards.
**Priority:** Low
**Source:** Card Browser Design v2.1 (T115, 2026-01-08)
**Notes:** Basic search covers most cases. Add when users report difficulty finding specific cards.

### Typo Suggestion in Empty State (F24)
**Description:** When search returns 0 results, suggest typo corrections using fuzzy matching against existing card fronts. Example: "No cards match 'cardilogy'. Did you mean: Cardiology?"
**Priority:** Low
**Source:** Card Browser Design v2.1 (T115, 2026-01-08)
**Notes:** Nice UX polish. Requires fuzzy matching library or Levenshtein distance calculation.

### New Card from Card Browser (F25)
**Description:** "New Card" button in Card Browser header for creating standalone cards without going through Notebook. Opens CardEditModal with empty fields + topic selector. Creates card with no sourceBlockId (orphan card). Escape hatch for advanced users who want quick card creation.
**Priority:** Low
**Source:** CLAUDE.md reference (2026-01-08)
**Notes:** MVP focuses on Notebook → Card flow. Card Browser is for maintenance, not creation. This is a convenience feature for power users. Consider whether orphan cards violate the 3-layer architecture principle.

### Session Time Limit with Gentle Exit Ramps (F26)
**Description:** Optional study session timers with soft reminders. "You've been studying 25 min, want to wrap up?" Pomodoro-style breaks without being jarring.
**Priority:** Low
**Source:** QoL review (2026-01-08)
**Notes:** ADHD users hyperfocus. Gentle reminders prevent burnout. T117 already tracks session time — this adds the reminder UI. Consider: configurable intervals, snooze option, end-of-session summary.

### Resume Where I Left Off (F27)
**Description:** When app closes mid-review, restore exact state on reopen: current card index, queue position, expanded panels.
**Priority:** Medium
**Source:** QoL review (2026-01-08)
**Notes:** Residents get interrupted by pages. Complex state serialization required. Consider: localStorage for view state, sessionStorage for ephemeral state, or dedicated state persistence table.

### Capture from Clipboard on App Focus (F28)
**Description:** Auto-detect clipboard content when app gains focus. Show non-intrusive prompt: "Capture this? [Yes] [No]". Eliminates paste step entirely.
**Priority:** Low
**Source:** QoL review (2026-01-08)
**Notes:** Privacy risk — clipboard may contain sensitive data. Consider: opt-in setting, content preview before capture, ignore if clipboard unchanged.

### Smart Queue Ordering by Cognitive Load (F29)
**Description:** Order review queue to prevent decision fatigue: 2-3 easy reviews (warm-up), interleave hard with easy, end with high-confidence (positive exit).
**Priority:** Medium
**Source:** QoL review (2026-01-08)
**Dependency:** T45 (FSRS Integration)
**Notes:** Evidence-based but adds complexity to FSRS queue. "First card is brutal, I quit" phenomenon is real. Consider: difficulty smoothing algorithm, user preference for ordering.

### Search Result Highlight Matches (F30)
**Description:** Highlight matching text in Card Browser search results. Show which part of front/back matched the query.
**Priority:** Low
**Source:** QoL review (2026-01-08)
**Notes:** UX polish for Card Browser. Helps scan results faster. Consider: regex-based highlight, bold or background color, context snippets.

### "Study X Cards" Bounded Session Mode (F31)
**Description:** Option to review a fixed number of cards (e.g., "Study 20 cards") instead of entire queue. Progress bar shows X/20.
**Priority:** Low
**Source:** QoL review (2026-01-08)
**Notes:** Bounded sessions reduce anxiety. FSRS already prioritizes queue. Consider: configurable count, "add 10 more" option, session summary at end.

### Loading States in Store Actions (F32)
**Description:** Add isLoading flags to useAppStore for async actions. Show spinners/skeletons during API calls. Confirm success with brief "Saved ✓" toast.
**Priority:** Medium
**Source:** QoL review (2026-01-08)
**Notes:** Users don't know if actions succeeded. Pattern: isLoading state per action, skeleton components, success/error toasts. High anxiety reduction for exhausted users.

---

## Notebook & Card Generation Enhancements (POST-MVP)

### Smart Card Generation from Gaps (F36)
**Description:** Card generation prompt includes AI evaluation gaps to target weak areas. When generating cards from a NotebookBlock that has aiEvaluation.gaps[], the AI prompt should incorporate these gaps to create cards that specifically address identified weaknesses.
**Priority:** Medium
**Source:** AI Workflow Planning Session (2026-01-08)
**Dependency:** T121 (AI Insight Evaluation), T42 (Card Generation)
**Notes:** Currently cards are generated without gap context. This enhancement makes card generation "smarter" by targeting YOUR specific weaknesses identified during the insight writing step.

### Link to Existing Block Enhancement (F37)
**Description:** When linking a new source to an existing NotebookBlock (via T119's "Link to existing block?" flow), optionally prompt "Anything to add?" to append supplementary insight to the existing userInsight field.
**Priority:** Low
**Source:** AI Workflow Planning Session (2026-01-08)
**Dependency:** T119 (Insight Writing Modal)
**Notes:** Currently linking just associates the source. This allows users to add incremental learning without creating a new block. Useful when multiple sources teach the same concept with minor additions.

---

## Personalized Learning & Scheduling (SOMEDAY)

> **Note:** These features require significant review data (~500-1000+ reviews) and advanced ML infrastructure. Implement after core learning loop has accumulated enough user data.

### Response Time Interval Weighting (F38)
**Description:** After ~500 reviews, apply response time weighting to FSRS intervals. Fast correct answers (<5s) get +15% interval boost; slow correct answers (>15s) get -15% reduction. Leverages existing responseTimeMs in review_logs.
**Priority:** Medium
**Source:** User POST-MVP roadmap (2026-01-08)
**Dependency:** T125 (Data Logging Framework), F13 (Response Time Signal)
**Trigger:** Enable after 500+ reviews
**Notes:** Extension of F13. F13 adds the basic signal; this adds milestone-based activation.

### Aggregated Confusion Reports (F39)
**Description:** After ~1000 reviews, generate periodic reports: "You confuse X and Y across 5 topics". Weekly summary email/notification with top 3 confusion pairs and suggested actions.
**Priority:** Medium
**Source:** User POST-MVP roadmap (2026-01-08)
**Dependency:** F12 (Confusion Cluster Detection), T125 (Data Logging Framework)
**Trigger:** Enable after 1000+ reviews
**Notes:** Builds on F12's detection to create actionable summaries. Different from real-time detection.

### Auto-Generated Comparison Cards (F40)
**Description:** When a confusion pair is detected N times (threshold TBD), automatically generate a comparison card that disambiguates the concepts. Example: "Methotrexate vs Methylnaltrexone: Key Differences".
**Priority:** Medium
**Source:** User POST-MVP roadmap (2026-01-08)
**Dependency:** F12 (Confusion Cluster Detection), T42 (Card Generation)
**Notes:** Related to T98 (Discrimination Training) but auto-generates cards rather than surfacing existing ones.

### AI Practice Questions for Weak Trap Types (F41)
**Description:** After Learning Tab has sufficient data, generate board-style practice questions targeting your weak exam trap types. "You struggle with negation blindness - here are 5 practice questions with tricky negations."
**Priority:** Medium
**Source:** User POST-MVP roadmap (2026-01-08)
**Dependency:** T123 (Weak Points Panel), F34 (Exam Trap Detection), T125 (Data Logging Framework)
**Notes:** Part of F19 (Adaptive Learning Assistant) vision. This is the targeted question generation component.

### 7-Step Adaptive Learning Pipeline (F42)
**Description:** Full adaptive gating based on confidence + correctness matrix. Routes cards through different pathways:
1. High confidence + Correct → Extended interval
2. Low confidence + Correct → "Lucky guess" path (shorter interval)
3. High confidence + Incorrect → "Misconception" path (elaborated feedback + related cards)
4. Low confidence + Incorrect → Standard relearning
**Priority:** Low
**Source:** User POST-MVP roadmap (2026-01-08)
**Dependency:** T125 (confidenceRating field), T97 (Adaptive Gating Logic)
**Notes:** Expands T97's basic gating to full 7-step pipeline. Requires confidenceRating data from T125.

### Individual Forgetting Curves (F43)
**Description:** Per-concept prediction of when user will forget. Goes beyond FSRS's general model to track individual concept retention patterns. "You forget drug mechanisms faster than diagnostic criteria."
**Priority:** Low
**Source:** User POST-MVP roadmap (2026-01-08) - SOMEDAY
**Dependency:** FSRS Integration, 1000+ reviews per topic category
**Notes:** Research-heavy. May require custom ML model training per user. High value for personalized learning.

### Rotation-Aware Scheduling (F44)
**Description:** Prioritize cards relevant to user's current clinical rotation. When user sets "On Cardiology rotation", bump cardiology cards in queue, reduce interval on related topics.
**Priority:** Low
**Source:** User POST-MVP roadmap (2026-01-08) - SOMEDAY
**Dependency:** Rotation tracking UI, topic-rotation mapping
**Notes:** Unique differentiator for medical residents. Requires rotation schedule input and topic classification.

---

*Last updated: 2026-01-08 (Added T124-T125 MVP tasks, F38-F44 deferred features for personalized learning)*
