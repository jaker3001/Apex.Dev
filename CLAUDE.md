# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apex Assistant** is a personalized AI assistant for Apex Restoration LLC (property damage restoration company) built on the Claude Agent SDK. It provides an interactive session that tracks tasks, logs metrics for automation opportunity analysis, and integrates with MCP servers for external tools.

## Commands

```bash
# Start interactive session
python main.py

# Initialize database only
python main.py --init-db

# Add example MCP server configurations
python main.py --setup-mcp

# Specify working directory
python main.py --working-dir /path/to/dir
```

## Dependencies

- Python 3.10+
- `ANTHROPIC_API_KEY` environment variable (get from https://console.anthropic.com/)
- Install: `pip install -r requirements.txt`

## Architecture

```
apex-assistant/
├── main.py              # Entry point, CLI argument handling
├── agents/
│   └── orchestrator.py  # ApexOrchestrator - main agent class
├── config/
│   └── system_prompt.py # APEX_SYSTEM_PROMPT constant (customizable)
├── database/
│   ├── schema.py        # SQLite table definitions, init_database()
│   └── operations.py    # CRUD operations for all tables
├── mcp_manager/
│   └── connections.py   # MCPConnectionManager class
├── utils/
│   └── metrics.py       # TaskMetrics dataclass, classify_automation_type()
└── apex_assistant.db    # SQLite database (auto-created)
```

### Core Flow

1. `main.py` parses args, checks API key, initializes database, creates `ApexOrchestrator`
2. `ApexOrchestrator.run_interactive()` starts continuous conversation loop
3. Each user message creates a task record, sends to Claude via `ClaudeSDKClient`
4. Responses are streamed, tools recorded, metrics collected
5. Task completion updates database with metrics for automation analysis

### Database Tables

- **tasks** - Every user request with metrics (complexity, tools_used, time_to_complete)
- **conversations** - Chat sessions with session_id for resuming
- **agents** - Registry of specialized agents with usage stats
- **automation_candidates** - Patterns identified for potential automation
- **files_processed** - Documents/images handled
- **mcp_connections** - Configured MCP servers (stdio, sse, http)

### Task Categories

Used in `tasks.category` for analytics:
- `estimates`, `line_items`, `adjuster_comms`, `documentation`
- `admin`, `research`, `scheduling`, `financial`, `other`

### Automation Classification

`classify_automation_type(metrics)` returns:
- **skill** - Simple, repeatable, ≤2 steps, ≤1 decision point
- **sub-agent** - Requires judgment, multi-step, context awareness
- **combo** - Complex workflow using 3+ tools

## Key Classes

### ApexOrchestrator (`agents/orchestrator.py`)

Main agent that wraps `ClaudeSDKClient`. Handles:
- Building `ClaudeAgentOptions` with system prompt and MCP servers
- Session lifecycle (start/end)
- Message send/receive with metric collection
- Task and conversation database logging

### MCPConnectionManager (`mcp_manager/connections.py`)

Manages MCP server configurations in database:
- `add_stdio_server()`, `add_sse_server()`, `add_http_server()`
- `enable()`, `disable()`, `set_error()`
- `get_active_mcp_servers()` - formats configs for ClaudeAgentOptions

### TaskMetrics (`utils/metrics.py`)

Dataclass collecting per-task metrics:
- `start()`, `complete()`, `add_step()`, `add_decision_point()`
- `record_tool()`, `record_correction()`, `record_follow_up()`
- Auto-calculates `complexity_score` (1-5)

## Customization

### System Prompt

Edit `config/system_prompt.py` to modify the assistant's behavior. The `APEX_SYSTEM_PROMPT` string is appended to Claude Code's default system prompt.

### MCP Servers

Add servers programmatically:
```python
from mcp_manager import MCPConnectionManager
manager = MCPConnectionManager()
manager.add_stdio_server("playwright", "npx", ["@playwright/mcp@latest"])
manager.enable("playwright")
```

Or use `python main.py --setup-mcp` to add example configurations.

## Domain Context

This assistant is tailored for property damage restoration work:
- Estimates often use Xactimate format (PDFs/spreadsheets)
- Line item justifications reference IICRC standards
- Adjuster communications need professional but firm tone
- User is a non-technical business owner learning processes

---

## REQUIRED: Development Best Practices

**These practices are MANDATORY for all code changes. This project is built for long-term maintainability.**

### Git Workflow

1. **Always use git** - Every change must be tracked in version control
2. **Commit frequently** - Make atomic commits with clear messages after completing each logical unit of work
3. **Check status before changes** - Run `git status` before starting work to understand current state
4. **Never commit secrets** - API keys, passwords, and .env files must never be committed (see .gitignore)
5. **Use feature branches** for significant changes (optional for small fixes)

### Before Making Code Changes

1. **Read before writing** - Always read existing code before modifying it
2. **Understand the architecture** - Check how similar features are implemented elsewhere in the codebase
3. **Check for existing patterns** - Follow established patterns, don't introduce new paradigms unnecessarily

### Code Quality

1. **Test your changes** - Verify functionality works before considering a task complete
2. **Handle errors gracefully** - Add appropriate error handling for user-facing features
3. **Keep it simple** - Avoid over-engineering; solve the current problem, not hypothetical future ones
4. **Don't leave dead code** - Remove unused imports, functions, and commented-out code

### API & Backend

1. **Backend supports all frontend needs** - If adding UI fields, ensure the backend API already handles them (or add support)
2. **Validate inputs** - Use Pydantic models for API request validation
3. **Return meaningful errors** - API errors should help the user understand what went wrong

### Frontend

1. **Match existing UI patterns** - New components should look consistent with the rest of the app
2. **Test in browser** - Use Playwright or manual testing to verify UI changes work
3. **Handle loading and error states** - Every async operation needs loading indicators and error handling

### Database

1. **Never lose data** - Be careful with migrations; always have a rollback plan
2. **Use the existing schema patterns** - Check `database/schema.py` before adding new tables

### Documentation

1. **Update CLAUDE.md** - If adding new features or changing architecture, update this file
2. **Code should be self-documenting** - Use clear variable/function names; add comments only for complex logic

### Task Completion Checklist

Before marking any task complete:
- [ ] Code works as expected (tested)
- [ ] No console errors or warnings
- [ ] Changes committed to git with descriptive message
- [ ] No secrets or sensitive data exposed
- [ ] CLAUDE.md updated if architecture changed
