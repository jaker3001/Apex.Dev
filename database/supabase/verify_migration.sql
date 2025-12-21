-- =====================================================================
-- Migration Verification Script
-- =====================================================================
-- Purpose: Verify all migrations were applied successfully
-- Run after: All 9 migration files
-- =====================================================================

\echo '===================================================='
\echo 'Apex Assistant - Migration Verification'
\echo '===================================================='
\echo ''

-- =====================================================================
-- 1. Verify Extensions
-- =====================================================================

\echo '1. Checking PostgreSQL Extensions...'
SELECT
    extname AS extension,
    extversion AS version,
    CASE
        WHEN extname = 'uuid-ossp' THEN '✓ UUID generation'
        WHEN extname = 'pgcrypto' THEN '✓ Password hashing'
        WHEN extname = 'pg_trgm' THEN '✓ Full-text search'
    END AS purpose
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm')
ORDER BY extname;

\echo ''

-- =====================================================================
-- 2. Verify ENUMs
-- =====================================================================

\echo '2. Checking ENUM Types...'
SELECT
    COUNT(*) AS total_enums,
    COUNT(*) FILTER (WHERE typname LIKE '%status%') AS status_enums,
    COUNT(*) FILTER (WHERE typname LIKE '%type%') AS type_enums
FROM pg_type
WHERE typtype = 'e'
  AND typnamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN ('public', 'dashboard', 'business'));

\echo ''

-- =====================================================================
-- 3. Verify Schemas
-- =====================================================================

\echo '3. Checking Schemas...'
SELECT
    nspname AS schema_name,
    CASE
        WHEN nspname = 'dashboard' THEN '✓ Personal productivity'
        WHEN nspname = 'business' THEN '✓ Restoration operations'
        WHEN nspname = 'public' THEN '✓ Supabase system'
    END AS description
FROM pg_namespace
WHERE nspname IN ('dashboard', 'business', 'public')
ORDER BY nspname;

\echo ''

-- =====================================================================
-- 4. Verify Tables by Schema
-- =====================================================================

\echo '4. Checking Tables...'
SELECT
    schemaname AS schema,
    COUNT(*) AS table_count
FROM pg_tables
WHERE schemaname IN ('dashboard', 'business')
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo 'Expected: dashboard=31, business=11'
\echo ''

-- =====================================================================
-- 5. Verify Key Tables Exist
-- =====================================================================

\echo '5. Checking Key Tables...'
SELECT
    schemaname || '.' || tablename AS table_name,
    '✓ Exists' AS status
FROM pg_tables
WHERE (schemaname = 'dashboard' AND tablename IN (
    'users', 'tags', 'tasks', 'projects', 'notes', 'goals',
    'conversations', 'messages', 'ai_tasks'
))
OR (schemaname = 'business' AND tablename IN (
    'jobs', 'clients', 'organizations', 'contacts', 'estimates', 'payments'
))
ORDER BY schemaname, tablename;

\echo ''

-- =====================================================================
-- 6. Verify Indexes
-- =====================================================================

\echo '6. Checking Indexes...'
SELECT
    schemaname AS schema,
    COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname IN ('dashboard', 'business')
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo 'Expected: dashboard=60+, business=30+'
\echo ''

-- =====================================================================
-- 7. Verify Functions
-- =====================================================================

\echo '7. Checking Functions...'
SELECT
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('dashboard', 'business', 'public')
  AND p.proname IN (
    'update_updated_at_column',
    'validate_cross_schema_job_reference',
    'search_notes',
    'search_tasks',
    'search_jobs',
    'get_inbox_task_count',
    'get_inbox_note_count',
    'get_area_context'
  )
ORDER BY n.nspname, p.proname;

\echo ''

-- =====================================================================
-- 8. Verify Triggers
-- =====================================================================

\echo '8. Checking Triggers...'
SELECT
    schemaname AS schema,
    COUNT(*) AS trigger_count
FROM (
    SELECT
        n.nspname AS schemaname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname IN ('dashboard', 'business')
      AND NOT t.tgisinternal
) triggers
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo 'Expected: 20+ total triggers'
\echo ''

