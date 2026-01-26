#!/usr/bin/env python3
"""
Test Setup Script for Supabase Migration

This script helps you verify the migration setup before full deployment.
Run this from the worktree directory.

Usage:
    python scripts/test_setup.py
"""

import os
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()


def check_env():
    """Check required environment variables."""
    print("\n1. Checking environment variables...")

    required = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]

    missing = []
    for var in required:
        value = os.environ.get(var)
        if value:
            # Show first/last few chars for verification
            masked = value[:8] + "..." + value[-4:] if len(value) > 20 else value[:4] + "..."
            print(f"   ✓ {var}: {masked}")
        else:
            print(f"   ✗ {var}: NOT SET")
            missing.append(var)

    if missing:
        print(f"\n   ⚠️  Missing: {', '.join(missing)}")
        print("   Add these to your .env file")
        return False

    return True


def check_supabase_connection():
    """Test Supabase connection."""
    print("\n2. Testing Supabase connection...")

    try:
        from api.services.supabase_client import get_client
        client = get_client()

        # Try a simple query to test connection
        result = client.table("_test_connection").select("*").limit(1).execute()
        print("   ✓ Supabase connection successful")
        return True

    except Exception as e:
        error_str = str(e)
        # Various ways the API tells us the table doesn't exist (but connection works)
        if any(indicator in error_str for indicator in [
            "does not exist",
            "404",
            "PGRST205",  # PostgREST: table not found in schema cache
            "Could not find the table",
        ]):
            print("   ✓ Supabase connection successful")
            return True
        else:
            print(f"   ✗ Connection failed: {e}")
            return False


def check_schemas_exist():
    """Check if the required schemas exist in Supabase."""
    print("\n3. Checking database schemas...")

    try:
        from api.services.supabase_client import get_service_client
        client = get_service_client()

        # Try to query from business schema
        try:
            result = client.schema("business").table("organizations").select("id").limit(1).execute()
            print("   ✓ business schema exists")
            business_ok = True
        except Exception as e:
            if "does not exist" in str(e):
                print("   ✗ business schema not found - run migrations first")
                business_ok = False
            else:
                print(f"   ? business schema: {e}")
                business_ok = False

        # Try to query from dashboard schema
        try:
            result = client.schema("dashboard").table("user_profiles").select("id").limit(1).execute()
            print("   ✓ dashboard schema exists")
            dashboard_ok = True
        except Exception as e:
            if "does not exist" in str(e):
                print("   ✗ dashboard schema not found - run migrations first")
                dashboard_ok = False
            else:
                print(f"   ? dashboard schema: {e}")
                dashboard_ok = False

        return business_ok and dashboard_ok

    except Exception as e:
        print(f"   ✗ Schema check failed: {e}")
        return False


def check_imports():
    """Check that all new modules import correctly."""
    print("\n4. Checking module imports...")

    modules = [
        ("api.routes.auth", "Auth routes"),
        ("api.routes.tags", "Tags routes"),
        ("api.routes.goals", "Goals routes"),
        ("api.routes.personal_projects", "Personal projects routes"),
        ("api.routes.people", "People routes"),
        ("api.routes.notes", "Notes routes"),
        ("api.routes.inbox", "Inbox routes"),
        ("api.repositories.tag_repository", "Tag repository"),
        ("api.repositories.goal_repository", "Goal repository"),
        ("api.repositories.personal_project_repository", "Personal project repository"),
        ("api.repositories.people_repository", "People repository"),
        ("api.repositories.note_repository_v2", "Note repository"),
        ("api.repositories.inbox_repository", "Inbox repository"),
        ("api.services.auth_service", "Auth service"),
        ("api.schemas.second_brain", "Second brain schemas"),
    ]

    all_ok = True
    for module, name in modules:
        try:
            __import__(module)
            print(f"   ✓ {name}")
        except Exception as e:
            print(f"   ✗ {name}: {e}")
            all_ok = False

    return all_ok


def check_fastapi_app():
    """Check that the FastAPI app loads correctly."""
    print("\n5. Checking FastAPI app...")

    try:
        # Skip SQLite init for this test
        os.environ["SKIP_SQLITE_INIT"] = "true"

        from api.main import app

        # Check routes are registered
        routes = [r.path for r in app.routes]

        expected = ["/api/tags", "/api/goals", "/api/personal-projects", "/api/people", "/api/notes"]
        missing = []

        for expected_route in expected:
            found = any(expected_route in r for r in routes)
            if found:
                print(f"   ✓ {expected_route}")
            else:
                print(f"   ✗ {expected_route} not found")
                missing.append(expected_route)

        if missing:
            return False

        print(f"   ✓ FastAPI app loaded with {len(routes)} routes")
        return True

    except Exception as e:
        print(f"   ✗ App load failed: {e}")
        return False


def print_next_steps(env_ok, conn_ok, schema_ok, imports_ok, app_ok):
    """Print what to do next."""
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if not env_ok:
        print("""
⚠️  Environment variables missing!

   1. Copy .env.example to .env (if not done)
   2. Add your Supabase credentials:
      SUPABASE_URL=https://your-project.supabase.co
      SUPABASE_ANON_KEY=eyJhbGc...
      SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
""")
        return

    if not conn_ok:
        print("""
⚠️  Cannot connect to Supabase!

   1. Check your SUPABASE_URL is correct
   2. Check your API keys are valid
   3. Ensure your IP is not blocked
""")
        return

    if not schema_ok:
        print("""
⚠️  Database schemas not found!

   Run the migrations in Supabase SQL Editor:

   1. Go to your Supabase dashboard
   2. Navigate to SQL Editor
   3. Run the contents of:
      - supabase/migrations/001_business_schema.sql
      - supabase/migrations/002_dashboard_schema.sql
   4. Re-run this script to verify
""")
        return

    if not imports_ok:
        print("""
⚠️  Some modules failed to import!

   Check the error messages above and fix any issues.
""")
        return

    if not app_ok:
        print("""
⚠️  FastAPI app failed to load!

   Check the error messages above and fix any issues.
""")
        return

    print("""
✅ All checks passed! Ready to test.

   Start the server:

   cd .worktrees/supabase-migration
   set SKIP_SQLITE_INIT=true
   python run_server.py

   Then test endpoints at:
   - http://localhost:8000/docs (Swagger UI)
   - http://localhost:8000/api/tags
   - http://localhost:8000/api/goals
   - etc.

   Note: You'll need to create a user first via /api/auth/signup
""")


def main():
    print("=" * 60)
    print("SUPABASE MIGRATION TEST SETUP")
    print("=" * 60)

    env_ok = check_env()
    conn_ok = check_supabase_connection() if env_ok else False
    schema_ok = check_schemas_exist() if conn_ok else False
    imports_ok = check_imports()
    app_ok = check_fastapi_app() if imports_ok else False

    print_next_steps(env_ok, conn_ok, schema_ok, imports_ok, app_ok)


if __name__ == "__main__":
    main()
