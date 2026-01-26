#!/usr/bin/env python3
"""
SQLite to Supabase Migration Script

Migrates all data from SQLite databases (apex_assistant.db, apex_operations.db)
to Supabase PostgreSQL.

Usage:
    python scripts/migrate_to_supabase.py [--dry-run] [--verify-only]

Options:
    --dry-run       Show what would be migrated without making changes
    --verify-only   Only verify the migration counts, don't migrate

Prerequisites:
    1. Run the SQL migrations in Supabase first:
       - supabase/migrations/001_business_schema.sql
       - supabase/migrations/002_dashboard_schema.sql
    2. Set environment variables:
       - SUPABASE_URL
       - SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import sqlite3
import argparse
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Supabase client
from supabase import create_client, Client


class MigrationStats:
    """Track migration statistics."""

    def __init__(self):
        self.tables: Dict[str, Dict[str, int]] = {}

    def record(self, table: str, source_count: int, migrated_count: int):
        self.tables[table] = {
            "source": source_count,
            "migrated": migrated_count,
        }

    def print_summary(self):
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)

        total_source = 0
        total_migrated = 0

        for table, counts in self.tables.items():
            status = "OK" if counts["source"] == counts["migrated"] else "MISMATCH"
            print(f"  {table:30} {counts['source']:6} -> {counts['migrated']:6}  [{status}]")
            total_source += counts["source"]
            total_migrated += counts["migrated"]

        print("-" * 60)
        print(f"  {'TOTAL':30} {total_source:6} -> {total_migrated:6}")
        print("=" * 60)

        if total_source == total_migrated:
            print("\n SUCCESS: All records migrated!")
        else:
            print(f"\n WARNING: {total_source - total_migrated} records not migrated")


class SQLiteToSupabaseMigrator:
    """Handles migration from SQLite to Supabase."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.stats = MigrationStats()

        # SQLite paths
        self.ops_db_path = Path(__file__).parent.parent / "apex_operations.db"
        self.assistant_db_path = Path(__file__).parent.parent / "apex_assistant.db"

        # Supabase client
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        self.supabase: Client = create_client(url, key)

    def get_sqlite_connection(self, db_path: Path) -> Optional[sqlite3.Connection]:
        """Get SQLite connection if database exists."""
        if not db_path.exists():
            print(f"  Warning: {db_path} not found, skipping")
            return None

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def fetch_all(self, conn: sqlite3.Connection, table: str) -> List[Dict[str, Any]]:
        """Fetch all rows from a SQLite table."""
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def clean_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Clean a record for Supabase insertion."""
        cleaned = {}
        for key, value in record.items():
            # Skip None values
            if value is None:
                continue
            # Convert SQLite booleans (0/1) to Python booleans
            if isinstance(value, int) and key in (
                "is_active", "has_msa", "billable", "reimbursable",
                "is_primary_adjuster", "is_tpa", "ready_to_invoice",
                "is_system", "is_important", "is_my_day", "is_favorite",
                "is_pinned", "archived", "processed"
            ):
                value = bool(value)
            cleaned[key] = value
        return cleaned

    def insert_batch(self, schema: str, table: str, records: List[Dict[str, Any]]) -> int:
        """Insert records into Supabase table."""
        if not records:
            return 0

        if self.dry_run:
            print(f"    [DRY RUN] Would insert {len(records)} records into {schema}.{table}")
            return len(records)

        try:
            # Clean records
            cleaned = [self.clean_record(r) for r in records]

            # Insert in batches of 100
            batch_size = 100
            inserted = 0

            for i in range(0, len(cleaned), batch_size):
                batch = cleaned[i:i + batch_size]
                result = (
                    self.supabase.schema(schema)
                    .table(table)
                    .insert(batch)
                    .execute()
                )
                inserted += len(result.data)

            return inserted

        except Exception as e:
            print(f"    ERROR inserting into {schema}.{table}: {e}")
            return 0

    def migrate_table(
        self,
        source_conn: sqlite3.Connection,
        source_table: str,
        target_schema: str,
        target_table: str,
        transform_fn: Optional[callable] = None,
    ) -> None:
        """Migrate a single table."""
        print(f"\n  Migrating {source_table} -> {target_schema}.{target_table}")

        # Fetch source data
        records = self.fetch_all(source_conn, source_table)
        source_count = len(records)
        print(f"    Source records: {source_count}")

        if source_count == 0:
            self.stats.record(f"{target_schema}.{target_table}", 0, 0)
            return

        # Transform if needed
        if transform_fn:
            records = [transform_fn(r) for r in records]

        # Insert into Supabase
        migrated_count = self.insert_batch(target_schema, target_table, records)
        print(f"    Migrated records: {migrated_count}")

        self.stats.record(f"{target_schema}.{target_table}", source_count, migrated_count)

    def migrate_operations_db(self) -> None:
        """Migrate apex_operations.db to business schema."""
        print("\n" + "=" * 60)
        print("MIGRATING OPERATIONS DATABASE")
        print("=" * 60)

        conn = self.get_sqlite_connection(self.ops_db_path)
        if not conn:
            return

        try:
            # Order matters due to foreign keys
            self.migrate_table(conn, "organizations", "business", "organizations")
            self.migrate_table(conn, "contacts", "business", "contacts")
            self.migrate_table(conn, "clients", "business", "clients")

            # Projects -> Jobs (rename)
            def transform_project(r):
                """Transform project record to job format."""
                return r  # Schema is compatible, no changes needed

            self.migrate_table(conn, "projects", "business", "jobs", transform_project)

            # Project contacts -> Job contacts (rename)
            def transform_project_contact(r):
                """Rename project_id to job_id."""
                r = dict(r)
                if "project_id" in r:
                    r["job_id"] = r.pop("project_id")
                return r

            self.migrate_table(conn, "project_contacts", "business", "job_contacts", transform_project_contact)

            # Notes -> Job notes (rename)
            def transform_note(r):
                """Rename project_id to job_id."""
                r = dict(r)
                if "project_id" in r:
                    r["job_id"] = r.pop("project_id")
                return r

            self.migrate_table(conn, "notes", "business", "job_notes", transform_note)

            # Rest of tables with project_id -> job_id transform
            tables_with_project_id = [
                ("media", "media"),
                ("estimates", "estimates"),
                ("payments", "payments"),
                ("labor_entries", "labor_entries"),
                ("receipts", "receipts"),
                ("work_orders", "work_orders"),
                ("activity_log", "activity_log"),
            ]

            def transform_job_fk(r):
                """Rename project_id to job_id."""
                r = dict(r)
                if "project_id" in r:
                    r["job_id"] = r.pop("project_id")
                return r

            for source, target in tables_with_project_id:
                self.migrate_table(conn, source, "business", target, transform_job_fk)

        finally:
            conn.close()

    def migrate_assistant_db(self) -> None:
        """Migrate apex_assistant.db to dashboard schema."""
        print("\n" + "=" * 60)
        print("MIGRATING ASSISTANT DATABASE")
        print("=" * 60)

        conn = self.get_sqlite_connection(self.assistant_db_path)
        if not conn:
            return

        try:
            # Check what tables exist
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            print(f"  Found tables: {tables}")

            # Migrate user_tasks -> tasks
            if "user_tasks" in tables:
                self.migrate_table(conn, "user_tasks", "dashboard", "tasks")

            # Migrate task_lists
            if "task_lists" in tables:
                # Note: We don't have task_lists in new schema, skip or transform

                pass

            # Migrate conversations
            if "conversations" in tables:
                self.migrate_table(conn, "conversations", "dashboard", "conversations")

            # Migrate messages
            if "messages" in tables:
                self.migrate_table(conn, "messages", "dashboard", "messages")

        finally:
            conn.close()

    def verify_migration(self) -> None:
        """Verify migration by comparing counts."""
        print("\n" + "=" * 60)
        print("VERIFYING MIGRATION")
        print("=" * 60)

        # Business schema tables
        business_tables = [
            "organizations", "contacts", "clients", "jobs",
            "job_contacts", "job_notes", "media", "estimates",
            "payments", "labor_entries", "receipts", "work_orders",
            "activity_log"
        ]

        for table in business_tables:
            try:
                result = (
                    self.supabase.schema("business")
                    .table(table)
                    .select("*", count="exact")
                    .execute()
                )
                count = result.count
                print(f"  business.{table}: {count} records")
            except Exception as e:
                print(f"  business.{table}: ERROR - {e}")

        # Dashboard schema tables
        dashboard_tables = [
            "user_profiles", "tags", "goals", "milestones",
            "projects", "people", "tasks", "notes",
            "inbox_items", "conversations", "messages"
        ]

        for table in dashboard_tables:
            try:
                result = (
                    self.supabase.schema("dashboard")
                    .table(table)
                    .select("*", count="exact")
                    .execute()
                )
                count = result.count
                print(f"  dashboard.{table}: {count} records")
            except Exception as e:
                print(f"  dashboard.{table}: ERROR - {e}")

    async def create_owner_profile(
        self,
        user_id: str,
        email: str,
        display_name: str,
    ) -> None:
        """Create the owner user profile."""
        print("\n" + "=" * 60)
        print("CREATING OWNER PROFILE")
        print("=" * 60)

        if self.dry_run:
            print(f"  [DRY RUN] Would create owner profile for {email}")
            return

        try:
            profile_data = {
                "id": user_id,
                "email": email,
                "display_name": display_name,
                "role": "owner",
                "is_active": True,
                "preferences": {},
            }

            result = (
                self.supabase.schema("dashboard")
                .table("user_profiles")
                .upsert(profile_data)
                .execute()
            )

            print(f"  Created owner profile for {email}")

        except Exception as e:
            print(f"  ERROR creating owner profile: {e}")

    def run(self) -> None:
        """Run the full migration."""
        print("\n" + "=" * 60)
        print("SQLITE TO SUPABASE MIGRATION")
        print("=" * 60)
        print(f"  Started at: {datetime.now().isoformat()}")
        print(f"  Dry run: {self.dry_run}")

        # Migrate operations database
        self.migrate_operations_db()

        # Migrate assistant database
        self.migrate_assistant_db()

        # Print summary
        self.stats.print_summary()

        print(f"\n  Completed at: {datetime.now().isoformat()}")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate SQLite databases to Supabase"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify the migration counts",
    )

    args = parser.parse_args()

    migrator = SQLiteToSupabaseMigrator(dry_run=args.dry_run)

    if args.verify_only:
        migrator.verify_migration()
    else:
        migrator.run()
        print("\n  Verifying migration...")
        migrator.verify_migration()


if __name__ == "__main__":
    main()
