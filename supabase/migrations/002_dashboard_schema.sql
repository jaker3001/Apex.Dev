-- ============================================================================
-- Apex Dashboard Schema - Personal Second Brain
-- Ultimate Brain-inspired data model with PARA + GTD methodology
-- ============================================================================

-- Create the dashboard schema
CREATE SCHEMA IF NOT EXISTS dashboard;

-- ============================================================================
-- USER_PROFILES TABLE
-- Extends Supabase Auth with application-specific user data
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_email ON dashboard.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON dashboard.user_profiles(role);

-- ============================================================================
-- TAGS TABLE (PARA: Areas, Resources, Entities)
-- Hierarchical tag system for organizing everything
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.tags (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,

    -- PARA type: area (life areas), resource (reference topics), entity (people/places)
    type TEXT NOT NULL CHECK (type IN ('area', 'resource', 'entity')),

    -- Hierarchy support
    parent_tag_id INTEGER REFERENCES dashboard.tags(id) ON DELETE SET NULL,

    -- Display
    is_favorite BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, name, type)
);

CREATE INDEX idx_tags_user ON dashboard.tags(user_id);
CREATE INDEX idx_tags_type ON dashboard.tags(type);
CREATE INDEX idx_tags_parent ON dashboard.tags(parent_tag_id);

