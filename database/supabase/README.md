# Supabase Database Migrations

This directory contains PostgreSQL migration files for Apex Assistant's Supabase database.

## Overview

The database uses a **two-schema architecture**:

- **`dashboard` schema**: Personal productivity data (tasks, projects, notes, tags, AI assistant)
- **`business` schema**: Restoration operations data (jobs, clients, estimates, payments)

## Migration Files

Migrations must be run in order:

| File | Purpose | Dependencies |
|------|---------|--------------|
| `001_create_extensions.sql` | Enable PostgreSQL extensions (uuid-ossp, pgcrypto, pg_trgm) | None |
| `002_create_enums.sql` | Create all ENUM types for type safety | 001 |
| `003_create_schemas.sql` | Create dashboard and business schemas | 002 |
| `004_create_dashboard_tables.sql` | Create all dashboard schema tables | 003 |
| `005_create_business_tables.sql` | Create all business schema tables | 004 |
| `006_create_indexes.sql` | Create performance indexes and full-text search | 005 |
| `007_create_functions.sql` | Create triggers, validation, and search functions | 006 |
| `008_enable_rls.sql` | Enable Row Level Security policies for multi-user isolation | 007 |
| `009_seed_data.sql` | Insert default data (admin user, agents, organizations) | 008 |

## Running Migrations

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push

# Or run individual migrations
psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/001_create_extensions.sql
```

### Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file's contents in order
4. Click "Run" for each migration

### Option 3: Direct PostgreSQL

```bash
# Set connection string
export DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"

