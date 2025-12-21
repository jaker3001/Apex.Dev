# Supabase Client Configuration Guide

## Overview

This document provides configuration recommendations for the Supabase Python client (`supabase-py`) in the Apex Assistant application.

---

## Installation

```bash
# Core dependencies
pip install supabase==2.0.0
pip install postgrest-py==0.13.0

# Optional for better performance
pip install httpx[http2]  # HTTP/2 support
pip install orjson  # Faster JSON parsing
```

---

## Environment Configuration

### Development (.env)
```bash
# Supabase Project
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Connection Pool (Development)
SUPABASE_POOL_SIZE=5
SUPABASE_MAX_OVERFLOW=2
SUPABASE_POOL_TIMEOUT=10

# Retry Settings
SUPABASE_MAX_RETRIES=3
SUPABASE_RETRY_DELAY=1.0
SUPABASE_RETRY_BACKOFF=exponential  # linear | exponential

# Feature Flags
USE_SUPABASE_CHAT=false
USE_SUPABASE_BUSINESS=false
USE_SUPABASE_DASHBOARD=false

# Logging
LOG_LEVEL=DEBUG
LOG_SUPABASE_QUERIES=true

# Environment
ENVIRONMENT=development
```

### Production (.env.production)
```bash
# Supabase Project
SUPABASE_URL=https://<prod-project-id>.supabase.co
SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-key>

# Connection Pool (Production)
SUPABASE_POOL_SIZE=20
SUPABASE_MAX_OVERFLOW=10
SUPABASE_POOL_TIMEOUT=30

# Retry Settings
SUPABASE_MAX_RETRIES=5
SUPABASE_RETRY_DELAY=2.0
SUPABASE_RETRY_BACKOFF=exponential

# Feature Flags
USE_SUPABASE_CHAT=true
USE_SUPABASE_BUSINESS=true
USE_SUPABASE_DASHBOARD=true

# Logging
LOG_LEVEL=INFO
LOG_SUPABASE_QUERIES=false

# Observability
SENTRY_DSN=<sentry-dsn>
ENVIRONMENT=production
```

---

## Client Initialization

### Basic Client
```python
from supabase import create_client, Client

url = "https://xyzcompany.supabase.co"
key = "public-anon-key"
supabase: Client = create_client(url, key)
```

### Client with Options
```python
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

options = ClientOptions(
    # Auth options
    auto_refresh_token=True,
    persist_session=True,
    detect_session_in_url=False,

    # PostgREST options
    schema="public",

    # Storage options
    storage_client_timeout=60,

    # Headers
    headers={
        "X-Client-Info": "apex-assistant/1.0",
        "X-Application-Name": "Apex Assistant API",
    },

    # Flow type for auth
    flow_type="pkce",  # PKCE flow for better security
)

supabase = create_client(url, key, options=options)
```

---

## Connection Pooling Strategy

### Why Connection Pooling?

Supabase uses HTTP connections under the hood. Connection pooling helps:
- **Reduce latency** - Reuse existing connections
- **Handle concurrency** - Multiple requests in parallel
- **Prevent exhaustion** - Limit total connections to Supabase

### HTTP Client Configuration

```python
import httpx
from supabase import create_client

# Custom HTTP client with connection pooling
http_client = httpx.Client(
    # Connection pool limits
    limits=httpx.Limits(
        max_connections=20,  # Total connections
        max_keepalive_connections=10,  # Reusable connections
    ),

    # Timeout settings
    timeout=httpx.Timeout(
        connect=5.0,  # Connection timeout
        read=30.0,    # Read timeout
        write=10.0,   # Write timeout
        pool=5.0,     # Pool timeout
    ),

    # Enable HTTP/2 for better performance
    http2=True,

    # Retry on connection errors
    transport=httpx.HTTPTransport(
        retries=3,
    ),
)

# Use custom client with Supabase
supabase = create_client(url, key, options=options)
# Note: supabase-py doesn't directly support custom httpx client yet
# This is a recommendation for future enhancement
```

### Async Client (Recommended for FastAPI)

```python
from supabase import create_client, Client
import asyncio

# Async version for better performance with FastAPI
class AsyncSupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self._client = None

    async def get_client(self) -> Client:
        if self._client is None:
            self._client = create_client(self.url, self.key)
        return self._client

    async def close(self):
        if self._client:
            # Cleanup if needed
            self._client = None


# Usage
async_client = AsyncSupabaseClient(url, key)
client = await async_client.get_client()
```

---

## Query Performance Optimization

### 1. Use Select Efficiently

