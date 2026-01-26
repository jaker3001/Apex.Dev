-- ============================================================================
-- Calendar Events Table
-- Local calendar event storage for standalone calendar functionality
-- ============================================================================

-- ============================================================================
-- EVENTS TABLE
-- Calendar events stored locally (independent of Google Calendar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    timezone TEXT DEFAULT 'America/Denver',

    -- Recurrence (iCal RRULE format, for future use)
    recurrence_rule TEXT,
    recurrence_parent_id INTEGER REFERENCES dashboard.events(id) ON DELETE CASCADE,

    -- Display
    color TEXT,  -- Hex color for calendar display

    -- Relations
    project_id INTEGER REFERENCES dashboard.projects(id) ON DELETE SET NULL,
    job_id INTEGER,  -- Reference to business.jobs (cross-schema)

    -- External sync (for future Google Calendar integration)
    external_id TEXT,  -- Google Calendar event ID if synced
    external_calendar_id TEXT,  -- Google Calendar ID if synced
    external_link TEXT,  -- Link to external calendar event
    last_synced_at TIMESTAMPTZ,

    -- Metadata
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure end is after start
    CONSTRAINT events_end_after_start CHECK (end_time >= start_time)
);

-- Indexes for common queries
CREATE INDEX idx_events_user ON dashboard.events(user_id);
CREATE INDEX idx_events_start_time ON dashboard.events(start_time);
CREATE INDEX idx_events_end_time ON dashboard.events(end_time);
CREATE INDEX idx_events_user_time ON dashboard.events(user_id, start_time, end_time);
CREATE INDEX idx_events_project ON dashboard.events(project_id);
CREATE INDEX idx_events_job ON dashboard.events(job_id);
CREATE INDEX idx_events_external ON dashboard.events(external_id);

-- ============================================================================
-- TRIGGER FOR updated_at
-- ============================================================================
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON dashboard.events
    FOR EACH ROW EXECUTE FUNCTION dashboard.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE dashboard.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their events"
    ON dashboard.events FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- EVENT REMINDERS TABLE (for future use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard.event_reminders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES dashboard.events(id) ON DELETE CASCADE,

    -- Reminder timing
    remind_at TIMESTAMPTZ NOT NULL,
    minutes_before INTEGER NOT NULL,  -- Original offset for display

    -- Status
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_reminders_event ON dashboard.event_reminders(event_id);
CREATE INDEX idx_event_reminders_remind_at ON dashboard.event_reminders(remind_at);
CREATE INDEX idx_event_reminders_pending ON dashboard.event_reminders(remind_at) WHERE sent = FALSE;

-- RLS for reminders
ALTER TABLE dashboard.event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their event reminders"
    ON dashboard.event_reminders FOR ALL
    USING (
        event_id IN (
            SELECT id FROM dashboard.events WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- SEQUENCE PERMISSIONS
-- Required for INSERT operations with auto-increment IDs
-- (ALTER DEFAULT PRIVILEGES only applies to sequences created afterward)
-- ============================================================================
GRANT USAGE, SELECT ON SEQUENCE dashboard.events_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE dashboard.event_reminders_id_seq TO authenticated, service_role;
