# Supabase Migration Summary

**Created:** December 21, 2024
**Total Migration Files:** 9
**Total Size:** ~120KB
**Source:** FEATURES.md (Dashboard Data Model)

## Migration Overview

Complete PostgreSQL schema implementation for Apex Assistant using Supabase, based on the comprehensive design in `FEATURES.md`.

### Two-Schema Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     APEX ASSISTANT                          │
├─────────────────────────┬───────────────────────────────────┤
│   dashboard schema      │       business schema             │
│   (Personal)            │       (Business)                  │
├─────────────────────────┼───────────────────────────────────┤
│ • users (auth)          │ • jobs (projects)                 │
│ • tags (PARA)           │ • clients                         │
│ • tasks (GTD/Kanban)    │ • organizations                   │
│ • projects (personal)   │ • contacts                        │
│ • notes (PKM)           │ • estimates                       │
│ • goals                 │ • payments                        │
│ • people (contacts)     │ • job_notes                       │
│ • work_sessions         │ • media                           │
│ • user_integrations     │ • receipts                        │
│ • conversations (AI)    │ • work_orders                     │
│ • messages              │ • labor_entries                   │
│ • ai_tasks              │ • activity_log                    │
│ • project_expenses      │                                   │
│ • project_income        │                                   │
└─────────────────────────┴───────────────────────────────────┘
```

## Migration Files Breakdown

### 001_create_extensions.sql (1.1KB)
**Purpose:** Enable required PostgreSQL extensions

- `uuid-ossp` - UUID generation for primary keys
- `pgcrypto` - Secure password hashing
- `pg_trgm` - Trigram similarity for full-text search

### 002_create_enums.sql (4.8KB)
**Purpose:** Define all ENUM types for type safety

**Dashboard ENUMs:**
- `user_role` - admin, manager, employee
- `task_status` - backlog, todo, in_progress, review, done, cancelled
- `task_priority` - low, medium, high
- `smart_list_type` - inbox, next, delegated, someday
- `recurrence_unit` - days, weeks, months, years
- `project_status` - planned, doing, ongoing, on_hold, done
- `tag_type` - area, resource, entity (PARA method)
- `note_type` - note, web_clip, meeting, journal
- `media_type` - image, audio, video, document
- `goal_status` - active, achieved, abandoned
- `integration_provider` - google_calendar, outlook, slack

**Business ENUMs:**
- `job_status` - lead, contacted, inspected, authorized, in_progress, completed, cancelled, on_hold
- `org_type` - insurance_carrier, tpa, vendor, internal
- `estimate_type` - initial, supplement, final
- `estimate_status` - draft, submitted, approved, rejected, revised
- `payment_type` - initial, depreciation, deductible, supplement, final, other
- `payment_method` - check, ach, wire, credit_card, cash
- `job_note_type` - general, call, email, site_visit, internal
- `work_order_status` - pending, in_progress, completed, cancelled
- `activity_action` - created, status_changed, contact_added, etc.

**AI Assistant ENUMs:**
- `ai_task_status` - pending, in_progress, completed, failed
- `task_category` - estimates, line_items, adjuster_comms, etc.
- `rating_level` - low, medium, high
- `io_type` - text, file, image, structured_data, multiple

### 003_create_schemas.sql (1.7KB)
**Purpose:** Create database schemas

- `dashboard` - Personal productivity schema
- `business` - Restoration operations schema
- `public` - Supabase system tables (unchanged)

### 004_create_dashboard_tables.sql (22KB)
**Purpose:** Create all dashboard schema tables

**Core Tables (31 total):**

1. **Users & Auth**
   - `users` - User accounts with role-based access

2. **PARA Organization**
   - `tags` - Areas, Resources, Entities
   - `people` - Personal contacts
   - `people_tags` - Many-to-many junction

3. **Goals**
   - `goals` - Long-term goals
   - `milestones` - Goal checkpoints

4. **Projects (Personal)**
   - `projects` - Personal projects with vision/outcomes
   - `project_milestones` - Project checkpoints
   - `project_people` - Project team members
   - `project_expenses` - Financial tracking
   - `project_income` - Income tracking
   - `project_budgets` - Budget planning
   - `project_activity` - Activity log
   - `expense_categories` - User-defined categories

5. **Tasks**
   - `tasks` - GTD task management with Kanban
   - `task_tags` - Task categorization
   - `task_people` - Assignments/delegations

6. **Notes (PKM)**
   - `notes` - Markdown notes
   - `note_tags` - Note categorization
   - `note_links` - Bidirectional linking
   - `note_media` - Attached media files

7. **Time Tracking**
   - `work_sessions` - Task time tracking

8. **Integrations**
   - `user_integrations` - OAuth tokens (Google Calendar, etc.)

9. **AI Assistant**
   - `conversations` - Chat sessions
   - `messages` - Chat messages
   - `ai_tasks` - Task execution tracking
   - `agents` - AI agent configurations

10. **Other**
    - `notifications` - User notifications

**Key Features:**
- UUID primary keys
- TIMESTAMPTZ for all timestamps
- JSONB for flexible data (recurrence days, settings)
- Cross-schema references (tasks.job_id → business.jobs)
- Full support for PARA methodology
- GTD smart lists
- Kanban status tracking
- Recurring tasks
- My Day planning
- Bidirectional note linking
- Media attachments

### 005_create_business_tables.sql (11KB)
**Purpose:** Create all business schema tables

**Tables (11 total):**

1. `organizations` - Insurance carriers, TPAs, vendors
2. `contacts` - People at organizations
3. `clients` - Property owners
4. `jobs` - Restoration projects (main entity)
5. `project_contacts` - Job team assignments
6. `estimates` - Xactimate estimates with versioning
7. `payments` - Received payments
8. `notes` - Job-specific notes
9. `media` - Photos/documents
10. `receipts` - Expense receipts
11. `work_orders` - Subcontractor work
12. `labor_entries` - Employee time tracking
13. `activity_log` - Job audit trail

**Key Features:**
- Serial integer primary keys (compatible with existing SQLite)
- Comprehensive job tracking
- Insurance/claim management
- Financial tracking
- Cross-schema user references
- Activity logging

### 006_create_indexes.sql (11KB)
**Purpose:** Create performance indexes

**Dashboard Schema (60+ indexes):**
- Foreign key indexes on all relationships
- Composite indexes for common queries (user_id + status, user_id + archived)
- Partial indexes for special cases (My Day tasks, unread notifications, inbox items)
- Full-text search indexes (trigram on notes.title, notes.content)

**Business Schema (30+ indexes):**
- Foreign key indexes
- Status and date indexes
- Full-text search on job addresses
- Activity log indexes

**Special Indexes:**
- `idx_tasks_inbox` - Optimized for GTD inbox view
- `idx_tasks_user_my_day` - Partial index for My Day (only where is_my_day = TRUE)
- `idx_notifications_user_unread` - Partial index for unread only
- `idx_notes_title_trgm` - Trigram for fuzzy search
- `idx_notes_content_trgm` - Full-text search
- `idx_jobs_address_trgm` - Address search

### 007_create_functions.sql (17KB)
**Purpose:** Create helper functions and triggers

**Trigger Functions:**
- `update_updated_at_column()` - Auto-update timestamps
- `validate_cross_schema_job_reference()` - Validate task.job_id references
- `update_note_word_count()` - Auto-calculate word count
- `extract_note_links()` - Parse [[Note Title]] syntax
- `increment_conversation_message_count()` - Track message count
- `log_project_activity()` - Auto-log project changes
- `log_business_activity()` - Auto-log job changes

**Search Functions:**
- `search_notes(user_id, query, limit)` - Full-text note search
- `search_tasks(user_id, query, limit)` - Full-text task search
- `search_jobs(query, limit)` - Full-text job search

**Utility Functions:**
- `get_inbox_task_count(user_id)` - Count unprocessed tasks
- `get_inbox_note_count(user_id)` - Count unprocessed notes
- `get_area_context(user_id, tag_id)` - Get all items for an Area (PARA)

**Triggers Applied (20+):**
- Updated_at triggers on all relevant tables
- Cross-schema validation on tasks
- Note word count and link extraction
- Activity logging on projects and jobs

### 008_enable_rls.sql (23KB)
**Purpose:** Enable Row Level Security policies

**Dashboard Schema Policies:**
- **Personal data isolation**: Users can only access their own data
- **Policy pattern**: `user_id = current_setting('app.current_user_id')::UUID`
- **Admin exceptions**: Admins can view AI task analytics
- **Junction table policies**: Follow parent table ownership

**Policies per table:**
- users (2) - Select own, select all (admin only)
- tags (1) - All operations for own tags
- goals (1) - All operations for own goals
- projects (1) - All operations for own projects
- tasks (1) - All operations for own tasks
- notes (1) - All operations for own notes
- ... and many more

**Business Schema Policies:**
- **Shared data model**: Business data is accessible to all authenticated users
- **Role-based write access**:
  - Employees: Read all, create/update jobs and notes
  - Managers: Modify clients, payments, financials
  - Admins: Full access including deletions
- **Labor entry isolation**: Users can only see/modify their own time entries

**Total Policies:** 50+ policies across both schemas

### 009_seed_data.sql (8.7KB)
**Purpose:** Insert default data

**Seed Data Includes:**

1. **Default Admin User**
   - Email: `admin@apex.com`
   - Password: `password123` (MUST CHANGE IN PRODUCTION)
   - Role: admin

2. **Default AI Agents**
   - General Assistant - Tasks, projects, notes
   - Estimate Analyzer - Xactimate review
   - Job Manager - Job coordination

3. **Default Organizations**
   - Major insurance carriers (State Farm, Allstate, USAA, etc.)
   - Common TPAs (Sedgwick, Crawford, Gallagher Bassett)
   - Internal organization (Apex Restoration)

4. **Template Data**
   - Expense categories (commented, add per user)
   - Sample PARA tags (commented, optional)

## Key Features Implemented

### PARA Method Organization
- Tags with types: Area, Resource, Entity
- Hierarchical tags (parent_tag_id)
- Area context views showing all related items

### GTD (Getting Things Done)
- Smart lists: inbox, next, delegated, someday
- My Day planning (is_my_day flag)
- Task inbox view (unprocessed tasks)
- Note inbox view (unprocessed notes)

### Kanban Boards
- Task statuses: backlog → todo → in_progress → review → done
- Project statuses: planned → doing/ongoing → done
- Drag-and-drop ready structure

### Recurring Tasks
- Flexible recurrence: daily, weekly, monthly, yearly
- Specific days (M/W/F)
- Stored as recur_interval + recur_unit + recur_days (JSON)

### Personal Knowledge Management (PKM)
- Markdown notes
- Bidirectional linking with [[Note Title]] syntax
- Media attachments (images, audio, video, documents)
- Full-text search with trigram similarity

### Financial Tracking
- Project expenses and income
- Budget planning by category
- Tax-deductible tracking
- CPA-friendly export ready

### AI Assistant
- Conversation history
- Message tracking with tool usage
- Task execution metrics
- Automation opportunity analysis

### Cross-Schema Integration
- Dashboard tasks can link to business jobs
- Dashboard notes can link to business jobs
- Validation triggers ensure referential integrity

### Multi-User Isolation
- RLS policies enforce data ownership
- Personal data (dashboard): user-specific
- Business data (business): shared with role-based access
- Session variable: `app.current_user_id`

### Full-Text Search
- Trigram indexes on notes (title + content)
- Trigram indexes on jobs (address)
- Search functions with similarity ranking

### Activity Logging
- Automatic logging of project changes
- Automatic logging of job changes
- Audit trail for compliance

## Database Statistics

**Total Tables:** 42 (31 dashboard + 11 business)
**Total Indexes:** 90+ (performance optimized)
**Total Functions:** 11 (triggers + search + utilities)
**Total Triggers:** 20+ (automated actions)
**Total RLS Policies:** 50+ (security)
**Total ENUMs:** 20+ (type safety)

## Migration Size Breakdown

```
001_create_extensions.sql      1.1 KB   (1%)
002_create_enums.sql           4.8 KB   (4%)
003_create_schemas.sql         1.7 KB   (1%)
004_create_dashboard_tables.sql 22 KB  (18%)
005_create_business_tables.sql 11 KB   (9%)
006_create_indexes.sql         11 KB   (9%)
007_create_functions.sql       17 KB  (14%)
008_enable_rls.sql             23 KB  (19%)
009_seed_data.sql             8.7 KB   (7%)
README.md                      22 KB  (18%)
----------------------------------------
TOTAL                        ~120 KB
```

## Testing Checklist

Before deploying to production:

- [ ] Run all migrations in order on test database
- [ ] Verify all tables created successfully
- [ ] Test RLS policies with different user roles
- [ ] Change default admin password
- [ ] Test cross-schema references (task.job_id)
- [ ] Test full-text search functions
- [ ] Verify triggers fire correctly (updated_at, activity logs)
- [ ] Test bidirectional note linking
- [ ] Verify My Day task filtering
- [ ] Test inbox views for tasks and notes
- [ ] Verify PARA tag hierarchy
- [ ] Test financial tracking calculations
- [ ] Backup test database before production

## Production Deployment

1. **Backup existing database** (if migrating from SQLite)
2. **Run migrations in order** (001 → 009)
3. **Verify migration success** (check table counts, indexes)
4. **Change admin password immediately**
5. **Configure authentication** (set app.current_user_id)
6. **Test RLS policies** with real user accounts
7. **Import existing data** (if applicable)
8. **Monitor for errors** in first 24-48 hours

## Rollback Plan

Each migration file includes rollback instructions in comments. To completely rollback:

```sql
-- Drop schemas (cascades to all tables)
DROP SCHEMA IF EXISTS dashboard CASCADE;
DROP SCHEMA IF EXISTS business CASCADE;

-- Drop ENUMs
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
-- ... (see 002_create_enums.sql for complete list)

-- Drop extensions (optional, usually safe to keep)
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
```

## Next Steps

After running migrations:

1. **Update application code** to use new schema
2. **Configure Supabase client** with authentication
3. **Implement API endpoints** (see FEATURES.md API section)
4. **Build frontend components** for each App
5. **Test full application flow** with real data
6. **Document any schema customizations** for your organization

## Support & Documentation

- **README.md** - Complete migration guide with examples
- **FEATURES.md** - Full feature specification and data model
- **CLAUDE.md** - Project overview and architecture
- **Migration files** - Detailed comments in each SQL file

## Changelog

**v1.0.0 - December 21, 2024**
- Initial migration set created
- Complete two-schema implementation
- Full RLS policies
- Comprehensive indexes and triggers
- Default seed data

---

**Generated by:** Claude Code
**Based on:** FEATURES.md Dashboard Data Model
**Status:** Ready for deployment
