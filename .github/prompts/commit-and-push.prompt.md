---
description: Commit and save the working directory with intelligent .gitignore management
name: commit-and-push
---

# Commit and Save Working Directory

Please commit and save the working directory with the following steps:

1. **Update .gitignore** - First, scan for and add these items to .gitignore if not already present:
   - Files larger than 100MB
   - `node_modules/`
   - `dist/` and `dist-electron/`
   - `build/` and `out/`
   - `.vscode/` and `.idea/`
   - `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`
   - `.DS_Store`, `Thumbs.db`
   - `.env`, `.env.local`, `.env.*.local`
   - `*.db`, `*.sqlite`, `*.sqlite3`
   - `coverage/`, `.nyc_output/`
   - `*.pem`, `*.key`, `*.cert`
   - `.cache/`, `.temp/`, `.tmp/`

2. **Stage all changes**: `git add .`

3. **Commit** with an auto-generated message using current timestamp


4. **Push to remote** automatically after committing

Show me what files are being committed and any large files that were excluded.
