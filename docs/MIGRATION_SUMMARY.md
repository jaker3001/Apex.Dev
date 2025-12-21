# Supabase Migration Summary

## Executive Summary

This document provides a high-level overview of the backend service architecture for migrating Apex Assistant from SQLite to Supabase.

---

## Architecture Deliverables

### 1. **BACKEND_ARCHITECTURE.md**
Complete service architecture design including:
- Current vs. target state diagrams
- Supabase client service implementation
- Repository pattern for data access
- Service layer for business logic
- Cross-schema validation
- Authentication & authorization (RLS + RBAC)
- Migration strategy (3 phases)
- Observability (logging, metrics, error tracking)

### 2. **API_ENDPOINT_MAPPING.md**
Detailed API contract changes:
- Current → New endpoint mappings
- Request/response format changes
- ID type changes (integer → UUID where applicable)
- New endpoints for dashboard features
- Authentication flow changes
- WebSocket protocol updates

### 3. **SUPABASE_CLIENT_CONFIG.md**
Configuration and optimization guide:
- Client initialization
- Connection pooling strategy
- Query performance optimization
- Error handling patterns
- Security best practices
- Testing configuration
- Production deployment checklist

---

## Key Architectural Decisions

### 1. Repository Pattern
**Decision:** Implement repository pattern for data access abstraction.

**Rationale:**
- Isolates Supabase implementation details
- Makes testing easier (mock repositories)
- Allows gradual migration with feature flags
- Provides consistent CRUD interface

**Example:**
```python
class ProjectRepository(BaseRepository):
    async def find_by_job_number(self, job_number: str):
        return await self.client.table("jobs").select("*").eq("job_number", job_number).execute()
```

---

### 2. Service Layer
**Decision:** Add service layer between routes and repositories.

**Rationale:**
- Encapsulates business logic
- Handles cross-cutting concerns (validation, logging)
- Simplifies route handlers
- Facilitates reuse across endpoints

**Example:**
```python
class ProjectService:
    async def create_project(self, data: ProjectCreate):
        # Business logic: auto-generate job number
        if not data.job_number:
            data.job_number = await self._generate_job_number()

        # Validation
        self._validate_project_data(data)

        # Delegate to repository
        return await self.repo.create(data.model_dump())
```

---

### 3. Hybrid Auth Approach
**Decision:** Use Supabase Auth for user management + RLS + RBAC at API level.

**Rationale:**
- RLS provides database-level security (defense in depth)
- RBAC at API level provides fine-grained control
- Supabase Auth handles token lifecycle
- Role hierarchy: admin > manager > employee

**Implementation:**
```sql
-- RLS Policy
CREATE POLICY "Users can view own tasks"
  ON dashboard.tasks FOR SELECT
  USING (auth.uid() = user_id);
```

```python
# RBAC Middleware
async def require_role(request: Request, required_role: str):
    user = await auth_service.get_user_from_token(token)
    if user.role != required_role:
        raise HTTPException(403)
```

---

### 4. Cross-Schema Validation
**Decision:** Validate references between dashboard and business schemas.

**Rationale:**
- Dashboard tasks can reference business jobs
- Foreign keys can't span schemas in PostgreSQL
- Application-level validation ensures integrity

**Implementation:**
```python
class CrossSchemaValidator:
    async def validate_job_reference(self, job_id: int) -> bool:
        result = self.client.schema("business").table("jobs").select("id").eq("id", job_id).execute()
        return len(result.data) > 0
```

---

### 5. Feature Flags for Gradual Migration
**Decision:** Use feature flags to enable Supabase incrementally.

**Rationale:**
- Reduce risk of big-bang migration
- Test each phase independently
- Easy rollback if issues arise
- Minimal downtime

**Configuration:**
```python
class FeatureFlags:
    USE_SUPABASE_CHAT = os.getenv("USE_SUPABASE_CHAT", "false") == "true"
    USE_SUPABASE_BUSINESS = os.getenv("USE_SUPABASE_BUSINESS", "false") == "true"
    USE_SUPABASE_DASHBOARD = os.getenv("USE_SUPABASE_DASHBOARD", "false") == "true"
```

---

## Migration Phases

### Phase 1: Chat Features (2-3 weeks)
**Scope:** AI assistant conversations and messages
**Risk:** Low (isolated feature)
**Tables:**
- `conversations` → `dashboard.conversations`
- `messages` → `dashboard.messages`
- `agents` → `dashboard.agents`

**Testing:**
- End-to-end chat flow
- WebSocket streaming
- Conversation history
- Model switching

**Success Criteria:**
- All chat features work with Supabase
- Performance equal or better than SQLite
- No data loss during migration

---

### Phase 2: Business Operations (3-4 weeks)
**Scope:** Jobs, clients, estimates, payments
**Risk:** Medium (core functionality)
**Tables:**
- `projects` → `business.jobs`
- `clients` → `business.clients`
- `organizations` → `business.organizations`
- All related tables (estimates, payments, notes, etc.)

