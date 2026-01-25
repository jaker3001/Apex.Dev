# Supabase Backend Implementation Guide

This document provides an overview of the Supabase backend service layer implementation for Apex Assistant.

## Overview

The backend has been refactored to support both SQLite (legacy) and Supabase (target) through a clean service architecture with feature flags for gradual migration.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      FastAPI Application                      │
├──────────────────────────────────────────────────────────────┤
│  Routes (dashboard, chat, projects, auth, etc.)              │
│  - Feature flag checks                                        │
│  - Route to appropriate service                               │
├──────────────────────────────────────────────────────────────┤
│  Middleware                                                    │
│  ├─ auth_middleware.py (Supabase JWT verification)           │
│  ├─ rbac_middleware.py (Permission checking)                 │
│  └─ logging_middleware.py (Request/response logging)         │
├──────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                               │
│  ├─ auth_service.py (Supabase Auth wrapper)                  │
│  ├─ dashboard_service.py (Tasks, Projects, Notes)            │
│  ├─ job_service.py (Restoration jobs)                        │
│  ├─ storage_service.py (Supabase Storage)                    │
│  └─ chat_service.py (Claude SDK + conversation storage)      │
├──────────────────────────────────────────────────────────────┤
│  Repository Layer (Data Access)                               │
│  ├─ base.py (Generic CRUD operations)                        │
│  ├─ task_repository.py                                       │
│  ├─ job_repository.py                                        │
│  ├─ note_repository.py                                       │
│  ├─ conversation_repository.py                               │
│  ├─ message_repository.py                                    │
│  ├─ project_repository.py                                    │
│  └─ cross_schema_validator.py (Dashboard ↔ Business refs)   │
├──────────────────────────────────────────────────────────────┤
│  Supabase Client (Connection pooling, retry logic)            │
├──────────────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + Extensions)               │
│  ├─ Schema: dashboard (personal productivity - RLS)           │
│  ├─ Schema: business (restoration jobs - RLS)                 │
│  ├─ Supabase Auth (user management)                           │
│  └─ Supabase Storage (file uploads)                           │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Supabase Client (`api/services/supabase_client.py`)

**Purpose**: Singleton client with connection pooling and retry logic.

**Features**:
- Automatic retry with exponential backoff
- Separate clients for standard (RLS-enabled) and service role (bypasses RLS) access
- Configuration from environment variables
- Type hints throughout

**Usage**:
```python
from api.services.supabase_client import get_client

client = get_client()
result = client.table("jobs").select("*").execute()
```

### 2. Error Handling (`api/services/supabase_errors.py`)

**Custom Exceptions**:
- `AuthenticationError` - JWT/auth failures
- `AuthorizationError` - RLS violations
- `ResourceNotFoundError` - Record not found
- `ValidationError` - Data validation failures
- `CrossSchemaValidationError` - Cross-schema reference failures
- `DatabaseError` - General database errors

**Helper Function**:
```python
from api.services.supabase_errors import handle_supabase_error

try:
    result = await operation()
except Exception as e:
    raise handle_supabase_error(e)
```

### 3. Repository Pattern (`api/repositories/`)

**Base Repository** (`base.py`):
- Generic CRUD operations (create, read, update, delete, count)
- Query building with filters, ordering, pagination
- Automatic model conversion using Pydantic

**Specific Repositories**:
- `TaskRepository` - Dashboard tasks with My Day, important, overdue queries
- `JobRepository` - Restoration jobs with relations (client, estimates, etc.)
- `NoteRepository` - PKM notes with search and tagging
- `ConversationRepository` - AI conversations
- `MessageRepository` - AI chat messages
- `ProjectRepository` - Personal dashboard projects

**Cross-Schema Validator**:
Validates references between dashboard and business schemas:
```python
from api.repositories.cross_schema_validator import CrossSchemaValidator

validator = CrossSchemaValidator()
if not await validator.validate_job_reference(job_id):
    raise CrossSchemaValidationError("dashboard", "business", f"Job {job_id} not found")
```

### 4. Service Layer (`api/services/`)

**Purpose**: Business logic and validation.

**Services**:
- `AuthService` - Supabase Auth operations (sign in, sign up, refresh, etc.)
- `DashboardService` - Tasks, projects, notes with validation
- `JobService` - Restoration jobs with business rules
- `StorageService` - File upload/download with Supabase Storage

**Example**:
```python
from api.services.dashboard_service import DashboardService

service = DashboardService()
tasks = await service.get_my_day_tasks(user_id)
```

### 5. Middleware (`api/middleware/`)

**Authentication** (`auth_middleware.py`):
```python
from api.middleware import require_auth, require_role

@router.get("/dashboard/tasks")
async def get_tasks(user = Depends(require_auth)):
    # user is a dict with id, email, role, metadata
    tasks = await service.get_user_tasks(user["id"])
    return tasks
```

**RBAC** (`rbac_middleware.py`):
```python
from api.middleware.rbac_middleware import Permission, RBACMiddleware

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: int, user = Depends(require_auth)):
    RBACMiddleware.require_permission(user, Permission.JOB_DELETE)
    await service.delete_job(job_id)
```

**Logging** (`logging_middleware.py`):
Automatically logs all requests with timing, status codes, and errors.