**Bad:**
```python
# Fetches all columns
result = supabase.table("jobs").select("*").execute()
```

**Good:**
```python
# Only fetch needed columns
result = supabase.table("jobs").select("id, job_number, status, client_name").execute()
```

### 2. Use Resource Embedding

**Bad (Multiple Queries):**
```python
# Fetch project
project = supabase.table("jobs").select("*").eq("id", 1).execute()

# Fetch client separately
client = supabase.table("clients").select("*").eq("id", project.data[0]["client_id"]).execute()

# Fetch estimates separately
estimates = supabase.table("estimates").select("*").eq("job_id", 1).execute()
```

**Good (Single Query with Embedding):**
```python
# Fetch everything in one query
result = supabase.table("jobs").select(
    """
    id,
    job_number,
    status,
    client:clients(id, name, email, phone),
    estimates(id, amount, status),
    payments(id, amount, received_date)
    """
).eq("id", 1).execute()

# Access nested data
project = result.data[0]
client = project["client"]
estimates = project["estimates"]
```

### 3. Use Pagination

**Bad:**
```python
# Fetch all records (could be thousands)
result = supabase.table("jobs").select("*").execute()
```

**Good:**
```python
# Paginate results
result = supabase.table("jobs").select("*").range(0, 49).execute()  # First 50

# Next page
result = supabase.table("jobs").select("*").range(50, 99).execute()  # Next 50
```

### 4. Use Counting

**Bad:**
```python
# Fetch all records just to count
result = supabase.table("jobs").select("*").execute()
count = len(result.data)
```

**Good:**
```python
# Use count parameter
result = supabase.table("jobs").select("*", count="exact").execute()
total = result.count  # No need to load data
```

### 5. Use Indexes

Ensure database has indexes on commonly queried columns:
```sql
-- In Supabase SQL Editor
CREATE INDEX idx_jobs_status ON business.jobs(status);
CREATE INDEX idx_jobs_job_number ON business.jobs(job_number);
CREATE INDEX idx_tasks_user_id ON dashboard.tasks(user_id);
CREATE INDEX idx_tasks_job_id ON dashboard.tasks(job_id);
```

---

## Error Handling Best Practices

### 1. Network Errors

```python
from supabase.lib.exceptions import APIError
import time

async def query_with_retry(operation, max_retries=3):
    """Execute query with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return await operation()
        except APIError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # Exponential backoff
            await asyncio.sleep(wait_time)
            logger.warning(f"Retry {attempt + 1}/{max_retries} after {wait_time}s")

# Usage
result = await query_with_retry(
    lambda: supabase.table("jobs").select("*").eq("id", 1).execute()
)
```

### 2. Validation Errors

```python
try:
    result = supabase.table("jobs").insert({
        "job_number": "202512-001-MIT",
        "status": "active",
    }).execute()
except Exception as e:
    error_msg = str(e).lower()

    if "duplicate" in error_msg or "unique constraint" in error_msg:
        raise ValidationError("Job number already exists")

    if "foreign key" in error_msg:
        raise ValidationError("Referenced record does not exist")

    if "not null" in error_msg:
        raise ValidationError("Required field is missing")

    raise DatabaseError(f"Database error: {e}")
```

### 3. RLS Policy Violations

```python
try:
    result = supabase.table("tasks").insert({
        "user_id": "other-user-uuid",  # Trying to insert for another user
        "title": "Task",
    }).execute()
except Exception as e:
    if "policy" in str(e).lower() or "rls" in str(e).lower():
        raise AuthorizationError("You don't have permission to perform this action")
    raise
```

---

## Performance Monitoring

### Query Timing

```python
import time
import logging

logger = logging.getLogger(__name__)

async def execute_with_timing(operation, operation_name: str):
    """Execute operation and log timing."""
    start_time = time.time()

    try:
        result = await operation()
        duration_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Supabase query completed",
            extra={
                "operation": operation_name,
                "duration_ms": duration_ms,
                "rows": len(result.data) if hasattr(result, "data") else 0,
            }
        )

        return result

    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000

        logger.error(
            f"Supabase query failed",
            extra={
                "operation": operation_name,
                "duration_ms": duration_ms,
                "error": str(e),
            }
        )
        raise

# Usage
result = await execute_with_timing(
    lambda: supabase.table("jobs").select("*").execute(),
    operation_name="fetch_all_jobs"
)
```

### Slow Query Alerts

