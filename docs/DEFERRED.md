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

## Archive (Completed or Obsolete)

*Move items here when they're done or no longer relevant*

---

*Last updated: 2026-01-06*
