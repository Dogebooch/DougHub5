# MCP Server Configuration

**Location:** `p:\Python Projects\DougHub5\.mcp.json`

---

## Current Configuration (Optimized)

```json
{
  "mcpServers": {
    "taskmaster-ai": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "TASK_MASTER_TOOLS": "core",
        "TASKMASTER_AI_PROVIDER": "claude-code",
        "TASKMASTER_AI_MODEL": "sonnet"
      }
    },
    "code-index": {
      "command": "uvx",
      "args": [
        "code-index-mcp",
        "--project-path", "."
      ]
    }
  }
}
```

---

## MCP Servers Enabled

### 1. TaskMaster AI
**Purpose:** Project task management and tracking
**Tools:** Core only (minimal set)
  - `get_tasks` - Retrieve task list
  - `get_task` - Get specific task details
  - `set_task_status` - Update task status
  - `next_task` - Find next actionable task
  - `expand_task` - Break task into subtasks
  - `update_subtask` - Add info to subtask
  - `parse_prd` - Generate tasks from PRD

**Configuration:**
- `TASK_MASTER_TOOLS: "core"` - Restricts to essential tools (excludes research/AI features)
- `TASKMASTER_AI_PROVIDER: "claude-code"` - Uses Claude Code for task operations
- `TASKMASTER_AI_MODEL: "sonnet"` - Claude Sonnet for balance of speed/quality

### 2. Code Index
**Purpose:** Fast codebase search and file indexing
**Tools:**
  - `set_project_path` - Set project root
  - `search_code_advanced` - Search code with regex/fuzzy matching
  - `find_files` - Find files by glob pattern
  - `get_file_summary` - Get file metadata and structure
  - `refresh_index` - Rebuild file index
  - `build_deep_index` - Full symbol extraction
  - `get_file_watcher_status` - Check auto-rebuild status
  - `configure_file_watcher` - Configure auto-rebuild settings

**Configuration:**
- `--project-path .` - Index current project directory

---

## Why This Configuration?

### TaskMaster: Core Tools Only
**Before (full):** 20+ tools including AI research, Perplexity integration, file operations
**After (core):** 7 essential task management tools

**Benefits:**
- ✅ Faster MCP startup
- ✅ Reduced token usage
- ✅ Less cognitive overhead (fewer tools to consider)
- ✅ Focused on task tracking (not AI generation)

**Removed (non-core):**
- Research tools (Perplexity API)
- File manipulation tools (already in Claude Code)
- Extended AI features (not needed for task tracking)

### Code Index: Optimal for DougHub
**Why keep this?**
- Fast codebase search (ugrep/ripgrep)
- File indexing for quick navigation
- Complements Claude Code's file tools (Read/Grep)
- Lightweight and fast

---

## Usage Guidelines

### Use TaskMaster For:
- ✅ Viewing task list (`get_tasks`)
- ✅ Getting next task (`next_task`)
- ✅ Marking tasks complete (`set_task_status`)
- ✅ Breaking down complex tasks (`expand_task`)
- ✅ Tracking subtask progress (`update_subtask`)

### Use Code Index For:
- ✅ Finding files by pattern (`find_files "*.tsx"`)
- ✅ Searching code (`search_code_advanced "calculateAutoRating"`)
- ✅ Getting file structure (`get_file_summary`)
- ✅ Refreshing index after large changes (`refresh_index`)

### Use Claude Code Native Tools For:
- ✅ Reading files (`Read`)
- ✅ Editing files (`Edit`)
- ✅ Writing files (`Write`)
- ✅ Running commands (`Bash`)
- ✅ Searching within files (`Grep`)

---

## Performance Notes

- **MCP Startup:** ~2-3 seconds (optimized)
- **Task Operations:** < 100ms per query
- **Code Index:** < 500ms for most searches
- **File Watcher:** Auto-rebuilds on file changes (debounced 2s)

---

## Troubleshooting

### TaskMaster Not Loading
```bash
# Verify npx can run task-master-ai
npx -y task-master-ai --version
```

### Code Index Not Loading
```bash
# Verify uvx is installed
uvx --version

# Manually test code-index-mcp
uvx code-index-mcp --project-path .
```

### Rebuild MCP Servers
1. Restart Claude Code
2. Check MCP status in settings
3. Verify `.mcp.json` syntax is valid JSON

---

**Last Updated:** 2026-01-05
**Configuration Status:** ✅ Optimized for DougHub MVP
