-- =====================================================================
-- Migration 007: Create Functions and Triggers
-- =====================================================================
-- Purpose: Create helper functions, triggers, and validation logic
-- Dependencies: 006_create_indexes.sql
-- Rollback: DROP FUNCTION IF EXISTS <function_name> CASCADE;
-- =====================================================================

-- =====================================================================
-- TRIGGER FUNCTION: Update updated_at timestamp
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates updated_at timestamp on row modification';

-- =====================================================================
-- TRIGGER FUNCTION: Validate cross-schema reference
-- Used for dashboard.tasks.job_id -> business.jobs
-- =====================================================================

CREATE OR REPLACE FUNCTION validate_cross_schema_job_reference()
RETURNS TRIGGER AS $$
BEGIN
    -- If job_id is set, verify it exists in business.jobs
    IF NEW.job_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM business.jobs WHERE id = NEW.job_id) THEN
            RAISE EXCEPTION 'Invalid job_id: job with id % does not exist', NEW.job_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_cross_schema_job_reference() IS 'Validates that job_id references a valid business.jobs record';

-- =====================================================================
-- TRIGGER FUNCTION: Auto-update word count for notes
-- =====================================================================

CREATE OR REPLACE FUNCTION update_note_word_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Count words in content (split by whitespace)
    NEW.word_count = array_length(regexp_split_to_array(COALESCE(NEW.content, ''), '\s+'), 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_note_word_count() IS 'Automatically updates word_count when note content changes';

-- =====================================================================
-- TRIGGER FUNCTION: Extract note links from markdown
-- Parses [[Note Title]] syntax and updates note_links table
-- =====================================================================

CREATE OR REPLACE FUNCTION extract_note_links()
RETURNS TRIGGER AS $$
DECLARE
    link_text TEXT;
    target_note_id UUID;
BEGIN
    -- Delete existing links from this note
    DELETE FROM dashboard.note_links WHERE source_note_id = NEW.id;

    -- Extract all [[Note Title]] patterns from content
    FOR link_text IN
        SELECT unnest(regexp_matches(NEW.content, '\[\[([^\]]+)\]\]', 'g'))
    LOOP
        -- Find note with matching title
        SELECT id INTO target_note_id
        FROM dashboard.notes
        WHERE user_id = NEW.user_id
          AND title = link_text
          AND id != NEW.id
        LIMIT 1;

        -- Insert link if target found
        IF target_note_id IS NOT NULL THEN
            INSERT INTO dashboard.note_links (source_note_id, target_note_id)
            VALUES (NEW.id, target_note_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION extract_note_links() IS 'Parses [[Note Title]] syntax and maintains bidirectional links';

-- =====================================================================
-- TRIGGER FUNCTION: Increment conversation message count
-- =====================================================================

CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dashboard.conversations
    SET message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_conversation_message_count() IS 'Increments message count when new message is added';

-- =====================================================================
-- TRIGGER FUNCTION: Log project activity
-- =====================================================================

CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_description TEXT;
    current_user_id UUID;
BEGIN
    -- Get current user from session (if available via RLS context)
    current_user_id := current_setting('app.current_user_id', TRUE)::UUID;

    IF TG_OP = 'INSERT' THEN
        activity_description := 'Project created';
        INSERT INTO dashboard.project_activity (project_id, user_id, action, description)
        VALUES (NEW.id, current_user_id, 'created', activity_description);

    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF NEW.status != OLD.status THEN
            activity_description := format('Status changed from %s to %s', OLD.status, NEW.status);
            INSERT INTO dashboard.project_activity (project_id, user_id, action, description, old_value, new_value)
            VALUES (NEW.id, current_user_id, 'status_changed', activity_description, OLD.status::TEXT, NEW.status::TEXT);
        END IF;

        -- Log completion
        IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
            activity_description := 'Project completed';
            INSERT INTO dashboard.project_activity (project_id, user_id, action, description)
            VALUES (NEW.id, current_user_id, 'task_completed', activity_description);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_project_activity() IS 'Automatically logs project changes to activity table';

-- =====================================================================
-- TRIGGER FUNCTION: Log business activity
-- =====================================================================

CREATE OR REPLACE FUNCTION log_business_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_description TEXT;
    current_user_id UUID;
BEGIN
    -- Get current user from session
    current_user_id := current_setting('app.current_user_id', TRUE)::UUID;

    IF TG_OP = 'INSERT' THEN
        activity_description := 'Job created';
        INSERT INTO business.activity_log (project_id, user_id, action, description)
        VALUES (NEW.id, current_user_id, 'created', activity_description);

    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF NEW.status != OLD.status THEN
            activity_description := format('Status changed from %s to %s', OLD.status, NEW.status);
            INSERT INTO business.activity_log (project_id, user_id, action, description, old_value, new_value)
            VALUES (NEW.id, current_user_id, 'status_changed', activity_description, OLD.status::TEXT, NEW.status::TEXT);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_business_activity() IS 'Automatically logs job changes to activity table';

-- =====================================================================
-- SEARCH FUNCTION: Full-text search for notes
-- =====================================================================

CREATE OR REPLACE FUNCTION search_notes(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        LEFT(n.content, 200) AS content,
        GREATEST(
            similarity(n.title, p_query),
            similarity(n.content, p_query)
        ) AS similarity
    FROM dashboard.notes n
    WHERE n.user_id = p_user_id
      AND n.archived = FALSE
      AND (
          n.title % p_query
          OR n.content % p_query
      )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_notes IS 'Full-text search for notes using trigram similarity';

-- =====================================================================
-- SEARCH FUNCTION: Full-text search for tasks
-- =====================================================================

CREATE OR REPLACE FUNCTION search_tasks(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.title,
        LEFT(t.description, 200) AS description,
        GREATEST(
            similarity(t.title, p_query),
            similarity(COALESCE(t.description, ''), p_query)
        ) AS similarity
    FROM dashboard.tasks t
    WHERE t.user_id = p_user_id
      AND (
          t.title % p_query
          OR t.description % p_query
      )
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_tasks IS 'Full-text search for tasks using trigram similarity';

-- =====================================================================
-- SEARCH FUNCTION: Full-text search for jobs
-- =====================================================================

CREATE OR REPLACE FUNCTION search_jobs(
    p_query TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    job_number TEXT,
    address TEXT,
    similarity REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.id,
        j.job_number,
        j.address,
        GREATEST(
            similarity(j.job_number, p_query),
            similarity(j.address, p_query)
        ) AS similarity
    FROM business.jobs j
    WHERE
        j.job_number % p_query
        OR j.address % p_query
    ORDER BY similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_jobs IS 'Full-text search for jobs by job number or address';

-- =====================================================================
-- UTILITY FUNCTION: Get inbox task count
-- =====================================================================

CREATE OR REPLACE FUNCTION get_inbox_task_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO task_count
    FROM dashboard.tasks
    WHERE user_id = p_user_id
      AND project_id IS NULL
      AND due_date IS NULL
      AND (smart_list = 'inbox' OR smart_list IS NULL);

    RETURN task_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_inbox_task_count IS 'Returns count of tasks in inbox (unprocessed)';

-- =====================================================================
-- UTILITY FUNCTION: Get inbox note count
-- =====================================================================

CREATE OR REPLACE FUNCTION get_inbox_note_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    note_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO note_count
    FROM dashboard.notes n
    WHERE n.user_id = p_user_id
      AND n.type = 'note'
      AND n.archived = FALSE
      AND NOT EXISTS (
          SELECT 1 FROM dashboard.note_tags nt WHERE nt.note_id = n.id
      )
      AND n.project_id IS NULL;

    RETURN note_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_inbox_note_count IS 'Returns count of notes in inbox (untagged, no project)';

-- =====================================================================
-- UTILITY FUNCTION: Get area context (all related items)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_area_context(p_user_id UUID, p_tag_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tag', (SELECT row_to_json(t) FROM dashboard.tags t WHERE t.id = p_tag_id),
        'projects', (
            SELECT COALESCE(json_agg(p), '[]'::json)
            FROM dashboard.projects p
            WHERE p.user_id = p_user_id
              AND p.area_id = p_tag_id
              AND p.archived = FALSE
        ),
        'tasks', (
            SELECT COALESCE(json_agg(task), '[]'::json)
            FROM (
                SELECT t.*
                FROM dashboard.tasks t
                JOIN dashboard.task_tags tt ON t.id = tt.task_id
                WHERE t.user_id = p_user_id
                  AND tt.tag_id = p_tag_id
                  AND t.status != 'done'
                ORDER BY t.due_date NULLS LAST
                LIMIT 20
            ) task
        ),
        'notes', (
            SELECT COALESCE(json_agg(note), '[]'::json)
            FROM (
                SELECT n.*
                FROM dashboard.notes n
                JOIN dashboard.note_tags nt ON n.id = nt.note_id
                WHERE n.user_id = p_user_id
                  AND nt.tag_id = p_tag_id
                  AND n.archived = FALSE
                ORDER BY n.updated_at DESC
                LIMIT 20
            ) note
        ),
        'goals', (
            SELECT COALESCE(json_agg(g), '[]'::json)
            FROM dashboard.goals g
            WHERE g.user_id = p_user_id
              AND g.tag_id = p_tag_id
              AND g.archived = FALSE
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_area_context IS 'Returns all items related to an Area (projects, tasks, notes, goals)';

-- =====================================================================
-- APPLY TRIGGERS TO TABLES
-- =====================================================================

-- Dashboard Schema Triggers

-- Update updated_at on all tables with that column
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON dashboard.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON dashboard.tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_goals_updated_at
    BEFORE UPDATE ON dashboard.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_projects_updated_at
    BEFORE UPDATE ON dashboard.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_project_expenses_updated_at
    BEFORE UPDATE ON dashboard.project_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_project_income_updated_at
    BEFORE UPDATE ON dashboard.project_income
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_project_budgets_updated_at
    BEFORE UPDATE ON dashboard.project_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_people_updated_at
    BEFORE UPDATE ON dashboard.people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_tasks_updated_at
    BEFORE UPDATE ON dashboard.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_notes_updated_at
    BEFORE UPDATE ON dashboard.notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_integrations_updated_at
    BEFORE UPDATE ON dashboard.user_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_conversations_updated_at
    BEFORE UPDATE ON dashboard.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cross-schema validation
CREATE TRIGGER trigger_validate_task_job_reference
    BEFORE INSERT OR UPDATE ON dashboard.tasks
    FOR EACH ROW EXECUTE FUNCTION validate_cross_schema_job_reference();

-- Note-specific triggers
CREATE TRIGGER trigger_update_note_word_count
    BEFORE INSERT OR UPDATE ON dashboard.notes
    FOR EACH ROW EXECUTE FUNCTION update_note_word_count();

CREATE TRIGGER trigger_extract_note_links
    AFTER INSERT OR UPDATE ON dashboard.notes
    FOR EACH ROW EXECUTE FUNCTION extract_note_links();

-- Conversation triggers
CREATE TRIGGER trigger_increment_message_count
    AFTER INSERT ON dashboard.messages
    FOR EACH ROW EXECUTE FUNCTION increment_conversation_message_count();

-- Project activity logging
CREATE TRIGGER trigger_log_project_activity
    AFTER INSERT OR UPDATE ON dashboard.projects
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();

-- Business Schema Triggers

CREATE TRIGGER trigger_update_jobs_updated_at
    BEFORE UPDATE ON business.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_log_business_activity
    AFTER INSERT OR UPDATE ON business.jobs
    FOR EACH ROW EXECUTE FUNCTION log_business_activity();
