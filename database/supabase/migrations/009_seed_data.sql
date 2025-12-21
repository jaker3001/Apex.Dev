-- =====================================================================
-- Migration 009: Seed Data
-- =====================================================================
-- Purpose: Insert default data for initial system setup
-- Dependencies: 008_enable_rls.sql
-- Rollback: DELETE FROM <table_name> WHERE <condition>;
-- =====================================================================

SET search_path TO dashboard, public;

-- =====================================================================
-- DEFAULT ADMIN USER
-- Password: 'password123' (CHANGE IN PRODUCTION!)
-- Hash generated with pgcrypto: crypt('password123', gen_salt('bf'))
-- =====================================================================

-- Note: This is a sample admin user. In production, this should be created
-- through a secure onboarding process, not via migration.

INSERT INTO users (email, password_hash, display_name, role, is_active)
VALUES (
    'admin@apex.com',
    crypt('password123', gen_salt('bf')),
    'System Admin',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'Default admin user created. Password: password123 (CHANGE IN PRODUCTION!)';

-- =====================================================================
-- DEFAULT AGENTS
-- Pre-configured AI agents
-- =====================================================================

INSERT INTO agents (name, description, system_prompt, tools, is_active)
VALUES
(
    'General Assistant',
    'General purpose assistant for tasks, projects, and notes',
    'You are a helpful assistant for Apex Restoration. Help users manage their tasks, projects, and notes efficiently.',
    '["tasks", "projects", "notes", "search"]'::jsonb,
    TRUE
),
(
    'Estimate Analyzer',
    'Specialized in reviewing Xactimate estimates',
    'You are an expert in property damage restoration estimates. Help review Xactimate estimates for completeness and accuracy.',
    '["files", "calculations", "iicrc_standards"]'::jsonb,
    TRUE
),
(
    'Job Manager',
    'Helps manage restoration jobs and client communications',
    'You are a restoration job manager assistant. Help track job progress, manage client communications, and coordinate work.',
    '["jobs", "clients", "contacts", "scheduling"]'::jsonb,
    TRUE
)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- DEFAULT EXPENSE CATEGORIES
-- Common expense categories for projects
-- =====================================================================

-- Note: These will be inserted for each user when they sign up.
-- This is a template that can be used by the application.

CREATE TEMP TABLE temp_default_expense_categories (
    name TEXT,
    icon TEXT,
    is_tax_deductible_default BOOLEAN,
    tax_category_default TEXT,
    sort_order INTEGER
);

INSERT INTO temp_default_expense_categories VALUES
('Materials', '🛠️', TRUE, 'business_expense', 1),
('Software & Tools', '💻', TRUE, 'business_expense', 2),
('Services', '🔧', TRUE, 'business_expense', 3),
('Travel', '✈️', TRUE, 'business_expense', 4),
('Education', '📚', TRUE, 'education', 5),
('Office Supplies', '📎', TRUE, 'business_expense', 6),
('Equipment', '⚙️', TRUE, 'business_expense', 7),
('Marketing', '📢', TRUE, 'business_expense', 8),
('Utilities', '💡', TRUE, 'home_office', 9),
('Other', '📋', FALSE, NULL, 10);

COMMENT ON TABLE temp_default_expense_categories IS 'Template expense categories - insert for each new user';

-- =====================================================================
-- DEFAULT TAGS (PARA) - Example Set
-- =====================================================================

-- Note: These are example tags. In production, users should create their own.
-- This data is commented out by default. Uncomment to seed example tags.

/*
-- Get admin user ID for seeding
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@apex.com';

    -- Areas (Ongoing Responsibilities)
    INSERT INTO tags (user_id, name, icon, color, type, is_favorite, sort_order) VALUES
    (admin_user_id, 'Apex Restoration', '🏢', '#3B82F6', 'area', TRUE, 1),
    (admin_user_id, 'Health', '🏃', '#10B981', 'area', TRUE, 2),
    (admin_user_id, 'Family', '👨‍👩‍👧', '#F59E0B', 'area', TRUE, 3),
    (admin_user_id, 'Finances', '💰', '#EF4444', 'area', TRUE, 4),
    (admin_user_id, 'Personal Growth', '🌱', '#8B5CF6', 'area', FALSE, 5);

    -- Resources (Reference Topics)
    INSERT INTO tags (user_id, name, icon, color, type, is_favorite, sort_order) VALUES
    (admin_user_id, 'Programming', '💻', '#06B6D4', 'resource', FALSE, 1),
    (admin_user_id, 'IICRC Standards', '📋', '#6366F1', 'resource', TRUE, 2),
    (admin_user_id, 'Recipes', '🍳', '#F97316', 'resource', FALSE, 3),
    (admin_user_id, 'Business Strategy', '📈', '#0EA5E9', 'resource', FALSE, 4);

    -- Entities (Meta-Categories)
    INSERT INTO tags (user_id, name, icon, color, type, is_favorite, sort_order) VALUES
    (admin_user_id, 'Books', '📚', '#64748B', 'entity', FALSE, 1),
    (admin_user_id, 'Articles', '📰', '#94A3B8', 'entity', FALSE, 2),
    (admin_user_id, 'Videos', '🎥', '#475569', 'entity', FALSE, 3);
END $$;
*/

-- =====================================================================
-- BUSINESS SCHEMA SEED DATA
-- =====================================================================

SET search_path TO business, public;

-- =====================================================================
-- DEFAULT ORGANIZATIONS
-- Common insurance carriers and TPAs
-- =====================================================================

INSERT INTO organizations (name, org_type, is_active) VALUES
('State Farm', 'insurance_carrier', TRUE),
('Allstate', 'insurance_carrier', TRUE),
('Farmers Insurance', 'insurance_carrier', TRUE),
('USAA', 'insurance_carrier', TRUE),
('Liberty Mutual', 'insurance_carrier', TRUE),
('Nationwide', 'insurance_carrier', TRUE),
('Progressive', 'insurance_carrier', TRUE),
('Travelers', 'insurance_carrier', TRUE),
('American Family', 'insurance_carrier', TRUE),
('GEICO', 'insurance_carrier', TRUE),
('Apex Restoration', 'internal', TRUE)
ON CONFLICT DO NOTHING;

-- Common TPAs
INSERT INTO organizations (name, org_type, is_active) VALUES
('Sedgwick', 'tpa', TRUE),
('Crawford & Company', 'tpa', TRUE),
('Gallagher Bassett', 'tpa', TRUE),
('CorVel', 'tpa', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- DAMAGE SOURCE REFERENCE DATA
-- =====================================================================

-- Note: These are stored as TEXT in the jobs table but could be normalized
-- into a separate reference table if needed. This comment serves as
-- documentation of common values.

COMMENT ON COLUMN jobs.damage_source IS
'Common values: water, fire, mold, storm, wind, hail, smoke, vandalism, impact';

COMMENT ON COLUMN jobs.structure_type IS
'Common values: single_family, multi_family, townhouse, condo, commercial, warehouse, retail';

-- =====================================================================
-- USAGE INSTRUCTIONS
-- =====================================================================

-- After running this migration:
--
-- 1. CHANGE THE DEFAULT ADMIN PASSWORD immediately via:
--    UPDATE dashboard.users
--    SET password_hash = crypt('new_secure_password', gen_salt('bf'))
--    WHERE email = 'admin@apex.com';
--
-- 2. Create additional users through the application's signup flow
--
-- 3. Add organization-specific data:
--    - Additional insurance carriers
--    - Local vendors
--    - Internal team members as contacts
--
-- 4. Configure expense categories per user via the application
--
-- 5. Set up app.current_user_id in your application's authentication middleware:
--    SET LOCAL app.current_user_id = '<user_uuid>';
--    This is required for RLS policies to work correctly.

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Run these queries to verify the seed data:
/*
SELECT 'Users' as table_name, COUNT(*) as count FROM dashboard.users
UNION ALL
SELECT 'Agents', COUNT(*) FROM dashboard.agents
UNION ALL
SELECT 'Organizations', COUNT(*) FROM business.organizations;
*/

-- =====================================================================
-- CLEAN UP
-- =====================================================================

DROP TABLE IF EXISTS temp_default_expense_categories;
