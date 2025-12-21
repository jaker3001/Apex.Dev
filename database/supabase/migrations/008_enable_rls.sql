-- =====================================================================
-- Migration 008: Enable Row Level Security (RLS)
-- =====================================================================
-- Purpose: Enable RLS and create security policies for multi-user isolation
-- Dependencies: 007_create_functions.sql
-- Rollback: ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
--           DROP POLICY IF EXISTS <policy_name> ON <table_name>;
-- =====================================================================

-- =====================================================================
-- DASHBOARD SCHEMA RLS POLICIES
-- =====================================================================

SET search_path TO dashboard, public;

-- =====================================================================
-- USERS TABLE
-- Users can only read their own profile
-- Admins can read all users
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own
    ON users FOR SELECT
    USING (id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY users_select_admin
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role = 'admin'
        )
    );

CREATE POLICY users_update_own
    ON users FOR UPDATE
    USING (id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- TAGS TABLE
-- Users can only see/modify their own tags
-- =====================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_all_own
    ON tags FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- GOALS TABLE
-- Users can only see/modify their own goals
-- =====================================================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY goals_all_own
    ON goals FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- MILESTONES TABLE
-- Users can see/modify milestones for their own goals
-- =====================================================================

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY milestones_all_own_goals
    ON milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = milestones.goal_id
              AND goals.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- PROJECTS TABLE (Personal)
-- Users can only see/modify their own projects
-- =====================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_all_own
    ON projects FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- PROJECT MILESTONES
-- Users can see/modify milestones for their own projects
-- =====================================================================

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_milestones_all_own_projects
    ON project_milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_milestones.project_id
              AND projects.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- PROJECT FINANCIALS
-- Users can see/modify financials for their own projects
-- =====================================================================

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_expenses_all_own
    ON project_expenses FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

ALTER TABLE project_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_income_all_own
    ON project_income FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budgets_all_own_projects
    ON project_budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_budgets.project_id
              AND projects.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY expense_categories_all_own
    ON expense_categories FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- PEOPLE TABLE
-- Users can only see/modify their own contacts
-- =====================================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_all_own
    ON people FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- PEOPLE_TAGS (Junction)
-- =====================================================================

ALTER TABLE people_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_tags_all_own_people
    ON people_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM people
            WHERE people.id = people_tags.person_id
              AND people.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- PROJECT_PEOPLE (Junction)
-- =====================================================================

ALTER TABLE project_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_people_all_own_projects
    ON project_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_people.project_id
              AND projects.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- TASKS TABLE
-- Users can only see/modify their own tasks
-- =====================================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_all_own
    ON tasks FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- TASK_TAGS (Junction)
-- =====================================================================

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_tags_all_own_tasks
    ON task_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_tags.task_id
              AND tasks.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- TASK_PEOPLE (Junction)
-- =====================================================================

ALTER TABLE task_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_people_all_own_tasks
    ON task_people FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_people.task_id
              AND tasks.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- NOTES TABLE
-- Users can only see/modify their own notes
-- =====================================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_all_own
    ON notes FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- NOTE_TAGS (Junction)
-- =====================================================================

ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_tags_all_own_notes
    ON note_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_tags.note_id
              AND notes.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- NOTE_LINKS (Junction)
-- =====================================================================

ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_links_all_own_notes
    ON note_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_links.source_note_id
              AND notes.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- NOTE_MEDIA
-- =====================================================================

ALTER TABLE note_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_media_all_own_notes
    ON note_media FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes
            WHERE notes.id = note_media.note_id
              AND notes.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- WORK_SESSIONS
-- Users can only see/modify their own work sessions
-- =====================================================================

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_sessions_all_own
    ON work_sessions FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- USER_INTEGRATIONS
-- Users can only see/modify their own integrations
-- =====================================================================

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_integrations_all_own
    ON user_integrations FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- CONVERSATIONS
-- Users can only see/modify their own conversations
-- =====================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_all_own
    ON conversations FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- MESSAGES
-- Users can see messages from their own conversations
-- =====================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_all_own_conversations
    ON messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- AI_TASKS
-- Users can see AI tasks from their own conversations
-- =====================================================================

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_tasks_select_own_conversations
    ON ai_tasks FOR SELECT
    USING (
        conversation_id IS NULL
        OR EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = ai_tasks.conversation_id
              AND conversations.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- Admins can see all AI tasks for analytics
CREATE POLICY ai_tasks_select_admin
    ON ai_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role = 'admin'
        )
    );

-- =====================================================================
-- AGENTS
-- All users can read agents, only admins can modify
-- =====================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY agents_select_all
    ON agents FOR SELECT
    USING (TRUE);

CREATE POLICY agents_modify_admin
    ON agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role = 'admin'
        )
    );

