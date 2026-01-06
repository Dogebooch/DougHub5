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

### Quick Actions Row
**Source:** User request during testing (2026-01-06)
**Description:** Add quick action buttons below capture box: "Paste", "Upload", "Extract Board Question" for faster capture workflows.
**Priority:** Low
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
**Source:** Task 11 (cancelled)
**Description:** Keyboard-first command palette for quick navigation, search, and actions. Currently bound to Ctrl+F but not discoverable.
**Priority:** Low
**Notes:** Sidebar provides navigation. This is power-user polish, not MVP-critical.

### Hotkey Reliability Investigation
**Source:** Manual testing 2026-01-06
**Description:** Ctrl+Shift+S hotkey intermittently stops working. Manual button always works. May be focus/event bubbling issue.
**Priority:** Low
**Notes:** Workaround: use FAB button. Investigate after MVP.

---

## Capture & Extraction

### Medical List Processing (was T4)
**Description:** Convert medical lists (differentials, procedures) into clinical vignettes and overlapping cloze cards to prevent sibling contamination.
**Priority:** Medium
**Notes:** Has detailed subtasks in original TaskMaster. Revisit after core v2 flow works.

### Auto Note Creation (was T6) - OBSOLETE
**Description:** Automatically create Notes from extraction sessions with bidirectional card-note links.
**Priority:** N/A
**Notes:** **SUPERSEDED by v2 architecture.** v2 uses SourceItem → NotebookBlock → Card flow. "Notes" are a v1 concept. The noteId column on cards is legacy; v2 cards use notebookTopicPageId instead. Move to Archive when ready.

### Connection Suggestions (was T7)
**Description:** AI surfaces related notes during extraction based on semantic similarity.
**Priority:** Low
**Notes:** Requires embeddings infrastructure. Post-MVP.

### Extraction Queue Enhancements (was T8)
**Description:** Batch processing support for Quick Dumps, queue indicator in header.
**Priority:** Low
**Notes:** Basic inbox flow (T39) covers core need. This is polish.

### Tag-Based Organization (was T9)
**Description:** AI suggests medical domain tags, tag filtering, tag-based navigation.
**Priority:** Medium
**Notes:** Tags exist in schema. This is about AI suggestions and tag management UI.

### Metadata Schema Templates (was T37)
**Description:** AI prompt templates per source type for extracting metadata (qbank, article, pdf, etc).
**Priority:** Low
**Notes:** Nice-to-have for smarter metadata suggestions.

---

## Review & Scheduling

### Response Time Personalization (was T12)
**Description:** Track response times, use for interval adjustments and domain-specific scheduling.
**Priority:** Medium
**Notes:** FSRS already tracks response time. This is about using it for personalization.

### Partial Credit Tracking (was T13)
**Description:** Track individual list item recall for clinical vignettes (3/5 correct schedules differently than 1/5).
**Priority:** Low
**Notes:** Requires medical list processing (T4) first.

### Space Bar Auto-Grade (was T32)
**Description:** Space bar after answer visible auto-grades as Good and continues.
**Priority:** Low
**Notes:** May conflict with zero-decision review design.

### Personalized Response Baselines (was T49)
**Description:** Grade relative to user's own response patterns rather than fixed thresholds.
**Priority:** Medium
**Notes:** Evidence-based feature. Implement after basic review flow stable.

### Voice Answer Capture (was T50)
**Description:** Speech-to-text answer capture with AI grading comparison.
**Priority:** Low
**Notes:** Exploratory. Web Speech API + AI comparison. Privacy considerations.

---

## AI & Settings

### AI Settings UI (was T28)
**Description:** Settings page for AI provider selection, API keys, model dropdowns, connection testing.
**Priority:** Medium
**Notes:** Current defaults work. This is for power users who want to configure providers.

### Recommended Ollama Models (was T30)
**Description:** Research and document optimal models for medical extraction (GPU and CPU).
**Priority:** Low
**Notes:** Depends on T28. Nice documentation to have.

---

## Polish & UX

### Test Suite Fixes
**Source:** Audit 2026-01-06
**Description:** Fix 105 failing tests. Issues: missing `fireEvent` imports in QuickCaptureModal.test.tsx, Electron subprocess mocking (`unref`) fails in Vitest environment.
**Priority:** Medium
**Notes:** Defer until after T39-T45 UI changes complete. Current tests will need rewriting anyway as UI evolves. Core app functionality works.

### Command Palette Enhancements (was T11)
**Description:** Fuzzy search, recent actions history, more command categories.
**Priority:** Low
**Notes:** Basic command palette exists. These are enhancements.

### Low-Ease Detection (was T46)
**Description:** Flag repeatedly-hard cards, route to "fix card" flow, Weak Topics view.
**Priority:** Medium
**Notes:** Useful for identifying knowledge gaps. Implement after core review works.

### UI/UX Rules Documentation (was T47)
**Description:** Document button hierarchy, confirmation patterns, naming conventions, keyboard shortcuts.
**Priority:** Low
**Notes:** Apply incrementally as we build. Don't need a dedicated task.

### Data Persistence & Crash Recovery (was T14)
**Description:** Hourly backups, session restoration, auto-save indicators.
**Priority:** Medium
**Notes:** Some backup infrastructure exists. This is about polish and UI indicators.

