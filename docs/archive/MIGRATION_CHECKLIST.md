# Migration Checklist: API → Supabase

## Overview

This checklist guides the migration from the current FastAPI backend to Supabase client for direct database access. The hybrid approach allows gradual migration feature by feature.

---

## Pre-Migration Setup

### 1. Supabase Project Setup

- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Note project URL and anon key
- [ ] Configure Supabase Auth providers (email, OAuth)
- [ ] Set up Row Level Security (RLS) policies

### 2. Database Schema Migration

Current database: `apex_assistant.db` (SQLite)
Target: Supabase (PostgreSQL)

#### Tables to Migrate

- [ ] **users** → Supabase Auth + users table
  ```sql
  -- Supabase already has auth.users
  -- Create public.users for additional fields
  CREATE TABLE public.users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
  );
  ```

- [ ] **user_tasks** → task management
  ```sql
  CREATE TABLE user_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    list_id BIGINT REFERENCES task_lists(id),
    parent_id BIGINT REFERENCES user_tasks(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
    due_date DATE,
    due_time TIME,
    reminder_at TIMESTAMPTZ,
    is_important BOOLEAN DEFAULT false,
    is_my_day BOOLEAN DEFAULT false,
    my_day_date DATE,
    project_id BIGINT,
    recurrence_rule TEXT,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes
  CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
  CREATE INDEX idx_user_tasks_list_id ON user_tasks(list_id);
  CREATE INDEX idx_user_tasks_status ON user_tasks(status);
  CREATE INDEX idx_user_tasks_my_day ON user_tasks(is_my_day) WHERE is_my_day = true;
  ```