**Testing:**
- CRUD operations for all entities
- RLS policies for multi-tenant access
- Cross-schema foreign key integrity
- Job workflow (lead → active → complete)

**Success Criteria:**
- All Jobs UI features functional
- RLS policies prevent unauthorized access
- Data integrity maintained
- Performance acceptable (< 500ms for most queries)

---

### Phase 3: Dashboard Features (4-5 weeks)
**Scope:** New features (tasks, projects, notes)
**Risk:** Low (greenfield development)
**Tables:**
- `dashboard.tasks` (user to-dos)
- `dashboard.projects` (personal projects)
- `dashboard.notes` (PKM)
- `dashboard.tags`, `dashboard.goals`, etc.

**Testing:**
- Task management (My Day, lists, etc.)
- Cross-schema validation (tasks → jobs)
- Real-time updates (Supabase Realtime)
- Full-text search

**Success Criteria:**
- Dashboard UI fully functional
- Real-time updates working
- Cross-schema links validated
- Search performance acceptable

---

## Technical Stack Changes

| Component | Current | New |
|-----------|---------|-----|
| Database | SQLite (2 files) | PostgreSQL (Supabase) |
| Schemas | N/A | `dashboard`, `business` |
| Auth | Custom JWT | Supabase Auth |
| File Storage | Local filesystem | Supabase Storage |
| Real-time | WebSocket only | WebSocket + Supabase Realtime |
| ORM | Direct SQL | PostgREST (via supabase-py) |
| IDs | Integer PKs | UUIDs (dashboard), Integers (business) |
| Security | None | RLS + RBAC |

---

## Performance Expectations

### Query Performance

| Operation | Current (SQLite) | Target (Supabase) | Notes |
|-----------|-----------------|-------------------|-------|
| Simple SELECT | < 10ms | < 50ms | Network overhead |
| JOIN (3 tables) | < 50ms | < 100ms | Resource embedding |
| Full-text search | N/A | < 200ms | PostgreSQL FTS |
| Aggregations | < 100ms | < 150ms | Better for large datasets |
| Concurrent writes | Limited | Excellent | PostgreSQL concurrency |

### Connection Metrics

| Metric | Development | Production |
|--------|-------------|------------|
| Pool size | 5 | 20 |
| Max overflow | 2 | 10 |
| Connection timeout | 10s | 30s |
| Query timeout | 30s | 60s |

---

## Security Model

### RLS Policies

**Dashboard schema:** User-owned data
```sql
-- Users only see their own data
CREATE POLICY "user_isolation"
  ON dashboard.tasks FOR ALL
  USING (auth.uid() = user_id);
```

**Business schema:** Role-based access
```sql
-- All users can view jobs
CREATE POLICY "authenticated_read"
  ON business.jobs FOR SELECT
  TO authenticated USING (true);

-- Only managers/admins can modify
CREATE POLICY "manager_write"
  ON business.jobs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role')::text IN ('admin', 'manager'));
```

### Role Hierarchy

```
admin (full access)
  └── manager (create/edit jobs, manage team)
      └── employee (view jobs, manage own tasks)
```

---

## File Structure Changes

### Current
```
apex-assistant/
├── database/
│   ├── operations.py           # apex_assistant.db
│   └── operations_apex.py      # apex_operations.db
├── uploads/                    # Local file storage
│   ├── estimates/
│   ├── receipts/
│   └── chat/
```

### New
```
apex-assistant/
├── api/
│   ├── services/
│   │   ├── supabase_client.py      # Supabase client wrapper
│   │   ├── auth_service.py         # Supabase Auth wrapper
│   │   ├── file_service.py         # Supabase Storage wrapper
│   │   ├── project_service.py      # Business logic
│   │   └── task_service.py         # Business logic
│   ├── repositories/
│   │   ├── base.py                 # Generic repository
│   │   ├── project_repository.py   # Data access
│   │   ├── task_repository.py      # Data access
│   │   └── cross_schema_validator.py
│   └── middleware/
│       ├── auth_middleware.py      # RBAC enforcement
│       ├── logging_middleware.py   # Request logging
│       └── metrics_middleware.py   # Prometheus metrics
```

---

## Data Migration Strategy

### 1. Preparation
- [x] Design Supabase schema
- [x] Create migration scripts
- [x] Set up test Supabase project
- [ ] Implement repositories
- [ ] Write unit tests

### 2. Migration Script
```python
# scripts/migrate_to_supabase.py
async def migrate_conversations():
    sqlite_conn = get_sqlite_conn()
    supabase = get_service_client()

    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM conversations")

    for row in cursor.fetchall():
        data = dict(row)
        await supabase.table("conversations").insert(data).execute()
```

### 3. Validation
- Compare row counts (SQLite vs Supabase)
- Validate foreign key integrity
- Test RLS policies
- Performance benchmarks

### 4. Cutover
1. Deploy new code with `USE_SUPABASE_*=false`
2. Run migration script
3. Enable feature flag for one phase
4. Monitor for errors
5. Repeat for next phase

