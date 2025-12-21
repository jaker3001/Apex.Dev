# Apex Assistant - Feature Specification

> The comprehensive reference for all features in Apex Assistant. This is the source of truth for system design, data architecture, and feature implementation.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [System Architecture](#system-architecture)
3. [Dashboard Data Model](#dashboard-data-model)
4. [Core Apps](#core-apps)
5. [Dashboard Hub](#dashboard-hub)
6. [Tasks App](#tasks-app)
7. [Projects App](#projects-app)
8. [Notes App](#notes-app)
9. [Calendar App](#calendar-app)
10. [Areas & Tags](#areas--tags)
11. [Quick Capture](#quick-capture)
12. [Jobs Reference Hub](#jobs-reference-hub)
13. [AI Assistant](#ai-assistant)
14. [Implementation Status](#implementation-status)

---

## Design Philosophy

### ADHD-Friendly by Design

This app is built for users who need **zero friction** to stay productive. When something is harder than it needs to be, it won't get done.

| Principle | Implementation |
|-----------|----------------|
| **Immediate Capture** | One tap to capture anything - process later |
| **Information Accessible** | Everything findable within 2 clicks |
| **Context Aggregation** | Areas show all related items in one place |
| **Reduce Decisions** | Smart defaults, fewer choices in the moment |
| **Visual Clarity** | Clean UI, clear hierarchy, no clutter |

### Core Design Principles

1. **Frictionless** - Minimize clicks/steps, especially for capture
2. **Smooth & Modern** - SPA feel, animations, no page reloads
3. **Customizable** - Users arrange their dashboard to fit their workflow
4. **Relational** - Data connects across tables, viewable from multiple angles
5. **Consumer-Grade Polish** - Feels like a well-designed consumer app

### GTD (Getting Things Done) Integration

The system supports GTD methodology:
- **Capture** - Quick capture to inbox, zero friction
- **Clarify** - Process inbox items, decide next action
- **Organize** - Assign to projects, areas, add due dates
- **Reflect** - Weekly review, My Day planning
- **Engage** - Execute from focused task views

### PARA Method Organization

Content is organized using the PARA method:

| Category | Definition | Examples |
|----------|------------|----------|
| **Projects** | Outcomes with deadlines | "Launch website", "Q1 taxes" |
| **Areas** | Ongoing responsibilities | "Health", "Family", "Apex Restoration" |
| **Resources** | Topics of interest | "Programming", "IICRC Standards" |
| **Archive** | Inactive items | Completed projects, old notes |

### Two Workspaces Philosophy

| Workspace | Purpose | Mindset |
|-----------|---------|---------|
| **Dashboard** | Action hub - where productivity happens | "Do things" |
| **Jobs** | Reference hub - where business information lives | "Look things up" |

This separation prevents the trap of one screen trying to do everything.

---

## System Architecture

### Dual Database Design

The app uses two separate databases for clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     APEX ASSISTANT                          │
├─────────────────────────┬───────────────────────────────────┤
│   apex_assistant.db     │       apex_operations.db          │
│   (Dashboard/Personal)  │       (Business/Jobs)             │
├─────────────────────────┼───────────────────────────────────┤
│ • Users & Auth          │ • Projects (Jobs)                 │
│ • Tasks                 │ • Clients                         │
│ • Personal Projects     │ • Organizations                   │
│ • Project Financials    │ • Contacts                        │
│ • Project Milestones    │ • Estimates                       │
│ • Tags (Areas/Resources)│ • Payments                        │
│ • Notes (PKM)           │ • Job Notes                       │
│ • Goals                 │ • Media                           │
│ • User Integrations     │ • Receipts                        │
│ • Work Sessions         │ • Work Orders                     │
│ • People (Personal)     │ • Labor Entries                   │
│ • Notifications         │ • Activity Log                    │
│ • Conversations (AI)    │                                   │
└─────────────────────────┴───────────────────────────────────┘
```

### Why Two Databases?

1. **Clean Separation** - Personal productivity vs. business operations
2. **Different Lifecycles** - Personal data follows you; business data follows the company
3. **Scalability** - Business data can grow independently
4. **Backup Strategy** - Different retention/backup needs

### The Bridge: Areas

Areas connect the two worlds. The "Apex Restoration" Area can show:
- Active Jobs (from apex_operations.db)
- Personal tasks tagged with work
- Business notes and resources
- Work-related goals

---

## Dashboard Data Model

### Core Tables

These tables power the personal productivity features. They live in `apex_assistant.db`.

#### tasks

The central task management table with rich properties for GTD, Kanban, recurring tasks, and time tracking.

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,

    -- Status (supports Kanban boards)
    status TEXT DEFAULT 'backlog' CHECK(status IN (
        'backlog',      -- Ideas, not yet prioritized
        'todo',         -- Ready to work on
        'in_progress',  -- Currently being worked on
        'review',       -- Waiting/needs review
        'done',         -- Completed
        'cancelled'     -- Won't do
    )),

    -- Priority
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')),

    -- Dates
    due_date DATE,
    due_time TIME,
    completed_at DATETIME,
    snooze_until DATE,

    -- GTD Smart Lists
    smart_list TEXT CHECK(smart_list IN ('inbox', 'next', 'delegated', 'someday')),

    -- My Day
    is_my_day BOOLEAN DEFAULT 0,
    my_day_date DATE,

    -- Recurrence
    recur_interval INTEGER,
    recur_unit TEXT CHECK(recur_unit IN ('days', 'weeks', 'months', 'years')),
    recur_days TEXT,  -- JSON array for specific days ["Monday", "Wednesday"]

    -- Relations
    project_id INTEGER,          -- FK to projects
    parent_task_id INTEGER,      -- FK to tasks (for sub-tasks)
    job_id INTEGER,              -- FK to jobs in apex_operations.db

    -- Metadata
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

-- Junction table for task-tag relations
CREATE TABLE task_tags (
    task_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Junction table for task-people relations
CREATE TABLE task_people (
    task_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    role TEXT,  -- 'assignee', 'delegated_to', 'collaborator'
    PRIMARY KEY (task_id, person_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);
```

#### projects

Personal projects with deadlines, financial tracking, and full project management (distinct from Jobs which are business projects in apex_operations.db).

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,                    -- Emoji or icon name
    color TEXT,                   -- Hex color for visual distinction

    -- Vision & Planning (captured in creation wizard)
    vision TEXT,                  -- What does success look like?
    desired_outcome TEXT,         -- Specific end goal

    -- Status (matches reference system + Ongoing pattern)
    status TEXT DEFAULT 'planned' CHECK(status IN (
        'planned',    -- Not yet started
        'doing',      -- Active with defined end goal
        'ongoing',    -- Maintenance, never "completes" (recurring tasks home)
        'on_hold',    -- Paused
        'done'        -- Completed
    )),

    -- Priority
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),

    -- Dates
    start_date DATE,              -- When work began
    target_date DATE,             -- Deadline/goal date
    completed_at DATETIME,        -- When marked done

    -- Relations
    area_id INTEGER,              -- Primary Area (tag with type='area')
    goal_id INTEGER,              -- Parent Goal if any

    -- Display
    cover_image TEXT,             -- Optional cover image path
    sort_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT 0,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (area_id) REFERENCES tags(id),
    FOREIGN KEY (goal_id) REFERENCES goals(id)
);

-- People related to projects (like job contacts)
CREATE TABLE project_people (
    project_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    role TEXT,  -- 'owner', 'collaborator', 'stakeholder', 'mentor', etc.
    PRIMARY KEY (project_id, person_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

-- Project milestones (key checkpoints)
CREATE TABLE project_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at DATETIME,
    sort_order INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Project activity log (like job activity)
CREATE TABLE project_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    action TEXT NOT NULL,         -- 'created', 'status_changed', 'task_completed', etc.
    description TEXT,             -- Human-readable description
    old_value TEXT,               -- For changes, the previous value
    new_value TEXT,               -- For changes, the new value

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Project Financials

Full financial tracking for personal projects - designed for bookkeeper/CPA compatibility.

```sql
-- Project expenses (money going out)
CREATE TABLE project_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,           -- 'materials', 'services', 'software', 'travel', etc.

    -- Vendor/Payee
    vendor TEXT,                      -- Who was paid

    -- Date & Payment
    transaction_date DATE NOT NULL,
    payment_method TEXT,              -- 'cash', 'credit_card', 'debit', 'check', 'transfer'
    reference_number TEXT,            -- Check number, transaction ID, etc.

    -- Documentation
    receipt_path TEXT,                -- Path to uploaded receipt image

    -- Tax & Accounting
    is_tax_deductible BOOLEAN DEFAULT 0,
    tax_category TEXT,                -- 'business_expense', 'home_office', 'education', etc.

    -- Metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Project income (money coming in)
CREATE TABLE project_income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,                    -- 'sales', 'services', 'royalties', 'refund', etc.

    -- Source
    source TEXT,                      -- Who paid

    -- Date & Payment
    transaction_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,

    -- Documentation
    invoice_number TEXT,              -- If invoiced
    document_path TEXT,               -- Path to invoice/documentation

    -- Tax & Accounting
    is_taxable BOOLEAN DEFAULT 1,
    tax_category TEXT,                -- 'self_employment', 'passive', 'capital_gains', etc.

    -- Metadata
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Project budget (optional budget planning)
CREATE TABLE project_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,

    category TEXT NOT NULL,           -- Budget category (matches expense categories)
    budgeted_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, category)      -- One budget per category per project
);

-- Expense categories (user-customizable)
CREATE TABLE expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_tax_deductible_default BOOLEAN DEFAULT 0,
    tax_category_default TEXT,
    sort_order INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, name)
);
```

#### tags

PARA organization: Areas, Resources, and Entities. This is the key to context aggregation.

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,

    -- Type (PARA)
    type TEXT NOT NULL CHECK(type IN ('area', 'resource', 'entity')),

    -- Hierarchy
    parent_tag_id INTEGER,  -- For sub-tags (e.g., Resource under an Area)

    -- Display
    is_favorite BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id)
);
```

**Tag Types Explained:**

| Type | Purpose | Example | Contains |
|------|---------|---------|----------|
| **Area** | Ongoing life responsibility | "Health", "Family", "Apex Restoration" | Projects, Tasks, Notes, People, Goals, Sub-Tags |
| **Resource** | Topic for future reference | "Programming", "Recipes" | Notes |
| **Entity** | Meta-category by type | "Apps", "Books", "Essays" | Notes |

#### notes

PKM (Personal Knowledge Management) notes with bidirectional linking.

```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
    title TEXT NOT NULL,
    content TEXT,  -- Markdown content

    -- Type
    type TEXT DEFAULT 'note' CHECK(type IN ('note', 'web_clip', 'meeting', 'journal')),
    source_url TEXT,  -- For web clips

    -- Media is embedded inline in content via markdown syntax
    -- e.g., ![Photo](uploads/notes/123/photo.jpg)
    -- Actual files tracked in note_media table below

    -- Display
    is_favorite BOOLEAN DEFAULT 0,

    -- Relations
    project_id INTEGER,
    job_id INTEGER,  -- Link to Jobs in apex_operations.db

    -- Metadata
    word_count INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Junction table for note-tag relations
CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Bidirectional links between notes
CREATE TABLE note_links (
    source_note_id INTEGER NOT NULL,
    target_note_id INTEGER NOT NULL,
    PRIMARY KEY (source_note_id, target_note_id),
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Media files attached to notes (photos, voice, video, documents)
CREATE TABLE note_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,

    -- File info
    file_path TEXT NOT NULL,          -- Path relative to uploads folder
    file_name TEXT NOT NULL,          -- Original filename
    file_size INTEGER,                -- Size in bytes
    mime_type TEXT,                   -- e.g., 'image/jpeg', 'audio/m4a', 'video/mp4'
    media_type TEXT NOT NULL CHECK(media_type IN ('image', 'audio', 'video', 'document')),

    -- Optional metadata
    duration_seconds INTEGER,         -- For audio/video
    width INTEGER,                    -- For images/video
    height INTEGER,                   -- For images/video
    transcription TEXT,               -- For voice recordings (optional)

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

#### goals

Goal tracking with milestones.

```sql
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'achieved', 'abandoned')),

    -- Dates
    target_date DATE,
    achieved_at DATETIME,

    -- Relations
    tag_id INTEGER,  -- Area this goal belongs to

    -- Metadata
    archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    target_date DATE,
    completed_at DATETIME,
    sort_order INTEGER DEFAULT 0,

    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);
```

#### people

Personal contacts (separate from job contacts in apex_operations.db).

```sql
CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Basic Info
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
    is_favorite BOOLEAN DEFAULT 0,

    -- Metadata
    archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Junction table for people-tag relations
CREATE TABLE people_tags (
    person_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (person_id, tag_id),
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### work_sessions

Time tracking for tasks.

```sql
CREATE TABLE work_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,

    start_time DATETIME NOT NULL,
    end_time DATETIME,

    notes TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### user_integrations

OAuth integrations for external services (Google Calendar, future providers).

```sql
CREATE TABLE user_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Integration type
    provider TEXT NOT NULL,           -- 'google_calendar', future: 'outlook', 'slack', etc.

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,

    -- Provider-specific settings
    settings JSON,                    -- e.g., {"visible_calendars": ["primary", "work"], "default_view": "week"}

    -- Status
    is_connected BOOLEAN DEFAULT 1,
    last_sync_at DATETIME,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, provider)         -- One connection per provider per user
);
```

**Note:** Calendar events are NOT stored locally. The Calendar App uses Google Calendar API as the source of truth. This table only stores OAuth credentials and user preferences.

#### Inbox (Computed Views)

The Inbox is **not a separate table** - it's a computed view within Tasks and Notes. This follows the GTD principle: items enter the inbox and leave once they're processed (organized).

**Task Inbox:** Tasks that haven't been organized yet.
```sql
-- A task is in the inbox when:
--   - It has no project_id AND
--   - It has no due_date AND
--   - smart_list = 'inbox' OR smart_list IS NULL
-- Once you assign a project, due date, or move to another smart list, it leaves the inbox.
```

**Note Inbox:** Notes that haven't been organized yet.
```sql
-- A note is in the inbox when:
--   - It has no tags (via note_tags) AND
--   - It has no project_id AND
--   - type = 'note' (not 'meeting' or 'journal' which have implicit organization)
-- Once you assign a tag or project, it leaves the inbox.
```

This approach is simpler and more elegant:
- No conversion step needed
- Items are already in the right database from creation
- "Inbox" is just a filtered view, not a separate table
- Processing = adding the right relations (Project, Tag, due date)

### Relation Diagram

```
                              ┌─────────────┐
                              │    tags     │
                              │ (Areas/Res) │
                              └──────┬──────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
    │   tasks     │◄─────────►│  projects   │           │   notes     │
    └──────┬──────┘           └──────┬──────┘           └──────┬──────┘
           │                         │                         │
           │                         ▼                         │
           │                  ┌─────────────┐                  │
           │                  │    goals    │                  │
           │                  └─────────────┘                  │
           │                                                   │
           ▼                                                   │
    ┌─────────────┐                                           │
    │   people    │◄──────────────────────────────────────────┘
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │work_sessions│
    └─────────────┘

    ════════════════════════════════════════════════════════

    CROSS-DATABASE LINKS (via job_id field):

    tasks.job_id ────────► apex_operations.projects
    notes.job_id ────────► apex_operations.projects
```

### Key Relations Summary

| From | To | Relation Type | Purpose |
|------|----|---------------|---------|
| tasks | tags | Many-to-Many | Categorize tasks by Area/Resource |
| tasks | projects | Many-to-One | Tasks belong to projects |
| tasks | people | Many-to-Many | Assignees, delegations |
| tasks | tasks | Self-referential | Sub-tasks |
| projects | tags | Many-to-One | Project belongs to Area |
| projects | goals | Many-to-One | Project supports a goal |
| notes | tags | Many-to-Many | Categorize notes |
| notes | notes | Many-to-Many | Bidirectional linking |
| goals | tags | Many-to-One | Goal belongs to Area |
| people | tags | Many-to-Many | Associate people with Areas |

---

## Core Apps

The Dashboard is powered by four **Core Apps** that must be fully built. Quick Capture is an extension that provides fast entry points into these apps.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE APPS                                │
├─────────────────────────────────────────────────────────────────┤
│  TASKS APP         PROJECTS APP       NOTES APP      CALENDAR   │
│  • GTD lists       • Project hub      • Markdown     • Events   │
│  • My Day          • Kanban boards    • Media        • Schedule │
│  • Recurrence      • Financials       • Linking      • Sync     │
│  • Sub-tasks       • Milestones       • PKM          │          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUICK CAPTURE                               │
│              (Extension - built after Core Apps)                 │
├─────────────────────────────────────────────────────────────────┤
│   FAB provides fast entry into: Tasks, Notes (text/photo/voice) │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation (PARA Structure)

```
┌──────────────────────┐
│ ▼ AREAS              │  ← Expandable, shows Area-type tags
│   ○ Jake (Personal)  │
│   ○ Family           │
│   ○ Health           │
│   ○ Apex Restoration │  ← Shows related Jobs
│   ○ Finances         │
│                      │
│ ─────────────────    │
│                      │
│ ⊞ Dashboard          │
│ ⊡ Assistant          │
│ ☐ Tasks              │
│ 📁 Projects          │  ← NEW: Personal project management
│ 📅 Calendar          │
│ 📝 Notes             │
│                      │
│ ─────────────────    │
│                      │
│ ▼ RESOURCES          │  ← Expandable, shows Resource-type tags
│   ○ Programming      │
│   ○ IICRC Standards  │
│   ○ Recipes          │
│                      │
│ ─────────────────    │
│                      │
│ 💼 Jobs              │  ← Business reference hub (separate)
│ ⚙ Settings           │
└──────────────────────┘
```

### App Overview

| App | Icon | Purpose | Primary Data |
|-----|------|---------|--------------|
| **Dashboard** | `LayoutDashboard` | Daily hub, widgets, My Day | Aggregated views |
| **Assistant** | `Bot` | AI chat interface | conversations, messages |
| **Tasks** | `CheckSquare` | Task management, GTD, Kanban | tasks |
| **Projects** | `FolderKanban` | Personal project management | projects, milestones, financials |
| **Calendar** | `Calendar` | Scheduling | Google Calendar API |
| **Notes** | `FileText` | PKM, knowledge capture | notes, note_media |
| **Jobs** | `Briefcase` | Business reference (separate DB) | apex_operations.* |

---

## Dashboard Hub

The landing page. Swipeable views with dot indicators.

### View 1: My Hub (Default)

Widget-based layout showing today's focus.

| Widget | Data Source | Purpose |
|--------|-------------|---------|
| **My Day** | tasks (is_my_day=true) | Today's planned tasks |
| **Task Inbox** | tasks (inbox state) | Unprocessed tasks |
| **Note Inbox** | notes (inbox state) | Unprocessed notes |
| **Calendar** | Google Calendar API | Today's schedule |
| **Weather** | External API | Field work planning |
| **Active Projects** | projects (status='active') | Project overview |
| **Active Jobs** | apex_operations.projects | Business jobs |

### View 2: Social (Future)

Team communication and activity feed.

### View 3: News (Future)

Company announcements and training.

---

## Tasks App

### Task Properties

| Property | Type | Purpose |
|----------|------|---------|
| title | Text | Task name |
| description | Text | Details |
| status | Select | backlog, todo, in_progress, review, done, cancelled |
| priority | Select | low, medium, high |
| due_date | Date | When it's due |
| is_my_day | Boolean | Pulled into My Day |
| smart_list | Select | GTD list (inbox, next, delegated, someday) |
| project_id | Relation | Parent project |
| parent_task_id | Relation | Parent task (for sub-tasks) |
| tags | Relation (M2M) | Areas/Resources |
| people | Relation (M2M) | Assignees |
| job_id | Relation | Link to Job |
| recur_* | Various | Recurrence settings |

### Task Statuses (Kanban Support)

| Status | Kanban Column | Purpose |
|--------|---------------|---------|
| `backlog` | Backlog | Ideas, not yet prioritized |
| `todo` | To Do | Ready to work on |
| `in_progress` | Doing | Currently being worked on |
| `review` | Review | Waiting/needs review |
| `done` | Done | Completed |
| `cancelled` | (hidden) | Won't do |

### GTD Smart Lists

| List | Filter | Purpose |
|------|--------|---------|
| **Inbox** | smart_list='inbox' OR (smart_list IS NULL AND due_date IS NULL) | Unclarified items |
| **Next Actions** | smart_list='next' | Ready to do |
| **Calendar** | due_date IS NOT NULL | Date-specific |
| **Delegated** | smart_list='delegated' | Waiting on others |
| **Someday** | smart_list='someday' | Maybe later |
| **Snoozed** | snooze_until > today | Deferred |

### My Day

Pull tasks into today's focus regardless of due date:
- Check `is_my_day` to add to My Day
- `my_day_date` tracks which day it was added
- Auto-clears at end of day (or on next visit)

### Sub-Tasks

Tasks can have sub-tasks via `parent_task_id`:
- Sub-tasks inherit project from parent
- Sub-tasks shown indented under parent
- Completing parent can auto-complete sub-tasks

### Recurring Tasks

Complex recurrence support:
- Daily, weekly, monthly, yearly
- Specific days (M/W/F)
- Nth weekday of month (3rd Thursday)
- On completion, creates next instance

---

## Projects App

The Projects App provides full project management for personal projects - completely separate from Jobs (business projects in apex_operations.db). It mirrors the Jobs UI/UX while using Dashboard data tables.

### Projects vs Jobs

| Aspect | Projects (Personal) | Jobs (Business) |
|--------|---------------------|-----------------|
| **Database** | `apex_assistant.db` | `apex_operations.db` |
| **Purpose** | Personal outcomes & goals | Restoration work |
| **People** | `people` table | `contacts` + `clients` |
| **Financials** | `project_expenses`, `project_income` | `estimates`, `payments`, `receipts` |
| **Notes** | `notes` table (PKM) | `notes` table (job notes) |
| **Tasks** | `tasks` table | N/A (uses compliance tasks) |

### Project List View

Filter and browse projects similar to Jobs list:

```
┌─────────────────────────────────────────────────────────────────┐
│  PROJECTS                                      [+ New Project]  │
├─────────────────────────────────────────────────────────────────┤
│  [All] [Active] [Planned] [On Hold] [Completed]    🔍 Search    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🏠 Refinance House                              DOING      │ │
│  │ Finances • Target: Jan 2025 • 3 tasks remaining            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🏃 Run a 5K                                     DOING      │ │
│  │ Health • Target: Mar 2025 • 8 tasks remaining              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 🔧 Home Ongoing                                 ONGOING    │ │
│  │ Home • No end date • 2 recurring tasks                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Project Statuses

| Status | Purpose | Has End Date? |
|--------|---------|---------------|
| `planned` | Not yet started | Yes |
| `doing` | Active with defined end goal | Yes |
| `ongoing` | Maintenance, never "completes" | No |
| `on_hold` | Paused | Yes |
| `done` | Completed | Yes |

**Doing vs Ongoing:**
- **Doing**: "Refinance House" - has end goal, will be marked Done
- **Ongoing**: "Home Ongoing" - contains recurring/maintenance tasks, never completes

### Project Creation Wizard

Multi-step form (like Jobs creation) to properly kick off a project:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CREATE NEW PROJECT                    [X]   │
├─────────────────────────────────────────────────────────────────┤
│  ● Step 1    ○ Step 2    ○ Step 3    ○ Step 4    ○ Step 5      │
│    Basics      Vision      People      Setup       Review       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  (Step content here)                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1: Basics**
- Project Name *
- Description
- Icon (emoji picker)
- Color
- Area (Health, Finances, Family, etc.)
- Type: [ ] One-time (has end goal) [ ] Ongoing (maintenance)

**Step 2: Vision & Goals**
- Vision: What does success look like?
- Desired Outcome: Specific end goal
- Link to Goal (optional)
- Target Date
- Priority: Low / Medium / High

**Step 3: People**
- Who's involved?
- Add people with roles (Owner, Collaborator, Stakeholder, Mentor)

**Step 4: Initial Setup**
- Add first tasks (quick add)
- Add initial milestones
- Set up budget categories
- Starting budget amount

**Step 5: Review & Create**
- Summary of all info
- [Create Project] button

### Project Hub (Detail View)

When clicking into a project, see a hub with tabs (like Job detail):

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Projects                                                      │
│                                                                  │
│  🏠 Refinance House                                    [DOING]  │
│  Finances • Target: Jan 15, 2025 • 65% Complete                 │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Tasks] [Notes] [People] [Financials] [Activity]     │
└─────────────────────────────────────────────────────────────────┘
```

### Project Hub Tabs

| Tab | Content |
|-----|---------|
| **Overview** | Vision, status, dates, milestones, progress, linked Area/Goal |
| **Tasks** | Kanban board + list view of all project tasks |
| **Notes** | All project notes, can add new |
| **People** | Related people with roles |
| **Financials** | Budget, expenses, income, P&L summary |
| **Activity** | Timeline of all project events |

### Kanban Board (Tasks Tab)

Drag-and-drop task management by status:

```
┌─────────────────────────────────────────────────────────────────┐
│  Tasks                               [+ Add Task] [≡ List View] │
├─────────────────────────────────────────────────────────────────┤
│  BACKLOG (3)      TODO (2)        DOING (1)       DONE (5)      │
│  ───────────      ────────        ─────────       ────────      │
│  ┌──────────┐     ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │Research  │     │Call bank │    │Submit    │    │Get quotes│  │
│  │lenders   │     │about     │    │documents │    │from 3    │  │
│  │          │     │rates     │    │          │    │lenders   │  │
│  └──────────┘     └──────────┘    └──────────┘    └──────────┘  │
│  ┌──────────┐     ┌──────────┐                    ┌──────────┐  │
│  │Compare   │     │Gather    │                    │Review    │  │
│  │terms     │     │pay stubs │                    │credit    │  │
│  └──────────┘     └──────────┘                    └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Milestones (Overview Tab)

Key checkpoints within a project:

```
MILESTONES
┌────────────────────────────────────────────────────────────────┐
│ ✓ Get pre-approved                              Dec 1, 2024   │
│ ✓ Submit application                            Dec 10, 2024  │
│ ○ Home appraisal                                Dec 20, 2024  │
│ ○ Final approval                                Jan 5, 2025   │
│ ○ Closing                                       Jan 15, 2025  │
└────────────────────────────────────────────────────────────────┘
```

### Financials Tab

Full financial tracking for bookkeeper/CPA compatibility:

```
┌─────────────────────────────────────────────────────────────────┐
│  Financials                                      [+ Add Entry]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUMMARY                                                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │   Budget    │  Expenses   │   Income    │    Net      │      │
│  │  $15,000    │   $3,450    │   $0        │  -$3,450    │      │
│  │             │  (23% used) │             │             │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│                                                                  │
│  [Expenses] [Income] [Budget] [Reports]                         │
│  ─────────────────────────────────────────                      │
│                                                                  │
│  RECENT EXPENSES                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Dec 15  │ Appraisal Fee      │ Services    │    $500.00   │ │
│  │ Dec 12  │ Credit Report      │ Services    │     $35.00   │ │
│  │ Dec 10  │ Document Prep      │ Legal       │    $250.00   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Financial Reports

For bookkeepers and CPAs:

| Report | Description |
|--------|-------------|
| **Expense Report** | All expenses by date range, category, or vendor |
| **Income Report** | All income by date range, category, or source |
| **P&L Summary** | Profit/Loss for the project |
| **Budget vs Actual** | Compare budgeted amounts to actual spending |
| **Tax Summary** | Deductible expenses grouped by tax category |
| **Export to CSV** | Download for import into accounting software |

### Progress Tracking Views

Beyond Kanban, the Tasks tab offers:

| View | Description |
|------|-------------|
| **Kanban** | Drag-and-drop columns by status |
| **List** | Traditional task list with filters |
| **Timeline** | Tasks on a timeline by due date |
| **Milestones** | Progress through key checkpoints |

### The "Ongoing Project" Pattern

For maintenance and recurring work that never "completes":

> "Instead of cluttering your Inbox with maintenance tasks, create **ongoing projects** to organize them."

Examples:
- **Work Ongoing** - Recurring work tasks
- **Well-Being Ongoing** - Health habits (exercise, vitamins)
- **Home Ongoing** - Home maintenance tasks

Ongoing projects:
- Status = `ongoing` (never changes to `done`)
- No target date
- Contains recurring tasks and one-off maintenance
- Connects to an Area (e.g., "Home Ongoing" → "Home" Area)

---

## Notes App

The Notes App is the knowledge capture hub. It handles text notes, photos, voice recordings, and video - all in one place with a powerful markdown editor.

### Core Features

| Feature | Description |
|---------|-------------|
| **Markdown Editor** | Rich text editing similar to Obsidian |
| **Inline Media** | Embed photos, voice, and video directly in notes |
| **Bidirectional Linking** | Link notes with `[[Note Title]]` syntax |
| **Tags & Organization** | Organize by Areas, Resources, Projects |
| **Quick Capture Ready** | Serves as destination for photo/voice/video captures |

### Markdown Editor

The editor supports full markdown with live preview:
- Headers, bold, italic, strikethrough
- Bullet lists, numbered lists, checklists
- Code blocks with syntax highlighting
- Block quotes
- Tables
- Horizontal rules

**Obsidian-like features:**
- `[[Note Title]]` - Link to another note
- `![[Note Title]]` - Embed another note
- `#tag` - Inline tags (optional)
- `/` commands for quick formatting

### Media Support

Notes can contain embedded media, either added manually or via Quick Capture:

| Media Type | How It Works |
|------------|--------------|
| **Photos** | Embedded inline in markdown, stored in uploads folder |
| **Voice Recordings** | Audio player embedded in note, transcription optional |
| **Video Recordings** | Video player embedded in note |
| **Documents** | Attached as downloadable files |

Media is stored as files with references in the note content:
```markdown
Here's a photo from the job site:
![Photo](uploads/notes/123/photo_001.jpg)

Voice memo from the meeting:
[audio](uploads/notes/123/voice_001.m4a)
```

### Note Types

| Type | Purpose | Special Fields |
|------|---------|----------------|
| **Note** | General notes | - |
| **Web Clip** | Saved from web | source_url |
| **Meeting** | Meeting notes | Related people |
| **Journal** | Daily journal | Date-based |

### Bidirectional Linking

Notes can link to each other using `[[Note Title]]` syntax:
- Parser extracts links on save
- Updates `note_links` junction table
- "Linked From" section shows backlinks
- Graph view (future) shows connections visually

### Tags & Organization

Notes connect to:
- **Areas** - "This note is about Health"
- **Resources** - "This note is about Programming"
- **Entities** - "This note is a Book Summary"
- **Projects** - "This note supports Project X"
- **Jobs** - "This note is for Job #1045"

### Inbox State

A note is in the inbox (unprocessed) when it has:
- No tags assigned
- No project assigned
- Type is 'note' (not meeting/journal which have implicit organization)

Processing = assigning a tag, project, or changing the type.

---

## Calendar App

The Calendar App provides a native calendar interface within Apex Assistant that uses **Google Calendar API as the source of truth**. Events are NOT stored locally - all CRUD operations happen directly against the user's Google Calendar.

### Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Don't reinvent the wheel** | Google Calendar is battle-tested, has mobile apps, sync, sharing, etc. |
| **Never leave the app** | Full CRUD from within Apex Assistant - view, create, edit, delete events |
| **Calendar ≠ Tasks** | Tasks belong in Tasks app. Calendar is for time-specific events only. |
| **No Job integration** | Job milestones stay in Jobs. Calendar is personal productivity only. |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APEX ASSISTANT                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Calendar App (Custom UI)                   │    │
│  │                                                       │    │
│  │  • Month/Week/Day/Agenda views                       │    │
│  │  • Event modal (create/edit)                         │    │
│  │  • Calendar selector (show/hide multiple calendars)  │    │
│  └───────────────────┬─────────────────────────────────┘    │
│                      │                                        │
│                      │ Google Calendar API                   │
│                      │ (events.list, events.insert, etc.)   │
│                      ▼                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          user_integrations table                     │    │
│  │  (OAuth tokens + settings only)                      │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
                       │
                       │ HTTPS
                       ▼
         ┌─────────────────────────────┐
         │   Google Calendar API        │
         │   (Source of Truth)          │
         └─────────────────────────────┘
```

### OAuth Authentication

The app uses OAuth2 to authenticate with Google Calendar:

1. User clicks "Connect Google Calendar" in Settings > Integrations
2. OAuth flow redirects to Google consent screen
3. User grants calendar permissions
4. App receives access_token + refresh_token
5. Tokens stored in `user_integrations` table (encrypted)
6. App can now make API calls on behalf of user

**Required Scopes:**
- `https://www.googleapis.com/auth/calendar` (full read/write access)

### API Operations

The Calendar App performs these operations via Google Calendar API:

| Operation | API Method | Purpose |
|-----------|------------|---------|
| **List events** | `events.list` | Fetch events for month/week/day view |
| **Get event** | `events.get` | Load event details for edit modal |
| **Create event** | `events.insert` | Add new event |
| **Update event** | `events.update` | Modify existing event |
| **Delete event** | `events.delete` | Remove event |

### UI Components

```
┌─────────────────────────────────────────────────────────────┐
│  CALENDAR                                   [+ New Event]   │
├─────────────────────────────────────────────────────────────┤
│  [Month] [Week] [Day] [Agenda]              Today ▼         │
│                                                              │
│  ◀ December 2024 ▶                                          │
│  ┌────┬────┬────┬────┬────┬────┬────┐                      │
│  │ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │                      │
│  ├────┼────┼────┼────┼────┼────┼────┤                      │
│  │  1 │  2 │  3 │  4 │  5 │  6 │  7 │                      │
│  │    │    │ 2pm│    │    │    │    │                      │
│  │    │    │Team│    │    │    │    │                      │
│  ├────┼────┼────┼────┼────┼────┼────┤                      │
│  │  8 │  9 │ 10 │ 11 │ 12 │ 13 │ 14 │                      │
│  │    │9am │    │    │    │    │    │                      │
│  │    │Mtg │    │    │    │    │    │                      │
│  └────┴────┴────┴────┴────┴────┴────┘                      │
│                                                              │
│  MY CALENDARS                          SHOW ALL / HIDE ALL  │
│  ☑ jake@apex.com (primary)                                  │
│  ☑ Work Calendar                                            │
│  ☐ Family Events                                            │
└─────────────────────────────────────────────────────────────┘
```

### Event Modal

When creating or editing an event:

```
┌─────────────────────────────────────────────────────────────┐
│  New Event                                            [X]   │
├─────────────────────────────────────────────────────────────┤
│  Title: ________________________________                     │
│                                                              │
│  Date:  Dec 20, 2024 ▼      All day [ ]                    │
│                                                              │
│  Start: 2:00 PM ▼           End: 3:00 PM ▼                 │
│                                                              │
│  Calendar: jake@apex.com (primary) ▼                        │
│                                                              │
│  Description:                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Location: ________________________________                  │
│                                                              │
│  Repeat: Does not repeat ▼                                  │
│                                                              │
│                                  [Cancel]  [Save Event]     │
└─────────────────────────────────────────────────────────────┘
```

### Calendar Selector

Users can have multiple Google Calendars. The app shows them all with show/hide toggles:

- Primary calendar (always shown)
- Additional calendars (Work, Family, etc.)
- Toggle visibility per calendar
- Events from hidden calendars don't appear in views

### What Calendar is NOT

To keep the app focused, Calendar explicitly does NOT handle:

| Feature | Why Not | Where It Belongs |
|---------|---------|------------------|
| **Tasks with due dates** | Tasks are not time-boxed events | Tasks App |
| **Project deadlines** | Not calendar events | Projects App (milestones) |
| **Job milestones** | Business data, not personal | Jobs (COS dates, inspections) |
| **Recurring tasks** | Different from recurring events | Tasks App (recurrence) |

**Key difference:** Calendar is for time-specific events ("Meeting at 2pm"). Tasks are for things to accomplish ("Call the insurance adjuster").

### Dashboard Widget

The Dashboard's Calendar widget shows today's events:

```
┌─────────────────────────────────────┐
│  CALENDAR                     Today │
├─────────────────────────────────────┤
│  9:00 AM   Team standup              │
│  2:00 PM   Client meeting            │
│  4:30 PM   Dentist appointment       │
│                                      │
│            [View Full Calendar →]    │
└─────────────────────────────────────┘
```

Clicking the widget opens the full Calendar App.

### Implementation Notes

**Libraries:**
- Use **FullCalendar** or **react-big-calendar** for calendar UI
- Use **@google/calendar** npm package for API calls
- Use OAuth library for authentication flow

**Caching:**
- Cache events in React Query for fast re-renders
- Invalidate cache after create/update/delete operations
- Refresh every 5 minutes to catch external changes

**Error Handling:**
- Token expiration → auto-refresh using refresh_token
- Network errors → show offline mode, queue changes
- Permission errors → prompt user to re-authenticate

### Calendar Preferences

Stored in `user_integrations.settings` JSON field:

```json
{
  "visible_calendars": ["primary", "work@apex.com"],
  "default_view": "week",
  "week_starts_on": "sunday",
  "default_reminder": 15
}
```

---

## Areas & Tags

### Areas as Context Hubs

When viewing an Area (e.g., "Health"), you see everything related:

```
┌─────────────────────────────────────────────────────────┐
│ 🏃 Health                                    ★ Favorite │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ACTIVE PROJECTS                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ○ Lose 20 pounds          Due: Mar 2025           │ │
│ │ ○ Run a 5K                Due: Apr 2025           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ TASKS                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☐ Schedule annual checkup          Due: Jan 15     │ │
│ │ ☐ Refill prescription              Due: Jan 10     │ │
│ │ ☑ Buy vitamins                     Done: Jan 5     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ GOALS                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎯 Get in best shape of my life    Progress: 30%   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ RECENT NOTES                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 Workout routine ideas           Updated: Jan 8   │ │
│ │ 📝 Nutrition research              Updated: Jan 3   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ RELATED PEOPLE                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Dr. Smith (Primary Care)                         │ │
│ │ 👤 Coach Mike (Trainer)                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ SUB-RESOURCES                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Nutrition                                        │ │
│ │ 📁 Exercise                                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### The "Apex Restoration" Area

This Area bridges personal productivity with business:

```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Apex Restoration                          ★ Favorite │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ACTIVE JOBS (from apex_operations.db)                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🏠 Job #1045 - 123 Main St        Status: Active    │ │
│ │ 🏠 Job #1048 - 456 Oak Ave        Status: Pending   │ │
│ │ 🏠 Job #1052 - 789 Pine Rd        Status: Active    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ MY TASKS (tagged with Apex Restoration)                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☐ Review Q4 financials             Due: Jan 15     │ │
│ │ ☐ Call insurance adjuster          Due: Today      │ │
│ │ ☐ Order new equipment              Due: Jan 20     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ GOALS                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎯 Hit $1M revenue                 Progress: 65%   │ │
│ │ 🎯 Hire 2 technicians              Progress: 50%   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ RECENT NOTES                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 Marketing ideas                 Updated: Jan 8   │ │
│ │ 📝 Equipment maintenance log       Updated: Jan 5   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ SUB-RESOURCES                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 IICRC Standards                                  │ │
│ │ 📁 Insurance Processes                              │ │
│ │ 📁 Equipment Manuals                                │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Resources vs Areas

| Aspect | Area | Resource |
|--------|------|----------|
| **Nature** | Ongoing responsibility | Reference topic |
| **Contains** | Projects, Tasks, Goals, People, Notes | Notes only |
| **Example** | "Health", "Family" | "Programming", "Recipes" |
| **Sidebar** | Top section | Bottom section |

---

## Quick Capture

> **Important:** Quick Capture is an **extension** to the core Apps, not a standalone feature. The Tasks App, Projects App, and Notes App must be fully built first, then Quick Capture adds fast entry points into them.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE APPS                                │
│                    (Must be built first)                         │
├─────────────────────────────────────────────────────────────────┤
│   TASKS APP          PROJECTS APP         NOTES APP              │
│   • GTD lists        • Project hub        • Markdown editor      │
│   • My Day           • Kanban boards      • Inline media         │
│   • Sub-tasks        • Financials         • Voice/video          │
│   • Recurrence       • Milestones         • Bidirectional links  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUICK CAPTURE                               │
│              (Built as extension to Apps)                        │
├─────────────────────────────────────────────────────────────────┤
│   FAB on every page offers fast paths into existing Apps:        │
│   [Task]  → Tasks App    [Photo] → Notes App                     │
│   [Note]  → Notes App    [Voice/Video] → Notes App               │
└─────────────────────────────────────────────────────────────────┘
```

### Principle: Capture First, Organize Later

The Quick Capture FAB (Floating Action Button) is available on **every page**. The goal is **zero friction** - get the thought out of your head and into the system immediately.

### How It Works

Quick Capture creates items **directly in the core Apps** in an "inbox" state:

| Capture Type | Uses App | What's Created |
|--------------|----------|----------------|
| **Task** | Tasks App | Task with no project, no due date |
| **Note** | Notes App | Note with no tags, no project |
| **Photo** | Notes App | Note with embedded photo |
| **Voice** | Notes App | Note with voice recording attached |
| **Video** | Notes App | Note with video recording attached |

### Why Notes App Handles Media

Photos, voice memos, and videos are all captured as **notes with media**. This is intentional:
- Media often needs context (what is this photo of?)
- User can add text/description alongside the media
- Media lives in the same organizational system (Tags, Projects)
- No separate "media library" to manage

### Processing (Leaving the Inbox)

Items leave the inbox when you **organize** them:

**Tasks leave inbox when:**
- Assigned to a Project, OR
- Given a due date, OR
- Moved to a smart list (Next, Someday, Delegated)

**Notes leave inbox when:**
- Assigned to a Tag (Area or Resource), OR
- Assigned to a Project, OR
- Type changed to Meeting or Journal (implicitly organized)

### Quick Capture Flow

```
[User taps FAB]
    → [Selects type: Task, Note, Photo, Voice, Video]
    → [Enters content (minimal fields)]
    → [Saves to Tasks App or Notes App in inbox state]
    → [User processes later: assigns Area, Project, due date]
```

### Build Order

1. **Tasks App** (full feature) → enables Quick Capture Task
2. **Notes App** (full feature with media support) → enables Quick Capture Note/Photo/Voice/Video
3. **Quick Capture FAB** (extension) → provides fast entry points

---

## Jobs Reference Hub

The business side. Uses `apex_operations.db` - **these tables remain unchanged**.

### Existing Tables

| Table | Purpose |
|-------|---------|
| projects | Restoration jobs |
| clients | Property owners |
| organizations | Insurance companies, TPAs |
| contacts | People at organizations |
| estimates | Xactimate estimates |
| payments | Received payments |
| notes | Job-specific notes |
| media | Photos, documents |
| receipts | Expenses |
| work_orders | Subcontractor work |
| labor_entries | Time tracking |
| activity_log | Event history |

### Integration with Dashboard

Jobs connect to Dashboard via:
1. **Area relation** - Jobs appear under "Apex Restoration" Area
2. **task.job_id** - Tasks can link to specific jobs
3. **notes.job_id** - Notes can link to specific jobs

---

## AI Assistant

Claude-powered chat with tool use.

### Capabilities

- Natural language task creation
- Job lookups and updates
- Schedule queries
- Document processing
- Estimate analysis

### Context Awareness

The assistant knows:
- Current user's tasks and schedule
- Active jobs and their status
- Recent conversations

---

## Implementation Status

### Built

| Feature | Status |
|---------|--------|
| AI Chat | Complete |
| Jobs CRUD | Complete |
| Job Detail (all tabs) | Complete |
| Visual Overhaul | Complete |
| Login/Auth | Complete |

### In Progress

| Feature | Status | Blockers |
|---------|--------|----------|
| Dashboard Views | Partial | Needs data |
| Quick Capture UI | Partial | Needs Core Apps |

### Not Started

| Feature | Priority | Dependencies |
|---------|----------|--------------|
| Database Migration | **Critical** | None |
| Tags/Areas | **High** | Database schema |
| Tasks App | **High** | Database schema |
| Projects App | **High** | Tasks App, Database schema |
| Notes App | **High** | Database schema |
| Calendar App | Medium | Google OAuth setup, user_integrations table |
| Quick Capture | Medium | Tasks App, Notes App |
| Goals | Medium | Areas/Tags |
| Time Tracking | Low | Tasks |
| Widget Customization | Low | All apps |

### Recommended Build Order

```
PHASE 1: Foundation
├── 1. Database Migration - Create all Dashboard tables
└── 2. Tags/Areas - PARA foundation for organization

PHASE 2: Core Apps
├── 3. Tasks App - GTD task management with Kanban
├── 4. Projects App - Full project management with financials
├── 5. Notes App - Markdown editor with media support
└── 6. Calendar App - Scheduling and events

PHASE 3: Integration
├── 7. Quick Capture - FAB extension for Tasks & Notes
├── 8. Area Views - Context aggregation pages
└── 9. Dashboard Widgets - Connect to real data

PHASE 4: Enhancement
├── 10. Goals - Long-term tracking with milestones
├── 11. Time Tracking - Work sessions
└── 12. Widget Customization - react-grid-layout
```

---

## API Endpoints Needed

### Tasks
```
GET    /api/tasks                     - List tasks (with filters)
GET    /api/tasks/:id                 - Get single task
POST   /api/tasks                     - Create task
PATCH  /api/tasks/:id                 - Update task
DELETE /api/tasks/:id                 - Delete task
GET    /api/tasks/my-day              - Get My Day tasks
POST   /api/tasks/:id/my-day          - Add to My Day
DELETE /api/tasks/:id/my-day          - Remove from My Day
GET    /api/tasks?project_id=:id      - Tasks for a project (Kanban)
```

### Projects
```
GET    /api/projects                  - List projects (with status filter)
GET    /api/projects/:id              - Get single project
POST   /api/projects                  - Create project (wizard data)
PATCH  /api/projects/:id              - Update project
DELETE /api/projects/:id              - Delete project

# Project sub-resources
GET    /api/projects/:id/tasks        - All tasks for project
GET    /api/projects/:id/notes        - All notes for project
GET    /api/projects/:id/people       - People related to project
POST   /api/projects/:id/people       - Add person to project
DELETE /api/projects/:id/people/:pid  - Remove person from project

# Milestones
GET    /api/projects/:id/milestones   - Get project milestones
POST   /api/projects/:id/milestones   - Create milestone
PATCH  /api/projects/:id/milestones/:mid - Update milestone
DELETE /api/projects/:id/milestones/:mid - Delete milestone

# Financials
GET    /api/projects/:id/expenses     - Get project expenses
POST   /api/projects/:id/expenses     - Create expense
PATCH  /api/projects/:id/expenses/:eid - Update expense
DELETE /api/projects/:id/expenses/:eid - Delete expense

GET    /api/projects/:id/income       - Get project income
POST   /api/projects/:id/income       - Create income entry
PATCH  /api/projects/:id/income/:iid  - Update income entry
DELETE /api/projects/:id/income/:iid  - Delete income entry

GET    /api/projects/:id/budget       - Get project budget
POST   /api/projects/:id/budget       - Create budget category
PATCH  /api/projects/:id/budget/:bid  - Update budget
DELETE /api/projects/:id/budget/:bid  - Delete budget category

GET    /api/projects/:id/financials/summary - P&L summary
GET    /api/projects/:id/financials/export  - Export CSV

# Activity
GET    /api/projects/:id/activity     - Project activity log
```

### Tags (Areas/Resources)
```
GET    /api/tags                      - List all tags
GET    /api/tags/:id                  - Get single tag
GET    /api/tags/:id/full             - Tag with all related items (context hub)
POST   /api/tags                      - Create tag
PATCH  /api/tags/:id                  - Update tag
DELETE /api/tags/:id                  - Delete tag
```

### Notes
```
GET    /api/notes                     - List notes (with filters)
GET    /api/notes/:id                 - Get single note
POST   /api/notes                     - Create note
PATCH  /api/notes/:id                 - Update note
DELETE /api/notes/:id                 - Delete note
GET    /api/notes/:id/backlinks       - Notes linking to this note
POST   /api/notes/:id/media           - Upload media to note
DELETE /api/notes/:id/media/:mid      - Delete media from note
```

### People
```
GET    /api/people                    - List people
GET    /api/people/:id                - Get single person
POST   /api/people                    - Create person
PATCH  /api/people/:id                - Update person
DELETE /api/people/:id                - Delete person
```

### Expense Categories
```
GET    /api/expense-categories        - List user's expense categories
POST   /api/expense-categories        - Create category
PATCH  /api/expense-categories/:id    - Update category
DELETE /api/expense-categories/:id    - Delete category
```

### Inbox (Views, not separate endpoints)

Inbox is accessed via filtered queries on Tasks and Notes:

```
GET    /api/tasks?inbox=true          - Tasks in inbox state
GET    /api/notes?inbox=true          - Notes in inbox state
GET    /api/tasks/inbox/count         - Count of inbox tasks
GET    /api/notes/inbox/count         - Count of inbox notes
```

Processing an inbox item = updating it with a project, tag, or due date using the standard PATCH endpoints.

---

*Last updated: December 2024*