# Run migrations in order
for file in migrations/*.sql; do
    echo "Running $file..."
    psql $DATABASE_URL -f $file
done
```

## Post-Migration Setup

### 1. Change Default Admin Password

The seed data creates an admin user with password `password123`. **Change this immediately**:

```sql
UPDATE dashboard.users
SET password_hash = crypt('your_secure_password', gen_salt('bf'))
WHERE email = 'admin@apex.com';
```

### 2. Configure Application Authentication

Set the current user ID in your application's authentication middleware:

```javascript
// Example: Express.js middleware
app.use((req, res, next) => {
  if (req.user) {
    // Set PostgreSQL session variable for RLS
    await supabase.rpc('exec', {
      sql: `SET LOCAL app.current_user_id = '${req.user.id}'`
    });
  }
  next();
});
```

Or using Supabase's built-in auth:

```javascript
// Supabase automatically handles RLS with authenticated user
const { data, error } = await supabase
  .from('tasks')
  .select('*');  // Only returns tasks for authenticated user
```

### 3. Add Organization Data

Customize the seed data with your organization's information:

```sql
-- Add your insurance carriers
INSERT INTO business.organizations (name, org_type, is_active)
VALUES ('Your Insurance Co', 'insurance_carrier', TRUE);

-- Add your team members
INSERT INTO business.contacts (organization_id, first_name, last_name, email, role)
VALUES (
  (SELECT id FROM business.organizations WHERE name = 'Apex Restoration'),
  'John',
  'Doe',
  'john@apex.com',
  'Project Manager'
);
```

## Database Schema Details

### Dashboard Schema Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | Role-based access (admin, manager, employee) |
| `tags` | PARA organization | Areas, Resources, Entities |
| `tasks` | Task management | GTD lists, Kanban, recurrence, My Day |
| `projects` | Personal projects | Financials, milestones, Kanban |
| `notes` | Personal knowledge | Markdown, bidirectional links, media |
| `goals` | Goal tracking | Milestones, linked to Areas |
| `people` | Personal contacts | Separate from business contacts |
| `work_sessions` | Time tracking | Start/end times per task |
| `user_integrations` | OAuth tokens | Google Calendar, future: Outlook, Slack |
| `conversations` | AI chat sessions | Claude conversations |
| `messages` | Chat messages | Role, content, tools used |
| `ai_tasks` | AI task tracking | Automation opportunity analysis |

### Business Schema Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `jobs` | Restoration projects | Status tracking, damage info, dates |
| `clients` | Property owners | Contact information |
| `organizations` | Insurance/vendors | Carrier, TPA, vendor, internal |
| `contacts` | People at orgs | Adjusters, vendor contacts |
| `estimates` | Xactimate estimates | Versioning for supplements |
| `payments` | Received payments | Payment tracking by type |
| `notes` | Job-specific notes | Call logs, site visits, emails |
| `media` | Photos/documents | File storage references |
| `receipts` | Expense receipts | Job costs |
| `work_orders` | Subcontractor work | Vendor work orders |
| `labor_entries` | Employee time | Time tracking per job |
| `activity_log` | Job history | Audit trail |

### Cross-Schema References

Some dashboard tables can reference business data:

- `dashboard.tasks.job_id` → `business.jobs.id`
- `dashboard.notes.job_id` → `business.jobs.id`

These are validated by the `validate_cross_schema_job_reference()` trigger.

## Row Level Security (RLS)

RLS policies enforce multi-user data isolation:

### Dashboard Schema (Personal Data)

- **Users see only their own data**: Tasks, projects, notes, tags, etc.
- **Admins have broader access**: Can view AI task analytics for all users
- **Policy pattern**: `user_id = current_setting('app.current_user_id')::UUID`

### Business Schema (Shared Data)

- **All users can read jobs**: Business data is shared across the organization
- **Role-based write access**:
  - Employees: Can create/update jobs, add notes/media
  - Managers: Can modify clients, payments, financials
  - Admins: Full access including deletions
- **Labor entries**: Users can only see/modify their own time entries

## Triggers and Automation

### Automatic Timestamps

`update_updated_at_column()` trigger automatically updates `updated_at` on modifications.

### Activity Logging

- `log_project_activity()`: Logs all changes to personal projects
- `log_business_activity()`: Logs all changes to jobs

### Note Features

- `update_note_word_count()`: Auto-calculates word count
- `extract_note_links()`: Parses `[[Note Title]]` syntax and maintains bidirectional links

### Validation

- `validate_cross_schema_job_reference()`: Ensures job_id references valid jobs

## Search Functions

Full-text search using PostgreSQL's trigram similarity:

```sql
-- Search notes
SELECT * FROM search_notes('user-uuid', 'water damage', 20);

-- Search tasks
SELECT * FROM search_tasks('user-uuid', 'call adjuster', 20);

-- Search jobs
SELECT * FROM search_jobs('123 Main St', 20);
```

## Indexes

Performance indexes created for:

- Foreign key relationships
- Common query patterns (user_id, status, dates)
- Full-text search (trigram indexes on notes, jobs)
- Partial indexes for special cases (My Day tasks, unread notifications)

## Backup and Rollback

### Backup Before Migration

```bash
# Backup entire database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Backup specific schema
pg_dump $DATABASE_URL --schema=dashboard > dashboard_backup.sql
```

### Rollback Instructions

Each migration file includes rollback instructions in comments:

```sql
-- Rollback: DROP TABLE IF EXISTS dashboard.tasks CASCADE;
-- Rollback: DROP TYPE IF EXISTS task_status CASCADE;
-- Rollback: DROP SCHEMA IF EXISTS dashboard CASCADE;
```

To rollback completely:

```bash
# Drop everything and start over
psql $DATABASE_URL << EOF
DROP SCHEMA IF EXISTS dashboard CASCADE;
DROP SCHEMA IF EXISTS business CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
-- ... etc
EOF
```

## Development vs Production

### Development

- Seed data includes default admin user (email: `admin@apex.com`, password: `password123`)
- Sample tags and expense categories commented out in seed file

### Production

1. **Change admin password immediately**
2. **Remove seed data** or customize for your organization
3. **Enable SSL** for database connections
4. **Set up backups** (Supabase does this automatically)
5. **Monitor RLS policies** to ensure proper data isolation
6. **Review and audit** all default organizations and contacts

## Troubleshooting

### RLS Policies Not Working

Ensure `app.current_user_id` is set in your application:

```sql
-- Test RLS
SET app.current_user_id = 'your-user-uuid';
SELECT * FROM dashboard.tasks;  -- Should only show that user's tasks
```

### Cross-Schema References Failing

Ensure the business.jobs record exists before creating a task/note with job_id:

```sql
-- This will fail if job doesn't exist
INSERT INTO dashboard.tasks (user_id, title, job_id)
VALUES ('user-uuid', 'Call adjuster', 999);  -- Error: Invalid job_id
```

### Migration Failures

Run migrations one at a time and check for errors:

```bash
psql $DATABASE_URL -f migrations/001_create_extensions.sql
# Check output for errors before proceeding
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [FEATURES.md](../../FEATURES.md) - Complete feature specification

## Support

For questions or issues with migrations:

1. Check migration file comments for detailed explanations
2. Review FEATURES.md for data model documentation
3. Check Supabase logs in the dashboard
4. Consult PostgreSQL documentation for specific errors
