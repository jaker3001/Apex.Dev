# Apex Assistant - Comprehensive Database Design

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Schema Organization](#schema-organization)
4. [PostgreSQL Type Mappings](#postgresql-type-mappings)
5. [Authentication & Users](#authentication--users)
6. [AI Assistant Tables](#ai-assistant-tables)
7. [Dashboard Core Tables](#dashboard-core-tables)
8. [Projects & Financials](#projects--financials)
9. [Tasks Management](#tasks-management)
10. [Notes & PKM](#notes--pkm)
11. [Tags & Organization (PARA)](#tags--organization-para)
12. [People & Contacts](#people--contacts)
13. [Calendar Integration](#calendar-integration)
14. [Business Operations Tables](#business-operations-tables)
15. [Cross-Database Relations](#cross-database-relations)
16. [Row Level Security (RLS)](#row-level-security-rls)
17. [Indexes & Performance](#indexes--performance)
18. [Migration Scripts](#migration-scripts)
19. [Migration Strategy & Phased Approach](#migration-strategy--phased-approach)

---

## Overview

This document defines the complete database schema for Apex Assistant, migrated from SQLite to Supabase (PostgreSQL). The system supports:

- **Personal Productivity**: Tasks, Projects, Notes, Goals, Calendar
- **PARA Organization**: Areas, Resources, Entities for context aggregation
- **AI Assistant**: Conversations, task tracking, automation analysis
- **Business Operations**: Jobs, clients, estimates, payments (restoration industry)
- **Multi-user**: Team collaboration with RLS

### Design Principles

1. **Single Source of Truth**: All data in one PostgreSQL database
2. **Multi-tenant**: User isolation via RLS policies
3. **PARA Method**: Flexible organization by Areas, Resources, Entities
4. **GTD Workflow**: Inbox → Process → Organize → Execute
5. **Cross-linking**: Tasks, Notes, Projects, and Jobs can interconnect

---

## Database Architecture

### Unified Database Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                            │
│                  (Single PostgreSQL Database)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  DASHBOARD SCHEMA    │    │  BUSINESS SCHEMA             │  │
│  │  (Personal Data)     │    │  (Operations Data)           │  │
│  ├──────────────────────┤    ├──────────────────────────────┤  │
│  │ • Users & Auth       │    │ • Jobs (Projects)            │  │
│  │ • Tasks              │    │ • Clients                    │  │
│  │ • Personal Projects  │    │ • Organizations              │  │
│  │ • Tags (PARA)        │    │ • Contacts                   │  │
│  │ • Notes (PKM)        │    │ • Estimates                  │  │
│  │ • Goals              │    │ • Payments                   │  │
│  │ • People (Personal)  │    │ • Media                      │  │
│  │ • Calendar Settings  │    │ • Work Orders                │  │
│  │ • AI Conversations   │    │ • Labor Entries              │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits of Single Database:**
- Simplified foreign key relationships
- Single connection pool
- Easier transactions across schemas
- Unified backup/restore
- Better query performance across data

---

## Schema Organization

### Public Schema (Default)

Authentication and cross-cutting tables:
- `auth.users` (Supabase Auth - managed by Supabase)
- `profiles` (User profiles, extends auth.users)

### Dashboard Schema (New)

Personal productivity tables (prefix with `dash_` or use schema):
- Tasks, Projects, Notes, Tags, Goals, People
- AI conversations and metrics
- User integrations (Google Calendar)

### Business Schema (New)

Business operations tables (prefix with `biz_` or use schema):
- Jobs, Clients, Organizations, Contacts
- Estimates, Payments, Media, Work Orders

**Recommendation**: Use table prefixes (`dash_`, `biz_`) in public schema for simplicity, or create actual PostgreSQL schemas if cleaner separation is needed.

---

## PostgreSQL Type Mappings

### SQLite → PostgreSQL Conversions

| SQLite Type | PostgreSQL Type | Notes |
|-------------|-----------------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` or `UUID PRIMARY KEY` | UUID recommended for distributed systems |
| `INTEGER` | `INTEGER` or `BIGINT` | Use BIGINT for large numbers |
| `TEXT` | `TEXT` or `VARCHAR(n)` | TEXT unlimited, VARCHAR for constraints |
| `DATETIME` | `TIMESTAMP WITH TIME ZONE` | Always use timestamptz |
| `DATE` | `DATE` | Same |
| `TIME` | `TIME` | Same |
| `BOOLEAN` (as INTEGER 0/1) | `BOOLEAN` | Native boolean type |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` | For money |
| `TEXT` (for JSON) | `JSONB` | Indexed, queryable JSON |
| `CHECK (col IN (...))` | `CHECK (col IN (...))` or ENUM | ENUMs for performance |

### Recommended Patterns

**Primary Keys:**
```sql
-- Option 1: UUID (recommended for multi-tenant, API-friendly)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Option 2: BIGSERIAL (simpler, sequential)
id BIGSERIAL PRIMARY KEY
```

**Timestamps:**
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**User References:**
```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

**Soft Deletes:**
```sql
deleted_at TIMESTAMPTZ NULL  -- NULL = not deleted
```

---

## Authentication & Users

### Supabase Auth (Managed)

Supabase provides `auth.users` table automatically with OAuth support.

```sql
-- Managed by Supabase
-- auth.users contains:
--   id (UUID)
--   email
--   encrypted_password
--   email_confirmed_at
--   created_at
--   updated_at
--   etc.
```

### User Profiles (Custom)

Extends auth.users with application-specific data.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    display_name TEXT NOT NULL,
    avatar_url TEXT,

    -- Role-based access
    role TEXT NOT NULL DEFAULT 'employee'
        CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Optional link to business contacts
    contact_id BIGINT REFERENCES biz_contacts(id) ON DELETE SET NULL,

    -- Preferences
    preferences JSONB DEFAULT '{}',  -- UI settings, theme, etc.
    timezone TEXT DEFAULT 'America/New_York',

    -- Tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role) WHERE is_active = TRUE;
CREATE INDEX idx_profiles_contact ON profiles(contact_id) WHERE contact_id IS NOT NULL;
```

---

## AI Assistant Tables

### Conversations

Chat sessions with AI assistant.

```sql
CREATE TABLE dash_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Conversation metadata
    title TEXT,  -- Auto-generated from first message
    summary TEXT,  -- AI-generated summary

    -- Session tracking
    session_id TEXT,  -- Claude SDK session for resuming
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Model tracking
    last_model_id TEXT,  -- e.g., 'claude-sonnet-4-5-20250514'
    message_count INTEGER NOT NULL DEFAULT 0,

    -- Relations
    chat_project_id UUID REFERENCES dash_chat_projects(id) ON DELETE SET NULL,
    related_task_ids JSONB DEFAULT '[]',  -- Array of task UUIDs

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
    ON dash_conversations
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_conversations_user_active
    ON dash_conversations(user_id, is_active, updated_at DESC);
CREATE INDEX idx_conversations_session
    ON dash_conversations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_conversations_chat_project
    ON dash_conversations(chat_project_id) WHERE chat_project_id IS NOT NULL;
```

### Messages

Individual messages within conversations.

```sql
CREATE TABLE dash_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES dash_conversations(id) ON DELETE CASCADE,

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT,  -- Message text

    -- Model tracking
    model_id TEXT,  -- e.g., 'claude-sonnet-4-5-20250514'
    model_name TEXT,  -- Display name e.g., 'Sonnet 4.5'

    -- Tool usage
    tools_used JSONB DEFAULT '[]',  -- Array of tool objects

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (inherit from conversation)
ALTER TABLE dash_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages"
    ON dash_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dash_conversations
            WHERE id = dash_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_messages_conversation
    ON dash_messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_role
    ON dash_messages(conversation_id, role);
```

### AI Tasks

Record of every task requested from the AI.

```sql
CREATE TABLE dash_ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES dash_conversations(id) ON DELETE SET NULL,

    -- Task details
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    outcome TEXT,  -- Result summary

    -- Classification
    category TEXT CHECK (category IN (
        'estimates', 'line_items', 'adjuster_comms', 'documentation',
        'admin', 'research', 'scheduling', 'financial', 'other'
    )),
    agent_used TEXT,

    -- Metrics for automation analysis
    complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 5),
    steps_required INTEGER,
    decision_points INTEGER,
    context_needed TEXT CHECK (context_needed IN ('low', 'medium', 'high')),
    reusability TEXT CHECK (reusability IN ('low', 'medium', 'high')),

    -- Input/Output tracking
    input_type TEXT CHECK (input_type IN ('text', 'file', 'image', 'structured_data', 'multiple')),
    output_type TEXT,
    tools_used JSONB DEFAULT '[]',  -- Array of tool names

    -- Quality metrics
    human_corrections INTEGER DEFAULT 0,
    follow_up_tasks INTEGER DEFAULT 0,
    time_to_complete INTEGER,  -- Seconds
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),

    -- Pattern matching
    frequency_tag TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE dash_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own AI tasks"
    ON dash_ai_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dash_conversations
            WHERE id = dash_ai_tasks.conversation_id
            AND user_id = auth.uid()
        )
        OR conversation_id IS NULL  -- Tasks without conversation visible to creator
    );

-- Indexes
CREATE INDEX idx_ai_tasks_status ON dash_ai_tasks(status, created_at DESC);
CREATE INDEX idx_ai_tasks_category ON dash_ai_tasks(category) WHERE category IS NOT NULL;
CREATE INDEX idx_ai_tasks_conversation ON dash_ai_tasks(conversation_id);
CREATE INDEX idx_ai_tasks_frequency ON dash_ai_tasks(frequency_tag) WHERE frequency_tag IS NOT NULL;
```

### Agents Registry

Specialized AI agents.

```sql
CREATE TABLE dash_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Agent identity
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    capabilities JSONB DEFAULT '[]',  -- Array of capability strings

    -- Usage stats
    times_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- RLS (public read, admin write)
ALTER TABLE dash_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view agents"
    ON dash_agents FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can modify agents"
    ON dash_agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX idx_agents_active ON dash_agents(name) WHERE is_active = TRUE;
```

### Automation Candidates

Patterns identified for automation.

```sql
CREATE TABLE dash_automation_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Pattern details
    pattern_description TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    suggested_automation TEXT,
    automation_type TEXT CHECK (automation_type IN ('skill', 'sub-agent', 'combo')),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'identified'
        CHECK (status IN ('identified', 'in_review', 'implemented', 'dismissed')),

    -- Related tasks
    related_task_ids JSONB DEFAULT '[]',  -- Array of task UUIDs
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_automation_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation candidates"
    ON dash_automation_candidates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Indexes
CREATE INDEX idx_automation_status ON dash_automation_candidates(status, frequency DESC);
```

### Chat Projects

Projects for Chat Mode with custom instructions.

```sql
CREATE TABLE dash_chat_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Project details
    name TEXT NOT NULL,
    description TEXT,

    -- Custom context
    instructions TEXT,  -- Additional system prompt
    knowledge_path TEXT,  -- Path to knowledge folder

    -- Optional link to business job
    linked_job_number TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_chat_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat projects"
    ON dash_chat_projects
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_chat_projects_user ON dash_chat_projects(user_id, name);
CREATE INDEX idx_chat_projects_job ON dash_chat_projects(linked_job_number)
    WHERE linked_job_number IS NOT NULL;
```

### Files Processed

Record of files handled by AI.

```sql
CREATE TABLE dash_files_processed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES dash_ai_tasks(id) ON DELETE SET NULL,

    -- File info
    filename TEXT NOT NULL,
    file_type TEXT,  -- PDF, image, etc.
    file_path TEXT,
    file_size BIGINT,  -- Bytes

    -- Purpose
    purpose TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_files_processed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own processed files"
    ON dash_files_processed FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dash_ai_tasks
            JOIN dash_conversations ON dash_conversations.id = dash_ai_tasks.conversation_id
            WHERE dash_ai_tasks.id = dash_files_processed.task_id
            AND dash_conversations.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_files_task ON dash_files_processed(task_id);
CREATE INDEX idx_files_created ON dash_files_processed(created_at DESC);
```

### MCP Connections

Configured MCP server connections.

```sql
CREATE TABLE dash_mcp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Connection details
    name TEXT UNIQUE NOT NULL,
    server_type TEXT NOT NULL,  -- stdio, sse, http, sdk
    config JSONB NOT NULL,  -- Server configuration

    -- Status
    status TEXT NOT NULL DEFAULT 'inactive'
        CHECK (status IN ('active', 'inactive', 'error')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE dash_mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage MCP connections"
    ON dash_mcp_connections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX idx_mcp_status ON dash_mcp_connections(status);
```

### Activity Logs

Centralized logging for debugging.

```sql
CREATE TABLE dash_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Log details
    log_type TEXT NOT NULL,  -- 'api', 'websocket', 'model', 'mcp', 'tool', 'error'
    session_id TEXT,
    conversation_id UUID REFERENCES dash_conversations(id) ON DELETE SET NULL,

    -- Data
    data JSONB,  -- Flexible log data
    severity TEXT NOT NULL DEFAULT 'info'
        CHECK (severity IN ('debug', 'info', 'warning', 'error')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all logs"
    ON dash_activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX idx_logs_type_time ON dash_activity_logs(log_type, created_at DESC);
CREATE INDEX idx_logs_session ON dash_activity_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_logs_severity ON dash_activity_logs(severity, created_at DESC)
    WHERE severity IN ('warning', 'error');

-- Partition by month for performance
-- CREATE TABLE dash_activity_logs_y2025m01 PARTITION OF dash_activity_logs
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## Dashboard Core Tables

### Inbox Items

Quick capture inbox for notes, tasks, media.

```sql
CREATE TABLE dash_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Item type
    type TEXT NOT NULL CHECK (type IN ('note', 'photo', 'audio', 'document', 'task')),

    -- Content
    title TEXT,
    content TEXT,

    -- File (if media)
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,

    -- Processing
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    project_id UUID REFERENCES dash_projects(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE dash_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inbox"
    ON dash_inbox
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_inbox_user_unprocessed
    ON dash_inbox(user_id, created_at DESC) WHERE processed = FALSE;
CREATE INDEX idx_inbox_user_type
    ON dash_inbox(user_id, type, created_at DESC);
```

### Notifications

User notifications and alerts.

```sql
CREATE TABLE dash_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification details
    type TEXT NOT NULL CHECK (type IN ('mention', 'assignment', 'reminder', 'alert', 'system')),
    title TEXT NOT NULL,
    message TEXT,

    -- Source tracking
    source_type TEXT,  -- 'task', 'project', 'note', 'job', etc.
    source_id UUID,
    link TEXT,  -- Deep link to source

    -- Read status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE dash_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
    ON dash_notifications
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_notifications_user_unread
    ON dash_notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_source
    ON dash_notifications(source_type, source_id) WHERE source_type IS NOT NULL;
```

### Time Entries

Clock in/out tracking.

```sql
CREATE TABLE dash_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Time tracking
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    break_minutes INTEGER NOT NULL DEFAULT 0,

    -- Optional project link
    project_id UUID REFERENCES dash_projects(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CHECK (clock_out IS NULL OR clock_out > clock_in),
    CHECK (break_minutes >= 0)
);

-- RLS
ALTER TABLE dash_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own time entries"
    ON dash_time_entries
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_time_entries_user_date
    ON dash_time_entries(user_id, clock_in DESC);
CREATE INDEX idx_time_entries_project
    ON dash_time_entries(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_time_entries_active
    ON dash_time_entries(user_id, clock_in DESC) WHERE clock_out IS NULL;
```

---

## Projects & Financials

### Projects (Personal)

Personal projects with full project management.

```sql
CREATE TYPE project_status AS ENUM ('planned', 'doing', 'ongoing', 'on_hold', 'done');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE dash_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,  -- Emoji or icon name
    color TEXT,  -- Hex color

    -- Vision (from wizard)
    vision TEXT,
    desired_outcome TEXT,

    -- Status
    status project_status NOT NULL DEFAULT 'planned',
    priority project_priority NOT NULL DEFAULT 'medium',

    -- Dates
    start_date DATE,
    target_date DATE,
    completed_at TIMESTAMPTZ,

    -- Relations
    area_id UUID REFERENCES dash_tags(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES dash_goals(id) ON DELETE SET NULL,

    -- Display
    cover_image TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"
    ON dash_projects
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_projects_user_active
    ON dash_projects(user_id, status, updated_at DESC) WHERE archived = FALSE;
CREATE INDEX idx_projects_area
    ON dash_projects(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_projects_goal
    ON dash_projects(goal_id) WHERE goal_id IS NOT NULL;
```

### Project People

People related to projects.

```sql
CREATE TABLE dash_project_people (
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES dash_people(id) ON DELETE CASCADE,
    role TEXT,  -- 'owner', 'collaborator', 'stakeholder', 'mentor'

    PRIMARY KEY (project_id, person_id)
);

-- RLS (inherit from project)
ALTER TABLE dash_project_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage project people"
    ON dash_project_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_people.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_project_people_person ON dash_project_people(person_id);
```

### Project Milestones

Key checkpoints within projects.

```sql
CREATE TABLE dash_project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,

    -- Milestone details
    name TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage project milestones"
    ON dash_project_milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_milestones.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_milestones_project
    ON dash_project_milestones(project_id, sort_order);
```

### Project Activity

Activity log for projects.

```sql
CREATE TABLE dash_project_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Activity details
    action TEXT NOT NULL,  -- 'created', 'status_changed', 'task_completed', etc.
    description TEXT,
    old_value TEXT,
    new_value TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view project activity"
    ON dash_project_activity FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_activity.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_project_activity_project
    ON dash_project_activity(project_id, created_at DESC);
```

### Project Expenses

Money going out.

```sql
CREATE TABLE dash_project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction
    amount NUMERIC(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,  -- From expense_categories or free-form
    vendor TEXT,

    -- Date & payment
    transaction_date DATE NOT NULL,
    payment_method TEXT,  -- 'cash', 'credit_card', 'debit', 'check', 'transfer'
    reference_number TEXT,

    -- Documentation
    receipt_path TEXT,

    -- Tax tracking
    is_tax_deductible BOOLEAN NOT NULL DEFAULT FALSE,
    tax_category TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage project expenses"
    ON dash_project_expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_expenses.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_expenses_project
    ON dash_project_expenses(project_id, transaction_date DESC);
CREATE INDEX idx_expenses_category
    ON dash_project_expenses(category);
```

### Project Income

Money coming in.

```sql
CREATE TABLE dash_project_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Transaction
    amount NUMERIC(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,  -- 'sales', 'services', 'royalties', 'refund'
    source TEXT,  -- Who paid

    -- Date & payment
    transaction_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,

    -- Documentation
    invoice_number TEXT,
    document_path TEXT,

    -- Tax tracking
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    tax_category TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_project_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage project income"
    ON dash_project_income FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_income.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_income_project
    ON dash_project_income(project_id, transaction_date DESC);
```

### Project Budgets

Budget planning by category.

```sql
CREATE TABLE dash_project_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES dash_projects(id) ON DELETE CASCADE,

    -- Budget details
    category TEXT NOT NULL,
    budgeted_amount NUMERIC(10,2) NOT NULL,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One budget per category per project
    UNIQUE (project_id, category)
);

-- RLS
ALTER TABLE dash_project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage project budgets"
    ON dash_project_budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_projects
            WHERE id = dash_project_budgets.project_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_budgets_project ON dash_project_budgets(project_id);
```

### Expense Categories

User-customizable expense categories.

```sql
CREATE TABLE dash_expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Category details
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,

    -- Tax defaults
    is_tax_deductible_default BOOLEAN NOT NULL DEFAULT FALSE,
    tax_category_default TEXT,

    -- Display
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- One category name per user
    UNIQUE (user_id, name)
);

-- RLS
ALTER TABLE dash_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories"
    ON dash_expense_categories
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_expense_categories_user
    ON dash_expense_categories(user_id, sort_order);
```

---

## Tasks Management

### Tasks

Rich task management with GTD, Kanban, recurrence.

```sql
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE smart_list AS ENUM ('inbox', 'next', 'delegated', 'someday');
CREATE TYPE recur_unit AS ENUM ('days', 'weeks', 'months', 'years');

CREATE TABLE dash_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    title TEXT NOT NULL,
    description TEXT,

    -- Status & priority
    status task_status NOT NULL DEFAULT 'backlog',
    priority task_priority,

    -- Dates
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    snooze_until DATE,

    -- GTD
    smart_list smart_list,

    -- My Day
    is_my_day BOOLEAN NOT NULL DEFAULT FALSE,
    my_day_date DATE,

    -- Recurrence
    recur_interval INTEGER,
    recur_unit recur_unit,
    recur_days JSONB,  -- Array: ["Monday", "Wednesday"]

    -- Relations
    project_id UUID REFERENCES dash_projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES dash_tasks(id) ON DELETE CASCADE,
    job_number TEXT,  -- Link to business job

    -- Display
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks"
    ON dash_tasks
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tasks_user_status
    ON dash_tasks(user_id, status, due_date NULLS LAST);
CREATE INDEX idx_tasks_user_my_day
    ON dash_tasks(user_id, is_my_day, my_day_date) WHERE is_my_day = TRUE;
CREATE INDEX idx_tasks_project
    ON dash_tasks(project_id, sort_order) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_parent
    ON dash_tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_job
    ON dash_tasks(job_number) WHERE job_number IS NOT NULL;
CREATE INDEX idx_tasks_smart_list
    ON dash_tasks(user_id, smart_list) WHERE smart_list IS NOT NULL;
```

### Task Tags (M2M)

Tasks can have multiple tags.

```sql
CREATE TABLE dash_task_tags (
    task_id UUID NOT NULL REFERENCES dash_tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES dash_tags(id) ON DELETE CASCADE,

    PRIMARY KEY (task_id, tag_id)
);

-- RLS
ALTER TABLE dash_task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage task tags"
    ON dash_task_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_tasks
            WHERE id = dash_task_tags.task_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_task_tags_tag ON dash_task_tags(tag_id);
```

### Task People (M2M)

Tasks can be assigned to people.

```sql
CREATE TABLE dash_task_people (
    task_id UUID NOT NULL REFERENCES dash_tasks(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES dash_people(id) ON DELETE CASCADE,
    role TEXT,  -- 'assignee', 'delegated_to', 'collaborator'

    PRIMARY KEY (task_id, person_id)
);

-- RLS
ALTER TABLE dash_task_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage task people"
    ON dash_task_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_tasks
            WHERE id = dash_task_people.task_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_task_people_person ON dash_task_people(person_id);
```

---

## Notes & PKM

### Notes

Personal knowledge management with markdown.

```sql
CREATE TYPE note_type AS ENUM ('note', 'web_clip', 'meeting', 'journal');

CREATE TABLE dash_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    title TEXT NOT NULL,
    content TEXT,  -- Markdown

    -- Type
    type note_type NOT NULL DEFAULT 'note',
    source_url TEXT,  -- For web clips

    -- Display
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

    -- Relations
    project_id UUID REFERENCES dash_projects(id) ON DELETE SET NULL,
    job_number TEXT,  -- Link to business job

    -- Metadata
    word_count INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes"
    ON dash_notes
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_notes_user_updated
    ON dash_notes(user_id, updated_at DESC) WHERE archived = FALSE;
CREATE INDEX idx_notes_project
    ON dash_notes(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_notes_job
    ON dash_notes(job_number) WHERE job_number IS NOT NULL;
CREATE INDEX idx_notes_favorites
    ON dash_notes(user_id, updated_at DESC) WHERE is_favorite = TRUE;

-- Full-text search
CREATE INDEX idx_notes_search ON dash_notes USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));
```

### Note Tags (M2M)

Notes can have multiple tags.

```sql
CREATE TABLE dash_note_tags (
    note_id UUID NOT NULL REFERENCES dash_notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES dash_tags(id) ON DELETE CASCADE,

    PRIMARY KEY (note_id, tag_id)
);

-- RLS
ALTER TABLE dash_note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage note tags"
    ON dash_note_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_notes
            WHERE id = dash_note_tags.note_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_note_tags_tag ON dash_note_tags(tag_id);
```

### Note Links (Bidirectional)

Notes can link to each other.

```sql
CREATE TABLE dash_note_links (
    source_note_id UUID NOT NULL REFERENCES dash_notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES dash_notes(id) ON DELETE CASCADE,

    PRIMARY KEY (source_note_id, target_note_id),

    -- Prevent self-links
    CHECK (source_note_id != target_note_id)
);

-- RLS
ALTER TABLE dash_note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage note links"
    ON dash_note_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_notes
            WHERE id = dash_note_links.source_note_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_note_links_target ON dash_note_links(target_note_id);
```

### Note Media

Photos, audio, video, documents attached to notes.

```sql
CREATE TYPE media_type AS ENUM ('image', 'audio', 'video', 'document');

CREATE TABLE dash_note_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES dash_notes(id) ON DELETE CASCADE,

    -- File info
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    media_type media_type NOT NULL,

    -- Metadata
    duration_seconds INTEGER,  -- For audio/video
    width INTEGER,  -- For images/video
    height INTEGER,  -- For images/video
    transcription TEXT,  -- For voice recordings

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_note_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage note media"
    ON dash_note_media FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_notes
            WHERE id = dash_note_media.note_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_note_media_note ON dash_note_media(note_id, created_at);
CREATE INDEX idx_note_media_type ON dash_note_media(media_type);
```

---

## Tags & Organization (PARA)

### Tags

Areas, Resources, Entities for PARA organization.

```sql
CREATE TYPE tag_type AS ENUM ('area', 'resource', 'entity');

CREATE TABLE dash_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,

    -- PARA type
    type tag_type NOT NULL,

    -- Hierarchy
    parent_tag_id UUID REFERENCES dash_tags(id) ON DELETE CASCADE,

    -- Display
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One tag name per user per type
    UNIQUE (user_id, name, type)
);

-- RLS
ALTER TABLE dash_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tags"
    ON dash_tags
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tags_user_type
    ON dash_tags(user_id, type, sort_order) WHERE archived = FALSE;
CREATE INDEX idx_tags_parent
    ON dash_tags(parent_tag_id) WHERE parent_tag_id IS NOT NULL;
CREATE INDEX idx_tags_favorites
    ON dash_tags(user_id, sort_order) WHERE is_favorite = TRUE;
```

---

## People & Contacts

### People (Personal)

Personal contacts separate from business contacts.

```sql
CREATE TABLE dash_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    title TEXT,

    -- Social
    website TEXT,
    linkedin TEXT,
    twitter TEXT,

    -- Notes
    notes TEXT,

    -- Display
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own people"
    ON dash_people
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_people_user_name
    ON dash_people(user_id, name) WHERE archived = FALSE;
CREATE INDEX idx_people_favorites
    ON dash_people(user_id, name) WHERE is_favorite = TRUE;
```

### People Tags (M2M)

People can have tags (connect to Areas).

```sql
CREATE TABLE dash_people_tags (
    person_id UUID NOT NULL REFERENCES dash_people(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES dash_tags(id) ON DELETE CASCADE,

    PRIMARY KEY (person_id, tag_id)
);

-- RLS
ALTER TABLE dash_people_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage people tags"
    ON dash_people_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_people
            WHERE id = dash_people_tags.person_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_people_tags_tag ON dash_people_tags(tag_id);
```

---

## Goals

### Goals

Goal tracking with milestones.

```sql
CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'abandoned');

CREATE TABLE dash_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    description TEXT,

    -- Status
    status goal_status NOT NULL DEFAULT 'active',

    -- Dates
    target_date DATE,
    achieved_at TIMESTAMPTZ,

    -- Relations
    tag_id UUID REFERENCES dash_tags(id) ON DELETE SET NULL,

    -- Metadata
    archived BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE dash_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals"
    ON dash_goals
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_goals_user_status
    ON dash_goals(user_id, status, target_date) WHERE archived = FALSE;
CREATE INDEX idx_goals_tag
    ON dash_goals(tag_id) WHERE tag_id IS NOT NULL;
```

### Milestones

Checkpoints for goals.

```sql
CREATE TABLE dash_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES dash_goals(id) ON DELETE CASCADE,

    -- Milestone details
    name TEXT NOT NULL,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE dash_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage goal milestones"
    ON dash_milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dash_goals
            WHERE id = dash_milestones.goal_id
            AND user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_milestones_goal ON dash_milestones(goal_id, sort_order);
```

---

## Work Sessions

### Work Sessions

Time tracking for tasks.

```sql
CREATE TABLE dash_work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES dash_tasks(id) ON DELETE CASCADE,

    -- Time tracking
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Constraints
    CHECK (end_time IS NULL OR end_time > start_time)
);

-- RLS
ALTER TABLE dash_work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own work sessions"
    ON dash_work_sessions
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_work_sessions_task
    ON dash_work_sessions(task_id, start_time DESC);
CREATE INDEX idx_work_sessions_user_date
    ON dash_work_sessions(user_id, start_time DESC);
```

---

## Calendar Integration

### User Integrations

OAuth integrations (Google Calendar, etc.).

```sql
CREATE TABLE dash_user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Integration type
    provider TEXT NOT NULL,  -- 'google_calendar', future: 'outlook', 'slack'

    -- OAuth tokens (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Provider settings
    settings JSONB DEFAULT '{}',  -- Visible calendars, default view, etc.

    -- Status
    is_connected BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One connection per provider per user
    UNIQUE (user_id, provider)
);

-- RLS
ALTER TABLE dash_user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own integrations"
    ON dash_user_integrations
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_integrations_user_provider
    ON dash_user_integrations(user_id, provider);
```

**Note:** Calendar events are NOT stored locally - Google Calendar API is the source of truth.

---

## Business Operations Tables

### Jobs (Projects)

Restoration jobs - main business table.

```sql
CREATE TYPE job_status AS ENUM (
    'lead', 'estimate', 'pending_auth', 'active', 'on_hold',
    'complete', 'invoiced', 'paid', 'cancelled'
);

CREATE TABLE biz_jobs (
    id BIGSERIAL PRIMARY KEY,

    -- Job identifier
    job_number TEXT UNIQUE NOT NULL,

    -- Status
    status job_status NOT NULL DEFAULT 'lead',

    -- Property info
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    year_built INTEGER,
    structure_type TEXT,
    square_footage INTEGER,
    num_stories INTEGER,

    -- Damage info
    damage_source TEXT,
    damage_category TEXT,  -- Water, Fire, Mold, etc.
    damage_class TEXT,  -- Class 1-4 for water

    -- Dates
    date_of_loss DATE,
    date_contacted DATE,
    inspection_date DATE,
    work_auth_signed_date DATE,
    start_date DATE,
    cos_date DATE,  -- Certificate of Satisfaction
    completion_date DATE,

    -- Insurance
    claim_number TEXT,
    policy_number TEXT,
    deductible NUMERIC(10,2),

    -- Relations
    client_id BIGINT REFERENCES biz_clients(id) ON DELETE SET NULL,
    insurance_org_id BIGINT REFERENCES biz_organizations(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,
    ready_to_invoice BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_status ON biz_jobs(status, updated_at DESC);
CREATE INDEX idx_jobs_client ON biz_jobs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_jobs_insurance ON biz_jobs(insurance_org_id) WHERE insurance_org_id IS NOT NULL;
CREATE INDEX idx_jobs_ready_invoice ON biz_jobs(status) WHERE ready_to_invoice = TRUE;
```

### Clients

Property owners/customers.

```sql
CREATE TABLE biz_clients (
    id BIGSERIAL PRIMARY KEY,

    -- Basic info
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,

    -- Notes
    notes TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_clients_active ON biz_clients(name) WHERE is_active = TRUE;
```

### Organizations

Insurance companies, TPAs, vendors.

```sql
CREATE TYPE org_type AS ENUM ('insurance_carrier', 'tpa', 'vendor', 'internal');

CREATE TABLE biz_organizations (
    id BIGSERIAL PRIMARY KEY,

    -- Basic info
    name TEXT NOT NULL,
    org_type org_type NOT NULL,

    -- Address
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    website TEXT,

    -- MSA (Master Service Agreement)
    has_msa BOOLEAN NOT NULL DEFAULT FALSE,
    msa_signed_date DATE,
    msa_expiration_date DATE,

    -- For vendors
    trade_category TEXT,

    -- Notes
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orgs_type ON biz_organizations(org_type, name) WHERE is_active = TRUE;
CREATE INDEX idx_orgs_msa ON biz_organizations(org_type) WHERE has_msa = TRUE;
```

### Contacts

People at organizations (adjusters, vendors, etc.).

```sql
CREATE TABLE biz_contacts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT REFERENCES biz_organizations(id) ON DELETE CASCADE,

    -- Basic info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    phone_extension TEXT,
    email TEXT,

    -- Notes
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_org ON biz_contacts(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_contacts_name ON biz_contacts(last_name, first_name);
```

### Project Contacts

Links contacts to jobs with roles.

```sql
CREATE TABLE biz_project_contacts (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES biz_contacts(id) ON DELETE CASCADE,
    role TEXT,  -- 'adjuster', 'inspector', 'subcontractor', etc.
    notes TEXT,

    UNIQUE (project_id, contact_id, role)
);

-- Indexes
CREATE INDEX idx_project_contacts_project ON biz_project_contacts(project_id);
CREATE INDEX idx_project_contacts_contact ON biz_project_contacts(contact_id);
```

### Estimates

Xactimate estimates with versions.

```sql
CREATE TYPE estimate_type AS ENUM ('initial', 'revised', 'supplement', 'final');
CREATE TYPE estimate_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'pending_review');

CREATE TABLE biz_estimates (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,

    -- Version tracking
    version INTEGER NOT NULL DEFAULT 1,
    estimate_type estimate_type NOT NULL DEFAULT 'initial',

    -- Amounts
    amount NUMERIC(10,2) NOT NULL,
    original_amount NUMERIC(10,2),  -- For tracking changes

    -- Status
    status estimate_status NOT NULL DEFAULT 'draft',
    submitted_date DATE,
    approved_date DATE,

    -- File
    xactimate_file_path TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, version)
);

-- Indexes
CREATE INDEX idx_estimates_project ON biz_estimates(project_id, version DESC);
CREATE INDEX idx_estimates_status ON biz_estimates(status) WHERE status != 'approved';
```

### Payments

Payments received.

```sql
CREATE TYPE payment_type AS ENUM ('initial', 'progress', 'final', 'supplement');
CREATE TYPE payment_method AS ENUM ('check', 'ach', 'wire', 'credit_card', 'cash');

CREATE TABLE biz_payments (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    estimate_id BIGINT REFERENCES biz_estimates(id) ON DELETE SET NULL,

    -- Payment details
    invoice_number TEXT,
    amount NUMERIC(10,2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_method payment_method NOT NULL,

    -- Check details
    check_number TEXT,

    -- Dates
    received_date DATE NOT NULL,
    deposited_date DATE,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_project ON biz_payments(project_id, received_date DESC);
CREATE INDEX idx_payments_estimate ON biz_payments(estimate_id) WHERE estimate_id IS NOT NULL;
```

### Notes (Job Notes)

Notes specific to jobs.

```sql
CREATE TYPE job_note_type AS ENUM ('general', 'inspection', 'communication', 'damage', 'work');

CREATE TABLE biz_notes (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Content
    type job_note_type NOT NULL DEFAULT 'general',
    content TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_job_notes_project ON biz_notes(project_id, created_at DESC);
```

### Media

Photos and documents for jobs.

```sql
CREATE TYPE job_media_type AS ENUM ('photo', 'document', 'report', 'invoice');

CREATE TABLE biz_media (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,

    -- File info
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    media_type job_media_type NOT NULL,

    -- Metadata
    description TEXT,
    taken_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_project ON biz_media(project_id, created_at DESC);
CREATE INDEX idx_media_type ON biz_media(project_id, media_type);
```

### Receipts

Expense receipts for jobs.

```sql
CREATE TABLE biz_receipts (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,

    -- Transaction
    amount NUMERIC(10,2) NOT NULL,
    vendor TEXT NOT NULL,
    category TEXT,
    description TEXT,

    -- Date
    transaction_date DATE NOT NULL,

    -- File
    receipt_path TEXT,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_receipts_project ON biz_receipts(project_id, transaction_date DESC);
```

### Work Orders

Subcontractor work orders.

```sql
CREATE TYPE work_order_status AS ENUM ('draft', 'sent', 'accepted', 'in_progress', 'completed', 'invoiced', 'paid');

CREATE TABLE biz_work_orders (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES biz_organizations(id),

    -- Work order details
    work_order_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2),

    -- Status
    status work_order_status NOT NULL DEFAULT 'draft',

    -- Dates
    sent_date DATE,
    start_date DATE,
    completed_date DATE,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_orders_project ON biz_work_orders(project_id);
CREATE INDEX idx_work_orders_vendor ON biz_work_orders(vendor_id);
CREATE INDEX idx_work_orders_status ON biz_work_orders(status);
```

### Labor Entries

Employee time tracking per job.

```sql
CREATE TABLE biz_labor_entries (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Time tracking
    date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL,
    description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_labor_project ON biz_labor_entries(project_id, date DESC);
CREATE INDEX idx_labor_user ON biz_labor_entries(user_id, date DESC);
```

### Activity Log

Event history for jobs.

```sql
CREATE TABLE biz_activity_log (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Activity
    action TEXT NOT NULL,
    description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_project ON biz_activity_log(project_id, created_at DESC);
```

---

## Cross-Database Relations

### Linking Dashboard ↔ Business

```sql
-- Tasks can link to Jobs
-- dash_tasks.job_number → biz_jobs.job_number (TEXT foreign key)

-- Notes can link to Jobs
-- dash_notes.job_number → biz_jobs.job_number (TEXT foreign key)

-- Users can link to Business Contacts
-- profiles.contact_id → biz_contacts.id (BIGINT foreign key)

-- Tags (Areas) can aggregate Jobs
-- Area views query biz_jobs WHERE user is assigned
```

**Implementation Note:** Since `job_number` is TEXT, use application-level validation. Consider adding a foreign key constraint if possible:

```sql
-- Option: Add FK constraint if all jobs have job_number
ALTER TABLE dash_tasks
    ADD CONSTRAINT fk_tasks_job
    FOREIGN KEY (job_number) REFERENCES biz_jobs(job_number) ON DELETE SET NULL;

ALTER TABLE dash_notes
    ADD CONSTRAINT fk_notes_job
    FOREIGN KEY (job_number) REFERENCES biz_jobs(job_number) ON DELETE SET NULL;
```

---

## Row Level Security (RLS)

### RLS Strategy

**Multi-tenant Isolation:**
- All dashboard tables filtered by `user_id = auth.uid()`
- Business tables filtered by assigned users or team access
- Admins can bypass certain RLS policies

### Common RLS Patterns

**User owns resource:**
```sql
CREATE POLICY "policy_name"
    ON table_name
    USING (auth.uid() = user_id);
```

**Resource through parent:**
```sql
CREATE POLICY "policy_name"
    ON table_name
    USING (
        EXISTS (
            SELECT 1 FROM parent_table
            WHERE parent_table.id = table_name.parent_id
            AND parent_table.user_id = auth.uid()
        )
    );
```

**Admin override:**
```sql
CREATE POLICY "policy_name"
    ON table_name
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

**Public read, owner write:**
```sql
CREATE POLICY "public_read"
    ON table_name FOR SELECT
    USING (TRUE);

CREATE POLICY "owner_write"
    ON table_name FOR ALL
    USING (auth.uid() = user_id);
```

### Business Data RLS

For business tables, determine access model:

**Option 1: All employees see all jobs**
```sql
ALTER TABLE biz_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_view_all_jobs"
    ON biz_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_active = TRUE
        )
    );
```

**Option 2: Job-based assignment**
```sql
-- Create job_assignments table
CREATE TABLE biz_job_assignments (
    job_id BIGINT NOT NULL REFERENCES biz_jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT,
    PRIMARY KEY (job_id, user_id)
);

-- RLS on jobs
CREATE POLICY "users_view_assigned_jobs"
    ON biz_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM biz_job_assignments
            WHERE job_id = biz_jobs.id
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

---

## Indexes & Performance

### Index Strategy

**Primary indexes (already shown in schemas):**
- Foreign keys
- User isolation (`user_id`)
- Status fields with filters
- Timestamp fields for sorting
- Unique constraints

**Additional performance indexes:**

```sql
-- Composite indexes for common queries
CREATE INDEX idx_tasks_user_status_due
    ON dash_tasks(user_id, status, due_date NULLS LAST);

CREATE INDEX idx_tasks_user_project_status
    ON dash_tasks(user_id, project_id, status) WHERE project_id IS NOT NULL;

CREATE INDEX idx_notes_user_tags
    ON dash_notes(user_id, updated_at DESC)
    WHERE archived = FALSE;

CREATE INDEX idx_jobs_status_updated
    ON biz_jobs(status, updated_at DESC);

-- Full-text search indexes
CREATE INDEX idx_tasks_search
    ON dash_tasks USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_projects_search
    ON dash_projects USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- JSONB indexes
CREATE INDEX idx_tasks_recur_days
    ON dash_tasks USING GIN (recur_days) WHERE recur_days IS NOT NULL;

CREATE INDEX idx_project_expenses_category
    ON dash_project_expenses USING GIN ((category));
```

### Performance Considerations

**Partitioning:**
- Consider partitioning `dash_activity_logs` by month
- Partition `dash_messages` by conversation_id or date range

**Materialized Views:**
- Dashboard widget queries
- Area aggregation views
- Project financial summaries

Example:
```sql
CREATE MATERIALIZED VIEW mv_project_financials AS
SELECT
    p.id AS project_id,
    p.name,
    p.user_id,
    COALESCE(SUM(e.amount), 0) AS total_expenses,
    COALESCE(SUM(i.amount), 0) AS total_income,
    COALESCE(SUM(i.amount), 0) - COALESCE(SUM(e.amount), 0) AS net
FROM dash_projects p
LEFT JOIN dash_project_expenses e ON e.project_id = p.id
LEFT JOIN dash_project_income i ON i.project_id = p.id
GROUP BY p.id, p.name, p.user_id;

CREATE UNIQUE INDEX ON mv_project_financials(project_id);
CREATE INDEX ON mv_project_financials(user_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_financials;
```

---

## Migration Scripts

### Migration Order

1. **Setup Supabase Project**
2. **Create Extensions**
3. **Create ENUMs**
4. **Create Tables (in dependency order)**
5. **Create Indexes**
6. **Enable RLS**
7. **Create Policies**
8. **Migrate Data**
9. **Create Functions & Triggers**

### Step 1: Extensions

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy search
```

### Step 2: Create ENUMs

```sql
-- Task enums
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE smart_list AS ENUM ('inbox', 'next', 'delegated', 'someday');
CREATE TYPE recur_unit AS ENUM ('days', 'weeks', 'months', 'years');

-- Project enums
CREATE TYPE project_status AS ENUM ('planned', 'doing', 'ongoing', 'on_hold', 'done');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high');

-- Note enums
CREATE TYPE note_type AS ENUM ('note', 'web_clip', 'meeting', 'journal');
CREATE TYPE media_type AS ENUM ('image', 'audio', 'video', 'document');

-- Tag enums
CREATE TYPE tag_type AS ENUM ('area', 'resource', 'entity');

-- Goal enums
CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'abandoned');

-- Business enums
CREATE TYPE job_status AS ENUM ('lead', 'estimate', 'pending_auth', 'active', 'on_hold', 'complete', 'invoiced', 'paid', 'cancelled');
CREATE TYPE org_type AS ENUM ('insurance_carrier', 'tpa', 'vendor', 'internal');
CREATE TYPE estimate_type AS ENUM ('initial', 'revised', 'supplement', 'final');
CREATE TYPE estimate_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'pending_review');
CREATE TYPE payment_type AS ENUM ('initial', 'progress', 'final', 'supplement');
CREATE TYPE payment_method AS ENUM ('check', 'ach', 'wire', 'credit_card', 'cash');
CREATE TYPE job_note_type AS ENUM ('general', 'inspection', 'communication', 'damage', 'work');
CREATE TYPE job_media_type AS ENUM ('photo', 'document', 'report', 'invoice');
CREATE TYPE work_order_status AS ENUM ('draft', 'sent', 'accepted', 'in_progress', 'completed', 'invoiced', 'paid');
```

### Step 3: Create Tables

Execute table creation SQL from sections above in this order:

1. `profiles`
2. Dashboard AI tables (conversations, messages, agents, etc.)
3. Dashboard core (tags, people)
4. Dashboard projects
5. Dashboard tasks
6. Dashboard notes
7. Dashboard goals
8. Business tables (jobs, clients, orgs, contacts, etc.)
9. Junction tables (task_tags, note_tags, etc.)

### Step 4: Create Updated_At Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON dash_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ... repeat for all tables with updated_at
```

### Step 5: Data Migration

```python
# Python script to migrate from SQLite to Supabase

import sqlite3
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import os

load_dotenv()

# Connections
sqlite_conn = sqlite3.connect('apex_assistant.db')
sqlite_conn.row_factory = sqlite3.Row

pg_conn = psycopg2.connect(os.getenv('SUPABASE_CONNECTION_STRING'))
pg_cursor = pg_conn.cursor()

def migrate_table(sqlite_table, pg_table, columns, transform=None):
    """
    Migrate data from SQLite table to PostgreSQL table.

    Args:
        sqlite_table: Source SQLite table name
        pg_table: Destination PostgreSQL table name
        columns: List of columns to migrate
        transform: Optional function to transform each row
    """
    # Fetch from SQLite
    sqlite_cursor = sqlite_conn.cursor()
    sqlite_cursor.execute(f"SELECT {', '.join(columns)} FROM {sqlite_table}")
    rows = sqlite_cursor.fetchall()

    if not rows:
        print(f"No data in {sqlite_table}")
        return

    # Transform if needed
    if transform:
        rows = [transform(dict(row)) for row in rows]
    else:
        rows = [tuple(row) for row in rows]

    # Insert into PostgreSQL
    placeholders = ', '.join(['%s'] * len(columns))
    query = f"INSERT INTO {pg_table} ({', '.join(columns)}) VALUES ({placeholders})"

    execute_values(pg_cursor, query, rows)
    pg_conn.commit()

    print(f"Migrated {len(rows)} rows from {sqlite_table} to {pg_table}")

# Example migrations
def transform_user(row):
    """Transform SQLite user to PostgreSQL profile"""
    # Note: auth.users should be created separately via Supabase Auth
    # This just migrates profile data
    return {
        'id': row['id'],  # UUID from Supabase Auth
        'display_name': row['display_name'],
        'role': row['role'],
        'is_active': row['is_active'] == 1,
        'contact_id': row.get('contact_id'),
        'preferences': row.get('preferences', '{}'),
        'created_at': row['created_at'],
        'last_login_at': row.get('last_login')
    }

# Migrate conversations
migrate_table(
    'conversations',
    'dash_conversations',
    ['id', 'user_id', 'title', 'summary', 'session_id', 'is_active', 'created_at'],
    transform=lambda r: (
        r['id'],
        r.get('user_id'),  # Map to Supabase auth.users.id
        r.get('title'),
        r.get('summary'),
        r.get('session_id'),
        r['is_active'] == 1,
        r['timestamp']
    )
)

# Continue for all tables...
# migrate_table('messages', 'dash_messages', ...)
# migrate_table('tasks', 'dash_ai_tasks', ...)
# etc.

sqlite_conn.close()
pg_conn.close()
```

### Step 6: Validation

```sql
-- Check row counts
SELECT
    'profiles' AS table_name, COUNT(*) FROM profiles
UNION ALL SELECT 'dash_conversations', COUNT(*) FROM dash_conversations
UNION ALL SELECT 'dash_messages', COUNT(*) FROM dash_messages
UNION ALL SELECT 'dash_tasks', COUNT(*) FROM dash_tasks
UNION ALL SELECT 'dash_projects', COUNT(*) FROM dash_projects
UNION ALL SELECT 'dash_notes', COUNT(*) FROM dash_notes
UNION ALL SELECT 'biz_jobs', COUNT(*) FROM biz_jobs;

-- Verify foreign keys
SELECT
    COUNT(*) AS orphaned_messages
FROM dash_messages
WHERE conversation_id NOT IN (SELECT id FROM dash_conversations);

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'dash_%';
```

---

## Migration Strategy & Phased Approach

### Strategic Decision: Migrate Database First

**Recommendation: Complete database migration BEFORE building new features**

This approach is recommended because:

1. **Most features haven't been built yet** - According to FEATURES.md:
   - Tasks App: "Not Started"
   - Projects App: "Not Started"
   - Notes App: "Not Started"
   - Calendar: "Not Started"

2. **Supabase enables better features:**
   - RLS → True multi-user without custom code
   - Real-time → Live collaboration in Tasks/Notes
   - Full-text search → Better note search with PostgreSQL
   - Auth → OAuth with Google for Calendar integration
   - JSONB → Flexible, queryable structured data

3. **Avoid rework:**
   - Building Tasks on SQLite, then rebuilding on Supabase = wasted time
   - Better to spend 2-3 weeks migrating, then build features right the first time
   - No legacy SQLite code mixed with new Supabase code

4. **The migration is manageable:**
   - Existing data is limited (mostly AI conversations and Jobs)
   - No production users depending on features that don't exist yet
   - Comprehensive documentation already exists (this document)

### Three-Phase Migration Plan

Break the migration into phases to reduce risk and show incremental progress:

---

#### **Phase 1: Foundation & AI Assistant (Week 1-2)**

**Goal:** Migrate core infrastructure and existing AI features

**Tasks:**
1. **Supabase Setup**
   - [ ] Create Supabase project
   - [ ] Configure environment variables (`.env`)
   - [ ] Set up Supabase CLI for local development
   - [ ] Install `supabase-py` package

2. **Schema Creation**
   - [ ] Create all ENUMs (task_status, project_status, etc.)
   - [ ] Create extensions (uuid-ossp, pgcrypto, pg_trgm)
   - [ ] Create authentication tables (profiles)
   - [ ] Create AI Assistant tables:
     - `dash_conversations`
     - `dash_messages`
     - `dash_ai_tasks`
     - `dash_agents`
     - `dash_automation_candidates`
     - `dash_files_processed`
     - `dash_mcp_connections`
     - `dash_activity_logs`
     - `dash_chat_projects`

3. **User Migration**
   - [ ] Create users in Supabase Auth
   - [ ] Migrate user data to `profiles` table
   - [ ] Update auth routes to use Supabase Auth
   - [ ] Test login/logout flows

4. **AI Data Migration**
   - [ ] Write migration script for conversations
   - [ ] Migrate messages with proper conversation linking
   - [ ] Migrate AI task history
   - [ ] Migrate MCP connections
   - [ ] Validate data integrity

5. **Backend Updates**
   - [ ] Create `api/services/supabase.py` client
   - [ ] Update `ChatService` to use Supabase
   - [ ] Update conversation routes (`api/routes/conversations.py`)
   - [ ] Update chat routes (`api/routes/chat.py`)
   - [ ] Update agents routes (`api/routes/agents.py`)
   - [ ] Update analytics routes (`api/routes/analytics.py`)

6. **RLS Implementation**
   - [ ] Enable RLS on all tables
   - [ ] Create user isolation policies
   - [ ] Create admin override policies
   - [ ] Test permissions with multiple users

7. **Testing**
   - [ ] Test existing chat functionality
   - [ ] Test conversation history loading
   - [ ] Test multi-user isolation
   - [ ] Verify no data loss
   - [ ] Performance comparison (SQLite vs Supabase)

**Success Criteria:**
- ✅ All existing AI features work identically
- ✅ Users can log in via Supabase Auth
- ✅ Conversations are isolated per user
- ✅ No regressions in chat functionality
- ✅ SQLite can be safely removed

**Estimated Time:** 1-2 weeks

---

#### **Phase 2: Business Operations (Week 2-3)**

**Goal:** Migrate all Jobs-related data and maintain existing Jobs features

**Tasks:**
1. **Schema Creation**
   - [ ] Create business tables:
     - `biz_jobs`
     - `biz_clients`
     - `biz_organizations`
     - `biz_contacts`
     - `biz_project_contacts`
     - `biz_estimates`
     - `biz_payments`
     - `biz_notes`
     - `biz_media`
     - `biz_receipts`
     - `biz_work_orders`
     - `biz_labor_entries`
     - `biz_activity_log`

2. **Data Migration**
   - [ ] Migrate organizations
   - [ ] Migrate clients
   - [ ] Migrate contacts
   - [ ] Migrate jobs (projects)
   - [ ] Migrate estimates and payments
   - [ ] Migrate job notes and media
   - [ ] Verify all foreign key relationships

3. **Backend Updates**
   - [ ] Update `database/operations_apex.py` to use Supabase
   - [ ] Update `api/routes/projects.py` (Jobs routes)
   - [ ] Update `api/routes/contacts.py`
   - [ ] Update file upload handling for media
   - [ ] Test all CRUD operations

4. **RLS for Business Data**
   - [ ] Determine access model (all employees vs job-based)
   - [ ] Implement chosen RLS strategy
   - [ ] Test employee access patterns
   - [ ] Test admin overrides

5. **Frontend Testing**
   - [ ] Test Jobs list page
   - [ ] Test Job detail page (all tabs)
   - [ ] Test creating new jobs
   - [ ] Test estimates and payments
   - [ ] Test media uploads

**Success Criteria:**
- ✅ All Jobs features work identically
- ✅ Job data is accessible and correct
- ✅ Multi-user access controls work
- ✅ No regressions in Jobs UI
- ✅ `apex_operations.db` can be safely removed

**Estimated Time:** 1 week

---

#### **Phase 3: New Features on Supabase (Week 3+)**

**Goal:** Build all new features on the migrated Supabase database

**Now you can build:**

1. **Tags & Areas** (PARA Foundation)
   - Create `dash_tags` table
   - Build Tags management UI
   - Implement Area aggregation views

2. **Tasks App** (GTD + Kanban)
   - Create `dash_tasks` table
   - Create junction tables (task_tags, task_people)
   - Build Tasks UI with filters
   - Implement My Day feature
   - Add recurring tasks support
   - Build Kanban board view

3. **Projects App** (Personal Project Management)
   - Create `dash_projects` tables
   - Create `dash_project_milestones`
   - Create financial tables (expenses, income, budgets)
   - Build Project creation wizard
   - Build Project detail hub
   - Implement Kanban for project tasks

4. **Notes App** (PKM)
   - Create `dash_notes` table
   - Create `dash_note_media` for attachments
   - Create `dash_note_links` for bidirectional linking
   - Build markdown editor
   - Implement media upload
   - Add full-text search

5. **Calendar App**
   - Create `dash_user_integrations` table
   - Implement Google OAuth flow
   - Build calendar UI (month/week/day views)
   - Integrate Google Calendar API
   - Add event CRUD

6. **Goals & People**
   - Create `dash_goals` and `dash_milestones`
   - Create `dash_people` table
   - Build Goals tracking UI
   - Build People management UI

7. **Dashboard Widgets**
   - Connect widgets to real data
   - Implement My Day widget
   - Add Task Inbox widget
   - Add Calendar widget
   - Add Active Projects/Jobs widgets

**Success Criteria:**
- ✅ All new features built on Supabase from day one
- ✅ No technical debt from SQLite
- ✅ Full-text search works
- ✅ Real-time updates work (optional)
- ✅ Multi-user collaboration ready

**Estimated Time:** 4-6 weeks (depending on features prioritized)

---

### Risk Mitigation Strategies

#### 1. **Dual-Database Period (Phase 1 Only)**

During Phase 1, keep both databases running:

```python
# api/services/database_router.py
import os

USE_SUPABASE = os.getenv('USE_SUPABASE', 'false').lower() == 'true'

def get_db_client():
    if USE_SUPABASE:
        from api.services.supabase import get_client
        return get_client()
    else:
        from database.schema import get_connection
        return get_connection()
```

**Benefits:**
- Can test Supabase without breaking existing features
- Easy rollback if issues arise
- Gradual transition reduces risk

**Environment Variable:**
```env
# .env
USE_SUPABASE=false  # Start with false, flip to true when ready
```

#### 2. **Feature Flags for Routes**

Use feature flags to control which routes use Supabase:

```python
# api/routes/conversations.py
from api.services.database_router import USE_SUPABASE

@router.get("/conversations")
async def get_conversations():
    if USE_SUPABASE:
        # Use Supabase client
        from api.services.supabase import get_client
        client = get_client()
        # ... Supabase query
    else:
        # Use SQLite
        from database.operations import get_conversations
        # ... SQLite query
```

#### 3. **Automated Testing**

Create comparison tests to ensure Supabase matches SQLite behavior:

```python
# tests/test_migration.py
import pytest
from api.services.supabase import get_client as get_supabase
from database.operations import get_conversations as get_sqlite_conversations

def test_conversations_match():
    """Ensure Supabase returns same data as SQLite"""
    sqlite_data = get_sqlite_conversations(user_id=1)
    supabase_data = get_supabase().table('dash_conversations').select('*').eq('user_id', 1).execute()

    assert len(sqlite_data) == len(supabase_data.data)
    # ... more assertions
```

#### 4. **Data Validation Queries**

Run after each phase:

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM dash_messages
WHERE conversation_id NOT IN (SELECT id FROM dash_conversations);

-- Check for missing foreign keys
SELECT COUNT(*) FROM dash_tasks
WHERE project_id IS NOT NULL
AND project_id NOT IN (SELECT id FROM dash_projects);

-- Compare row counts
SELECT 'conversations' AS table, COUNT(*) FROM dash_conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM dash_messages
UNION ALL
SELECT 'tasks', COUNT(*) FROM dash_tasks;
```

#### 5. **Incremental Rollout**

**Week 1:** Supabase running locally only (dev environment)
**Week 2:** Supabase tested with production data copy (staging)
**Week 3:** Supabase live for admin users only (canary)
**Week 4:** Full rollout to all users

#### 6. **Rollback Plan**

If critical issues arise:

1. Set `USE_SUPABASE=false` in environment
2. Restart API server (falls back to SQLite)
3. Debug Supabase issues offline
4. Fix and redeploy when ready

**Note:** Only viable during Phase 1 (dual-database period)

---

### Success Metrics

Track these metrics to validate migration success:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Data Integrity** | 100% match | Row count comparisons, data validation queries |
| **Query Performance** | ≤ SQLite speed | Time common queries (conversation load, job list) |
| **Zero Downtime** | 100% uptime | Monitor API availability during migration |
| **User Impact** | 0 regressions | QA testing of all existing features |
| **RLS Effectiveness** | 100% isolation | Test multi-user data access |

---

### Timeline Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION TIMELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 1-2:  Phase 1 - Foundation & AI Assistant                │
│             ├─ Supabase setup                                   │
│             ├─ Auth migration                                   │
│             ├─ AI data migration                                │
│             └─ Existing features work on Supabase               │
│                                                                  │
│  Week 2-3:  Phase 2 - Business Operations                      │
│             ├─ Jobs data migration                              │
│             ├─ Business tables created                          │
│             └─ Jobs features verified                           │
│                                                                  │
│  Week 3+:   Phase 3 - Build New Features                       │
│             ├─ Tasks App                                        │
│             ├─ Projects App                                     │
│             ├─ Notes App                                        │
│             ├─ Calendar App                                     │
│             └─ Dashboard Widgets                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Total Migration Time: 2-3 weeks
New Features: 4-6 weeks (after migration complete)
```

---

### Why This Approach Works

1. **Incremental Risk Reduction**
   - Small, testable phases
   - Can validate at each step
   - Easy to identify and fix issues

2. **Clear Milestones**
   - Each phase has concrete deliverables
   - Success criteria are measurable
   - Team can track progress

3. **Business Continuity**
   - Existing features continue working
   - Users see no disruption
   - Can pause/resume safely

4. **Technical Benefits**
   - Build new features on modern stack
   - Leverage Supabase advantages from day one
   - No legacy code debt

5. **Future-Proof**
   - Multi-user ready
   - Scalable from the start
   - Real-time capabilities available

---

## Summary

This comprehensive database design provides:

✅ **Complete Schema**: All tables from FEATURES.md specification
✅ **PostgreSQL Optimized**: Proper types, indexes, constraints
✅ **Multi-tenant RLS**: User isolation and security
✅ **Cross-linking**: Dashboard ↔ Business integration
✅ **Performance**: Strategic indexes and materialized views
✅ **Migration Path**: Clear steps from SQLite to Supabase
✅ **Future-proof**: Extensible for new features

**Next Steps:**
1. Review and approve schema design
2. Create Supabase project
3. Run migration scripts
4. Update backend code to use Supabase client
5. Implement RLS policies
6. Test data access and permissions
7. Update frontend to use Supabase client

---

*Document Version: 1.0*
*Last Updated: December 2024*
*For: Apex Assistant - Supabase Migration*
