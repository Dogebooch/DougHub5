# DougHub Vision

## Vision Statement

**FOR** medical residents preparing for boards **WHO** need to capture and learn from QBank mistakes, **DougHub is** an AI-powered capture and preprocessing hub **THAT** extracts knowledge from board questions and exports flashcard candidates to Remnote. **UNLIKE** all-in-one flashcard apps, our product focuses solely on high-quality capture and AI analysis, letting Remnote handle spaced repetition.

## Core Philosophy

**DougHub is the kitchen. Remnote is the dining room.**

- **Kitchen (DougHub):** Capture, store, analyze, prep flashcard ingredients
- **Dining room (Remnote):** Consume, review, space out repetition

## What DougHub Does

| Capability    | Description                                                             |
| ------------- | ----------------------------------------------------------------------- |
| 📥 Capture    | Tampermonkey script grabs MKSAP/PeerPrep questions                      |
| 💾 Store      | SQLite database with full question data + images                        |
| 🤖 AI Analyze | Ollama extracts key concepts, explains "why wrong", suggests flashcards |
| 📤 Export     | Copy formatted flashcard candidates to clipboard for Remnote            |

## What DougHub Does NOT Do

- ❌ Flashcard review sessions
- ❌ Spaced repetition scheduling
- ❌ Card creation UI (Knowledge Forging)
- ❌ FSRS or any scheduling algorithm
- ❌ Practice mode or grading

## Data Flow

```
1. CAPTURE: Tampermonkey → POST → Parse → SQLite
2. AI ANALYSIS: Question → Ollama → Flashcard candidates + "Why Wrong"
3. USER REVIEW: Browse questions → See AI suggestions → Select cards
4. EXPORT: Selected cards → Remnote-format → Clipboard → Paste in Remnote
```

## Success Criteria

- ✅ Capture and store board questions reliably
- ✅ Show AI-generated flashcard suggestions
- ✅ Allow export to Remnote via clipboard
- ✅ Be simpler and faster to navigate
- ✅ Feel like a "capture tool" not a "learning app"

---

## Technical Stack

Electron + React + TypeScript + SQLite (local-first) + Ollama

---

## Reference

See `docs/PHILOSOPHY.md` for full architecture details and migration path.

---

_Updated: 2026-02-04 — Capture Hub Redesign_
