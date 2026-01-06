---
description: Quick project onboarding for new chat sessions
name: context
agent: ask
---

# Project Context Onboarding

Read and summarize project essentials in ≤500 characters:

Reference these files:
- `CLAUDE.md` - Project overview, architecture, domain rules
- `docs/DougHub Vision.md` - Core principles
- `docs/DougHub User Profile.md` - Target user constraints
- `docs/DougHub Success Metrics.md` - Performance targets

Output format:
```
DougHub: [1 sentence - what it is, who it's for]
User: [1 sentence - key constraints]
Tech: [Stack: React/Electron/SQLite, data flow]
Rules: [Never/Always implement]
Targets: [Key performance metrics]
```

Be extremely concise.
