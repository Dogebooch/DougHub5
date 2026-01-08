# Handoff: T124 - Tampermonkey Board Question Capture

> **Created:** 2026-01-08
> **For:** Next Claude Code session
> **Task:** T124 - Tampermonkey Script Integration for Quick Capture

---

## Context

User wants to capture board questions from PeerPrep (ACEP) and MKSAP 19 into DougHub. Goal is to:
1. Do a board question on the website
2. Click "Send to DougHub" button (Tampermonkey)
3. Question appears in Knowledge Bank with full content preserved
4. Later: add to Notebook, generate flashcards

---

## Executive Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Port** | 23847 | High port, unlikely conflicts |
| **HTML Sanitization** | Skip (trust source) | Known medical sites only |
| **Duplicate Questions** | Single entry + attempts[] array | Clean UI, tracks learning over time |
| **Image Storage** | Files in `userData/images/` | Scales to thousands of questions |
| **Content Format** | Raw HTML stored and rendered | Preserves tables, equations, formatting |
| **Notifications** | Electron system notification | Works when DougHub is backgrounded |
| **Capture Timing** | After submission (explanation visible) | Gets all educational content |

---

## Data Structures

### CapturePayload (from Tampermonkey)
```typescript
interface CapturePayload {
  timestamp: string;
  url: string;
  hostname: string;
  siteName: 'ACEP PeerPrep' | 'MKSAP 19';
  pageHTML: string;
  bodyText: string;
  images: {
    url: string;
    title: string;
    type: 'fancybox-gallery' | 'inline-image';
    source: 'question' | 'feedback' | 'keypoints' | 'references' | 'other';
  }[];
}
```

### BoardQuestionContent (stored in SourceItem.rawContent)
```typescript
interface BoardQuestionContent {
  // Metadata
  source: 'peerprep' | 'mksap';
  questionId?: string;
  category?: string;           // "Nephrology", "Cardiology"
  capturedAt: string;
  sourceUrl: string;

  // Question (store as HTML)
  vignetteHtml: string;        // Clinical stem
  questionStemHtml: string;    // "What is the next best step?"

  // Answers
  answers: {
    letter: string;
    html: string;              // Answer text as HTML
    isCorrect: boolean;
    isUserChoice: boolean;
    peerPercent?: number;      // 49%, etc.
  }[];

  // Result
  wasCorrect: boolean;

  // Explanation (store as HTML)
  explanationHtml: string;     // Main reasoning
  keyPointsHtml?: string;      // Key points section

  // Images (paths to local files)
  images: {
    localPath: string;         // "images/abc123.png"
    caption?: string;
    location: 'vignette' | 'explanation' | 'keypoint';
  }[];

  // Duplicate tracking
  attempts: {
    attemptNumber: number;
    date: string;
    chosenAnswer: string;
    wasCorrect: boolean;
    note?: string;             // Optional "what I was thinking"
  }[];
}
```

---

## Site-Specific CSS Selectors

### PeerPrep (ACEP)
```typescript
const PEERPREP_SELECTORS = {
  vignette: '.questionStem, .question-stem',
  answers: '.answerOption, .answer-choice',
  correctAnswer: '.correct-answer, [class*="correct"]',
  userChoice: '.selected, .user-selected, [class*="selected"]',
  peerStats: '.peer-response, .percentage',
  explanation: '.feedbackTab, .feedback-content',
  keyPoints: '.keyPointsTab, .key-points',
  questionImages: '#media-links a.fancybox',
  explanationImages: '.feedbackTab img, .keyPointsTab img'
};
```

### MKSAP 19
```typescript
const MKSAP_SELECTORS = {
  vignette: '.question-text, .stem',
  answers: '.answer-option',
  correctAnswer: '.correct',
  userChoice: '.selected',
  explanation: '.critique, .explanation',
  keyPoints: '.educational-objective'
};
```

---

## Implementation Files to Create/Modify

### New Files
1. `electron/capture-server.ts` - Express HTTP server on port 23847
2. `electron/parsers/board-question-parser.ts` - HTML → BoardQuestionContent
3. `electron/services/image-service.ts` - Download images to userData/images/
4. `src/components/BoardQuestionView.tsx` - Render component for qbank items

