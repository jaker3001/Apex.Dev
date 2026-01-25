# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apex Assistant** is a personalized AI assistant for Apex Restoration LLC (property damage restoration company) built on the Claude Agent SDK. It provides a web UI with real-time chat (via WebSocket), project management, structural drying tracking, and metrics for automation opportunity analysis.

**Database Status:** Hybrid approach - SQLite for legacy operations plus Supabase (PostgreSQL) for newer features. The repository pattern abstracts database access.

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

# Type-check frontend (runs before build)
cd frontend && npx tsc -b

# CLI - Interactive session (legacy)
python main.py

# Initialize databases only
python main.py --init-db
```

## Git Hooks (New Machine Setup)

Git hooks are stored in `scripts/hooks/` for version control.

**On a fresh clone, run once:**
```bash
git config core.hooksPath scripts/hooks
```

| Hook | Purpose |
|------|---------|
| `pre-commit` | Blocks commits with secrets, .env files; warns about large files |
| `commit-msg` | Enforces conventional commit format (`feat:`, `fix:`, etc.) |
| `pre-push` | Reminds you when pushing directly to master |

**Bypass when needed:** `git commit --no-verify` or `git push --no-verify`

See `docs/development/git-workflow.md` for full Git workflow reference.

## Dependencies

**Backend:** Python 3.10+, `pip install -r requirements.txt`
- Requires `ANTHROPIC_API_KEY` environment variable
- Requires Supabase credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Uses `.env` file (auto-loaded by api/main.py)

**Frontend:** Node.js, `cd frontend && npm install`
- React 19, Vite 7, TailwindCSS 4, React Query, Zustand
- Uses `@supabase/supabase-js` for client-side Supabase integration

## Architecture

```
apex-assistant/
├── run_server.py           # Production server entry (Windows asyncio fix)
├── api/
│   ├── main.py             # FastAPI app, CORS, router registration
│   ├── routes/
│   │   ├── chat.py         # WebSocket /ws/chat/{session_id}
│   │   ├── conversations.py
│   │   ├── projects.py     # Job/project CRUD
│   │   ├── drying.py       # Structural drying tracker
│   │   ├── calendar.py     # Calendar events
│   │   ├── google_auth.py  # Google OAuth flow
│   │   ├── dashboard.py    # Dashboard aggregation
│   │   ├── tasks.py        # User tasks
│   │   ├── pkm.py          # Personal knowledge management
│   │   └── agents.py, skills.py, mcp.py, analytics.py, auth.py
│   ├── repositories/       # Repository pattern for Supabase
│   │   ├── base.py         # Generic CRUD operations
│   │   ├── project_repository.py
│   │   ├── job_repository.py
│   │   ├── task_repository.py
│   │   ├── conversation_repository.py
│   │   ├── drying_repository.py
│   │   └── cross_schema_validator.py
│   ├── services/
│   │   ├── chat_service.py     # ChatService wraps ClaudeSDKClient
│   │   ├── supabase_client.py  # Singleton with connection pooling
│   │   ├── drying_report_service.py  # PDF report generation
│   │   ├── job_service.py
│   │   ├── dashboard_service.py
│   │   └── google_calendar.py
│   ├── middleware/         # Auth, RBAC, logging middleware
│   └── schemas/            # Pydantic models
├── database/
│   ├── schema*.py          # SQLite schema definitions (legacy)
│   └── operations*.py      # SQLite CRUD functions (legacy)
├── config/
│   └── system_prompt.py    # APEX_SYSTEM_PROMPT
├── mcp_manager/
│   └── connections.py      # MCPConnectionManager
├── frontend/
│   └── src/
│       ├── pages/          # Route components (ChatPage, ProjectsPage, etc.)
│       ├── components/
│       │   ├── chat/       # Chat UI components
│       │   ├── dashboard/  # Dashboard cards and views
│       │   ├── projects/   # Job management (tabs, modals, accounting)
│       │   ├── drying/     # Structural drying tracker UI
│       │   ├── tasks/      # Task editor and forms
│       │   └── layout/     # Sidebars, TopNav, AppLayout
│       ├── hooks/          # Custom React hooks (useAuth, useChat, useProjects, etc.)
│       ├── contexts/       # ChatContext
│       ├── stores/         # Zustand (uiStore, filtersStore)
│       └── lib/
│           ├── supabase/   # Client, types, subscriptions, storage
│           └── react-query/ # Query config and keys
```

## Repository Pattern

Database operations use a repository pattern abstracting Supabase access:

```python
# api/repositories/base.py
class BaseRepository(Generic[T]):
    async def find_by_id(self, id) -> Optional[T]
    async def find_all(self, filters, order_by, limit, offset) -> List[T]
    async def create(self, data) -> T
    async def update(self, id, data) -> T
    async def delete(self, id) -> bool
    async def count(self, filters) -> int