```python
SLOW_QUERY_THRESHOLD_MS = 1000  # 1 second

async def execute_with_slow_query_alert(operation, operation_name: str):
    """Alert if query is slow."""
    start_time = time.time()
    result = await operation()
    duration_ms = (time.time() - start_time) * 1000

    if duration_ms > SLOW_QUERY_THRESHOLD_MS:
        logger.warning(
            f"Slow query detected: {operation_name} took {duration_ms:.2f}ms"
        )

        # Send alert to monitoring service
        # sentry_sdk.capture_message(f"Slow query: {operation_name}")

    return result
```

---

## Testing Configuration

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch
from supabase import Client

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing."""
    mock = Mock(spec=Client)

    # Mock table operations
    mock.table.return_value.select.return_value.execute.return_value = Mock(
        data=[{"id": 1, "job_number": "202512-001-MIT"}],
        count=1,
    )

    return mock


def test_project_repository(mock_supabase):
    """Test ProjectRepository with mocked client."""
    repo = ProjectRepository()
    repo._client = mock_supabase

    result = await repo.find_by_id(1)

    assert result.id == 1
    assert result.job_number == "202512-001-MIT"
    mock_supabase.table.assert_called_with("jobs")
```

### Integration Tests

```python
import pytest
from api.services.supabase_client import get_client

# Use test database
TEST_SUPABASE_URL = "https://test-project.supabase.co"
TEST_SUPABASE_KEY = "test-anon-key"

@pytest.fixture
def test_supabase():
    """Real Supabase client for integration tests."""
    return create_client(TEST_SUPABASE_URL, TEST_SUPABASE_KEY)


@pytest.mark.integration
async def test_create_project(test_supabase):
    """Test creating a project in test database."""
    result = test_supabase.table("jobs").insert({
        "job_number": "TEST-001",
        "status": "lead",
    }).execute()

    assert result.data[0]["job_number"] == "TEST-001"

    # Cleanup
    test_supabase.table("jobs").delete().eq("job_number", "TEST-001").execute()
```

---

## Security Best Practices

### 1. Use Service Role Key Carefully

```python
# DON'T: Use service role key in client-facing code
# This bypasses RLS and exposes all data!
client = create_client(url, service_role_key)  # ❌ DANGEROUS

# DO: Use service role key only for admin operations
class AdminService:
    def __init__(self):
        self.admin_client = create_client(url, service_role_key)

    async def delete_user(self, user_id: str):
        """Admin-only operation."""
        # This bypasses RLS, only use for admin tasks
        return self.admin_client.table("users").delete().eq("id", user_id).execute()
```

### 2. Set JWT Token Per Request

```python
from fastapi import Depends, Request

async def get_supabase_for_request(request: Request):
    """Get Supabase client with user's JWT token."""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    client = get_client()
    client.auth.set_session(token)  # RLS will use this user's context

    return client

# Usage in routes
@router.get("/tasks")
async def get_tasks(client: Client = Depends(get_supabase_for_request)):
    # This query respects RLS for the authenticated user
    result = client.table("tasks").select("*").execute()
    return result.data
```

### 3. Never Log Sensitive Data

```python
# DON'T: Log JWT tokens or API keys
logger.info(f"User token: {token}")  # ❌ DANGEROUS

# DO: Log only non-sensitive metadata
logger.info(f"User authenticated", extra={"user_id": user.id})
```

---

## Production Deployment Checklist

- [ ] Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in production environment
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
- [ ] Configure connection pool size based on load testing
- [ ] Enable HTTP/2 for better performance
- [ ] Set up query performance monitoring
- [ ] Configure retry logic with exponential backoff
- [ ] Enable RLS policies on all tables
- [ ] Test RLS policies with different user roles
- [ ] Set up database indexes on commonly queried columns
- [ ] Configure Sentry for error tracking
- [ ] Set up Prometheus metrics for query timing
- [ ] Test failover and retry logic
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Test data migration scripts

---

## Troubleshooting

### Connection Timeout
```
Error: Connection timeout after 30s
```

**Solution:**
- Increase `SUPABASE_POOL_TIMEOUT`
- Check network connectivity
- Verify Supabase project is running

### RLS Policy Violation
```
Error: new row violates row-level security policy
```

**Solution:**
- Verify user is authenticated
- Check JWT token is valid
- Review RLS policies in Supabase Dashboard

### Too Many Connections
```
Error: remaining connection slots are reserved
```

**Solution:**
- Reduce `SUPABASE_POOL_SIZE`
- Implement connection pooling
- Check for connection leaks (unclosed connections)

### Slow Queries
```
Warning: Query took 5000ms
```

**Solution:**
- Add database indexes
- Use `select()` with specific columns
- Use pagination with `range()`
- Review query complexity