-- =====================================================================
-- PROJECT_ACTIVITY
-- Users can see activity for their own projects
-- =====================================================================

ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_activity_all_own_projects
    ON project_activity FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_activity.project_id
              AND projects.user_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

-- =====================================================================
-- NOTIFICATIONS
-- Users can only see/modify their own notifications
-- =====================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_all_own
    ON notifications FOR ALL
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- =====================================================================
-- BUSINESS SCHEMA RLS POLICIES
-- =====================================================================
-- Note: Business data is shared across users in the organization.
-- RLS policies are more permissive but still enforce role-based access.
-- =====================================================================

SET search_path TO business, public;

-- =====================================================================
-- ORGANIZATIONS
-- All authenticated users can read, only admins/managers can modify
-- =====================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select_all
    ON organizations FOR SELECT
    USING (TRUE);  -- All authenticated users can read

CREATE POLICY organizations_modify_admin_manager
    ON organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

-- =====================================================================
-- CONTACTS
-- All authenticated users can read, only admins/managers can modify
-- =====================================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select_all
    ON contacts FOR SELECT
    USING (TRUE);

CREATE POLICY contacts_modify_admin_manager
    ON contacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

-- =====================================================================
-- CLIENTS
-- All authenticated users can read, only admins/managers can modify
-- =====================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_all
    ON clients FOR SELECT
    USING (TRUE);

CREATE POLICY clients_modify_admin_manager
    ON clients FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

-- =====================================================================
-- JOBS
-- All authenticated users can read, all can create/update, only admins can delete
-- =====================================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select_all
    ON jobs FOR SELECT
    USING (TRUE);

CREATE POLICY jobs_insert_all
    ON jobs FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY jobs_update_all
    ON jobs FOR UPDATE
    USING (TRUE);

CREATE POLICY jobs_delete_admin
    ON jobs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role = 'admin'
        )
    );

-- =====================================================================
-- PROJECT_CONTACTS
-- All authenticated users can read/modify
-- =====================================================================

ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_contacts_all_authenticated
    ON project_contacts FOR ALL
    USING (TRUE);

-- =====================================================================
-- ESTIMATES
-- All authenticated users can read/modify
-- =====================================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY estimates_all_authenticated
    ON estimates FOR ALL
    USING (TRUE);

-- =====================================================================
-- PAYMENTS
-- All authenticated users can read, only admins/managers can modify
-- =====================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_all
    ON payments FOR SELECT
    USING (TRUE);

CREATE POLICY payments_modify_admin_manager
    ON payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

-- =====================================================================
-- NOTES (Job)
-- All authenticated users can read/modify
-- =====================================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_notes_all_authenticated
    ON notes FOR ALL
    USING (TRUE);

-- =====================================================================
-- MEDIA
-- All authenticated users can read/modify
-- =====================================================================

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_all_authenticated
    ON media FOR ALL
    USING (TRUE);

-- =====================================================================
-- RECEIPTS
-- All authenticated users can read, only admins/managers can modify
-- =====================================================================

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipts_select_all
    ON receipts FOR SELECT
    USING (TRUE);

CREATE POLICY receipts_modify_admin_manager
    ON receipts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

-- =====================================================================
-- WORK_ORDERS
-- All authenticated users can read/modify
-- =====================================================================

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_all_authenticated
    ON work_orders FOR ALL
    USING (TRUE);

-- =====================================================================
-- LABOR_ENTRIES
-- All authenticated users can read/create their own, admins/managers can see all
-- =====================================================================

ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY labor_entries_select_own
    ON labor_entries FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY labor_entries_select_admin_manager
    ON labor_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY labor_entries_insert_own
    ON labor_entries FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY labor_entries_update_own
    ON labor_entries FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY labor_entries_delete_admin
    ON labor_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM dashboard.users
            WHERE id = current_setting('app.current_user_id', TRUE)::UUID
              AND role = 'admin'
        )
    );

-- =====================================================================
-- ACTIVITY_LOG
-- All authenticated users can read, system creates entries
-- =====================================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_log_select_all
    ON activity_log FOR SELECT
    USING (TRUE);

-- Only allow inserts (via triggers), no manual modifications
CREATE POLICY activity_log_insert_system
    ON activity_log FOR INSERT
    WITH CHECK (TRUE);

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON POLICY users_select_own ON dashboard.users IS 'Users can read their own profile';
COMMENT ON POLICY users_select_admin ON dashboard.users IS 'Admins can read all user profiles';
COMMENT ON POLICY tasks_all_own ON dashboard.tasks IS 'Users can only access their own tasks';
COMMENT ON POLICY notes_all_own ON dashboard.notes IS 'Users can only access their own notes';
COMMENT ON POLICY jobs_select_all ON business.jobs IS 'All authenticated users can read jobs (shared business data)';
COMMENT ON POLICY jobs_delete_admin ON business.jobs IS 'Only admins can delete jobs';
