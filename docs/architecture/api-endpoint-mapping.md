# API Endpoint Mapping: SQLite → Supabase

## Overview

This document maps the current SQLite-based API endpoints to the new Supabase architecture. Each endpoint is analyzed for required changes during migration.

---

## Authentication Endpoints

### `/api/auth/login`

**Current Implementation:**
```python
POST /api/auth/login
Request:  {"email": "user@example.com", "password": "password123"}
Response: {
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "display_name": "Test User",
    "role": "admin",
    "is_active": true
  },
  "expires_at": "2025-12-22T10:00:00Z"
}
```

**New Implementation:**
```python
POST /api/auth/login
Request:  {"email": "user@example.com", "password": "password123"}
Response: {
  "access_token": "supabase-jwt-token",
  "refresh_token": "refresh-token-here",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "display_name": "Test User",
    "role": "admin",
    "user_metadata": {...}
  },
  "expires_at": "2025-12-22T10:00:00Z",
  "expires_in": 3600
}
```

**Migration Notes:**
- Replace custom JWT with Supabase Auth
- User ID changes from integer to UUID
- Add refresh token support
- Update `auth.py` to use `AuthService`

---

### `/api/auth/refresh` (NEW)

**New Endpoint:**
```python
POST /api/auth/refresh
Request:  {"refresh_token": "refresh-token-here"}
Response: {
  "access_token": "new-access-token",
  "expires_at": "2025-12-22T11:00:00Z",
  "expires_in": 3600
}
```

**Purpose:** Refresh access token without re-authenticating

---

### `/api/auth/status`

**Current Implementation:**
```python
GET /api/auth/status
Headers: Authorization: Bearer <token>
Response: {
  "authenticated": true,
  "user": {...}
}
```

**New Implementation:** (Same response, different auth verification)
- Validate Supabase JWT instead of custom JWT
- User object from Supabase Auth session

---

## Chat Endpoints

### `/api/ws/chat/{session_id}`

**Current Implementation:**
```
WebSocket: ws://localhost:8000/api/ws/chat/{session_id}?token=<jwt>&conversation_id=123
```

**New Implementation:**
```
WebSocket: ws://localhost:8000/api/ws/chat/{session_id}?token=<supabase-jwt>&conversation_id=<uuid>
```

**Migration Notes:**
- Verify Supabase JWT in WebSocket connection
- Update `ChatService` to use `ConversationRepository`
- Conversation IDs change from integer to UUID
- User IDs change from integer to UUID

**Protocol (unchanged):**
```
Client → Server: {"type": "message", "content": "...", "model": "claude-sonnet-4-5"}
Server → Client: {"type": "stream_start", "model": "...", "model_name": "..."}
Server → Client: {"type": "text_delta", "content": "..."}
Server → Client: {"type": "tool_use", "tool": {...}}
Server → Client: {"type": "stream_end", "message_id": "..."}
```

---

### `/api/chat/upload`

**Current Implementation:**
```python
POST /api/chat/upload
Content-Type: multipart/form-data
FormData: {
  file: <file>,
  session_id: "abc-123"
}
Response: {
  "status": "ok",
  "file": {
    "id": "uuid",
    "name": "document.pdf",
    "type": "pdf",
    "size": 123456,
    "has_text": true
  }
}
```

**New Implementation:**
```python
POST /api/files/upload  # Moved to /files
Content-Type: multipart/form-data
FormData: {
  file: <file>,
  folder: "chat"  # chat, estimates, receipts, media
}
Response: {
  "status": "ok",
  "file": {
    "id": "uuid",
    "name": "document.pdf",
    "path": "chat/user_<uuid>/abc-def.pdf",
    "url": "https://<project>.supabase.co/storage/v1/object/public/apex-files/...",
    "size": 123456,
    "mime_type": "application/pdf",
    "has_text": true
  }
}
```

**Migration Notes:**
- Use `FileService` with Supabase Storage
- Files stored in `apex-files` bucket
- Returns public URL instead of local path
- User context from JWT for folder organization

