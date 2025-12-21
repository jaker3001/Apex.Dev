-- =====================================================================
-- Migration 004: Create Dashboard Schema Tables
-- =====================================================================
-- Purpose: Create all personal productivity tables (users, tasks, projects,
--          notes, tags, goals, people, integrations, AI assistant)
-- Dependencies: 003_create_schemas.sql
-- Rollback: DROP TABLE IF EXISTS dashboard.<table_name> CASCADE;
-- =====================================================================

SET search_path TO dashboard, public;

-- =====================================================================
-- USERS TABLE
-- User accounts with role-based access control
-- =====================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role user_role DEFAULT 'employee',
    is_active BOOLEAN DEFAULT TRUE,
    contact_id INTEGER,  -- Optional link to business.contacts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts with authentication and role-based access';
COMMENT ON COLUMN users.contact_id IS 'Optional link to business schema contacts table';

-- =====================================================================
-- TAGS TABLE (PARA: Areas, Resources, Entities)
-- Central organization system using PARA methodology
-- =====================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,
    icon TEXT,  -- Emoji or icon name
    color TEXT,  -- Hex color code

    -- Type (PARA)
    type tag_type NOT NULL,

    -- Hierarchy
    parent_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,

    -- Display
    is_favorite BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_tag_name UNIQUE(user_id, name)
);

COMMENT ON TABLE tags IS 'PARA organization: Areas (responsibilities), Resources (topics), Entities (categories)';
COMMENT ON COLUMN tags.type IS 'area = ongoing responsibility, resource = reference topic, entity = meta-category';

-- =====================================================================
-- GOALS TABLE
-- Goal tracking with milestones
-- =====================================================================

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,

    -- Status
    status goal_status DEFAULT 'active',

    -- Dates
    target_date DATE,
    achieved_at TIMESTAMPTZ,

    -- Relations
    tag_id UUID REFERENCES tags(id) ON DELETE SET NULL,  -- Area this goal belongs to

    -- Metadata
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE goals IS 'Long-term goals linked to Areas with milestone tracking';

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE milestones IS 'Key checkpoints for goals';

-- =====================================================================
-- PROJECTS TABLE (Personal Projects, not Business Jobs)
-- Full project management with financials and milestones
-- =====================================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,  -- Emoji or icon name
    color TEXT,  -- Hex color for visual distinction

    -- Vision & Planning
    vision TEXT,  -- What does success look like?
    desired_outcome TEXT,  -- Specific end goal

    -- Status
    status project_status DEFAULT 'planned',
    priority task_priority DEFAULT 'medium',

    -- Dates
    start_date DATE,
    target_date DATE,  -- Deadline/goal date
    completed_at TIMESTAMPTZ,

    -- Relations
    area_id UUID REFERENCES tags(id) ON DELETE SET NULL,  -- Primary Area
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,  -- Parent Goal

    -- Display
    cover_image TEXT,  -- Optional cover image path
    sort_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE projects IS 'Personal projects with deadlines, distinct from business jobs';
COMMENT ON COLUMN projects.status IS 'ongoing = maintenance projects that never complete, doing = projects with end goals';

CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_milestones IS 'Key checkpoints within personal projects';

-- =====================================================================
-- PROJECT FINANCIALS
-- Full financial tracking for bookkeeper/CPA compatibility
-- =====================================================================

CREATE TABLE project_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'materials', 'services', 'software', 'travel', etc.

    -- Vendor/Payee
    vendor TEXT,

    -- Date & Payment
    transaction_date DATE NOT NULL,
    payment_method payment_method,
    reference_number TEXT,  -- Check number, transaction ID, etc.

    -- Documentation
    receipt_path TEXT,  -- Path to uploaded receipt

    -- Tax & Accounting
    is_tax_deductible BOOLEAN DEFAULT FALSE,
    tax_category TEXT,  -- 'business_expense', 'home_office', 'education', etc.

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_expenses IS 'Project expenses for financial tracking and tax reporting';

