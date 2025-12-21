# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apex Assistant** is a personalized AI assistant for Apex Restoration LLC (property damage restoration company) built on the Claude Agent SDK. It provides a web UI with real-time chat (via WebSocket), project management, and tracks metrics for automation opportunity analysis.

**CURRENT BRANCH:** This is the `feature/supabase-migration` branch. The goal is to migrate from SQLite to Supabase (PostgreSQL) for production-ready database management with authentication, real-time features, and scalability.

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

## Git Hooks (New Machine Setup)

This repo uses git hooks for quality checks. They're stored in `scripts/hooks/` so they're version-controlled.

**On a fresh clone, run this once:**
```bash
git config core.hooksPath scripts/hooks
```

**What the hooks do:**
| Hook | Purpose |
|------|---------|
| `pre-commit` | Blocks commits with secrets, .env files; warns about large files |
| `commit-msg` | Enforces conventional commit format (`feat:`, `fix:`, etc.) |
| `pre-push` | Reminds you when pushing directly to master |

**Bypass when needed:** `git commit --no-verify` or `git push --no-verify`

See `GIT_WORKFLOW.md` for full Git workflow reference.

## Dependencies

**Backend:** Python 3.10+, `pip install -r requirements.txt`
- Requires `ANTHROPIC_API_KEY` environment variable
- Requires Supabase credentials: `SUPABASE_URL`, `SUPABASE_KEY` (anon key), `SUPABASE_SERVICE_KEY` (service role key)
- Uses `.env` file (auto-loaded by api/main.py)

**Frontend:** Node.js, `cd frontend && npm install`
- React 19, Vite 7, TailwindCSS 4, React Query, Zustand
- Will use `@supabase/supabase-js` for client-side Supabase integration

## Migration Strategy

### Phase 1: Database Layer
Replace SQLite connections with Supabase (PostgreSQL):
- Convert `database/schema*.py` from SQLite DDL to Supabase migrations
- Replace `sqlite3` imports with `supabase-py` client
- Update `database/operations*.py` CRUD functions to use Supabase client
- Maintain same function signatures for minimal API route changes

### Phase 2: Authentication
Leverage Supabase Auth instead of custom JWT:
- Replace `api/routes/auth.py` to use Supabase Auth API
- Update frontend to use Supabase client for login/logout/session management
- Implement Row Level Security (RLS) policies in Supabase

### Phase 3: Real-time (Optional)
Add real-time subscriptions for collaborative features:
- Use Supabase Realtime for conversation updates
- Enable presence tracking for active users

## Architecture

```
apex-assistant/
├── run_server.py           # Production server entry (Windows asyncio fix)
├── api/
│   ├── main.py             # FastAPI app, CORS, router registration
│   ├── routes/
│   │   ├── chat.py         # WebSocket /ws/chat/{session_id}
│   │   ├── conversations.py
│   │   ├── projects.py     # CRUD for Supabase projects table
│   │   ├── agents.py, skills.py, mcp.py, analytics.py
│   │   └── auth.py         # Supabase Auth integration (to be migrated)
│   ├── services/
│   │   ├── chat_service.py # ChatService wraps ClaudeSDKClient
│   │   └── supabase.py     # Supabase client singleton (NEW)
│   └── schemas/            # Pydantic models
├── database/
│   ├── schema.py           # Assistant metrics schema (to be migrated to Supabase)
│   ├── schema_apex.py      # Business operations schema (to be migrated to Supabase)
│   ├── schema_hub.py       # Hub/dashboard schema (to be migrated to Supabase)
│   ├── schema_pkm.py       # PKM schema (to be migrated to Supabase)
│   └── operations*.py      # CRUD functions (to be migrated to Supabase client)
├── config/
│   └── system_prompt.py    # APEX_SYSTEM_PROMPT (appended to claude_code preset)
├── mcp_manager/
│   └── connections.py      # MCPConnectionManager
├── frontend/               # React SPA
│   └── src/
│       ├── pages/          # Route components
│       ├── components/     # UI components
│       ├── contexts/       # React context (ChatContext)
│       └── lib/
│           └── supabase.ts # Supabase client instance (NEW)
```