### Modified Files
1. `electron/main.ts` - Start capture server on app ready
2. `electron/ipc-handlers.ts` - Add capture:receive handler
3. `electron/preload.ts` - Expose capture API
4. `electron.d.ts` - Add types

### Tampermonkey Script
- Location: User's browser (not in repo)
- Change port from 55590 → 23847
- Existing script in chat handles both PeerPrep and MKSAP

---

## Architecture Flow

```
Tampermonkey                    DougHub (Electron)
    │                                │
    │  POST localhost:23847/api/capture
    │  ───────────────────────────►  │
    │  { pageHTML, images[], ... }   │
    │                                │
    │                           ┌────┴────┐
    │                           │ Express │
    │                           │ Server  │
    │                           └────┬────┘
    │                                │
    │                           ┌────┴────┐
    │                           │ Parser  │
    │                           │ Service │
    │                           └────┬────┘
    │                                │
    │                           ┌────┴────┐
    │                           │ Image   │
    │                           │ Service │
    │                           └────┬────┘
    │                                │
    │                           ┌────┴────┐
    │                           │ SQLite  │
    │                           │ Insert  │
    │                           └────┬────┘
    │                                │
    │  ◄───────────────────────────  │
    │  { success: true, id: 'xxx' }  │
    │                                │
    │                           ┌────┴────┐
    │                           │ System  │
    │                           │ Notif   │
    │                           └─────────┘
```

---

## Subtasks (from TaskMaster)

T124 has been expanded with 5 subtasks:

1. **T124.1** - Create Express HTTP capture server (no dependencies)
2. **T124.2** - Create board question HTML parser (no dependencies)
3. **T124.3** - Implement image download service (no dependencies)
4. **T124.4** - Wire up IPC handlers and types (depends on 1, 2, 3)
5. **T124.5** - Create BoardQuestionView component + update Tampermonkey script (depends on 4)

**Recommended order:** Start with 124.1, 124.2, 124.3 in parallel, then 124.4, then 124.5.

---

## Rendering Design

Display qbank items in Knowledge Bank like this:

```
┌──────────────────────────────────────────────┐
│ 📋 Board Question                            │
│ Source: PeerPrep · Nephrology · Jan 8, 2026  │
│ Result: ❌ Incorrect    Attempts (2) ▾       │
├──────────────────────────────────────────────┤
│ VIGNETTE                                     │
│ [HTML rendered with proper styling]          │
│ [Images inline where they appeared]          │
├──────────────────────────────────────────────┤
│ QUESTION                                     │
│ What is the most appropriate next step?      │
├──────────────────────────────────────────────┤
│ ANSWERS                         Peers   You  │
│ A. Option text...                 7%         │
│ B. Option text...                40%    ●    │
│ C. Option text... ✓              49%         │
│ D. Option text...                 3%         │
├──────────────────────────────────────────────┤
│ EXPLANATION                                  │
│ [HTML rendered - main reasoning]             │
├──────────────────────────────────────────────┤
│ KEY POINTS                                   │
│ • Point 1                                    │
│ • Point 2                                    │
└──────────────────────────────────────────────┘
```

"Attempts (2)" is a small collapsible badge showing attempt history without cluttering the main view.

---

## Reference Screenshots

User provided screenshots of a PeerPrep question at:
- `p:\Python Projects\DougHub5\.claude\claude-code-chat-images\image_1767906415883.png` (and 6 more)

These show:
- Question vignette with chest X-ray
- Answer choices with peer percentages
- Explanation tabs (Reasoning, Key Points, References)
- PEER Pearls educational images

---

## Existing Tampermonkey Script

Full script was pasted in chat. Key points:
- Handles both ACEP PeerPrep and MKSAP 19
- Extracts full pageHTML + images array
- Has retry logic with backoff
- Trigger words: "Key Point" (PeerPrep), "Correct Answer" (MKSAP)
- Currently targets port 55590 (needs update to 23847)

---

## Next Steps

1. Set T124 status to in-progress
2. Start with subtask 124.1 (Express server) - it's the foundation
3. Can parallelize 124.2 (parser) and 124.3 (image service)
4. 124.4 wires everything together
5. 124.5 creates the UI and updates the Tampermonkey script

Good luck! 🎯
