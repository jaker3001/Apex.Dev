# Supabase Migration Quick Start

**5-minute guide to deploy the complete Apex Assistant database schema**

## Prerequisites

- Supabase account and project created
- PostgreSQL client (psql) or Supabase CLI installed
- Database connection string from Supabase dashboard

## Quick Deploy (3 steps)

### Step 1: Get Connection String

From Supabase Dashboard → Settings → Database:

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
```

### Step 2: Run All Migrations

```bash
# Navigate to migrations directory
cd database/supabase/migrations

# Set connection string
export DATABASE_URL="your-connection-string-here"

# Run all migrations in order
for file in *.sql; do
    echo "Running $file..."
    psql $DATABASE_URL -f $file
    if [ $? -ne 0 ]; then
        echo "Error in $file - stopping"
        exit 1
    fi
done

echo "All migrations completed successfully!"
```

### Step 3: Change Default Password

```sql
UPDATE dashboard.users
SET password_hash = crypt('your_secure_password', gen_salt('bf'))
WHERE email = 'admin@apex.com';
```

## Verify Deployment

Run this verification query:

```sql
-- Should return counts for all major tables
SELECT
    'Dashboard Tables' AS category,
    COUNT(*) FILTER (WHERE schemaname = 'dashboard') AS table_count
FROM pg_tables
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Business Tables',
    COUNT(*) FILTER (WHERE schemaname = 'business')
FROM pg_tables
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Total Indexes',
    COUNT(*)::bigint
FROM pg_indexes
WHERE schemaname IN ('dashboard', 'business')
UNION ALL
SELECT
    'Total Functions',
    COUNT(*)::bigint
FROM pg_proc
WHERE pronamespace IN (
    SELECT oid FROM pg_namespace WHERE nspname IN ('dashboard', 'business')
);
```

Expected results:
- Dashboard Tables: 31
- Business Tables: 11
- Total Indexes: 90+
- Total Functions: 11+

## Test Authentication

Create a test user:

```sql
INSERT INTO dashboard.users (email, password_hash, display_name, role)
VALUES (
    'test@apex.com',
    crypt('testpass123', gen_salt('bf')),
    'Test User',
    'employee'
);
```

## Configure Application

Add to your application's middleware:

```javascript
// Set current user for RLS policies
const setCurrentUser = async (req, res, next) => {
  if (req.user?.id) {
    await supabase.rpc('exec', {
      sql: `SET LOCAL app.current_user_id = '${req.user.id}'`
    });
  }
  next();
};

app.use(setCurrentUser);
```

## Common Issues

### Issue: RLS denies access

**Solution:** Ensure `app.current_user_id` is set before queries:

```sql
SET LOCAL app.current_user_id = 'user-uuid-here';
SELECT * FROM dashboard.tasks;  -- Now works
```

### Issue: Cross-schema reference fails

**Solution:** Job must exist before linking:

```sql
-- First create/verify job exists
SELECT id FROM business.jobs WHERE job_number = 'JOB-001';

-- Then create task with job_id
INSERT INTO dashboard.tasks (user_id, title, job_id)
VALUES ('user-uuid', 'Call adjuster', 1);
```

### Issue: Full-text search not working

**Solution:** Ensure pg_trgm extension is enabled:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
-- Should return 1 row
```

## Next Steps

1. ✅ Migrations deployed
2. ✅ Admin password changed
3. ✅ Test user created
4. ⬜ Configure application authentication
5. ⬜ Build API endpoints (see FEATURES.md)
6. ⬜ Connect frontend
7. ⬜ Import existing data (if any)

## Schema Summary

**Dashboard Schema (Personal):**
- 31 tables: users, tasks, projects, notes, tags, goals, people, AI assistant
- User data isolation via RLS
- PARA organization system
- GTD task management
- Personal knowledge management

**Business Schema (Shared):**
- 11 tables: jobs, clients, estimates, payments, media, etc.
- Role-based access control
- Restoration job management
- Financial tracking

## Resources

- **Full Documentation:** [README.md](README.md)
- **Migration Details:** [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)
- **Feature Specs:** [../../FEATURES.md](../../FEATURES.md)

## Default Credentials

**Admin User:**
- Email: `admin@apex.com`
- Password: `password123`
- ⚠️ **CHANGE THIS IMMEDIATELY IN PRODUCTION**

## Support

For issues:
1. Check README.md for detailed troubleshooting
2. Review migration file comments
3. Check Supabase logs in dashboard
4. Consult FEATURES.md for schema details

---

**Total Setup Time:** ~5 minutes
**Database Ready:** Yes, ready for application connection
