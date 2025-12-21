-- =====================================================================
-- Migration 002: Create PostgreSQL ENUM Types
-- =====================================================================
-- Purpose: Define all ENUM types used across dashboard and business schemas
-- Dependencies: 001_create_extensions.sql
-- Rollback: DROP TYPE IF EXISTS <type_name> CASCADE;
-- =====================================================================

-- =====================================================================
-- Dashboard Schema ENUMs
-- =====================================================================

-- User roles for access control
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');

-- Task statuses (supports Kanban boards)
CREATE TYPE task_status AS ENUM (
    'backlog',      -- Ideas, not yet prioritized
    'todo',         -- Ready to work on
    'in_progress',  -- Currently being worked on
    'review',       -- Waiting/needs review
    'done',         -- Completed
    'cancelled'     -- Won't do
);

-- Task priority levels
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- GTD smart lists
CREATE TYPE smart_list_type AS ENUM ('inbox', 'next', 'delegated', 'someday');

-- Task recurrence units
CREATE TYPE recurrence_unit AS ENUM ('days', 'weeks', 'months', 'years');

-- Project statuses (includes ongoing for maintenance)
CREATE TYPE project_status AS ENUM (
    'planned',    -- Not yet started
    'doing',      -- Active with defined end goal
    'ongoing',    -- Maintenance, never "completes"
    'on_hold',    -- Paused
    'done'        -- Completed
);

-- Tag types (PARA method)
CREATE TYPE tag_type AS ENUM ('area', 'resource', 'entity');

-- Note types
CREATE TYPE note_type AS ENUM ('note', 'web_clip', 'meeting', 'journal');

-- Media types for note attachments
CREATE TYPE media_type AS ENUM ('image', 'audio', 'video', 'document');

-- Goal statuses
CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'abandoned');

-- OAuth integration providers
CREATE TYPE integration_provider AS ENUM ('google_calendar', 'outlook', 'slack');

-- =====================================================================
-- Business Schema ENUMs
-- =====================================================================

-- Job/Project statuses
CREATE TYPE job_status AS ENUM (
    'lead',
    'contacted',
    'inspected',
    'authorized',
    'in_progress',
    'completed',
    'cancelled',
    'on_hold'
);

-- Organization types
CREATE TYPE org_type AS ENUM ('insurance_carrier', 'tpa', 'vendor', 'internal');

-- Estimate types
CREATE TYPE estimate_type AS ENUM ('initial', 'supplement', 'final');

-- Estimate statuses
CREATE TYPE estimate_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'revised');

-- Payment types
CREATE TYPE payment_type AS ENUM ('initial', 'depreciation', 'deductible', 'supplement', 'final', 'other');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('check', 'ach', 'wire', 'credit_card', 'cash');

-- Job note types
CREATE TYPE job_note_type AS ENUM ('general', 'call', 'email', 'site_visit', 'internal');

-- Work order statuses
CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Activity action types
CREATE TYPE activity_action AS ENUM (
    'created',
    'status_changed',
    'contact_added',
    'estimate_added',
    'payment_received',
    'note_added',
    'media_uploaded',
    'task_completed',
    'other'
);

-- =====================================================================
-- AI Assistant ENUMs
-- =====================================================================

-- Conversation/task statuses
CREATE TYPE ai_task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Task categories for automation analysis
CREATE TYPE task_category AS ENUM (
    'estimates',
    'line_items',
    'adjuster_comms',
    'documentation',
    'admin',
    'research',
    'scheduling',
    'financial',
    'other'
);

-- Complexity/quality ratings
CREATE TYPE rating_level AS ENUM ('low', 'medium', 'high');

-- Input/output types for task tracking
CREATE TYPE io_type AS ENUM ('text', 'file', 'image', 'structured_data', 'multiple');

COMMENT ON TYPE user_role IS 'User access control roles';
COMMENT ON TYPE task_status IS 'Task workflow statuses for Kanban boards';
COMMENT ON TYPE project_status IS 'Project lifecycle statuses including ongoing maintenance';
COMMENT ON TYPE tag_type IS 'PARA method organization types (Projects, Areas, Resources, Archives)';
COMMENT ON TYPE job_status IS 'Restoration job lifecycle statuses';
COMMENT ON TYPE org_type IS 'Organization classification types';
