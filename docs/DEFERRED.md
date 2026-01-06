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

### Command Palette (Ctrl+K)
**Description:** Keyboard-first command palette for quick navigation, search, and actions. Currently bound to Ctrl+F but not discoverable.
**Priority:** Low
**Source:** Task T11 (Cancelled)
**Notes:** Sidebar provides navigation. This is power-user polish, not MVP-critical.

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

### Auto Note Creation - OBSOLETE
**Description:** Automatically create Notes from extraction sessions with bidirectional card-note links.
**Priority:** N/A
**Source:** Task T6 (Legacy)
**Notes:** **SUPERSEDED by v2 architecture.** v2 uses SourceItem → NotebookBlock → Card flow. "Notes" are a v1 concept. The noteId column on cards is legacy; v2 cards use notebookTopicPageId instead. Move to Archive when ready.

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

### Low-Ease Detection
**Description:** Flag repeatedly-hard cards, route to "fix card" flow, Weak Topics view.
**Priority:** Medium
**Source:** Task T46 (Legacy)
**Notes:** Useful for identifying knowledge gaps. Implement after core review works.

### UI/UX Rules Documentation
**Description:** Document button hierarchy, confirmation patterns, naming conventions, keyboard shortcuts.
**Priority:** Low
**Source:** Task T47 (Legacy)
**Notes:** Apply incrementally as we build. Don't need a dedicated task.

### Data Persistence & Crash Recovery
**Description:** Hourly backups, session restoration, auto-save indicators.
**Priority:** Medium
**Source:** Task T14 (Legacy)
**Notes:** Some backup infrastructure exists. This is about polish and UI indicators.

### Evidence-Based Card Validation
**Description:** Real-time warnings for pattern-matching cards, multi-fact violations.
**Priority:** Medium
**Source:** Task T15 (Legacy)
**Notes:** Overlaps with card-worthiness gate (T43). May merge concepts.

---

## AI & Extraction

### AI Extraction Pipeline Debugging
**Description:** Troubleshoot Ollama AI extraction integration. Issues include JSON parsing with Ollama responses, model compatibility testing (currently using 7b-instruct), and extractConcepts() return format validation. End-to-end testing needed from CaptureInterface paste → AI extraction → concept display.
**Priority:** Medium
**Source:** TaskMaster AI setup docs (ai-extraction-fix.txt)
**Notes:** Core extraction works with Claude. Ollama is alternative provider for offline/local usage. Not MVP-blocking.

---

## Browser & Web Integration

### Browser Extension for Web Capture
**Description:** Chrome/Firefox extension allowing right-click capture of web content (UWorld, UpToDate, etc.) directly into DougHub's Knowledge Bank. Features: context menu, metadata extraction (URL, title, date), quick tag assignment, image capture support. Two approaches: Tampermonkey script (simpler) or native extension (better UX). Requires local HTTP API in Electron main process.
**Priority:** Medium
**Source:** TaskMaster AI setup docs (post-mvp-browser-extension.txt)
**Notes:** Requires Layer 1 (Knowledge Bank) complete. Would dramatically improve capture workflow for web-based study resources.

---

## Capture Enhancements (Advanced)

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

### Procedural Simulation Mode
**Description:** Interactive procedure review with equipment recall and sequential steps. "You're about to intubate—what equipment do you need?" before revealing steps.
**Priority:** Low
**Source:** Task T52 (Legacy)
**Notes:** Requires medical list processing first. Advanced learning mode.

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

### Pre-Test Diagnostic
**Description:** Before generating cards from topic, run quick diagnostic. If >80% accuracy, skip or reduce card count.
**Priority:** Low
**Source:** Task T102 (Legacy)
**Notes:** Saves time on already-known material. Efficiency feature.

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

*Move items here when they're done or no longer relevant*

---

*Last updated: 2026-01-06 (TaskMaster cleanup - added 32 items from deferred tasks)*
