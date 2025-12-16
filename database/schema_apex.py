"""
Apex Operations Database Schema

Database connection and schema management for the apex_operations.db database.
This database manages restoration projects, clients, organizations, contacts,
estimates, payments, and related business operations data.
"""

import os
import sqlite3
from pathlib import Path
from typing import Optional

# Database path - can be overridden via environment variable
# This allows Docker to mount the database at a different location
_default_ops_path = Path(__file__).parent.parent / "apex_operations.db"
APEX_OPS_DB_PATH = Path(os.environ.get("APEX_OPS_DATABASE_PATH", str(_default_ops_path)))


def get_ops_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """
    Get a database connection for the operations database.

    Args:
        db_path: Optional path to database file. Defaults to apex_operations.db

    Returns:
        sqlite3.Connection with row factory enabled for dict-like access
    """
    path = db_path or APEX_OPS_DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
    # Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_apex_ops_database(db_path: Optional[Path] = None) -> None:
    """
    Initialize the operations database with all required tables.

    This creates the schema if it doesn't exist. Safe to call multiple times.
    """
    conn = get_ops_connection(db_path)
    cursor = conn.cursor()

    # =========================================================================
    # ORGANIZATIONS TABLE
    # Insurance carriers, TPAs, vendors, and internal entities
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            org_type TEXT NOT NULL CHECK(org_type IN ('insurance_carrier', 'tpa', 'vendor', 'internal')),
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            phone TEXT,
            website TEXT,
            has_msa INTEGER DEFAULT 0,
            msa_signed_date TEXT,
            msa_expiration_date TEXT,
            trade_category TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # =========================================================================
    # CONTACTS TABLE
    # People associated with organizations (adjusters, vendors, etc.)
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY,
            organization_id INTEGER,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role TEXT,
            phone TEXT,
            phone_extension TEXT,
            email TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
    """)

    # =========================================================================
    # CLIENTS TABLE
    # Property owners / customers
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            client_type TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # =========================================================================
    # PROJECTS TABLE
    # Restoration jobs - the central entity
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            job_number TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'lead' CHECK(status IN ('lead', 'pending', 'active', 'complete', 'closed', 'cancelled')),
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            year_built INTEGER,
            structure_type TEXT,
            square_footage INTEGER,
            num_stories INTEGER,
            damage_source TEXT,
            damage_category TEXT,
            damage_class TEXT,
            date_of_loss TEXT,
            date_contacted TEXT,
            inspection_date TEXT,
            work_auth_signed_date TEXT,
            start_date TEXT,
            cos_date TEXT,
            completion_date TEXT,
            claim_number TEXT,
            policy_number TEXT,
            deductible REAL,
            client_id INTEGER,
            insurance_org_id INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (insurance_org_id) REFERENCES organizations(id)
        )
    """)

    # =========================================================================
    # PROJECT_CONTACTS TABLE
    # Links contacts to projects (adjusters, project managers, etc.)
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_contacts (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            role_on_project TEXT,
            assigned_date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
        )
    """)

    # =========================================================================
    # NOTES TABLE
    # Job documentation and notes
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            author_id INTEGER,
            note_type TEXT,
            subject TEXT,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (author_id) REFERENCES contacts(id)
        )
    """)

    # =========================================================================
    # MEDIA TABLE
    # Photos and documents
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            caption TEXT,
            uploaded_by INTEGER,
            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (uploaded_by) REFERENCES contacts(id)
        )
    """)

    # =========================================================================
    # ESTIMATES TABLE
    # Estimate tracking with versions
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS estimates (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            version INTEGER DEFAULT 1,
            estimate_type TEXT,
            amount REAL,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'revision_requested', 'denied')),
            submitted_date TEXT,
            approved_date TEXT,
            xactimate_file_path TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )
    """)

    # =========================================================================
    # PAYMENTS TABLE
    # Payment tracking
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY,
            project_id INTEGER NOT NULL,
            estimate_id INTEGER,
            invoice_number TEXT,
            amount REAL NOT NULL,
            payment_type TEXT,
            payment_method TEXT,
            check_number TEXT,
            received_date TEXT,
            deposited_date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (estimate_id) REFERENCES estimates(id)
        )
    """)

    # =========================================================================
    # INDEXES
    # =========================================================================
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_job_number ON projects(job_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_project_contacts_project_id ON project_contacts(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_estimates_project_id ON estimates(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id)")

    # =========================================================================
    # VIEWS
    # =========================================================================

    # View: Projects with client and carrier info
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_projects AS
        SELECT
            p.id,
            p.job_number,
            p.status,
            cl.name AS client_name,
            cl.phone AS client_phone,
            cl.email AS client_email,
            p.address,
            p.city,
            p.state,
            p.zip,
            ins.name AS insurance_carrier,
            p.claim_number,
            p.damage_source,
            p.damage_category,
            p.start_date,
            p.notes
        FROM projects p
        LEFT JOIN clients cl ON p.client_id = cl.id
        LEFT JOIN organizations ins ON p.insurance_org_id = ins.id
    """)

    # View: Project contacts with full details
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_project_contacts AS
        SELECT
            pc.id,
            p.job_number,
            cl.name AS client_name,
            c.first_name || ' ' || c.last_name AS adjuster_name,
            c.role AS adjuster_title,
            org.name AS adjuster_company,
            c.phone AS adjuster_phone,
            c.email AS adjuster_email,
            pc.role_on_project
        FROM project_contacts pc
        JOIN projects p ON pc.project_id = p.id
        JOIN clients cl ON p.client_id = cl.id
        JOIN contacts c ON pc.contact_id = c.id
        JOIN organizations org ON c.organization_id = org.id
    """)

    # View: Contacts with organization info
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_contacts AS
        SELECT
            c.id,
            c.first_name,
            c.last_name,
            c.first_name || ' ' || c.last_name AS full_name,
            org.name AS organization,
            org.org_type,
            c.role,
            c.phone,
            c.email
        FROM contacts c
        JOIN organizations org ON c.organization_id = org.id
    """)

    # View: Organizations with contacts
    cursor.execute("""
        CREATE VIEW IF NOT EXISTS v_organizations AS
        SELECT
            org.id,
            org.name AS organization,
            org.org_type,
            org.phone AS org_phone,
            c.first_name || ' ' || c.last_name AS contact_name,
            c.role AS contact_role,
            c.phone AS contact_phone,
            c.email AS contact_email
        FROM organizations org
        LEFT JOIN contacts c ON org.id = c.organization_id
        ORDER BY org.name, c.last_name
    """)

    # =========================================================================
    # SCHEMA MIGRATIONS - Add columns to existing tables
    # =========================================================================
    _run_ops_migrations(cursor)

    conn.commit()
    conn.close()

    print(f"Operations database initialized at: {db_path or APEX_OPS_DB_PATH}")


def _run_ops_migrations(cursor: sqlite3.Cursor) -> None:
    """Run database migrations to add new columns to existing tables."""

    # Check which columns exist in projects table
    cursor.execute("PRAGMA table_info(projects)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    # Add inspection_date column if missing
    if "inspection_date" not in existing_columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN inspection_date TEXT")
        print("Migration: Added 'inspection_date' column to projects")

    # Add work_auth_signed_date column if missing
    if "work_auth_signed_date" not in existing_columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN work_auth_signed_date TEXT")
        print("Migration: Added 'work_auth_signed_date' column to projects")

    # Add cos_date column if missing
    if "cos_date" not in existing_columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN cos_date TEXT")
        print("Migration: Added 'cos_date' column to projects")


if __name__ == "__main__":
    init_apex_ops_database()
