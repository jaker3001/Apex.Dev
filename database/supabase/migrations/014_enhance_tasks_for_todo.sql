-- =====================================================================
-- Migration 014: Enhance Tasks for Microsoft To Do Features
-- =====================================================================
-- Purpose: Add reminder, notes, importance, and task list features
-- Dependencies: 004_create_dashboard_tables.sql
-- Rollback: See bottom of file
-- =====================================================================

SET search_path TO dashboard, public;

-- =====================================================================
-- ADD MISSING COLUMNS TO TASKS TABLE
-- =====================================================================

-- Reminders (separate from due date)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Notes field (separate from description - MS To Do pattern)
-- description = title/quick notes shown in list view
-- notes = detailed markdown notes shown in detail panel
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Important flag (star in MS To Do)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE;

-- My Day suggestion dismissed (prevent re-suggesting)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS my_day_dismissed_at DATE;

-- Attachments support (links to files)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB;

-- =====================================================================
-- TASK LISTS TABLE (Custom Lists like in MS To Do)
-- =====================================================================

CREATE TABLE IF NOT EXISTS task_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    icon TEXT,              -- emoji or icon name (e.g., 'list', 'briefcase')
    color TEXT,             -- hex color (e.g., '#3b82f6')

    -- System vs custom lists
    is_system BOOLEAN DEFAULT FALSE,  -- My Day, Important, Planned are system lists
    system_type TEXT,       -- 'my_day', 'important', 'planned', 'inbox', 'assigned', 'all'

    -- Display preferences
    sort_order INTEGER DEFAULT 0,
    is_collapsed BOOLEAN DEFAULT FALSE,
    show_completed BOOLEAN DEFAULT TRUE,

    -- Grouping (for list groups in sidebar)
    group_name TEXT,        -- Optional group name

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_list_name UNIQUE(user_id, name)
);

-- Add list_id to tasks (nullable - tasks can exist without a list)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES task_lists(id) ON DELETE SET NULL;

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Task queries
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON dashboard.tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_important ON dashboard.tasks(is_important) WHERE is_important = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_pending ON dashboard.tasks(reminder_at)
    WHERE reminder_at IS NOT NULL AND reminder_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_my_day ON dashboard.tasks(user_id, is_my_day)
    WHERE is_my_day = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON dashboard.tasks(due_date)
    WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON dashboard.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON dashboard.tasks(user_id, status);

-- Task list queries
CREATE INDEX IF NOT EXISTS idx_task_lists_user ON dashboard.task_lists(user_id, sort_order);

-- =====================================================================
-- RLS POLICIES FOR TASK_LISTS
-- =====================================================================

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own lists
CREATE POLICY task_lists_select_own ON task_lists
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Users can only insert their own lists
CREATE POLICY task_lists_insert_own ON task_lists
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Users can only update their own lists
CREATE POLICY task_lists_update_own ON task_lists
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Users can only delete their own non-system lists
CREATE POLICY task_lists_delete_own ON task_lists
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID AND is_system = FALSE);