- [ ] **task_lists** → task organization
  ```sql
  CREATE TABLE task_lists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_system BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **chat_projects** → PARA system
  ```sql
  CREATE TABLE chat_projects (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'project' CHECK (category IN ('project', 'area', 'resource', 'archive')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
    parent_id BIGINT REFERENCES chat_projects(id),
    color TEXT,
    icon TEXT,
    is_favorite BOOLEAN DEFAULT false,
    metadata JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );
  ```

- [ ] **pkm_notes** → personal knowledge management
  ```sql
  CREATE TABLE pkm_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    note_type TEXT DEFAULT 'note' CHECK (note_type IN ('note', 'journal', 'reference', 'meeting')),
    project_id BIGINT REFERENCES chat_projects(id),
    tags TEXT[] DEFAULT '{}',
    backlinks BIGINT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Full-text search
  CREATE INDEX idx_pkm_notes_content ON pkm_notes USING gin(to_tsvector('english', content));
  CREATE INDEX idx_pkm_notes_tags ON pkm_notes USING gin(tags);
  ```

- [ ] **conversations** → chat history
- [ ] **messages** → chat messages

### 3. Row Level Security (RLS)

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pkm_notes ENABLE ROW LEVEL SECURITY;

-- Example policy for user_tasks
CREATE POLICY "Users can view own tasks"
  ON user_tasks FOR SELECT
  USING (auth.uid()::bigint = user_id);

CREATE POLICY "Users can create own tasks"
  ON user_tasks FOR INSERT
  WITH CHECK (auth.uid()::bigint = user_id);

CREATE POLICY "Users can update own tasks"
  ON user_tasks FOR UPDATE
  USING (auth.uid()::bigint = user_id);

CREATE POLICY "Users can delete own tasks"
  ON user_tasks FOR DELETE
  USING (auth.uid()::bigint = user_id);
```

Repeat for all tables.

### 4. Storage Buckets

- [ ] Create `avatars` bucket (public)
- [ ] Create `documents` bucket (private)
- [ ] Create `media` bucket (private)
- [ ] Configure storage policies

### 5. Environment Variables

- [ ] Add to production `.env`
  ```env
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  VITE_FEATURE_SUPABASE_ENABLED=true
  ```

---

## Migration Steps by Feature

### Phase 1: Authentication ✅

- [x] Install Supabase client
- [x] Create Supabase client config
- [ ] Create AuthContext with Supabase Auth
- [ ] Update LoginPage
- [ ] Test login/logout flow
- [ ] Migrate existing users (if any)

**Validation:**
- [ ] Can sign up with email
- [ ] Can log in
- [ ] Session persists on refresh
- [ ] Can log out

### Phase 2: Tasks (GTD) 🔄

- [x] Create database types
- [x] Create query hooks
- [x] Set feature flag `VITE_FEATURE_TASKS_ENABLED=true`
- [ ] Build TasksList component
- [ ] Build TaskItem component
- [ ] Build TaskQuickAdd component
- [ ] Test CRUD operations
- [ ] Enable real-time subscriptions
- [ ] Test cross-tab sync

**Validation:**
- [ ] Can create tasks
- [ ] Can update tasks
- [ ] Can delete tasks
- [ ] Can toggle completion
- [ ] Can add to My Day
- [ ] Filters work correctly
- [ ] Optimistic updates work
- [ ] Real-time updates appear

### Phase 3: Projects (PARA) 🔄

- [x] Create query hooks
- [ ] Build ProjectHub component
- [ ] Build ProjectCard component
- [ ] Build ProjectKanban component
- [ ] Test CRUD operations
- [ ] Test category filters
- [ ] Test hierarchical projects

**Validation:**
- [ ] Can create projects in all categories
- [ ] Can move projects between categories
- [ ] Can favorite/unfavorite
- [ ] Can archive projects
- [ ] Parent/child relationships work

### Phase 4: Notes (PKM) 📝

- [ ] Create useNotesQuery hooks
- [ ] Build NoteEditor component
- [ ] Build NotesList component
- [ ] Build BacklinkPanel component
- [ ] Test note creation
- [ ] Test backlink detection
- [ ] Test tag management
- [ ] Test search

**Validation:**
- [ ] Can create notes
- [ ] Can edit with markdown
- [ ] Backlinks work
- [ ] Tags work
- [ ] Search returns correct results
- [ ] Favorites work

### Phase 5: Real-time Features 🔄

- [x] Create subscription manager
- [ ] Create useTasksSubscription hook
- [ ] Create useNotesSubscription hook
- [ ] Create useChatSubscription hook
- [ ] Test multi-tab sync
- [ ] Test reconnection

**Validation:**
- [ ] Changes appear in other tabs
- [ ] Subscription reconnects after disconnect
- [ ] No memory leaks
- [ ] Performance is acceptable

### Phase 6: File Uploads 📁

- [x] Create storage utilities
- [x] Create FileUpload component
- [ ] Test avatar upload
- [ ] Test document upload
- [ ] Test file deletion
- [ ] Configure CORS if needed

**Validation:**
- [ ] Can upload files
- [ ] Progress bar works
- [ ] Can delete files
- [ ] Public URLs work
- [ ] Signed URLs work

---

## Jobs (Keep on API)

Jobs (`apex_operations.db`) will continue using the API:
- Complex queries across multiple tables
- Existing business logic
- Integration with Xactimate, insurance systems

**Action:** Create `useJobsQuery` that calls API endpoints (not Supabase)

---

## Testing Strategy

### Unit Tests

```bash
# Run tests
npm run test
```

Test files to create:
- `useTasksQuery.test.ts`
- `useProjectsQuery.test.ts`
- `uiStore.test.ts`
- `filtersStore.test.ts`

### Integration Tests

Test complete workflows:
- [ ] Create task → Edit → Complete → Delete
- [ ] Create project → Add tasks → Archive
- [ ] Create note → Add backlinks → Search

### Manual Testing

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on mobile
- [ ] Test offline behavior
- [ ] Test with slow network

---

## Performance Optimization

- [ ] Enable React Query DevTools in development
- [ ] Monitor query cache size
- [ ] Implement virtual scrolling for long lists
- [ ] Add debouncing to search inputs
- [ ] Lazy load components
- [ ] Optimize bundle size

---

## Rollback Plan

If issues arise, revert to API:

1. Set `VITE_FEATURE_SUPABASE_ENABLED=false`
2. Clear browser localStorage
3. Restart frontend
4. All hooks have API fallback

---

## Post-Migration

### Monitoring

- [ ] Set up Supabase monitoring dashboard
- [ ] Configure alerts for errors
- [ ] Monitor query performance
- [ ] Track real-time connection count

### Documentation

- [ ] Update README with Supabase setup
- [ ] Document RLS policies
- [ ] Document database schema
- [ ] Create troubleshooting guide

### Cleanup

- [ ] Remove unused API endpoints
- [ ] Archive old code
- [ ] Update dependencies
- [ ] Run security audit

---

## Timeline Estimate

- **Phase 1 (Auth):** 2-3 days
- **Phase 2 (Tasks):** 5-7 days
- **Phase 3 (Projects):** 3-5 days
- **Phase 4 (Notes):** 5-7 days
- **Phase 5 (Real-time):** 2-3 days
- **Phase 6 (Files):** 2-3 days
- **Testing & Polish:** 5-7 days

**Total:** 4-6 weeks

---

## Success Metrics

- [ ] All features work with Supabase
- [ ] No regression in functionality
- [ ] Performance is equal or better
- [ ] Real-time updates work reliably
- [ ] User experience is smooth
- [ ] No data loss during migration
- [ ] Mobile app works (if applicable)

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Implementation Guide:** See `SUPABASE_FRONTEND_IMPLEMENTATION.md`
- **Quick Start:** See `frontend/QUICK_START_GUIDE.md`

---

## Notes

- Keep both systems running during migration
- Test thoroughly before disabling API
- Communicate changes to users
- Have rollback plan ready
- Monitor closely after deployment