```

Specific repositories extend with domain logic (e.g., `JobRepository.find_by_job_number()`).

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

| Category | Endpoints |
|----------|-----------|
| Auth | `POST /auth/login`, `POST /auth/logout` |
| Chat | `WS /ws/chat/{session_id}`, `GET /conversations`, `GET /conversations/{id}/messages` |
| Projects | `GET /projects`, `GET /projects/{id}`, `POST /projects`, `PATCH /projects/{id}` |
| Tasks | `GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}` |
| Drying | `GET /drying/projects/{id}`, `POST /drying/readings`, `GET /drying/reports/{id}` |
| Calendar | `GET /calendar/events`, `POST /calendar/events` |
| Google | `GET /google-auth/url`, `POST /google-auth/callback` |
| Dashboard | `GET /dashboard/summary` |
| Settings | `GET /agents`, `GET /skills`, `GET /mcp`, `GET /analytics` |

## Frontend Navigation

**Top nav + contextual sidebar pattern** - see `components/layout/`

| Route | Sidebar | Purpose |
|-------|---------|---------|
| `/` | DashboardSidebar | Hub with widgets, tasks, calendar |
| `/chat` | AssistantSidebar | AI conversation history |
| `/jobs/*` | JobsSidebar | Job search/filters |
| `/tasks` | TasksSidebar | Personal task management |
| `/calendar` | CalendarSidebar | Calendar events |
| `/settings/*` | SettingsSidebar | Admin features |

Settings sub-routes: `/settings/agents`, `/settings/skills`, `/settings/mcp`, `/settings/analytics`, `/settings/learn`

## Key Classes

**ChatService** (`api/services/chat_service.py`)
- Wraps `ClaudeSDKClient` with streaming support
- Tracks metrics per task, stores in database
- Supports mid-conversation model switching via `set_model()`

**SupabaseClient** (`api/services/supabase_client.py`)
- Singleton with connection pooling and exponential backoff retry
- `client` property uses anon key (respects RLS)
- `service_client` property uses service role key (bypasses RLS)

**BaseRepository** (`api/repositories/base.py`)
- Generic CRUD for Supabase tables with Pydantic model validation
- Supports filtering, ordering, pagination

**MCPConnectionManager** (`mcp_manager/connections.py`)
- CRUD for MCP server configs
- `get_active_mcp_servers()` returns configs for ClaudeAgentOptions

## Domain Context

This assistant is tailored for property damage restoration:
- Estimates use Xactimate format (PDFs/spreadsheets)
- Line item justifications reference IICRC standards
- Adjuster communications need professional but firm tone
- Structural drying uses psychrometric calculations (GPP - Grains Per Pound)
- User is a non-technical business owner

## Development Guidelines

- **Read before writing** - Always read existing code before modifying
- **Follow existing patterns** - Check how similar features are implemented
- **Use Repository pattern** for new Supabase database operations
- **Backend + frontend in sync** - If adding UI fields, ensure API supports them
- **Use Pydantic** for API request/response validation
- **Handle loading/error states** in frontend async operations
- **Update CLAUDE.md** if architecture changes

## Environment Variables

```env
# .env file (never commit!)
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optional Supabase tuning
SUPABASE_POOL_SIZE=10
SUPABASE_MAX_RETRIES=3
SUPABASE_RETRY_DELAY=1.0
```

## Project Planning & Vision

Before starting significant work, check these files for context:

- **`.planning/VISION.md`** - Product goals and north star
- **`.planning/ROADMAP.md`** - Current priorities and phases
- **`.planning/IDEAS.md`** - Ideas to potentially explore
- **`.planning/DECISIONS.md`** - Why past decisions were made
- **`.planning/FEATURES-SPEC.md`** - Detailed feature specifications

When making architectural decisions, document them in `.planning/DECISIONS.md`.

## Documentation Structure

```
docs/
├── architecture/     # Technical design (database, backend, API)
├── development/      # Developer guides (git workflow, setup)
├── user-guides/      # End-user documentation
└── archive/          # Historical/completed docs
```

## Parallel Development with Worktrees

This project uses git worktrees for parallel feature development:

```bash
# Create a new worktree for a feature
git worktree add .worktrees/feature-name -b feature/feature-name

# Work in the worktree
cd .worktrees/feature-name

# When done, remove the worktree
git worktree remove .worktrees/feature-name
```

**Why worktrees?**
- Multiple agents/sessions can work on different features simultaneously
- No conflicts between parallel work streams
- Each worktree has isolated file state but shares git history

**Workflow:**
1. Create worktree for feature branch
2. Develop and test in worktree
3. Push branch and open PR
4. Review, merge to main
5. Remove worktree

**Note:** `.worktrees/` is gitignored - worktrees are local only.