-- =====================================================================
-- 9. Verify RLS Enabled
-- =====================================================================

\echo '9. Checking Row Level Security...'
SELECT
    schemaname AS schema,
    tablename AS table_name,
    CASE
        WHEN rowsecurity THEN '✓ Enabled'
        ELSE '✗ Disabled'
    END AS rls_status
FROM pg_tables
WHERE schemaname IN ('dashboard', 'business')
  AND tablename IN ('users', 'tasks', 'notes', 'jobs', 'payments')
ORDER BY schemaname, tablename;

\echo ''

-- =====================================================================
-- 10. Verify RLS Policies
-- =====================================================================

\echo '10. Checking RLS Policies...'
SELECT
    schemaname AS schema,
    COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname IN ('dashboard', 'business')
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo 'Expected: 50+ total policies'
\echo ''

-- =====================================================================
-- 11. Verify Seed Data
-- =====================================================================

\echo '11. Checking Seed Data...'
SELECT
    'dashboard.users' AS table_name,
    COUNT(*) AS record_count,
    string_agg(email, ', ') AS sample_data
FROM dashboard.users
UNION ALL
SELECT
    'dashboard.agents',
    COUNT(*),
    string_agg(name, ', ')
FROM dashboard.agents
UNION ALL
SELECT
    'business.organizations',
    COUNT(*),
    COUNT(*)::text || ' organizations'
FROM business.organizations;

\echo ''

-- =====================================================================
-- 12. Verify Foreign Key Constraints
-- =====================================================================

\echo '12. Checking Foreign Key Constraints...'
SELECT
    schemaname AS schema,
    COUNT(*) AS fk_count
FROM (
    SELECT
        n.nspname AS schemaname
    FROM pg_constraint c
    JOIN pg_namespace n ON c.connamespace = n.oid
    WHERE c.contype = 'f'
      AND n.nspname IN ('dashboard', 'business')
) fks
GROUP BY schemaname
ORDER BY schemaname;

\echo ''

-- =====================================================================
-- 13. Verify Cross-Schema References
-- =====================================================================

\echo '13. Checking Cross-Schema References...'
SELECT
    'dashboard.tasks.job_id' AS reference,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'dashboard'
              AND table_name = 'tasks'
              AND column_name = 'job_id'
        ) THEN '✓ Column exists'
        ELSE '✗ Missing'
    END AS status
UNION ALL
SELECT
    'dashboard.notes.job_id',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'dashboard'
              AND table_name = 'notes'
              AND column_name = 'job_id'
        ) THEN '✓ Column exists'
        ELSE '✗ Missing'
    END;

\echo ''

-- =====================================================================
-- 14. Verify Full-Text Search Indexes
-- =====================================================================

\echo '14. Checking Full-Text Search Indexes...'
SELECT
    schemaname || '.' || tablename AS table_name,
    indexname AS index_name,
    '✓ GIN index' AS type
FROM pg_indexes
WHERE schemaname IN ('dashboard', 'business')
  AND indexdef LIKE '%USING gin%'
  AND indexname LIKE '%_trgm'
ORDER BY schemaname, tablename;

\echo ''

-- =====================================================================
-- 15. Database Summary
-- =====================================================================

\echo '15. Database Summary'
\echo '===================================================='

SELECT
    'Total Tables' AS metric,
    COUNT(*)::text AS value
FROM pg_tables
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Total Indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Total Functions',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('dashboard', 'business', 'public')
  AND p.proname NOT LIKE 'pg_%'
UNION ALL
SELECT
    'Total Triggers',
    COUNT(*)::text
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('dashboard', 'business')
  AND NOT t.tgisinternal
UNION ALL
SELECT
    'Total RLS Policies',
    COUNT(*)::text
FROM pg_policies
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Total ENUMs',
    COUNT(*)::text
FROM pg_type
WHERE typtype = 'e';

\echo ''
\echo '===================================================='
\echo 'Verification Complete!'
\echo '===================================================='
\echo ''
\echo 'Next Steps:'
\echo '1. Change default admin password'
\echo '2. Configure application authentication'
\echo '3. Test RLS policies with real users'
\echo '4. Begin application development'
\echo ''
