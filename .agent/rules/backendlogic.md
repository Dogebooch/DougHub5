---
trigger: always_on
---

1. When backend code is designed or edited, update the logic section under the Developer notepad (see below for rules)
2. When writing in the Developer pane, summarize and use language a non-programmer can understand
3. Only update the pane when editing or changing the backend logic
4. Focus on: capture pipeline, AI client (Ollama), export formatting
5. Do not edit the user's comments
6. Keep the ToDo list up to date in the pane whenever possible

Note: DougHub no longer handles flashcard review or spaced repetition. Backend logic should focus on capture, AI analysis, and export to Remnote.

# Developer Notepad

## Logic Updates (Feb 4, 2026)

- **AI Chat (Neural Link)**: Fixed the Advisor task configuration. It now uses a 60s timeout and strictly defines the JSON schema in the system prompt to ensure the AI returns usable data.
- **UI Integration**: The 'Neural Link' sidebar now correctly displays the "advice" field from the AI response, determining relevance (High Yield vs Reference) and suggesting flashcard formats.

## ToDo

- [x] Fix Advisor Task Schema & Prompts
- [x] Connect Neural Pane UI to Advisor Result
- [ ] Validate "Smart Capture" pipeline with new AI schemas
- [ ] Verify RemNote export formatting
