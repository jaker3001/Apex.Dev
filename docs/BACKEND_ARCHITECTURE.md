# Backend Service Architecture for Supabase Migration

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Supabase Client Service](#supabase-client-service)
3. [Service Layer Refactoring](#service-layer-refactoring)
4. [API Contract Changes](#api-contract-changes)
5. [Authentication & Authorization](#authentication--authorization)
6. [Migration Strategy](#migration-strategy)
7. [Observability](#observability)

---

## Architecture Overview

### Current State (SQLite)
```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
├─────────────────────────────────────────────────────────────┤
│  Routes (chat, projects, auth, contacts, tasks, etc.)       │
├─────────────────────────────────────────────────────────────┤
│  Services                                                    │
│  ├─ ChatService (Claude SDK wrapper)                        │
│  └─ FileService (local uploads)                             │
├─────────────────────────────────────────────────────────────┤
│  Direct Database Access                                      │
│  ├─ database/operations.py (apex_assistant.db)              │
│  └─ database/operations_apex.py (apex_operations.db)        │
├─────────────────────────────────────────────────────────────┤
│  SQLite Databases                                            │
│  ├─ apex_assistant.db (15 tables - AI/App)                  │
│  └─ apex_operations.db (14 tables - Business)               │
└─────────────────────────────────────────────────────────────┘

WebSocket:  Direct connection for chat streaming
Auth:       JWT tokens (custom implementation)
Files:      Local filesystem (uploads/)
```

### Target State (Supabase)
```
┌──────────────────────────────────────────────────────────────┐
│                      FastAPI Application                      │
├──────────────────────────────────────────────────────────────┤
│  Routes (chat, projects, auth, contacts, tasks, etc.)        │
├──────────────────────────────────────────────────────────────┤
│  Service Layer (Business Logic)                              │
│  ├─ AuthService (Supabase Auth wrapper)                      │
│  ├─ ChatService (Claude SDK + Supabase)                      │
│  ├─ ProjectService (business logic)                          │
│  ├─ TaskService (dashboard tasks)                            │
│  ├─ FileService (Supabase Storage)                           │
│  └─ RealtimeService (Supabase Realtime events)               │
├──────────────────────────────────────────────────────────────┤
│  Repository Layer (Data Access)                              │
│  ├─ BaseRepository (generic CRUD)                            │
│  ├─ ProjectRepository                                        │
│  ├─ TaskRepository                                           │
│  ├─ ConversationRepository                                   │
│  └─ CrossSchemaValidator (dashboard ↔ business)             │
├──────────────────────────────────────────────────────────────┤
│  Supabase Client (connection pooling, retry logic)           │
├──────────────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + Extensions)              │
│  ├─ Schema: dashboard (personal productivity - RLS)          │
│  ├─ Schema: business (restoration jobs - RLS)                │
│  ├─ Supabase Auth (user management)                          │
│  ├─ Supabase Storage (file uploads)                          │
│  └─ Supabase Realtime (live updates)                         │
└──────────────────────────────────────────────────────────────┘

WebSocket:  Hybrid (FastAPI for chat + Supabase Realtime for data)
Auth:       Supabase Auth (JWT tokens)
Files:      Supabase Storage (with CDN)
RLS:        Row-level security for multi-tenant isolation
```

---

## Supabase Client Service

### 1. Client Configuration

**File:** `api/services/supabase_client.py`

```python
"""
Supabase client service with connection pooling and error handling.
"""
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import logging
from functools import lru_cache
import asyncio

logger = logging.getLogger("apex_assistant.supabase")

class SupabaseConfig:
    """Configuration for Supabase client."""

    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_ANON_KEY")
        self.service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")

        # Connection pool settings
        self.pool_size = int(os.environ.get("SUPABASE_POOL_SIZE", "10"))
        self.max_overflow = int(os.environ.get("SUPABASE_MAX_OVERFLOW", "5"))
        self.pool_timeout = int(os.environ.get("SUPABASE_POOL_TIMEOUT", "30"))

        # Retry settings
        self.max_retries = int(os.environ.get("SUPABASE_MAX_RETRIES", "3"))
        self.retry_delay = float(os.environ.get("SUPABASE_RETRY_DELAY", "1.0"))


class SupabaseClient:
    """
    Singleton wrapper for Supabase client with connection pooling.

    Usage:
        client = get_supabase_client()
        result = await client.table("projects").select("*").execute()
    """

    _instance: Optional["SupabaseClient"] = None
    _client: Optional[Client] = None
    _service_client: Optional[Client] = None
    _config: Optional[SupabaseConfig] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._config = SupabaseConfig()
        return cls._instance

    def _create_client(self, use_service_role: bool = False) -> Client:
        """Create a Supabase client with proper configuration."""
        key = (
            self._config.service_role_key if use_service_role
            else self._config.key
        )

        options = ClientOptions(
            auto_refresh_token=True,
            persist_session=True,
            # PostgREST options
            schema="public",
            headers={
                "X-Client-Info": "apex-assistant/1.0",
            }
        )

        return create_client(
            supabase_url=self._config.url,
            supabase_key=key,
            options=options
        )

    @property
    def client(self) -> Client:
        """Get the standard client (uses anon key + RLS)."""
        if self._client is None:
            self._client = self._create_client(use_service_role=False)
            logger.info("Supabase client initialized")
        return self._client

    @property
    def service_client(self) -> Client:
        """Get the service role client (bypasses RLS)."""
        if self._service_client is None:
            self._service_client = self._create_client(use_service_role=True)
            logger.info("Supabase service role client initialized")
        return self._service_client

    def set_auth_token(self, token: str):
        """Set JWT token for the current request context."""
        self.client.auth.set_session(token)

    async def execute_with_retry(
        self,
        operation: callable,
        max_retries: Optional[int] = None,
        retry_delay: Optional[float] = None,
    ) -> Any:
        """
        Execute a database operation with retry logic.

        Args:
            operation: Async callable that performs the database operation
            max_retries: Override default max retries
            retry_delay: Override default retry delay

        Returns:
            Result of the operation

        Raises:
            Exception after max retries exhausted
        """
        max_retries = max_retries or self._config.max_retries
        retry_delay = retry_delay or self._config.retry_delay

        last_error = None
        for attempt in range(max_retries):
            try:
                return await operation()
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Supabase operation failed (attempt {attempt + 1}/{max_retries}): {e}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (2 ** attempt))  # Exponential backoff

        logger.error(f"Supabase operation failed after {max_retries} attempts")
        raise last_error

    async def close(self):
        """Close Supabase connections."""
        # Supabase client doesn't require explicit closing, but we can cleanup
        self._client = None
        self._service_client = None
        logger.info("Supabase clients closed")


@lru_cache()
def get_supabase_client() -> SupabaseClient:
    """Get the singleton Supabase client instance."""
    return SupabaseClient()


# Convenience functions for direct access
def get_client() -> Client:
    """Get the standard Supabase client."""
    return get_supabase_client().client


def get_service_client() -> Client:
    """Get the service role client (bypasses RLS)."""
    return get_supabase_client().service_client
```

### 2. Error Handling Patterns

**File:** `api/services/supabase_errors.py`

```python
"""
Custom exceptions for Supabase operations.
"""
from typing import Optional

class SupabaseError(Exception):
    """Base exception for Supabase operations."""
    pass


class AuthenticationError(SupabaseError):
    """Raised when authentication fails."""
    pass


class AuthorizationError(SupabaseError):
    """Raised when user lacks permissions (RLS violation)."""
    pass


class ResourceNotFoundError(SupabaseError):
    """Raised when a requested resource doesn't exist."""
    def __init__(self, resource_type: str, resource_id: any):
        self.resource_type = resource_type
        self.resource_id = resource_id
        super().__init__(f"{resource_type} with ID {resource_id} not found")


class ValidationError(SupabaseError):
    """Raised when data validation fails."""
    def __init__(self, message: str, field: Optional[str] = None):
        self.field = field
        super().__init__(message)


class DatabaseError(SupabaseError):
    """Raised when a database operation fails."""
    pass


class CrossSchemaValidationError(SupabaseError):
    """Raised when cross-schema reference validation fails."""
    def __init__(self, source_schema: str, target_schema: str, message: str):
        self.source_schema = source_schema
        self.target_schema = target_schema
        super().__init__(
            f"Cross-schema validation failed ({source_schema} → {target_schema}): {message}"
        )


def handle_supabase_error(error: Exception) -> SupabaseError:
    """
    Convert Supabase errors to custom exceptions.

    Args:
        error: Exception from Supabase client

    Returns:
        Custom SupabaseError subclass
    """
    error_msg = str(error).lower()

    if "authentication" in error_msg or "jwt" in error_msg:
        return AuthenticationError(str(error))

    if "authorization" in error_msg or "rls" in error_msg or "policy" in error_msg:
        return AuthorizationError(str(error))

    if "not found" in error_msg or "no rows" in error_msg:
        return ResourceNotFoundError("Resource", "unknown")

    if "violates" in error_msg or "constraint" in error_msg:
        return ValidationError(str(error))

    return DatabaseError(str(error))
```

---

## Service Layer Refactoring

### 1. Repository Pattern (Base)

**File:** `api/repositories/base.py`

```python
"""
Base repository with generic CRUD operations.
"""
from typing import Generic, TypeVar, List, Optional, Dict, Any
from pydantic import BaseModel
from supabase import Client
from api.services.supabase_client import get_client
from api.services.supabase_errors import (
    ResourceNotFoundError,
    handle_supabase_error
)

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """
    Generic repository for database operations.

    Implements the repository pattern to abstract Supabase access.
    Subclass this for specific entities (projects, tasks, etc.).
    """

    def __init__(
        self,
        table_name: str,
        schema: str = "public",
        model: type[T] = None,
        client: Optional[Client] = None,
    ):
        """
        Initialize repository.

        Args:
            table_name: Name of the database table
            schema: Schema name (default: "public")
            model: Pydantic model for response validation
            client: Optional Supabase client (uses default if not provided)
        """
        self.table_name = table_name
        self.schema = schema
        self.model = model
        self._client = client

    @property
    def client(self) -> Client:
        """Get Supabase client."""
        return self._client or get_client()

    def _get_table(self):
        """Get table reference with schema."""
        if self.schema != "public":
            return self.client.schema(self.schema).table(self.table_name)
        return self.client.table(self.table_name)

    async def find_by_id(self, id: any) -> Optional[T]:
        """
        Find a record by ID.

        Args:
            id: Primary key value

        Returns:
            Model instance or None if not found
        """
        try:
            result = self._get_table().select("*").eq("id", id).execute()

            if not result.data:
                return None

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def find_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[T]:
        """
        Find all records matching filters.

        Args:
            filters: Dict of column: value filters
            order_by: Column to order by (prefix with - for DESC)
            limit: Max number of records
            offset: Number of records to skip

        Returns:
            List of model instances
        """
        try:
            query = self._get_table().select("*")

            # Apply filters
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)

            # Apply ordering
            if order_by:
                ascending = not order_by.startswith("-")
                column = order_by.lstrip("-")
                query = query.order(column, desc=not ascending)

            # Apply pagination
            if limit:
                query = query.limit(limit)
            if offset:
                query = query.offset(offset)

            result = query.execute()

            if self.model:
                return [self.model(**item) for item in result.data]
            return result.data

        except Exception as e:
            raise handle_supabase_error(e)

    async def create(self, data: Dict[str, Any]) -> T:
        """
        Create a new record.

        Args:
            data: Dictionary of column values

        Returns:
            Created model instance
        """
        try:
            result = self._get_table().insert(data).execute()

            if not result.data:
                raise DatabaseError("Insert returned no data")

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def update(self, id: any, data: Dict[str, Any]) -> T:
        """
        Update a record by ID.

        Args:
            id: Primary key value
            data: Dictionary of column values to update

        Returns:
            Updated model instance
        """
        try:
            result = (
                self._get_table()
                .update(data)
                .eq("id", id)
                .execute()
            )

            if not result.data:
                raise ResourceNotFoundError(self.table_name, id)

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def delete(self, id: any) -> bool:
        """
        Delete a record by ID.

        Args:
            id: Primary key value

        Returns:
            True if deleted, False if not found
        """
        try:
            result = self._get_table().delete().eq("id", id).execute()
            return len(result.data) > 0

        except Exception as e:
            raise handle_supabase_error(e)

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records matching filters.

        Args:
            filters: Dict of column: value filters

        Returns:
            Count of matching records
        """
        try:
            query = self._get_table().select("*", count="exact")

            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)

            result = query.execute()
            return result.count

        except Exception as e:
            raise handle_supabase_error(e)
```

### 2. Specific Repositories

**File:** `api/repositories/project_repository.py`

```python
"""
Repository for business.jobs table.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import ProjectResponse


class ProjectRepository(BaseRepository[ProjectResponse]):
    """Repository for restoration projects."""

    def __init__(self):
        super().__init__(
            table_name="jobs",
            schema="business",
            model=ProjectResponse,
        )

    async def find_by_job_number(self, job_number: str) -> Optional[ProjectResponse]:
        """Find project by job number."""
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_number", job_number)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            raise handle_supabase_error(e)

    async def find_with_relations(self, id: int) -> Optional[Dict[str, Any]]:
        """
        Find project with all related data (client, carrier, contacts, estimates, etc.).

        Uses PostgREST resource embedding:
        https://postgrest.org/en/stable/references/api/resource_embedding.html
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    client:clients(*),
                    carrier:organizations(*),
                    contacts:job_contacts(*, contact:contacts(*)),
                    estimates(*),
                    payments(*),
                    notes(*),
                    media(*),
                    labor_entries(*),
                    receipts(*),
                    work_orders(*)
                    """
                )
                .eq("id", id)
                .execute()
            )

            if not result.data:
                return None

            return result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def find_by_status(
        self,
        status: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """Find projects by status with pagination."""
        return await self.find_all(
            filters={"status": status},
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )
```

**File:** `api/repositories/task_repository.py`

```python
"""
Repository for dashboard.tasks table.
"""
from typing import List, Optional
from datetime import datetime, date
from api.repositories.base import BaseRepository
from api.repositories.cross_schema_validator import CrossSchemaValidator
from api.schemas.tasks import TaskResponse
from api.services.supabase_errors import CrossSchemaValidationError


class TaskRepository(BaseRepository[TaskResponse]):
    """Repository for dashboard tasks (personal to-do items)."""

    def __init__(self):
        super().__init__(
            table_name="tasks",
            schema="dashboard",
            model=TaskResponse,
        )
        self.validator = CrossSchemaValidator()

    async def create(self, data: Dict[str, Any]) -> TaskResponse:
        """
        Create a task with cross-schema validation.

        Validates that job_id (if provided) exists in business.jobs.
        """
        # Validate job_id reference
        job_id = data.get("job_id")
        if job_id:
            is_valid = await self.validator.validate_job_reference(job_id)
            if not is_valid:
                raise CrossSchemaValidationError(
                    "dashboard",
                    "business",
                    f"Job with ID {job_id} does not exist"
                )

        return await super().create(data)

    async def find_by_user(
        self,
        user_id: str,
        list_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[TaskResponse]:
        """Find tasks for a specific user."""
        filters = {"user_id": user_id}

        if list_id:
            filters["list_id"] = list_id
        if status:
            filters["status"] = status

        return await self.find_all(
            filters=filters,
            order_by="-created_at",
        )

    async def find_my_day(self, user_id: str) -> List[TaskResponse]:
        """Find tasks marked as 'My Day' for a user."""
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_my_day", True)
                .eq("my_day_date", date.today().isoformat())
                .order("sort_order")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            raise handle_supabase_error(e)

    async def find_by_job(
        self,
        user_id: str,
        job_id: int,
    ) -> List[TaskResponse]:
        """Find all tasks linked to a specific job."""
        return await self.find_all(
            filters={"user_id": user_id, "job_id": job_id},
            order_by="-created_at",
        )
```

### 3. Cross-Schema Validation Service

**File:** `api/repositories/cross_schema_validator.py`

```python
"""
Service for validating cross-schema references.
"""
from api.services.supabase_client import get_client


class CrossSchemaValidator:
    """
    Validates references between dashboard and business schemas.

    Critical for ensuring data integrity when dashboard tables
    reference business tables (e.g., tasks.job_id → business.jobs.id).
    """

    def __init__(self):
        self.client = get_client()

    async def validate_job_reference(self, job_id: int) -> bool:
        """
        Validate that a job exists in business.jobs.

        Args:
            job_id: Job ID to validate

        Returns:
            True if job exists, False otherwise
        """
        try:
            result = (
                self.client.schema("business")
                .table("jobs")
                .select("id")
                .eq("id", job_id)
                .execute()
            )

            return len(result.data) > 0

        except Exception:
            return False

    async def validate_user_reference(self, user_id: str) -> bool:
        """
        Validate that a user exists in auth.users.

        Args:
            user_id: User UUID to validate

        Returns:
            True if user exists, False otherwise
        """
        try:
            result = (
                self.client.auth.admin.get_user_by_id(user_id)
            )
            return result is not None

        except Exception:
            return False
```

### 4. Business Logic Services

**File:** `api/services/project_service.py`

```python
"""
Business logic service for projects.
"""
from typing import List, Optional, Dict, Any
from api.repositories.project_repository import ProjectRepository
from api.schemas.operations import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)
from api.services.supabase_errors import ResourceNotFoundError


class ProjectService:
    """Service for managing restoration projects."""

    def __init__(self):
        self.repo = ProjectRepository()

    async def get_project(self, project_id: int) -> ProjectResponse:
        """Get a project by ID."""
        project = await self.repo.find_by_id(project_id)

        if not project:
            raise ResourceNotFoundError("Project", project_id)

        return project

    async def get_project_full(self, project_id: int) -> Dict[str, Any]:
        """Get a project with all related data."""
        project = await self.repo.find_with_relations(project_id)

        if not project:
            raise ResourceNotFoundError("Project", project_id)

        return project

    async def list_projects(
        self,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """List projects with optional filtering."""
        if status:
            return await self.repo.find_by_status(status, limit, offset)

        return await self.repo.find_all(
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        """Create a new project."""
        # Business logic: auto-generate job number if not provided
        if not data.job_number:
            data.job_number = await self._generate_job_number(data.damage_category)

        project_dict = data.model_dump(exclude_unset=True)
        return await self.repo.create(project_dict)

    async def update_project(
        self,
        project_id: int,
        data: ProjectUpdate,
    ) -> ProjectResponse:
        """Update a project."""
        # Verify project exists
        existing = await self.get_project(project_id)

        # Business logic: status transitions
        if data.status and data.status != existing.status:
            self._validate_status_transition(existing.status, data.status)

        update_dict = data.model_dump(exclude_unset=True)
        return await self.repo.update(project_id, update_dict)

    async def delete_project(self, project_id: int) -> bool:
        """Delete a project."""
        return await self.repo.delete(project_id)

    def _validate_status_transition(self, from_status: str, to_status: str):
        """Validate status transitions based on business rules."""
        # Example: Can't go from 'complete' to 'active'
        invalid_transitions = {
            "complete": ["lead", "pending", "active"],
            "closed": ["lead", "pending", "active", "complete"],
        }

        if from_status in invalid_transitions:
            if to_status in invalid_transitions[from_status]:
                raise ValidationError(
                    f"Cannot transition from {from_status} to {to_status}"
                )

    async def _generate_job_number(self, job_type: str) -> str:
        """Generate next job number (moved from route to service)."""
        # Implementation matches current logic in routes/projects.py
        pass
```

---

## API Contract Changes

### 1. Authentication Flow Changes

#### Current (JWT)
```
POST /api/auth/login
Request:  {"email": "...", "password": "..."}
Response: {"token": "...", "user": {...}, "expires_at": "..."}

WebSocket connection:
ws://localhost:8000/api/ws/chat/{session_id}?token=<jwt_token>
```

#### Target (Supabase Auth)
```
POST /api/auth/login
Request:  {"email": "...", "password": "..."}
Response: {
  "access_token": "...",
  "refresh_token": "...",
  "user": {...},
  "expires_at": "...",
  "expires_in": 3600
}

WebSocket connection (same):
ws://localhost:8000/api/ws/chat/{session_id}?token=<supabase_jwt>

New endpoint for refresh:
POST /api/auth/refresh
Request:  {"refresh_token": "..."}
Response: {"access_token": "...", "expires_at": "..."}
```

**New Auth Service:**
```python
# api/services/auth_service.py
from supabase import Client
from api.services.supabase_client import get_client

class AuthService:
    def __init__(self):
        self.client = get_client()

    async def sign_in(self, email: str, password: str):
        """Sign in with Supabase Auth."""
        result = self.client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        return result

    async def sign_up(self, email: str, password: str, metadata: dict):
        """Create new user account."""
        result = self.client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": metadata}
        })
        return result

    async def refresh_session(self, refresh_token: str):
        """Refresh access token."""
        result = self.client.auth.refresh_session(refresh_token)
        return result

    async def sign_out(self):
        """Sign out current user."""
        await self.client.auth.sign_out()
```

### 2. New Dashboard Endpoints

These endpoints don't exist yet but will be needed for the dashboard schema:

```python
# api/routes/dashboard.py

@router.get("/dashboard/tasks")
async def get_my_tasks(
    user: UserResponse = Depends(require_auth),
    list_id: Optional[int] = None,
    status: Optional[str] = None,
):
    """Get tasks for current user."""
    service = TaskService()
    tasks = await service.get_user_tasks(
        user_id=user.id,
        list_id=list_id,
        status=status,
    )
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/dashboard/my-day")
async def get_my_day(user: UserResponse = Depends(require_auth)):
    """Get tasks marked as 'My Day'."""
    service = TaskService()
    tasks = await service.get_my_day_tasks(user.id)
    return {"tasks": tasks, "total": len(tasks)}


@router.get("/dashboard/projects")
async def get_my_projects(user: UserResponse = Depends(require_auth)):
    """Get personal projects (not job projects)."""
    service = DashboardProjectService()
    projects = await service.get_user_projects(user.id)
    return {"projects": projects, "total": len(projects)}


@router.get("/dashboard/notes")
async def get_my_notes(
    user: UserResponse = Depends(require_auth),
    limit: int = 50,
):
    """Get PKM notes for current user."""
    service = NoteService()
    notes = await service.get_user_notes(user.id, limit=limit)
    return {"notes": notes, "total": len(notes)}
```

### 3. WebSocket + Supabase Realtime Integration

**Hybrid approach:**
- Keep FastAPI WebSocket for **chat streaming** (Claude responses)
- Add Supabase Realtime for **data updates** (task changes, project updates)

```python
# api/services/realtime_service.py

class RealtimeService:
    """
    Service for subscribing to Supabase Realtime channels.

    Handles real-time updates for tasks, projects, and other entities.
    """

    def __init__(self):
        self.client = get_client()
        self.subscriptions = {}

    async def subscribe_to_user_tasks(
        self,
        user_id: str,
        callback: callable,
    ):
        """
        Subscribe to task changes for a specific user.

        Args:
            user_id: User UUID
            callback: Function to call when task changes occur
        """
        channel = self.client.channel(f"user_{user_id}_tasks")

        channel.on(
            "postgres_changes",
            event="*",
            schema="dashboard",
            table="tasks",
            filter=f"user_id=eq.{user_id}",
            callback=callback,
        )

        channel.subscribe()
        self.subscriptions[f"tasks_{user_id}"] = channel

    async def subscribe_to_project_updates(
        self,
        project_id: int,
        callback: callable,
    ):
        """Subscribe to updates for a specific project."""
        channel = self.client.channel(f"project_{project_id}")

        # Subscribe to main project table
        channel.on(
            "postgres_changes",
            event="UPDATE",
            schema="business",
            table="jobs",
            filter=f"id=eq.{project_id}",
            callback=callback,
        )

        # Subscribe to related tables (estimates, payments, notes)
        for table in ["estimates", "payments", "notes"]:
            channel.on(
                "postgres_changes",
                event="*",
                schema="business",
                table=table,
                filter=f"job_id=eq.{project_id}",
                callback=callback,
            )

        channel.subscribe()
        self.subscriptions[f"project_{project_id}"] = channel

    async def unsubscribe(self, subscription_key: str):
        """Unsubscribe from a channel."""
        if subscription_key in self.subscriptions:
            channel = self.subscriptions[subscription_key]
            await channel.unsubscribe()
            del self.subscriptions[subscription_key]
```

**Frontend integration:**
```typescript
// frontend/src/services/realtimeService.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const subscribeToUserTasks = (userId: string, callback: Function) => {
  const channel = supabase
    .channel(`user_${userId}_tasks`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'dashboard',
        table: 'tasks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return channel
}
```

### 4. File Upload Changes

#### Current (Local Filesystem)
```
POST /api/chat/upload
Saves to: uploads/chat/{session_id}/{file_id}_{filename}
```

#### Target (Supabase Storage)
```
POST /api/files/upload
Request: FormData with file + metadata
Response: {
  "id": "...",
  "path": "chat/user123/abc-def-ghi.pdf",
  "url": "https://<project>.supabase.co/storage/v1/object/public/...",
  "size": 123456,
  "mime_type": "application/pdf"
}

File structure in Supabase Storage:
bucket: apex-files
├─ chat/
│  ├─ user_<uuid>/
│  │  ├─ <file_id>.pdf
│  │  └─ <file_id>.png
├─ estimates/
│  ├─ job_<id>/
│  │  └─ <file_id>_estimate.pdf
├─ receipts/
│  ├─ job_<id>/
│  │  └─ <file_id>_receipt.jpg
└─ media/
   ├─ job_<id>/
      └─ <file_id>_photo.jpg
```

**New File Service:**
```python
# api/services/file_service.py

class FileService:
    """Service for managing file uploads with Supabase Storage."""

    def __init__(self):
        self.client = get_client()
        self.bucket = "apex-files"

    async def upload_file(
        self,
        file: UploadFile,
        user_id: str,
        folder: str = "chat",
    ) -> Dict[str, Any]:
        """
        Upload file to Supabase Storage.

        Args:
            file: Uploaded file
            user_id: User UUID for path organization
            folder: Folder within bucket (chat, estimates, receipts, media)

        Returns:
            Dict with file metadata (id, path, url, size, mime_type)
        """
        file_id = str(uuid.uuid4())
        extension = Path(file.filename).suffix
        file_path = f"{folder}/user_{user_id}/{file_id}{extension}"

        # Read file content
        content = await file.read()

        # Upload to Supabase Storage
        result = self.client.storage.from_(self.bucket).upload(
            file_path,
            content,
            file_options={
                "content-type": file.content_type,
                "cache-control": "3600",
            }
        )

        # Get public URL
        url = self.client.storage.from_(self.bucket).get_public_url(file_path)

        return {
            "id": file_id,
            "path": file_path,
            "url": url,
            "size": len(content),
            "mime_type": file.content_type,
        }

    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage."""
        try:
            self.client.storage.from_(self.bucket).remove([file_path])
            return True
        except Exception:
            return False
```

---

## Authentication & Authorization

### 1. RLS Policies

Supabase uses Row-Level Security (RLS) to enforce data isolation. Policies are defined in SQL and enforced at the database level.

**Example for dashboard.tasks:**
```sql
-- Enable RLS
ALTER TABLE dashboard.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tasks
CREATE POLICY "Users can view own tasks"
  ON dashboard.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can insert own tasks"
  ON dashboard.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON dashboard.tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON dashboard.tasks
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Example for business.jobs (with role-based access):**
```sql
-- Enable RLS
ALTER TABLE business.jobs ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view jobs
CREATE POLICY "Authenticated users can view jobs"
  ON business.jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins/managers can create jobs
CREATE POLICY "Admins can create jobs"
  ON business.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
  );

-- Policy: Only admins/managers can update jobs
CREATE POLICY "Admins can update jobs"
  ON business.jobs
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'manager')
  );
```

### 2. Role-Based Access Control (RBAC)

**User roles stored in JWT claims:**
```json
{
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "role": "admin",  // admin | manager | employee
  "user_metadata": {
    "display_name": "John Doe",
    "contact_id": 123
  }
}
```

**Middleware for role enforcement:**
```python
# api/middleware/auth_middleware.py

from fastapi import Request, HTTPException
from api.services.auth_service import AuthService

async def require_role(request: Request, required_role: str):
    """
    Middleware to enforce role-based access control.

    Args:
        request: FastAPI request object
        required_role: Required role (admin, manager, employee)

    Raises:
        HTTPException if user lacks required role
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.replace("Bearer ", "")

    # Verify token and extract role
    auth_service = AuthService()
    user = await auth_service.get_user_from_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = user.get("role", "employee")

    # Check role hierarchy
    role_hierarchy = {"admin": 3, "manager": 2, "employee": 1}

    if role_hierarchy.get(role, 0) < role_hierarchy.get(required_role, 0):
        raise HTTPException(
            status_code=403,
            detail=f"Requires {required_role} role"
        )

    request.state.user = user
    return user


# Usage in routes:
@router.post("/projects")
async def create_project(
    project: ProjectCreate,
    user = Depends(lambda r: require_role(r, "manager"))
):
    """Only managers and admins can create projects."""
    pass
```

---

## Migration Strategy

### Phase 1: AI Features (Conversations, Messages, Tasks tracking)

**Goal:** Migrate assistant-related tables first (lowest risk).

**Tables:**
- `conversations` → `dashboard.conversations`
- `messages` → `dashboard.messages`
- `agents` → `dashboard.agents`
- `tasks` (AI tasks, not user tasks) → `dashboard.ai_tasks`
- `mcp_connections` → `dashboard.mcp_connections`

**Steps:**
1. Create Supabase schemas and tables
2. Run migration script to copy data
3. Update `ChatService` to use Supabase repositories
4. Update WebSocket routes to use new auth
5. Test chat functionality end-to-end
6. Deploy with feature flag `USE_SUPABASE_CHAT=true`

**Code changes:**
```python
# api/services/chat_service.py (updated)

from api.repositories.conversation_repository import ConversationRepository
from api.repositories.message_repository import MessageRepository

class ChatService:
    def __init__(self):
        self.conversation_repo = ConversationRepository()
        self.message_repo = MessageRepository()
        # ... rest of initialization

    async def start_session(self, user_id: str):
        """Create new conversation in Supabase."""
        conversation = await self.conversation_repo.create({
            "user_id": user_id,
            "session_id": self.session_id,
            "is_active": True,
        })
        self.conversation_id = conversation.id
```

### Phase 2: Jobs Section (Business Schema)

**Goal:** Migrate business operations tables.

**Tables:**
- `projects` → `business.jobs`
- `clients` → `business.clients`
- `organizations` → `business.organizations`
- `contacts` → `business.contacts`
- `estimates`, `payments`, `notes`, `media`, etc.

**Steps:**
1. Create business schema and tables
2. Set up RLS policies for multi-tenant access
3. Migrate data with referential integrity checks
4. Update `ProjectService` to use repositories
5. Update all `/api/projects/*` routes
6. Test Jobs UI end-to-end
7. Deploy with feature flag `USE_SUPABASE_BUSINESS=true`

### Phase 3: Dashboard Schema (New Features)

**Goal:** Implement new dashboard features (tasks, projects, notes).

**Tables (all new):**
- `dashboard.tasks` (user to-dos)
- `dashboard.task_lists`
- `dashboard.projects` (personal projects, not jobs)
- `dashboard.notes` (PKM)
- `dashboard.tags`
- `dashboard.goals`
- `dashboard.time_entries`
- `dashboard.inbox_items`

**Steps:**
1. Create schema and tables
2. Implement repositories and services
3. Create new API routes (`/api/dashboard/*`)
4. Build Dashboard UI
5. Deploy

### Feature Flags

**Configuration:**
```python
# config/feature_flags.py

import os

class FeatureFlags:
    USE_SUPABASE_CHAT = os.getenv("USE_SUPABASE_CHAT", "false") == "true"
    USE_SUPABASE_BUSINESS = os.getenv("USE_SUPABASE_BUSINESS", "false") == "true"
    USE_SUPABASE_DASHBOARD = os.getenv("USE_SUPABASE_DASHBOARD", "false") == "true"

    @classmethod
    def is_supabase_enabled(cls) -> bool:
        return (
            cls.USE_SUPABASE_CHAT or
            cls.USE_SUPABASE_BUSINESS or
            cls.USE_SUPABASE_DASHBOARD
        )
```

**Usage in code:**
```python
from config.feature_flags import FeatureFlags

if FeatureFlags.USE_SUPABASE_CHAT:
    # Use Supabase repositories
    repo = ConversationRepository()
else:
    # Use SQLite operations
    from database import create_conversation
```

### Data Migration Script

**File:** `scripts/migrate_to_supabase.py`

```python
"""
Migration script to copy data from SQLite to Supabase.
"""
import asyncio
from database.schema import get_connection as get_sqlite_conn
from api.services.supabase_client import get_service_client

async def migrate_conversations():
    """Migrate conversations table."""
    sqlite_conn = get_sqlite_conn()
    supabase = get_service_client()

    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM conversations")
    rows = cursor.fetchall()

    for row in rows:
        data = dict(row)
        await supabase.table("conversations").insert(data).execute()

    print(f"Migrated {len(rows)} conversations")

# Similar functions for other tables...

async def main():
    print("Starting migration to Supabase...")

    await migrate_conversations()
    await migrate_messages()
    # ... migrate other tables

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Observability

### 1. Logging Strategy

**Structured logging with context:**
```python
# api/middleware/logging_middleware.py

import logging
import time
from fastapi import Request
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

async def log_request_middleware(request: Request, call_next):
    """Log all requests with timing and metadata."""
    request_id = str(uuid.uuid4())
    start_time = time.time()

    # Add request context
    log = logger.bind(
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        client_ip=request.client.host,
    )

    log.info("request_started")

    try:
        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000

        log.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        return response

    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000

        log.error(
            "request_failed",
            error=str(e),
            duration_ms=duration_ms,
        )
        raise
```

**Database query logging:**
```python
# api/repositories/base.py (enhanced)

class BaseRepository:
    async def find_by_id(self, id: any) -> Optional[T]:
        """Find a record by ID with query logging."""
        start_time = time.time()

        try:
            result = self._get_table().select("*").eq("id", id).execute()

            duration_ms = (time.time() - start_time) * 1000

            logger.info(
                "supabase_query",
                table=self.table_name,
                operation="SELECT",
                duration_ms=duration_ms,
                rows_returned=len(result.data),
            )

            if not result.data:
                return None

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000

            logger.error(
                "supabase_query_failed",
                table=self.table_name,
                operation="SELECT",
                duration_ms=duration_ms,
                error=str(e),
            )
            raise handle_supabase_error(e)
```

### 2. Performance Metrics

**Prometheus metrics:**
```python
# api/middleware/metrics_middleware.py

from prometheus_client import Counter, Histogram, Gauge
import time

# Define metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"]
)

supabase_queries_total = Counter(
    "supabase_queries_total",
    "Total Supabase queries",
    ["table", "operation", "status"]
)

supabase_query_duration_seconds = Histogram(
    "supabase_query_duration_seconds",
    "Supabase query duration in seconds",
    ["table", "operation"]
)

active_websocket_connections = Gauge(
    "active_websocket_connections",
    "Number of active WebSocket connections"
)

# Middleware to track metrics
async def metrics_middleware(request: Request, call_next):
    """Track request metrics."""
    start_time = time.time()

    try:
        response = await call_next(request)

        duration = time.time() - start_time

        http_requests_total.labels(
            method=request.method,
            path=request.url.path,
            status=response.status_code
        ).inc()

        http_request_duration_seconds.labels(
            method=request.method,
            path=request.url.path
        ).observe(duration)

        return response

    except Exception as e:
        duration = time.time() - start_time

        http_requests_total.labels(
            method=request.method,
            path=request.url.path,
            status=500
        ).inc()

        raise


# Expose metrics endpoint
from fastapi import APIRouter
from prometheus_client import generate_latest

metrics_router = APIRouter()

@metrics_router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        generate_latest(),
        media_type="text/plain"
    )
```

### 3. Error Tracking

**Sentry integration:**
```python
# api/middleware/sentry_middleware.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

def init_sentry():
    """Initialize Sentry for error tracking."""
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(),
        ],
        traces_sample_rate=0.1,  # 10% of requests traced
        environment=os.getenv("ENVIRONMENT", "development"),
    )

# In main.py:
from api.middleware.sentry_middleware import init_sentry

if os.getenv("SENTRY_DSN"):
    init_sentry()
```

---

## Environment Variables

**Required for Supabase migration:**
```bash
# Supabase Configuration
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Connection Pool Settings
SUPABASE_POOL_SIZE=10
SUPABASE_MAX_OVERFLOW=5
SUPABASE_POOL_TIMEOUT=30

# Retry Settings
SUPABASE_MAX_RETRIES=3
SUPABASE_RETRY_DELAY=1.0

# Feature Flags
USE_SUPABASE_CHAT=false
USE_SUPABASE_BUSINESS=false
USE_SUPABASE_DASHBOARD=false

# Observability
SENTRY_DSN=<sentry-dsn>
ENVIRONMENT=development  # or staging, production
```

---

## Summary

This architecture provides:

1. **Clean separation of concerns** - Repository pattern isolates data access
2. **Type safety** - Pydantic models validate all data
3. **Testability** - Services can be mocked for testing
4. **Scalability** - Connection pooling and async operations
5. **Observability** - Comprehensive logging and metrics
6. **Security** - RLS policies + RBAC at API level
7. **Gradual migration** - Feature flags enable phased rollout

The migration can proceed incrementally:
- Phase 1: Chat features (low risk, high value)
- Phase 2: Business operations (core functionality)
- Phase 3: New dashboard features (greenfield)

Each phase can be tested independently with feature flags before full deployment.