---

## Conversation Endpoints

### `/api/conversations`

**Current Implementation:**
```python
GET /api/conversations?limit=50
Response: {
  "conversations": [
    {
      "id": 1,
      "timestamp": "2025-12-21T10:00:00Z",
      "title": "Project Discussion",
      "session_id": "abc-123",
      "message_count": 5,
      "last_model_id": "claude-sonnet-4-5",
      "user_id": 1,
      "preview": "First message..."
    }
  ],
  "total": 50
}
```

**New Implementation:**
```python
GET /api/conversations?limit=50
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "conversations": [
    {
      "id": "uuid-here",
      "created_at": "2025-12-21T10:00:00Z",
      "title": "Project Discussion",
      "session_id": "abc-123",
      "message_count": 5,
      "last_model_id": "claude-sonnet-4-5",
      "user_id": "user-uuid",
      "preview": "First message..."
    }
  ],
  "total": 50
}
```

**Migration Notes:**
- Use `ConversationRepository`
- RLS policy: users only see their own conversations
- IDs change to UUIDs

---

### `/api/conversations/{id}/messages`

**Current Implementation:**
```python
GET /api/conversations/123/messages
Response: {
  "messages": [
    {
      "id": 456,
      "conversation_id": 123,
      "role": "user",
      "content": "Hello",
      "timestamp": "2025-12-21T10:00:00Z"
    }
  ]
}
```

**New Implementation:**
```python
GET /api/conversations/<uuid>/messages
Response: {
  "messages": [
    {
      "id": "message-uuid",
      "conversation_id": "conv-uuid",
      "role": "user",
      "content": "Hello",
      "created_at": "2025-12-21T10:00:00Z"
    }
  ]
}
```

**Migration Notes:**
- Use `MessageRepository`
- UUIDs for all IDs
- `timestamp` → `created_at`

---

## Project Endpoints

### `/api/projects`

**Current Implementation:**
```python
GET /api/projects?status=active&limit=50&offset=0
Response: {
  "projects": [
    {
      "id": 1,
      "job_number": "202512-001-MIT",
      "status": "active",
      "client_name": "John Doe",
      "insurance_carrier": "State Farm",
      "property_address": "123 Main St",
      "loss_type": "Water Damage",
      "date_of_loss": "2025-12-01"
    }
  ],
  "total": 50
}
```

**New Implementation:**
```python
GET /api/projects?status=active&limit=50&offset=0
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "projects": [
    {
      "id": 1,  # Stays as integer (business PK)
      "job_number": "202512-001-MIT",
      "status": "active",
      "client_name": "John Doe",
      "insurance_carrier": "State Farm",
      "property_address": "123 Main St",
      "damage_source": "supply_line",
      "damage_category": "water",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 50
}
```

**Migration Notes:**
- Use `ProjectService` → `ProjectRepository`
- Business schema doesn't use UUIDs (keeps integer PKs)
- RLS: all authenticated users can view
- Field renames: `loss_type` → `damage_source`, `damage_category`

---

### `/api/projects/{id}`

**Current Implementation:**
```python
GET /api/projects/123
Response: {
  "id": 123,
  "job_number": "202512-001-MIT",
  "status": "active",
  "client": {...},
  "carrier": {...},
  "contacts": [...],
  "estimates": [...],
  "payments": [...],
  "notes": [...],
  "accounting_summary": {...}
}
```

**New Implementation:** (Same structure, different data source)
- Use `ProjectRepository.find_with_relations()`
- PostgREST resource embedding for related data
- Single database query instead of multiple

---

### `/api/projects` (POST)

**Current Implementation:**
```python
POST /api/projects
Request: {
  "job_number": "202512-001-MIT",
  "client_name": "John Doe",
  "status": "lead",
  "address": "123 Main St",
  "damage_source": "supply_line",
  "damage_category": "water"
}
Response: {
  "id": 123,
  "job_number": "202512-001-MIT",
  ...
}
```