### Evidence-Based Card Validation (was T15)
**Description:** Real-time warnings for pattern-matching cards, multi-fact violations.
**Priority:** Medium
**Notes:** Overlaps with card-worthiness gate (T43). May merge concepts.

---

## AI & Extraction

### AI Extraction Pipeline Debugging
**Source:** TaskMaster AI setup docs (ai-extraction-fix.txt)
**Description:** Troubleshoot Ollama AI extraction integration. Issues include JSON parsing with Ollama responses, model compatibility testing (currently using 7b-instruct), and extractConcepts() return format validation. End-to-end testing needed from CaptureInterface paste → AI extraction → concept display.
**Priority:** Medium
**Notes:** Core extraction works with Claude. Ollama is alternative provider for offline/local usage. Not MVP-blocking.

---

## Browser & Web Integration

### Browser Extension for Web Capture
**Source:** TaskMaster AI setup docs (post-mvp-browser-extension.txt)
**Description:** Chrome/Firefox extension allowing right-click capture of web content (UWorld, UpToDate, etc.) directly into DougHub's Knowledge Bank. Features: context menu, metadata extraction (URL, title, date), quick tag assignment, image capture support. Two approaches: Tampermonkey script (simpler) or native extension (better UX). Requires local HTTP API in Electron main process.
**Priority:** Medium
**Notes:** Requires Layer 1 (Knowledge Bank) complete. Would dramatically improve capture workflow for web-based study resources.

---

## Capture Enhancements (Advanced)

### Camera Capture with AI Vision Analysis
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Description:** Add camera/webcam capture to Quick Dump. AI vision model (Claude) analyzes image + surrounding text context to extract diagram/chart content, cross-reference similar images online, identify medical concepts. Enables multimodal learning pipeline.
**Priority:** Low
**Notes:** Exploratory. Needs research on multimodal AI integration, image similarity APIs, cost implications.

### Unified Capture Pathway UX Audit
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Description:** Current UI doesn't clearly teach three capture pathways: (1) Quick Dump → Inbox, (2) Main Page → Extract Concepts, (3) Learning Pipeline. Need UX audit, visual cues/onboarding, user testing with residents, potential pathway consolidation.
**Priority:** Low
**Notes:** Awaits post-MVP user feedback. May not be an actual problem.

### AI Image Context Understanding
**Source:** TaskMaster AI setup docs (post-mvp-capture-ux.txt)
**Description:** Enhance AI service to handle images with rich context. Accept image + text together (multimodal), use surrounding text to disambiguate, identify medical diagrams/charts/algorithms, generate appropriate card formats (labeled diagram → multiple cloze cards). Requires Claude vision API research.
**Priority:** Low
**Notes:** Related to Camera Capture feature. Needs prompt engineering for medical images.

---

## Search Enhancements (Advanced)

### OCR Image Text Search
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Description:** Extract text from images for searchability using Tesseract.js or Cloud OCR API. Index extracted text in FTS5 for search.
**Priority:** Low
**Notes:** High complexity. Requires OCR infrastructure and FTS5 indexing strategy.

### Video Transcription Search
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Description:** Transcribe video/audio content using Whisper for searchability.
**Priority:** Low
**Notes:** Very high complexity. Major scope consideration. Would enable searching recorded lectures.

### Voice Search (Siri-like)
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Description:** Implement voice-to-text search using Web Speech API. Allow users to speak search queries.
**Priority:** Low
**Notes:** High complexity. Nice-to-have for accessibility and mobile use.

### Semantic Intent Search
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Description:** Use AI embeddings to understand search intent beyond keyword matching. Leverage Ollama for local embeddings.
**Priority:** Medium
**Notes:** Current TF-IDF approach works. This would enable "find cards about heart failure management" vs exact keyword matching.

### Context-Aware Search Suggestions
**Source:** TaskMaster AI setup docs (post-mvp-search.txt)
**Description:** AI-powered suggestions like "Cards comparing X and Y" based on user context and study patterns.
**Priority:** Low
**Notes:** Needs AI inference. Cool feature but not essential.

---

## UI Polish (Post-MVP)

### Superhuman-Style Split View for Notebook
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Description:** Master-detail layout for Notebook view: narrow topic list on left (~280px), content on right. Resizable divider, topic search/filter, smooth transitions, keyboard navigation. Avoids full-page navigation.
**Priority:** Low
**Notes:** Nice UX polish. Current full-page navigation works fine for MVP.

### Notion-Style Breadcrumb Navigation
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Description:** Breadcrumb trail in content header showing location ("Capture > New Note", "Review > Cardiology"). Clickable segments, truncation with hover expansion.
**Priority:** Low
**Notes:** Helps orientation in complex navigation. Post-MVP polish.

### Things 3 Today Badge Pulse Animation
**Source:** TaskMaster AI setup docs (post-mvp-ui-enhancements.txt)
**Description:** Subtle pulse animation on Today count badge when due cards > 0. Scale 1.0 to 1.05, opacity variation, respects prefers-reduced-motion, stops after review session starts.
**Priority:** Low
**Notes:** Delightful detail. Pure polish.

---

## Archive (Completed or Obsolete)

*Move items here when they're done or no longer relevant*

---

*Last updated: 2026-01-06*