-- =====================================================================
-- FUNCTION: Create default lists for new user
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.create_default_task_lists(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create default "Tasks" list
    INSERT INTO dashboard.task_lists (user_id, name, icon, is_system, system_type, sort_order)
    VALUES (p_user_id, 'Tasks', 'home', FALSE, NULL, 0)
    ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: Get smart list counts for a user
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.get_smart_list_counts(p_user_id UUID)
RETURNS TABLE(
    list_type TEXT,
    task_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH counts AS (
        SELECT
            CASE
                WHEN t.is_my_day AND t.my_day_date = CURRENT_DATE THEN 'my_day'
                WHEN t.is_important THEN 'important'
                WHEN t.due_date IS NOT NULL THEN 'planned'
                ELSE 'inbox'
            END as smart_list,
            COUNT(*) as cnt
        FROM dashboard.tasks t
        WHERE t.user_id = p_user_id
            AND t.status NOT IN ('done', 'cancelled')
            AND t.parent_task_id IS NULL
        GROUP BY smart_list
    )
    SELECT smart_list, cnt FROM counts;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: Handle task completion with recurrence
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.complete_recurring_task(p_task_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_task dashboard.tasks%ROWTYPE;
    v_new_task_id UUID;
    v_next_due_date DATE;
BEGIN
    -- Get the task
    SELECT * INTO v_task
    FROM dashboard.tasks
    WHERE id = p_task_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found';
    END IF;

    -- Mark current task as completed
    UPDATE dashboard.tasks
    SET status = 'done', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_task_id;

    -- If recurring, create next occurrence
    IF v_task.recur_interval IS NOT NULL AND v_task.recur_unit IS NOT NULL THEN
        -- Calculate next due date
        v_next_due_date := CASE v_task.recur_unit
            WHEN 'days' THEN COALESCE(v_task.due_date, CURRENT_DATE) + (v_task.recur_interval || ' days')::INTERVAL
            WHEN 'weeks' THEN COALESCE(v_task.due_date, CURRENT_DATE) + (v_task.recur_interval || ' weeks')::INTERVAL
            WHEN 'months' THEN COALESCE(v_task.due_date, CURRENT_DATE) + (v_task.recur_interval || ' months')::INTERVAL
            WHEN 'years' THEN COALESCE(v_task.due_date, CURRENT_DATE) + (v_task.recur_interval || ' years')::INTERVAL
        END;

        -- Create new task
        INSERT INTO dashboard.tasks (
            user_id, title, description, notes, list_id, project_id, parent_task_id,
            status, priority, due_date, due_time, reminder_at,
            is_important, recur_interval, recur_unit, recur_days, sort_order
        )
        VALUES (
            v_task.user_id, v_task.title, v_task.description, v_task.notes,
            v_task.list_id, v_task.project_id, v_task.parent_task_id,
            'todo', v_task.priority, v_next_due_date, v_task.due_time,
            CASE WHEN v_task.reminder_at IS NOT NULL
                THEN v_next_due_date + (v_task.reminder_at::TIME)::INTERVAL
                ELSE NULL
            END,
            v_task.is_important, v_task.recur_interval, v_task.recur_unit,
            v_task.recur_days, v_task.sort_order
        )
        RETURNING id INTO v_new_task_id;

        RETURN v_new_task_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: Add task to My Day
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.add_to_my_day(p_task_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE dashboard.tasks
    SET is_my_day = TRUE,
        my_day_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_task_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION: Remove task from My Day
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.remove_from_my_day(p_task_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE dashboard.tasks
    SET is_my_day = FALSE,
        my_day_dismissed_at = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_task_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- TRIGGER: Update updated_at on task_lists
-- =====================================================================

CREATE OR REPLACE FUNCTION dashboard.update_task_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_lists_updated_at ON dashboard.task_lists;
CREATE TRIGGER task_lists_updated_at
    BEFORE UPDATE ON dashboard.task_lists
    FOR EACH ROW
    EXECUTE FUNCTION dashboard.update_task_lists_updated_at();

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE task_lists IS 'Custom task lists (like MS To Do lists)';
COMMENT ON COLUMN task_lists.system_type IS 'For virtual system lists: my_day, important, planned, inbox, assigned, all';
COMMENT ON COLUMN tasks.reminder_at IS 'When to send a reminder notification';
COMMENT ON COLUMN tasks.is_important IS 'Starred/important flag (MS To Do Important list)';
COMMENT ON COLUMN tasks.notes IS 'Detailed markdown notes (separate from description)';
COMMENT ON COLUMN tasks.attachments IS 'JSON array of attachment objects [{name, url, type}]';

-- =====================================================================
-- ROLLBACK COMMANDS (run manually if needed)
-- =====================================================================
/*
DROP TRIGGER IF EXISTS task_lists_updated_at ON dashboard.task_lists;
DROP FUNCTION IF EXISTS dashboard.update_task_lists_updated_at();
DROP FUNCTION IF EXISTS dashboard.remove_from_my_day(UUID, UUID);
DROP FUNCTION IF EXISTS dashboard.add_to_my_day(UUID, UUID);
DROP FUNCTION IF EXISTS dashboard.complete_recurring_task(UUID, UUID);
DROP FUNCTION IF EXISTS dashboard.get_smart_list_counts(UUID);
DROP FUNCTION IF EXISTS dashboard.create_default_task_lists(UUID);
DROP POLICY IF EXISTS task_lists_delete_own ON task_lists;
DROP POLICY IF EXISTS task_lists_update_own ON task_lists;
DROP POLICY IF EXISTS task_lists_insert_own ON task_lists;
DROP POLICY IF EXISTS task_lists_select_own ON task_lists;
DROP INDEX IF EXISTS idx_task_lists_user;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_parent;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_my_day;
DROP INDEX IF EXISTS idx_tasks_reminder_pending;
DROP INDEX IF EXISTS idx_tasks_is_important;
DROP INDEX IF EXISTS idx_tasks_list_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS list_id;
DROP TABLE IF EXISTS task_lists;
ALTER TABLE tasks DROP COLUMN IF EXISTS attachments;
ALTER TABLE tasks DROP COLUMN IF EXISTS my_day_dismissed_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS is_important;
ALTER TABLE tasks DROP COLUMN IF EXISTS notes;
ALTER TABLE tasks DROP COLUMN IF EXISTS reminder_sent;
ALTER TABLE tasks DROP COLUMN IF EXISTS reminder_at;
*/