## Database Schema

### Current SQLite Structure (To Be Migrated)

The application uses two logical databases that will become a single Supabase database with organized tables:

**Assistant/App Tables** (from apex_assistant.db):
- **users** - App user accounts
- **conversations** - Chat sessions
- **messages** - Chat message history
- **agents** - Registered AI agents
- **tasks** - AI task metrics
- **automation_candidates** - Automation patterns
- **mcp_connections** - MCP server configs
- **chat_projects** - Chat mode contexts
- **user_tasks** - Personal to-do items
- **task_lists** - To-do list categories
- **inbox_items** - Quick captures
- **time_entries** - Clock in/out records
- **pkm_notes** - Knowledge management notes
- **notifications** - User alerts
- **activity_logs** - System event logs
- **files_processed** - File processing history

**Business Operations Tables** (from apex_operations.db):
- **projects** - Restoration jobs (job_number is unique key)
- **clients** - Customers/property owners
- **organizations** - Insurance cos, TPAs, subcontractors
- **contacts** - People at organizations
- **project_contacts** - Links contacts to projects with roles
- **estimates** - Xactimate estimates with versions
- **payments** - Received payments
- **notes** - Job notes by type
- **media** - Photos/documents
- **receipts** - Expense receipts
- **work_orders** - Subcontractor work orders
- **labor_entries** - Employee time tracking per job
- **activity_log** - Job event history

### Supabase Migration Notes

**Key Differences from SQLite:**
- Use `SERIAL` or `BIGSERIAL` for auto-increment IDs instead of `INTEGER PRIMARY KEY AUTOINCREMENT`
- Use `TIMESTAMP WITH TIME ZONE` instead of `DATETIME` or `TEXT` for timestamps
- Use `BOOLEAN` instead of `INTEGER` for boolean fields
- Use `JSONB` for flexible JSON data storage
- Foreign key constraints work the same but enable better on conflict handling
- Add `user_id UUID REFERENCES auth.users(id)` for Supabase Auth integration
- Implement Row Level Security (RLS) policies for multi-tenant data isolation

**Recommended Table Naming:**
- Prefix app-specific tables with `app_` (e.g., `app_conversations`, `app_messages`)
- Prefix business operations tables with `ops_` (e.g., `ops_projects`, `ops_clients`)
- Or use PostgreSQL schemas: `app.*` and `ops.*`

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
- `POST /auth/login`, `POST /auth/logout` - Authentication (Supabase Auth)
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

**SupabaseClient** (`api/services/supabase.py`) - NEW
- Singleton Supabase client for backend API routes
- Handles service role key authentication for admin operations

## Customization

Edit `config/system_prompt.py` to modify assistant behavior. The `APEX_SYSTEM_PROMPT` string is appended to Claude Code's preset system prompt.

## Frontend Navigation

**Top nav + contextual sidebar pattern** - see `components/layout/`

| Route | Sidebar | Purpose |
|-------|---------|---------|
| `/` | ChatSidebar | Conversation history |
| `/jobs/*` | JobsSidebar | Job search/filters |
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
- **Test with Supabase local dev** - Use `supabase start` for local PostgreSQL instance
- **Update CLAUDE.md** if architecture changes

## Supabase Development

**Local Development:**
```bash
# Start local Supabase (requires Docker)
supabase start

# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (warning: data loss)
supabase db reset
```

**Environment Variables:**
```env
# .env file (never commit!)
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # For frontend client
SUPABASE_SERVICE_KEY=eyJhbGc...  # For backend admin operations
```

**Row Level Security (RLS):**
- Enable RLS on all tables with user data
- Create policies for user isolation: `user_id = auth.uid()`
- Allow service role to bypass RLS for admin operations
- Public tables (organizations, contacts) can have read-only policies