**New Implementation:** (Same API, different backend)
- Use `ProjectService.create_project()`
- RLS: Only managers/admins can create
- Auto-generate job number if not provided

---

## Dashboard Endpoints (NEW)

These endpoints don't exist in current implementation.

### `/api/dashboard/tasks`

**New Endpoint:**
```python
GET /api/dashboard/tasks?list_id=1&status=incomplete
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "tasks": [
    {
      "id": "task-uuid",
      "user_id": "user-uuid",
      "list_id": 1,
      "title": "Follow up with adjuster",
      "description": "Call about estimate approval",
      "status": "incomplete",
      "priority": "high",
      "due_date": "2025-12-22",
      "is_my_day": true,
      "job_id": 123,  # Link to business.jobs
      "created_at": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 10
}
```

**Features:**
- RLS: users only see their own tasks
- Cross-schema validation for `job_id`
- Supports filtering by list, status, priority

---

### `/api/dashboard/my-day`

**New Endpoint:**
```python
GET /api/dashboard/my-day
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "tasks": [...],
  "total": 5
}
```

**Features:**
- Tasks marked as "My Day" for current user
- Filtered by `is_my_day = true` AND `my_day_date = today`

---

### `/api/dashboard/projects`

**New Endpoint:**
```python
GET /api/dashboard/projects
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "projects": [
    {
      "id": "project-uuid",
      "user_id": "user-uuid",
      "title": "Home Renovation Ideas",
      "description": "Research for kitchen remodel",
      "color": "blue",
      "is_favorite": true,
      "created_at": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 3
}
```

**Note:** These are personal projects (PKM), not job projects

---

### `/api/dashboard/notes`

**New Endpoint:**
```python
GET /api/dashboard/notes?limit=50
Headers: Authorization: Bearer <supabase-jwt>
Response: {
  "notes": [
    {
      "id": "note-uuid",
      "user_id": "user-uuid",
      "title": "Water Damage Best Practices",
      "content": "Markdown content here...",
      "project_id": "project-uuid",
      "tags": ["water-damage", "mitigation"],
      "created_at": "2025-12-21T10:00:00Z",
      "updated_at": "2025-12-21T11:00:00Z"
    }
  ],
  "total": 25
}
```

**Features:**
- RLS: users only see their own notes
- Full-text search on title + content
- Tag filtering

---

## Contact Endpoints

### `/api/contacts`

**Current Implementation:**
```python
GET /api/contacts?limit=500
Response: {
  "contacts": [
    {
      "id": 1,
      "full_name": "Jane Smith",
      "organization_name": "State Farm",
      "email": "jane@statefarm.com",
      "phone": "555-1234"
    }
  ],
  "total": 500
}
```

**New Implementation:** (Same structure)
- Use `ContactRepository`
- Business schema (integer PKs)
- RLS: all authenticated users can view

---

### `/api/contacts/search?q=jane`

**Current Implementation:**
```python
GET /api/contacts/search?q=jane
Response: {
  "contacts": [...]
}
```

**New Implementation:**
- Use PostgreSQL full-text search
- `ilike` operator for pattern matching
- More efficient than SQLite LIKE

---

## Task Endpoints (AI Tasks)

**Current:** AI task metrics (not user tasks)
**Future:** Renamed to `/api/ai-tasks` to avoid confusion with dashboard tasks

### `/api/tasks`

**Current Implementation:**
```python
GET /api/tasks?category=project_management&limit=50
Response: {
  "tasks": [
    {
      "id": 1,
      "description": "Create estimate for job 202512-001",
      "category": "project_management",
      "status": "completed",
      "agent_used": "orchestrator",
      "steps": 5,
      "tools_used": ["Read", "Write"],
      "duration_seconds": 12.5
    }
  ]
}
```

