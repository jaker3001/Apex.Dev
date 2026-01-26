-- ============================================================================
-- Calendars Table
-- Multi-calendar support for organizing events
-- ============================================================================

-- ============================================================================
-- CALENDARS TABLE
-- Users can create multiple calendars to organize their events
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.calendars (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Calendar Info
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    description TEXT,

    -- Display Settings
    is_visible BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only have one calendar with a given name
    UNIQUE(user_id, name)
);

-- Indexes for common queries
CREATE INDEX idx_calendars_user ON dashboard.calendars(user_id);
CREATE INDEX idx_calendars_user_visible ON dashboard.calendars(user_id, is_visible);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================
CREATE TRIGGER update_calendars_updated_at
    BEFORE UPDATE ON dashboard.calendars
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE dashboard.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their calendars"
    ON dashboard.calendars FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- ADD CALENDAR_ID TO EVENTS TABLE
-- Links events to specific calendars
-- ============================================================================
ALTER TABLE dashboard.events
ADD COLUMN calendar_id INTEGER REFERENCES dashboard.calendars(id) ON DELETE SET NULL;

CREATE INDEX idx_events_calendar ON dashboard.events(calendar_id);

-- ============================================================================
-- ADD EVENT_ID TO TASKS TABLE
-- Links tasks to calendar events (for scheduled tasks)
-- ============================================================================
ALTER TABLE dashboard.tasks
ADD COLUMN event_id INTEGER REFERENCES dashboard.events(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_event ON dashboard.tasks(event_id);

-- ============================================================================
-- SEQUENCE PERMISSIONS
-- Required for INSERT operations with auto-increment IDs
-- (ALTER DEFAULT PRIVILEGES only applies to sequences created afterward)
-- ============================================================================
GRANT USAGE, SELECT ON SEQUENCE dashboard.calendars_id_seq TO authenticated, service_role;
