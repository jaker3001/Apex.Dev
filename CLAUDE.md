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

Enable foreign keys when connecting to apex_operations.db:
```python
conn.execute('PRAGMA foreign_keys = ON')
```

### apex_operations.db (Business Data)

| Table | Purpose | Used In App |
|-------|---------|-------------|
| **projects** | Restoration jobs (job_number is unique key) | Jobs page - main listing |
| **clients** | Customers/property owners | Linked to projects |
| **organizations** | Insurance cos, TPAs, subcontractors | Project contacts |
| **contacts** | People at organizations | Adjuster assignments |
| **project_contacts** | Links contacts to projects with roles | Job details |
| **estimates** | Xactimate estimates with versions | Job financials |
| **payments** | Received payments | Job financials |
| **notes** | Job notes by type | Job details |
| **media** | Photos/documents | Job attachments |
| **receipts** | Expense receipts | Accounting |
| **work_orders** | Subcontractor work orders | Accounting |
| **labor_entries** | Employee time tracking per job | Accounting |
| **activity_log** | Job event history | Event viewer |

**projects columns:** id, job_number, status, address, city, state, zip, year_built, structure_type, square_footage, num_stories, damage_source, damage_category, damage_class, date_of_loss, date_contacted, inspection_date, work_auth_signed_date, start_date, cos_date, completion_date, claim_number, policy_number, deductible, client_id, insurance_org_id, notes, created_at, updated_at, ready_to_invoice

**estimates columns:** id, project_id, version, estimate_type, amount, original_amount, status, submitted_date, approved_date, xactimate_file_path, notes, created_at

**payments columns:** id, project_id, estimate_id, invoice_number, amount, payment_type, payment_method, check_number, received_date, deposited_date, notes, created_at

### apex_assistant.db (Assistant/App Data)

| Table | Purpose | Used In App |
|-------|---------|-------------|
| **users** | App user accounts | Auth |
| **conversations** | Chat sessions | Chat sidebar |
| **messages** | Chat message history | Chat history (resume) |
| **agents** | Registered AI agents | Chat sidebar |
| **tasks** | AI task metrics | Analytics |
| **automation_candidates** | Patterns for automation | Analytics |
| **mcp_connections** | MCP server configs | Settings |
| **chat_projects** | Chat mode contexts | Chat mode |
| **user_tasks** | Personal to-do items | Dashboard "My Day" |
| **task_lists** | To-do list categories | Dashboard |
| **inbox_items** | Quick captures | Dashboard "Inbox" |
| **time_entries** | Clock in/out records | Dashboard time tracking |
| **pkm_notes** | Knowledge management notes | Notes feature |
| **notifications** | User alerts | Bell icon |
| **activity_logs** | System event logs | Debug |
| **files_processed** | File processing history | Analytics |

**conversations columns:** id, timestamp, summary, related_task_ids, session_id, is_active, title, last_model_id, message_count, chat_project_id, user_id

**messages columns:** id, conversation_id, role, content, model_id, model_name, tools_used, timestamp

**user_tasks columns:** id, user_id, list_id, parent_id, title, description, status, priority, due_date, due_time, reminder_at, is_important, is_my_day, my_day_date, project_id, recurrence_rule, completed_at, sort_order, created_at, updated_at

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
- **Update CLAUDE.md** if architecture changes

## Future Features

### Dashboard

A central employee hub for daily workflow management. Intended as the landing page for field technicians and office staff.

**Planned Components:**
- **Today's Tasks** - Tasks assigned to the current user, filtered by due date
- **Upcoming Deadlines** - Jobs with approaching COS dates, estimate deadlines, etc.
- **Active Jobs Summary** - Quick counts and status of jobs by category
- **Quick Actions** - Common workflows like "Clock in", "Start drying log", "Upload photos"
- **Notifications** - Unread items requiring attention

### Compliance Tasks (Tasks Tab)

A sophisticated task management system for restoration work, separate from simple to-do lists. This system enforces IICRC compliance and tracks accountability.

**Core Concepts:**

1. **Task Templates by Job Type**
   - Water mitigation jobs auto-populate with required tasks (initial inspection, moisture mapping, equipment placement, daily monitoring, etc.)
   - Fire/smoke jobs have different templates
   - Templates are customizable per job type in settings

2. **Time Tracking**
   - Built-in timers for each task
   - Tracks how long each task actually takes vs. estimated time
   - Data feeds into job costing and future estimates

3. **Task Dependencies**
   - Some tasks can't start until prerequisites are complete
   - Example: "Final moisture readings" can't be done until "Equipment removal" is complete
   - Visual dependency chain in the UI

4. **Accountability Tracking**
   - Each task logs: who completed it, when, and any notes
   - Required for IICRC documentation
   - Creates audit trail for insurance disputes

5. **Compliance Requirements**
   - Certain tasks are marked as "required" for job completion
   - Job can't be marked "complete" until all required tasks are done
   - Tied to IICRC S500/S520 standards where applicable

**Database Schema (Proposed):**
```sql
-- Task templates (admin-defined)
CREATE TABLE task_templates (
    id INTEGER PRIMARY KEY,
    job_type TEXT,              -- 'water_mitigation', 'fire', 'mold', etc.
    name TEXT NOT NULL,
    description TEXT,
    estimated_minutes INTEGER,
    is_required BOOLEAN DEFAULT 0,
    sort_order INTEGER,
    depends_on_template_id INTEGER  -- FK to another template
);

-- Job tasks (instances from templates)
CREATE TABLE job_tasks (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    template_id INTEGER,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, in_progress, completed, skipped
    assigned_to INTEGER,            -- FK to contacts (technician)
    started_at DATETIME,
    completed_at DATETIME,
    completed_by INTEGER,
    actual_minutes INTEGER,
    notes TEXT,
    depends_on_task_id INTEGER,     -- FK to another job_task
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

**Implementation Priority:** This is a future phase, not part of the current Jobs section finalization.