CREATE TABLE project_income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Transaction details
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT,  -- 'sales', 'services', 'royalties', 'refund', etc.

    -- Source
    source TEXT,  -- Who paid

    -- Date & Payment
    transaction_date DATE NOT NULL,
    payment_method payment_method,
    reference_number TEXT,

    -- Documentation
    invoice_number TEXT,
    document_path TEXT,

    -- Tax & Accounting
    is_taxable BOOLEAN DEFAULT TRUE,
    tax_category TEXT,  -- 'self_employment', 'passive', 'capital_gains', etc.

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_income IS 'Project income for financial tracking and tax reporting';

CREATE TABLE project_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    category TEXT NOT NULL,  -- Budget category (matches expense categories)
    budgeted_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, category)
);

COMMENT ON TABLE project_budgets IS 'Budget planning for projects by category';

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_tax_deductible_default BOOLEAN DEFAULT FALSE,
    tax_category_default TEXT,
    sort_order INTEGER DEFAULT 0,

    UNIQUE(user_id, name)
);

COMMENT ON TABLE expense_categories IS 'User-customizable expense categories';

-- =====================================================================
-- PEOPLE TABLE (Personal Contacts)
-- Separate from business contacts
-- =====================================================================

CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

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
    is_favorite BOOLEAN DEFAULT FALSE,

    -- Metadata
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE people IS 'Personal contacts, separate from business contacts';

CREATE TABLE people_tags (
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, tag_id)
);

COMMENT ON TABLE people_tags IS 'Many-to-many relation between people and tags (Areas)';

CREATE TABLE project_people (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role TEXT,  -- 'owner', 'collaborator', 'stakeholder', 'mentor', etc.
    PRIMARY KEY (project_id, person_id)
);

COMMENT ON TABLE project_people IS 'People related to projects';

-- =====================================================================
-- TASKS TABLE
-- Central task management with GTD, Kanban, recurring tasks
-- =====================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,

    -- Status (supports Kanban boards)
    status task_status DEFAULT 'backlog',
    priority task_priority,

    -- Dates
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    snooze_until DATE,

    -- GTD Smart Lists
    smart_list smart_list_type,

    -- My Day
    is_my_day BOOLEAN DEFAULT FALSE,
    my_day_date DATE,

    -- Recurrence
    recur_interval INTEGER,
    recur_unit recurrence_unit,
    recur_days JSONB,  -- Array for specific days ["Monday", "Wednesday"]

    -- Relations
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    job_id INTEGER,  -- FK to business.jobs (cross-schema reference)

    -- Metadata
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'GTD task management with Kanban, recurrence, and My Day planning';
COMMENT ON COLUMN tasks.job_id IS 'Cross-schema link to business.jobs for work-related tasks';
COMMENT ON COLUMN tasks.smart_list IS 'GTD lists: inbox, next, delegated, someday';
COMMENT ON COLUMN tasks.is_my_day IS 'Tasks pulled into today focus regardless of due date';