-- ============================================================================
-- GOALS TABLE
-- Long-term goals and aspirations
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.goals (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,

    -- Status progression: dream -> active -> achieved
    status TEXT DEFAULT 'dream' CHECK (status IN ('dream', 'active', 'achieved')),

    -- Dates
    goal_set DATE,
    target_date DATE,
    achieved_at TIMESTAMPTZ,

    -- Link to an area tag
    tag_id INTEGER REFERENCES dashboard.tags(id) ON DELETE SET NULL,

    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON dashboard.goals(user_id);
CREATE INDEX idx_goals_status ON dashboard.goals(status);
CREATE INDEX idx_goals_tag ON dashboard.goals(tag_id);

-- ============================================================================
-- MILESTONES TABLE
-- Checkpoints within goals
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.milestones (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES dashboard.goals(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_goal ON dashboard.milestones(goal_id);

-- ============================================================================
-- PROJECTS TABLE (Personal Projects)
-- Personal projects with accounting support - separate from business jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.projects (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    vision TEXT,
    desired_outcome TEXT,

    -- Status (Ultimate Brain inspired)
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'doing', 'ongoing', 'on_hold', 'done')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

    -- Dates
    start_date DATE,
    target_date DATE,
    completed_at TIMESTAMPTZ,

    -- Relations
    area_id INTEGER REFERENCES dashboard.tags(id) ON DELETE SET NULL,
    goal_id INTEGER REFERENCES dashboard.goals(id) ON DELETE SET NULL,

    -- Accounting mode: simple (just totals) or advanced (detailed tracking)
    accounting_mode TEXT DEFAULT 'simple' CHECK (accounting_mode IN ('simple', 'advanced')),

    -- Simple accounting (used when accounting_mode = 'simple')
    budget DECIMAL(10, 2),
    total_spent DECIMAL(10, 2) DEFAULT 0,
    total_income DECIMAL(10, 2) DEFAULT 0,

    -- Display
    cover_image TEXT,
    sort_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON dashboard.projects(user_id);
CREATE INDEX idx_projects_status ON dashboard.projects(status);
CREATE INDEX idx_projects_area ON dashboard.projects(area_id);
CREATE INDEX idx_projects_goal ON dashboard.projects(goal_id);

-- ============================================================================
-- PROJECT_PEOPLE TABLE
-- Links personal contacts to projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.project_people (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES dashboard.projects(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES dashboard.people(id) ON DELETE CASCADE,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, person_id)
);

-- Note: Index created after people table

-- ============================================================================
-- PROJECT_EXPENSES TABLE
-- Expense tracking for projects (when accounting_mode = 'advanced')
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.project_expenses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES dashboard.projects(id) ON DELETE CASCADE,

    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_expenses_project ON dashboard.project_expenses(project_id);
CREATE INDEX idx_project_expenses_date ON dashboard.project_expenses(expense_date);

-- ============================================================================
-- PROJECT_INCOME TABLE
-- Income tracking for projects (when accounting_mode = 'advanced')
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.project_income (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES dashboard.projects(id) ON DELETE CASCADE,

    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT,
    income_date DATE NOT NULL,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_income_project ON dashboard.project_income(project_id);
CREATE INDEX idx_project_income_date ON dashboard.project_income(income_date);

-- ============================================================================
-- PEOPLE TABLE (Personal Contacts)
-- Separate from business.contacts - these are personal relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.people (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

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

    -- Personal
    birthday DATE,
    relationship TEXT[], -- 'family', 'friend', 'colleague', 'mentor', etc.
    interests TEXT[],

    -- CRM-lite
    last_check_in DATE,
    next_check_in DATE,

    -- Notes
    notes TEXT,

    -- Display
    avatar_url TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_people_user ON dashboard.people(user_id);
CREATE INDEX idx_people_name ON dashboard.people(name);
CREATE INDEX idx_people_email ON dashboard.people(email);

-- Now create index for project_people
CREATE INDEX idx_project_people_project ON dashboard.project_people(project_id);
CREATE INDEX idx_project_people_person ON dashboard.project_people(person_id);

-- ============================================================================
-- PEOPLE_TAGS TABLE
-- Many-to-many relationship between people and tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.people_tags (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES dashboard.people(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES dashboard.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(person_id, tag_id)
);

CREATE INDEX idx_people_tags_person ON dashboard.people_tags(person_id);
CREATE INDEX idx_people_tags_tag ON dashboard.people_tags(tag_id);

-- ============================================================================
-- TASKS TABLE
-- Personal to-do items with GTD support
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.tasks (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic
    title TEXT NOT NULL,
    description TEXT,

    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'waiting', 'someday')),
    priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),

    -- GTD contexts
    energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high', NULL)),
    time_estimate INTEGER, -- minutes
    context TEXT[], -- '@home', '@work', '@phone', '@computer', etc.

    -- Dates
    due_date DATE,
    due_time TIME,
    start_date DATE,
    reminder_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- My Day feature
    is_my_day BOOLEAN DEFAULT FALSE,
    my_day_date DATE,

    -- Flags
    is_important BOOLEAN DEFAULT FALSE,

    -- Recurrence (iCal RRULE format)
    recurrence_rule TEXT,
    recurrence_parent_id INTEGER REFERENCES dashboard.tasks(id) ON DELETE SET NULL,

    -- Relations
    project_id INTEGER REFERENCES dashboard.projects(id) ON DELETE SET NULL,
    job_id INTEGER, -- Reference to business.jobs (cross-schema)
    parent_id INTEGER REFERENCES dashboard.tasks(id) ON DELETE CASCADE,

    -- Display
    sort_order INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user ON dashboard.tasks(user_id);
CREATE INDEX idx_tasks_status ON dashboard.tasks(status);
CREATE INDEX idx_tasks_due_date ON dashboard.tasks(due_date);
CREATE INDEX idx_tasks_my_day ON dashboard.tasks(is_my_day, my_day_date);
CREATE INDEX idx_tasks_project ON dashboard.tasks(project_id);
CREATE INDEX idx_tasks_job ON dashboard.tasks(job_id);
CREATE INDEX idx_tasks_parent ON dashboard.tasks(parent_id);

-- ============================================================================
-- TASK_TAGS TABLE
-- Many-to-many relationship between tasks and tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.task_tags (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES dashboard.tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES dashboard.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(task_id, tag_id)
);

CREATE INDEX idx_task_tags_task ON dashboard.task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON dashboard.task_tags(tag_id);

-- ============================================================================
-- TASK_PEOPLE TABLE
-- Links people to tasks (collaborators, assignees, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.task_people (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES dashboard.tasks(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES dashboard.people(id) ON DELETE CASCADE,
    role TEXT, -- 'assigned', 'collaborator', 'waiting_on'
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(task_id, person_id)
);

CREATE INDEX idx_task_people_task ON dashboard.task_people(task_id);
CREATE INDEX idx_task_people_person ON dashboard.task_people(person_id);

-- ============================================================================
-- NOTES TABLE
-- Full Ultimate Brain note types with rich linking
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.notes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic Info
    title TEXT NOT NULL,
    content TEXT,

    -- Type (full Ultimate Brain set)
    type TEXT DEFAULT 'note' CHECK (type IN (
        'note',       -- General note
        'journal',    -- Daily journal entry
        'meeting',    -- Meeting notes
        'web_clip',   -- Saved web content
        'idea',       -- Brainstorm/idea
        'reference',  -- Reference material
        'voice_note', -- Transcribed voice note
        'book',       -- Book notes
        'lecture',    -- Lecture/course notes
        'plan',       -- Planning document
        'recipe'      -- Recipe (for Jake's side interest)
    )),

    -- For web clips
    source_url TEXT,

    -- For voice notes
    audio_url TEXT,
    duration_seconds INTEGER,

    -- For meeting notes
    meeting_date TIMESTAMPTZ,
    attendees TEXT[],

    -- Display
    is_favorite BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Direct relations (single project/event link)
    project_id INTEGER REFERENCES dashboard.projects(id) ON DELETE SET NULL,

    -- Metadata
    word_count INTEGER DEFAULT 0,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user ON dashboard.notes(user_id);
CREATE INDEX idx_notes_type ON dashboard.notes(type);
CREATE INDEX idx_notes_project ON dashboard.notes(project_id);
CREATE INDEX idx_notes_created_at ON dashboard.notes(created_at);

-- ============================================================================
-- NOTE_TAGS TABLE
-- Many-to-many relationship between notes and tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.note_tags (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES dashboard.notes(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES dashboard.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(note_id, tag_id)
);

CREATE INDEX idx_note_tags_note ON dashboard.note_tags(note_id);
CREATE INDEX idx_note_tags_tag ON dashboard.note_tags(tag_id);

-- ============================================================================
-- NOTE_LINKS TABLE (Polymorphic)
-- Notes can link to tasks, events, projects, jobs, or people
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.note_links (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES dashboard.notes(id) ON DELETE CASCADE,
    linkable_type TEXT NOT NULL CHECK (linkable_type IN ('task', 'event', 'project', 'job', 'person')),
    linkable_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(note_id, linkable_type, linkable_id)
);

CREATE INDEX idx_note_links_note ON dashboard.note_links(note_id);
CREATE INDEX idx_note_links_target ON dashboard.note_links(linkable_type, linkable_id);

-- ============================================================================
-- NOTE_MEDIA TABLE
-- Attachments and media for notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.note_media (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES dashboard.notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_note_media_note ON dashboard.note_media(note_id);

-- ============================================================================
-- INBOX_ITEMS TABLE
-- Quick capture for later processing (GTD inbox)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.inbox_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    source TEXT DEFAULT 'manual', -- 'manual', 'voice', 'email', 'chrome_extension'
    source_url TEXT,

    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,

    -- What it became after processing
    converted_to_type TEXT CHECK (converted_to_type IN ('task', 'note', 'project', 'event', NULL)),
    converted_to_id INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbox_user ON dashboard.inbox_items(user_id);
CREATE INDEX idx_inbox_processed ON dashboard.inbox_items(processed);

-- ============================================================================
-- CONVERSATIONS TABLE
-- AI chat conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT,
    summary TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON dashboard.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON dashboard.conversations(created_at);

-- ============================================================================
-- MESSAGES TABLE
-- Messages within conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES dashboard.conversations(id) ON DELETE CASCADE,

    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    model_name TEXT,

    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,

    -- Tool usage
    tool_calls JSONB,
    tool_results JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON dashboard.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON dashboard.messages(created_at);

-- ============================================================================
-- USER_INTEGRATIONS TABLE
-- OAuth tokens and integration settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.user_integrations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    provider TEXT NOT NULL, -- 'google', 'notion', 'todoist', etc.
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, provider)
);

CREATE INDEX idx_user_integrations_user ON dashboard.user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON dashboard.user_integrations(provider);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION dashboard.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON dashboard.user_profiles
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON dashboard.tags
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON dashboard.goals
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON dashboard.projects
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_people_updated_at
    BEFORE UPDATE ON dashboard.people
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON dashboard.tasks
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON dashboard.notes
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON dashboard.conversations
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

CREATE TRIGGER update_user_integrations_updated_at
    BEFORE UPDATE ON dashboard.user_integrations
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Each user can only see their own data
-- ============================================================================
ALTER TABLE dashboard.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard.user_integrations ENABLE ROW LEVEL SECURITY;

-- User profiles: users can see/edit their own profile
CREATE POLICY "Users can view own profile"
    ON dashboard.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON dashboard.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Standard user-owned tables policy
CREATE POLICY "Users own their tags"
    ON dashboard.tags FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their goals"
    ON dashboard.goals FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their projects"
    ON dashboard.projects FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their people"
    ON dashboard.people FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their tasks"
    ON dashboard.tasks FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their notes"
    ON dashboard.notes FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their inbox items"
    ON dashboard.inbox_items FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their conversations"
    ON dashboard.conversations FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users own their integrations"
    ON dashboard.user_integrations FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE BYPASS
-- The service role key bypasses RLS for admin/backend operations
-- ============================================================================
-- Note: Service role automatically bypasses RLS in Supabase
