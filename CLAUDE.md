# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apex Assistant** is a personalized AI assistant for Apex Restoration LLC (property damage restoration company) built on the Claude Agent SDK. It provides a web UI with real-time chat (via WebSocket), project management, and tracks metrics for automation opportunity analysis.

## Commands

```bash
# Backend - Start API server (port 8000)
python run_server.py

# Frontend - Development server (port 5173+)
cd frontend && npm run dev

# Frontend - Build for production
cd frontend && npm run build

# Frontend - Lint
cd frontend && npm run lint

# CLI - Interactive session (legacy)
python main.py

# Initialize databases only
python main.py --init-db
```

## Dependencies

**Backend:** Python 3.10+, `pip install -r requirements.txt`
- Requires `ANTHROPIC_API_KEY` environment variable
- Uses `.env` file (auto-loaded by api/main.py)

**Frontend:** Node.js, `cd frontend && npm install`
- React 19, Vite 7, TailwindCSS 4, React Query, Zustand

## Architecture

```
apex-assistant/
├── run_server.py           # Production server entry (Windows asyncio fix)
├── api/
│   ├── main.py             # FastAPI app, CORS, router registration
│   ├── routes/
│   │   ├── chat.py         # WebSocket /ws/chat/{session_id}
│   │   ├── conversations.py
│   │   ├── projects.py     # CRUD for apex_operations.db
│   │   ├── agents.py, skills.py, mcp.py, analytics.py
│   │   └── auth.py         # JWT authentication
│   ├── services/
│   │   └── chat_service.py # ChatService wraps ClaudeSDKClient
│   └── schemas/            # Pydantic models
├── database/
│   ├── schema.py           # apex_assistant.db (assistant metrics)
│   ├── schema_apex.py      # apex_operations.db (business data)
│   └── operations*.py      # CRUD for both databases
├── config/
│   └── system_prompt.py    # APEX_SYSTEM_PROMPT (appended to claude_code preset)
├── mcp_manager/
│   └── connections.py      # MCPConnectionManager
├── frontend/               # React SPA
│   └── src/
│       ├── pages/          # Route components
│       ├── components/     # UI components
│       └── contexts/       # React context (ChatContext)
├── apex_assistant.db       # Assistant metrics database
└── apex_operations.db      # Business operations database
```

## Two Databases

**apex_assistant.db** - Assistant metrics and chat history
- `tasks` - User requests with complexity metrics
- `conversations`, `messages` - Chat sessions with model tracking
- `agents` - Registered agent usage stats
- `automation_candidates` - Patterns for potential automation
- `mcp_connections` - Configured MCP servers

**apex_operations.db** - Business operations (restoration jobs)
- `projects` - Jobs (job_number is primary key)
- `clients`, `organizations`, `contacts` - People and companies
- `estimates`, `payments`, `notes`, `media` - Job documentation

Enable foreign keys when connecting to apex_operations.db:
```python
conn.execute('PRAGMA foreign_keys = ON')
```

## WebSocket Chat Protocol

Connect to `ws://localhost:8000/api/ws/chat/{session_id}`

**Client sends:**
```json
{"type": "message", "content": "...", "model": "claude-sonnet-4-5"}
```

**Server sends:**
- `{"type": "init", "session_id": "...", "conversation_id": ...}`
- `{"type": "stream_start", "model": "...", "model_name": "..."}`
- `{"type": "text_delta", "content": "..."}`
- `{"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}`
- `{"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}`
- `{"type": "stream_end", "task_id": ..., "message_id": ...}`
- `{"type": "error", "message": "..."}`

**Available models:** `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-sonnet-4-0`, `claude-haiku-4-5`

## API Endpoints

All routes prefixed with `/api`:
- `POST /auth/login`, `POST /auth/logout` - JWT authentication
- `GET /conversations`, `GET /conversations/{id}/messages`
- `GET /projects`, `GET /projects/{id}`, `POST /projects`, `PATCH /projects/{id}`
- `GET /agents`, `GET /skills`, `GET /mcp`, `GET /analytics`

## Key Classes

**ChatService** (`api/services/chat_service.py`) - Main entry point for web UI
- Wraps `ClaudeSDKClient` with streaming support
- Tracks metrics per task, stores in database
- Supports mid-conversation model switching via `set_model()`

**MCPConnectionManager** (`mcp_manager/connections.py`)
- CRUD for MCP server configs in database
- `get_active_mcp_servers()` returns configs for ClaudeAgentOptions

**TaskMetrics** (`utils/metrics.py`)
- Dataclass for per-task metrics (steps, tools, corrections, complexity)
- `classify_automation_type()` returns `skill` | `sub-agent` | `combo`

## Customization

Edit `config/system_prompt.py` to modify assistant behavior. The `APEX_SYSTEM_PROMPT` string is appended to Claude Code's preset system prompt.

## Frontend Navigation

**Top nav + contextual sidebar pattern** - see `components/layout/`

| Route | Sidebar | Purpose |
|-------|---------|---------|
| `/` | ChatSidebar | Conversation history |
| `/projects/*` | ProjectsSidebar | Job search/filters |
| `/settings/*` | SettingsSidebar | Admin features |

Settings sub-routes: `/settings/agents`, `/settings/skills`, `/settings/mcp`, `/settings/analytics`, `/settings/learn`

## Domain Context

This assistant is tailored for property damage restoration:
- Estimates use Xactimate format (PDFs/spreadsheets)
- Line item justifications reference IICRC standards
- Adjuster communications need professional but firm tone
- User is a non-technical business owner

## Development Guidelines

- **Read before writing** - Always read existing code before modifying
- **Follow existing patterns** - Check how similar features are implemented
- **Backend + frontend in sync** - If adding UI fields, ensure API supports them
- **Use Pydantic** for API request/response validation
- **Handle loading/error states** in frontend async operations
- **Update CLAUDE.md** if architecture changes