---

## Rollback Plan

### If Migration Fails

**Phase 1 (Chat):**
1. Set `USE_SUPABASE_CHAT=false`
2. Restart API server
3. SQLite data intact (read-only mode during migration)

**Phase 2 (Business):**
1. Set `USE_SUPABASE_BUSINESS=false`
2. Restore SQLite from backup if needed
3. Investigate and fix issues
4. Re-run migration

**Phase 3 (Dashboard):**
- No rollback needed (new features, no existing data)

---

## Monitoring & Alerts

### Key Metrics

**Application:**
- API request latency (p50, p95, p99)
- Error rate by endpoint
- WebSocket connection count
- Active user count

**Database:**
- Query duration (p50, p95, p99)
- Connection pool utilization
- Failed query count
- RLS policy violations

**Infrastructure:**
- Supabase project health
- Storage usage
- Database size
- Real-time channel count

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| API error rate | > 5% | Page on-call |
| Query latency (p95) | > 1s | Investigate slow queries |
| Connection pool | > 90% | Scale pool size |
| Storage usage | > 80% | Review file cleanup |

---

## Cost Estimation

### Supabase Pricing

| Plan | Database | Storage | Bandwidth | Cost |
|------|----------|---------|-----------|------|
| Free | 500MB | 1GB | 5GB | $0 |
| Pro | 8GB | 100GB | 250GB | $25/mo |
| Team | 32GB | 250GB | 500GB | $599/mo |

**Recommendation:** Start with **Pro plan** ($25/mo)

**Projected Usage (first 6 months):**
- Database: ~2GB (conversations, jobs, tasks)
- Storage: ~10GB (estimates, photos, receipts)
- Bandwidth: ~50GB/mo
- Active users: 5-10

**Cost breakdown:**
- Supabase Pro: $25/mo
- Sentry (error tracking): $26/mo
- Total: **~$51/mo**

---

## Success Metrics

### Technical Metrics
- [ ] Migration completes with 0 data loss
- [ ] API latency < 500ms (p95)
- [ ] Database query time < 200ms (p95)
- [ ] Zero RLS policy violations in production
- [ ] Error rate < 1%

### Business Metrics
- [ ] All features functional
- [ ] No user-reported data issues
- [ ] Dashboard features launched
- [ ] Multi-user support enabled
- [ ] Mobile access enabled (via Supabase API)

---

## Next Steps

### Immediate (Week 1)
1. Review architecture documents with team
2. Set up Supabase project (development)
3. Implement `SupabaseClient` service
4. Create base repository class
5. Write unit tests for repositories

### Short-term (Weeks 2-4)
1. Implement Phase 1 repositories (conversations, messages)
2. Update `ChatService` to use Supabase
3. Run migration script for Phase 1
4. Test with feature flag enabled
5. Deploy Phase 1 to production

### Medium-term (Weeks 5-12)
1. Implement Phase 2 repositories (projects, clients, etc.)
2. Update all `/api/projects/*` routes
3. Run migration script for Phase 2
4. Test with feature flag enabled
5. Deploy Phase 2 to production
6. Start Phase 3 development

### Long-term (Months 4-6)
1. Complete Phase 3 (Dashboard features)
2. Remove SQLite dependencies
3. Remove feature flags
4. Optimize performance
5. Document lessons learned

---

## Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [PostgREST API Reference](https://postgrest.org/en/stable/api.html)
- [supabase-py Library](https://github.com/supabase-community/supabase-py)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

### Internal Documents
- `BACKEND_ARCHITECTURE.md` - Complete architecture design
- `API_ENDPOINT_MAPPING.md` - API contract changes
- `SUPABASE_CLIENT_CONFIG.md` - Configuration guide
- `DATABASE_DESIGN.md` - Supabase schema design

### Support
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- GitHub Issues: [github.com/supabase/supabase](https://github.com/supabase/supabase)

---

## Conclusion

The migration from SQLite to Supabase represents a significant architectural improvement:

**Benefits:**
- **Multi-user support** via RLS
- **Real-time updates** via Supabase Realtime
- **Better performance** at scale
- **Cloud-native** architecture
- **Managed backups** and disaster recovery
- **Mobile API** ready (same auth tokens)

**Risks:**
- Network latency (mitigated by query optimization)
- New dependencies (mitigated by abstraction layers)
- Learning curve (mitigated by documentation)

The phased approach with feature flags minimizes risk while delivering incremental value. Each phase can be tested independently and rolled back if needed.

**Estimated timeline:** 10-12 weeks for complete migration
**Estimated effort:** 200-250 developer hours
**Estimated cost:** $50-100/month infrastructure

The architecture is designed for:
- **Testability** - Repository pattern enables mocking
- **Maintainability** - Clean separation of concerns
- **Scalability** - PostgreSQL handles growth
- **Security** - RLS + RBAC defense in depth
- **Observability** - Comprehensive logging and metrics

With proper planning and execution, this migration will set Apex Assistant up for long-term success as a multi-user, cloud-native application.
