-- =====================================================================
-- Migration 006: Create Performance Indexes
-- =====================================================================
-- Purpose: Create indexes for common query patterns and foreign keys
-- Dependencies: 005_create_business_tables.sql
-- Rollback: DROP INDEX IF EXISTS <index_name>;
-- =====================================================================

-- =====================================================================
-- DASHBOARD SCHEMA INDEXES
-- =====================================================================

SET search_path TO dashboard, public;

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Tags (PARA)
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_parent_tag_id ON tags(parent_tag_id);
CREATE INDEX idx_tags_archived ON tags(archived);
CREATE INDEX idx_tags_user_type_archived ON tags(user_id, type, archived);

-- Goals
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_tag_id ON goals(tag_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

CREATE INDEX idx_milestones_goal_id ON milestones(goal_id);

-- Projects (Personal)
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_area_id ON projects(area_id);
CREATE INDEX idx_projects_goal_id ON projects(goal_id);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_projects_archived ON projects(archived);

CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_project_expenses_project_id ON project_expenses(project_id);
CREATE INDEX idx_project_expenses_user_id ON project_expenses(user_id);
CREATE INDEX idx_project_expenses_transaction_date ON project_expenses(transaction_date);
CREATE INDEX idx_project_income_project_id ON project_income(project_id);
CREATE INDEX idx_project_income_user_id ON project_income(user_id);
CREATE INDEX idx_project_income_transaction_date ON project_income(transaction_date);
CREATE INDEX idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);

-- People (Personal Contacts)
CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_people_archived ON people(archived);
CREATE INDEX idx_people_tags_person_id ON people_tags(person_id);
CREATE INDEX idx_people_tags_tag_id ON people_tags(tag_id);
CREATE INDEX idx_project_people_project_id ON project_people(project_id);
CREATE INDEX idx_project_people_person_id ON project_people(person_id);

-- Tasks
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_job_id ON tasks(job_id);
CREATE INDEX idx_tasks_is_my_day ON tasks(is_my_day);
CREATE INDEX idx_tasks_my_day_date ON tasks(my_day_date);
CREATE INDEX idx_tasks_smart_list ON tasks(smart_list);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_my_day ON tasks(user_id, is_my_day) WHERE is_my_day = TRUE;
CREATE INDEX idx_tasks_inbox ON tasks(user_id) WHERE project_id IS NULL AND due_date IS NULL;

CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX idx_task_people_task_id ON task_people(task_id);
CREATE INDEX idx_task_people_person_id ON task_people(person_id);

-- Notes (PKM)
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_job_id ON notes(job_id);
CREATE INDEX idx_notes_archived ON notes(archived);
CREATE INDEX idx_notes_user_archived ON notes(user_id, archived);
-- Full-text search index on title and content
CREATE INDEX idx_notes_title_trgm ON notes USING gin(title gin_trgm_ops);
CREATE INDEX idx_notes_content_trgm ON notes USING gin(content gin_trgm_ops);

CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX idx_note_links_source_note_id ON note_links(source_note_id);
CREATE INDEX idx_note_links_target_note_id ON note_links(target_note_id);
CREATE INDEX idx_note_media_note_id ON note_media(note_id);

-- Work Sessions
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_task_id ON work_sessions(task_id);
CREATE INDEX idx_work_sessions_start_time ON work_sessions(start_time);

-- User Integrations
CREATE INDEX idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider);

-- AI Assistant
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_is_active ON conversations(is_active);
CREATE INDEX idx_conversations_user_active ON conversations(user_id, is_active);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

CREATE INDEX idx_ai_tasks_conversation_id ON ai_tasks(conversation_id);
CREATE INDEX idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX idx_ai_tasks_category ON ai_tasks(category);
CREATE INDEX idx_ai_tasks_timestamp ON ai_tasks(timestamp);

-- Project Activity
CREATE INDEX idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX idx_project_activity_user_id ON project_activity(user_id);
CREATE INDEX idx_project_activity_created_at ON project_activity(created_at);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================================
-- BUSINESS SCHEMA INDEXES
-- =====================================================================

SET search_path TO business, public;

-- Organizations
CREATE INDEX idx_organizations_org_type ON organizations(org_type);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- Contacts
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_active ON contacts(is_active);

-- Clients
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- Jobs
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_insurance_org_id ON jobs(insurance_org_id);
CREATE INDEX idx_jobs_date_of_loss ON jobs(date_of_loss);
CREATE INDEX idx_jobs_inspection_date ON jobs(inspection_date);
CREATE INDEX idx_jobs_cos_date ON jobs(cos_date);
CREATE INDEX idx_jobs_ready_to_invoice ON jobs(ready_to_invoice);
CREATE INDEX idx_jobs_status_ready_invoice ON jobs(status, ready_to_invoice);
-- Full-text search on address
CREATE INDEX idx_jobs_address_trgm ON jobs USING gin(address gin_trgm_ops);

-- Project Contacts
CREATE INDEX idx_project_contacts_project_id ON project_contacts(project_id);
CREATE INDEX idx_project_contacts_contact_id ON project_contacts(contact_id);
CREATE INDEX idx_project_contacts_role ON project_contacts(role);

-- Estimates
CREATE INDEX idx_estimates_project_id ON estimates(project_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimate_type ON estimates(estimate_type);

-- Payments
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_estimate_id ON payments(estimate_id);
CREATE INDEX idx_payments_received_date ON payments(received_date);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);

-- Notes (Job)
CREATE INDEX idx_business_notes_project_id ON notes(project_id);
CREATE INDEX idx_business_notes_user_id ON notes(user_id);
CREATE INDEX idx_business_notes_note_type ON notes(note_type);
CREATE INDEX idx_business_notes_created_at ON notes(created_at);

-- Media
CREATE INDEX idx_media_project_id ON media(project_id);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_uploaded_at ON media(uploaded_at);

-- Receipts
CREATE INDEX idx_receipts_project_id ON receipts(project_id);
CREATE INDEX idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX idx_receipts_category ON receipts(category);

-- Work Orders
CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_vendor_org_id ON work_orders(vendor_org_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);

-- Labor Entries
CREATE INDEX idx_labor_entries_project_id ON labor_entries(project_id);
CREATE INDEX idx_labor_entries_user_id ON labor_entries(user_id);
CREATE INDEX idx_labor_entries_date ON labor_entries(date);

-- Activity Log
CREATE INDEX idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON INDEX dashboard.idx_tasks_inbox IS 'Optimized index for GTD inbox view';
COMMENT ON INDEX dashboard.idx_tasks_user_my_day IS 'Optimized index for My Day view';
COMMENT ON INDEX dashboard.idx_notifications_user_unread IS 'Partial index for unread notifications only';
COMMENT ON INDEX dashboard.idx_notes_title_trgm IS 'Trigram index for fuzzy search on note titles';
COMMENT ON INDEX dashboard.idx_notes_content_trgm IS 'Trigram index for full-text search on note content';
COMMENT ON INDEX business.idx_jobs_address_trgm IS 'Trigram index for fuzzy search on job addresses';