CREATE TABLE task_tags (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

COMMENT ON TABLE task_tags IS 'Many-to-many relation between tasks and tags';

CREATE TABLE task_people (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role TEXT,  -- 'assignee', 'delegated_to', 'collaborator'
    PRIMARY KEY (task_id, person_id)
);

COMMENT ON TABLE task_people IS 'Task assignments and delegations';

-- =====================================================================
-- NOTES TABLE (Personal Knowledge Management)
-- Markdown notes with bidirectional linking and media
-- =====================================================================

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Info
    title TEXT NOT NULL,
    content TEXT,  -- Markdown content

    -- Type
    type note_type DEFAULT 'note',
    source_url TEXT,  -- For web clips

    -- Display
    is_favorite BOOLEAN DEFAULT FALSE,

    -- Relations
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    job_id INTEGER,  -- Link to business.jobs

    -- Metadata
    word_count INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notes IS 'Personal Knowledge Management with markdown, media, and bidirectional linking';
COMMENT ON COLUMN notes.job_id IS 'Cross-schema link to business.jobs';

CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

COMMENT ON TABLE note_tags IS 'Many-to-many relation between notes and tags';

CREATE TABLE note_links (
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    PRIMARY KEY (source_note_id, target_note_id)
);

COMMENT ON TABLE note_links IS 'Bidirectional links between notes ([[Note Title]] syntax)';

CREATE TABLE note_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

    -- File info
    file_path TEXT NOT NULL,  -- Path relative to uploads folder
    file_name TEXT NOT NULL,  -- Original filename
    file_size INTEGER,  -- Bytes
    mime_type TEXT,  -- e.g., 'image/jpeg', 'audio/m4a'
    media_type media_type NOT NULL,

    -- Optional metadata
    duration_seconds INTEGER,  -- For audio/video
    width INTEGER,  -- For images/video
    height INTEGER,  -- For images/video
    transcription TEXT,  -- For voice recordings (optional)

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE note_media IS 'Media files attached to notes (photos, voice, video, documents)';

-- =====================================================================
-- WORK SESSIONS (Time Tracking)
-- =====================================================================

CREATE TABLE work_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE work_sessions IS 'Time tracking for tasks with start/end times';

-- =====================================================================
-- USER INTEGRATIONS (OAuth)
-- Google Calendar, future: Outlook, Slack, etc.
-- =====================================================================

CREATE TABLE user_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Integration type
    provider integration_provider NOT NULL,

    -- OAuth tokens (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,

    -- Provider-specific settings
    settings JSONB,  -- e.g., {"visible_calendars": ["primary", "work"], "default_view": "week"}

    -- Status
    is_connected BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, provider)
);

COMMENT ON TABLE user_integrations IS 'OAuth integrations for external services (Google Calendar, etc.)';
COMMENT ON COLUMN user_integrations.settings IS 'JSON settings like visible calendars, default views';

-- =====================================================================
-- AI ASSISTANT TABLES
-- Conversations, messages, and task tracking
-- =====================================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    timestamp TIMESTAMPTZ DEFAULT NOW(),
    summary TEXT,
    related_task_ids JSONB,  -- Array of task IDs
    session_id TEXT,  -- Claude SDK session ID for resuming
    is_active BOOLEAN DEFAULT TRUE,
    title TEXT,  -- Auto-generated from first message
    last_model_id TEXT,  -- Last model used
    message_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE conversations IS 'AI chat sessions with Claude';

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    model_id TEXT,
    model_name TEXT,
    tools_used JSONB,  -- Array of tool names

    timestamp TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Individual messages within conversations';

CREATE TABLE ai_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

    timestamp TIMESTAMPTZ DEFAULT NOW(),
    description TEXT NOT NULL,
    status ai_task_status DEFAULT 'pending',
    outcome TEXT,
    category task_category,
    agent_used TEXT,

    -- Metrics columns for automation analysis
    complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 5),
    steps_required INTEGER,
    decision_points INTEGER,
    context_needed rating_level,
    reusability rating_level,
    input_type io_type,
    output_type TEXT,
    tools_used JSONB,  -- Array of tool names
    human_corrections INTEGER DEFAULT 0,
    follow_up_tasks INTEGER DEFAULT 0,
    time_to_complete INTEGER,  -- Seconds
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    frequency_tag TEXT,  -- For pattern matching

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_tasks IS 'AI task execution tracking for automation opportunity analysis';

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT,
    tools JSONB,  -- Array of tool configurations
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agents IS 'Registered AI agents with configurations';

-- =====================================================================
-- PROJECT ACTIVITY LOG
-- Track changes to projects
-- =====================================================================

CREATE TABLE project_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    action TEXT NOT NULL,  -- 'created', 'status_changed', 'task_completed', etc.
    description TEXT,  -- Human-readable description
    old_value TEXT,  -- For changes, the previous value
    new_value TEXT,  -- For changes, the new value

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE project_activity IS 'Activity log for personal projects';

-- =====================================================================
-- NOTIFICATIONS
-- User alerts and notifications
-- =====================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    message TEXT,
    type TEXT,  -- 'task_due', 'project_deadline', 'reminder', etc.
    link TEXT,  -- Deep link to related item

    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notifications and alerts';