**New Implementation:**
```python
GET /api/ai-tasks?category=project_management&limit=50
Response: {
  "tasks": [
    {
      "id": "task-uuid",
      "description": "Create estimate for job 202512-001",
      "category": "project_management",
      "status": "completed",
      "agent_used": "orchestrator",
      "metrics": {
        "steps": 5,
        "tools_used": ["Read", "Write"],
        "duration_seconds": 12.5
      },
      "created_at": "2025-12-21T10:00:00Z"
    }
  ]
}
```

**Migration Notes:**
- Rename endpoint to avoid confusion
- Use `AITaskRepository`
- JSONB for metrics

---

## Analytics Endpoints

### `/api/analytics`

**Current Implementation:**
```python
GET /api/analytics
Response: {
  "task_stats": {...},
  "tool_usage": {...},
  "automation_candidates": [...]
}
```

**New Implementation:** (Same structure, Supabase backend)
- Use PostgreSQL aggregation functions
- More efficient than SQLite

---

## File Serving Endpoints

### `/api/files/{file_path:path}`

**Current Implementation:**
```python
GET /api/files/estimates/123/abc-def.pdf
Response: (PDF file from uploads/estimates/123/abc-def.pdf)
```

**New Implementation:**
```python
GET /api/files/estimates/123/abc-def.pdf
Response: (Redirect to Supabase Storage public URL)
```

**Migration Notes:**
- Redirect to Supabase Storage CDN
- Or proxy through FastAPI (for auth)
- Public files: direct CDN link
- Private files: signed URLs

---

## Summary of Changes

### ID Changes
| Entity | Current | New |
|--------|---------|-----|
| Users | Integer | UUID |
| Conversations | Integer | UUID |
| Messages | Integer | UUID |
| Dashboard Tasks | N/A | UUID |
| Dashboard Projects | N/A | UUID |
| Dashboard Notes | N/A | UUID |
| Business Jobs | Integer | Integer (unchanged) |
| Clients | Integer | Integer (unchanged) |
| Contacts | Integer | Integer (unchanged) |

### New Endpoints
- `POST /api/auth/refresh`
- `GET /api/dashboard/tasks`
- `POST /api/dashboard/tasks`
- `GET /api/dashboard/my-day`
- `GET /api/dashboard/projects`
- `GET /api/dashboard/notes`
- `POST /api/files/upload` (replaces `/api/chat/upload`)

### Renamed Endpoints
- `/api/tasks` → `/api/ai-tasks` (to avoid confusion with dashboard tasks)

### Authentication Changes
- All endpoints require `Authorization: Bearer <supabase-jwt>` header
- WebSocket auth uses same JWT
- RLS enforced at database level

### Response Format Changes
- `timestamp` → `created_at` (consistency)
- Integer IDs → UUIDs (where applicable)
- Add `user_id` to responses (for multi-tenant context)

---

## Migration Checklist

### Phase 1: Chat Features
- [ ] Update `ChatService` to use Supabase repositories
- [ ] Update `/api/ws/chat` WebSocket handler
- [ ] Update `/api/conversations` endpoints
- [ ] Migrate `/api/chat/upload` → `/api/files/upload`
- [ ] Test with feature flag `USE_SUPABASE_CHAT=true`

### Phase 2: Business Features
- [ ] Update `ProjectService` to use Supabase repositories
- [ ] Update all `/api/projects/*` endpoints
- [ ] Update `/api/contacts/*` endpoints
- [ ] Update file serving for estimates/receipts
- [ ] Test with feature flag `USE_SUPABASE_BUSINESS=true`

### Phase 3: Dashboard Features
- [ ] Create new `/api/dashboard/*` endpoints
- [ ] Implement TaskService, ProjectService, NoteService
- [ ] Build frontend for Dashboard
- [ ] Test with feature flag `USE_SUPABASE_DASHBOARD=true`

### Phase 4: Cleanup
- [ ] Remove SQLite database files
- [ ] Remove old operations.py files
- [ ] Remove feature flags
- [ ] Update documentation