### 6. Feature Flags (`config/settings.py`)

**Environment Variables**:
```bash
USE_SUPABASE_CHAT=true
USE_SUPABASE_BUSINESS=false
USE_SUPABASE_DASHBOARD=true
```

**Usage in Routes**:
```python
from config import FeatureFlags

@router.get("/dashboard/tasks")
async def get_tasks(user = Depends(require_auth)):
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        # Use Supabase service
        service = DashboardService()
        return await service.get_user_tasks(user["id"])
    else:
        # Use legacy SQLite
        from database.operations_dashboard import get_user_tasks
        return get_user_tasks(user["id"])
```

## Migration Strategy

### Phase 1: AI Features (Chat, Conversations, Messages)
1. Set `USE_SUPABASE_CHAT=true`
2. Update `ChatService` to use `ConversationRepository` and `MessageRepository`
3. Test end-to-end chat functionality
4. Run data migration script to copy existing conversations

### Phase 2: Business Operations (Jobs, Clients, Organizations)
1. Set `USE_SUPABASE_BUSINESS=true`
2. All `/api/projects/*` routes use `JobService`
3. Test Jobs UI thoroughly
4. Run data migration for business schema

### Phase 3: Dashboard Features (Tasks, Projects, Notes)
1. Set `USE_SUPABASE_DASHBOARD=true`
2. New dashboard routes in `/api/dashboard/*`
3. Build Dashboard UI
4. No migration needed (new feature)

## Configuration

### Environment Variables (`.env`)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Connection Pool
SUPABASE_POOL_SIZE=10
SUPABASE_MAX_OVERFLOW=5
SUPABASE_POOL_TIMEOUT=30

# Retry
SUPABASE_MAX_RETRIES=3
SUPABASE_RETRY_DELAY=1.0

# Feature Flags
USE_SUPABASE_CHAT=false
USE_SUPABASE_BUSINESS=false
USE_SUPABASE_DASHBOARD=false

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Dependencies (`requirements.txt`)

Added:
- `supabase>=2.0.0` - Supabase Python client
- `postgrest-py>=0.13.0` - PostgREST client (used by Supabase)
- `structlog>=24.0.0` - Structured logging

## File Structure

```
api/
├── middleware/
│   ├── __init__.py
│   ├── auth_middleware.py          # JWT authentication
│   ├── rbac_middleware.py          # Role-based access control
│   └── logging_middleware.py       # Request/response logging
├── repositories/
│   ├── __init__.py
│   ├── base.py                     # Generic CRUD
│   ├── task_repository.py          # Dashboard tasks
│   ├── project_repository.py       # Dashboard projects
│   ├── note_repository.py          # PKM notes
│   ├── job_repository.py           # Business jobs
│   ├── conversation_repository.py  # AI conversations
│   ├── message_repository.py       # AI messages
│   └── cross_schema_validator.py   # Cross-schema validation
├── routes/
│   ├── dashboard.py                # NEW: Dashboard endpoints
│   ├── auth.py                     # UPDATE: Use AuthService
│   ├── conversations.py            # UPDATE: Use ConversationRepository
│   └── projects.py                 # UPDATE: Feature flag for JobService
├── services/
│   ├── auth_service.py             # Supabase Auth wrapper
│   ├── dashboard_service.py        # Tasks, projects, notes logic
│   ├── job_service.py              # Business jobs logic
│   ├── storage_service.py          # Supabase Storage
│   ├── chat_service.py             # UPDATE: Use repositories
│   ├── supabase_client.py          # Supabase client singleton
│   └── supabase_errors.py          # Custom exceptions
└── schemas/
    └── (existing Pydantic models)

config/
├── __init__.py                     # UPDATE: Export settings
└── settings.py                     # NEW: Settings and feature flags
```

## Next Steps

1. **Set up Supabase Project**:
   - Create project on supabase.com
   - Run schema migration SQL (from SUPABASE_SCHEMA.md)
   - Set up RLS policies
   - Configure storage buckets

2. **Update Environment**:
   - Copy `.env.example` to `.env`
   - Fill in Supabase credentials
   - Set feature flags as needed

3. **Test Migration**:
   - Start with `USE_SUPABASE_CHAT=true`
   - Test chat functionality thoroughly
   - Enable other features incrementally

4. **Data Migration**:
   - Run migration scripts to copy data from SQLite to Supabase
   - Verify data integrity
   - Test with production-like data

5. **Frontend Updates**:
   - Update API calls to use new endpoints
   - Add Supabase Realtime for live updates
   - Update authentication flow

## Benefits

1. **Scalability**: PostgreSQL scales better than SQLite
2. **Real-time**: Built-in subscriptions for live updates
3. **Security**: Row-level security at database level
4. **Type Safety**: Pydantic models validate all data
5. **Testability**: Services can be mocked for testing
6. **Observability**: Comprehensive logging and error handling
7. **Flexibility**: Feature flags enable gradual rollout

## Important Notes

- All new code has type hints and docstrings
- Error handling is consistent across all layers
- Feature flags allow running both systems in parallel
- Repository pattern abstracts data access
- Service layer enforces business rules
- Middleware handles cross-cutting concerns
- RLS policies provide security at database level
