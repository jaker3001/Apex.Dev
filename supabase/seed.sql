-- Apex Database Seed
-- Creates custom schemas and runs migrations during Supabase initialization

-- ============================================================================
-- CREATE SCHEMAS FIRST (so PostgREST can start)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS business;
CREATE SCHEMA IF NOT EXISTS dashboard;

-- Grant usage to PostgREST roles
GRANT USAGE ON SCHEMA business TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA dashboard TO anon, authenticated, service_role;

-- Grant table access (will apply to tables created later)
ALTER DEFAULT PRIVILEGES IN SCHEMA business
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboard
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

-- Grant sequence permissions for authenticated role
-- (Required for auto-increment IDs to work with RLS)
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboard
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA business
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- NOTE: Run the full migrations manually after Supabase starts:
--   cat migrations/001_business_schema.sql | docker exec -i supabase_db_Apex.Dev psql -U postgres -d postgres
--   cat migrations/002_dashboard_schema.sql | docker exec -i supabase_db_Apex.Dev psql -U postgres -d postgres
