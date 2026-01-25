"""
Apex Assistant - Database Schema

Defines all SQLite tables for tracking activity, metrics, and automation opportunities.
"""

import os
import sqlite3
from pathlib import Path
from typing import Optional

# Default database path - can be overridden via environment variable
# This allows Docker to mount the database at a different location
_default_path = Path(__file__).parent.parent / "apex_assistant.db"
DEFAULT_DB_PATH = Path(os.environ.get("DATABASE_PATH", str(_default_path)))


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Get a database connection with row factory enabled."""
    path = db_path or DEFAULT_DB_PATH
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row  # Enable dict-like access to rows
    return conn


def init_database(db_path: Optional[Path] = None) -> None:
    """Initialize the database with all required tables."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # =========================================================================
    # TASKS TABLE
    # Record of every task requested from the orchestrator agent
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
            outcome TEXT,
            category TEXT CHECK (category IN (
                'estimates', 'line_items', 'adjuster_comms', 'documentation',
                'admin', 'research', 'scheduling', 'financial', 'other'
            )),
            agent_used TEXT,

            -- Metrics columns
            complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 5),
            steps_required INTEGER,
            decision_points INTEGER,
            context_needed TEXT CHECK (context_needed IN ('low', 'medium', 'high')),
            reusability TEXT CHECK (reusability IN ('low', 'medium', 'high')),
            input_type TEXT CHECK (input_type IN ('text', 'file', 'image', 'structured_data', 'multiple')),
            output_type TEXT,
            tools_used TEXT,  -- JSON array of tool names
            human_corrections INTEGER DEFAULT 0,
            follow_up_tasks INTEGER DEFAULT 0,
            time_to_complete INTEGER,  -- Seconds
            quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
            frequency_tag TEXT,  -- For pattern matching

            -- Conversation link
            conversation_id INTEGER,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    """)

    # =========================================================================
    # CONVERSATIONS TABLE
    # Chat sessions for context tracking
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            summary TEXT,
            related_task_ids TEXT,  -- JSON array of task IDs
            session_id TEXT,  -- Claude SDK session ID for resuming
            is_active INTEGER DEFAULT 1,
            title TEXT,  -- Auto-generated from first message
            last_model_id TEXT,  -- Last model used in conversation
            message_count INTEGER DEFAULT 0
        )
    """)

    # =========================================================================
    # USERS TABLE
    # Multi-user authentication with role-based access
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
            is_active INTEGER DEFAULT 1,
            contact_id INTEGER,  -- Optional link to apex_operations contacts
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            preferences TEXT  -- JSON for user preferences
        )
    """)

    # =========================================================================
    # MESSAGES TABLE
    # Individual messages within conversations with model tracking
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT,
            model_id TEXT,  -- e.g., 'claude-sonnet-4-5-20250514'
            model_name TEXT,  -- e.g., 'Sonnet 4.5' (display name)
            tools_used TEXT,  -- JSON array of tool objects
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    """)

    # =========================================================================
    # AGENTS TABLE
    # Registry of specialized agents
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            capabilities TEXT,  -- JSON array of capabilities
            times_used INTEGER DEFAULT 0,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_used DATETIME,
            is_active INTEGER DEFAULT 1
        )
    """)

    # =========================================================================
    # AUTOMATION_CANDIDATES TABLE
    # Patterns identified for potential automation
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS automation_candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_description TEXT NOT NULL,
            frequency INTEGER DEFAULT 1,
            suggested_automation TEXT,
            automation_type TEXT CHECK (automation_type IN ('skill', 'sub-agent', 'combo')),
            status TEXT DEFAULT 'identified' CHECK (status IN (
                'identified', 'in_review', 'implemented', 'dismissed'
            )),
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            related_task_ids TEXT,  -- JSON array of task IDs that match this pattern
            notes TEXT
        )
    """)

    # =========================================================================
    # FILES_PROCESSED TABLE
    # Record of documents and images handled
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS files_processed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_type TEXT,  -- PDF, image, document type, etc.
            file_path TEXT,
            task_id INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            purpose TEXT,
            file_size INTEGER,
            FOREIGN KEY (task_id) REFERENCES tasks(id)
        )
    """)

    # =========================================================================
    # MCP_CONNECTIONS TABLE
    # Configured MCP server connections
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mcp_connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            server_type TEXT NOT NULL,  -- stdio, sse, http, sdk
            config TEXT NOT NULL,  -- JSON configuration
            status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
            last_used DATETIME,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT
        )
    """)

    # =========================================================================
    # ACTIVITY_LOGS TABLE
    # Centralized logging for debugging and troubleshooting
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            log_type TEXT NOT NULL,  -- 'api', 'websocket', 'model', 'mcp', 'claude', 'tool', 'error'
            session_id TEXT,
            conversation_id INTEGER,
            data TEXT,  -- JSON with log details
            severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error'))
        )
    """)

    # =========================================================================
    # CHAT_PROJECTS TABLE
    # Projects for Chat Mode (Claude Desktop style) with custom instructions
    # =========================================================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            instructions TEXT,  -- Custom system prompt addition
            knowledge_path TEXT,  -- Local folder path for knowledge context
            linked_job_number TEXT,  -- Optional link to apex_operations.db project
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # =========================================================================
    # CREATE INDEXES FOR COMMON QUERIES
    # =========================================================================
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_timestamp ON tasks(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(is_active)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_automation_status ON automation_candidates(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_files_task ON files_processed(task_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mcp_status ON mcp_connections(status)")

    # Message indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)")

    # Activity log indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_type ON activity_logs(log_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_logs_session ON activity_logs(session_id)")

    # Chat projects indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_projects_name ON chat_projects(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_projects_linked_job ON chat_projects(linked_job_number)")

    # =========================================================================
    # SCHEMA MIGRATIONS - Add columns to existing tables
    # =========================================================================
    _run_migrations(cursor)

    # =========================================================================
    # CREATE DEFAULT TEST USER (for development)
    # =========================================================================
    _create_default_test_user(cursor)

    conn.commit()
    conn.close()

    print(f"Database initialized at: {db_path or DEFAULT_DB_PATH}")


def _create_default_test_user(cursor: sqlite3.Cursor) -> None:
    """Create a default test user if it doesn't exist.

    This ensures the hardcoded user in require_auth (id=1) actually exists
    in the database to satisfy foreign key constraints.
    """
    cursor.execute("SELECT id FROM users WHERE id = 1")
    if cursor.fetchone() is None:
        # Create default test user with id=1
        # Password hash is for "password123" using bcrypt
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, display_name, role, is_active)
            VALUES (1, 'test@apexrestoration.pro', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VU9QDFkQGzHVvi', 'Test User', 'admin', 1)
        """)
        print("Created default test user (id=1)")


def _run_migrations(cursor: sqlite3.Cursor) -> None:
    """Run database migrations to add new columns to existing tables."""

    # Check which columns exist in conversations table
    cursor.execute("PRAGMA table_info(conversations)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    # Add title column if missing
    if "title" not in existing_columns:
        cursor.execute("ALTER TABLE conversations ADD COLUMN title TEXT")
        print("Migration: Added 'title' column to conversations")

    # Add last_model_id column if missing
    if "last_model_id" not in existing_columns:
        cursor.execute("ALTER TABLE conversations ADD COLUMN last_model_id TEXT")
        print("Migration: Added 'last_model_id' column to conversations")

    # Add message_count column if missing
    if "message_count" not in existing_columns:
        cursor.execute("ALTER TABLE conversations ADD COLUMN message_count INTEGER DEFAULT 0")
        print("Migration: Added 'message_count' column to conversations")

    # Add chat_project_id column if missing (links conversation to a chat project)
    if "chat_project_id" not in existing_columns:
        cursor.execute("ALTER TABLE conversations ADD COLUMN chat_project_id INTEGER REFERENCES chat_projects(id)")
        print("Migration: Added 'chat_project_id' column to conversations")

    # Add user_id column if missing (for multi-user conversation isolation)
    if "user_id" not in existing_columns:
        cursor.execute("ALTER TABLE conversations ADD COLUMN user_id INTEGER REFERENCES users(id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)")
        print("Migration: Added 'user_id' column to conversations")

    # Check which columns exist in chat_projects table
    cursor.execute("PRAGMA table_info(chat_projects)")
    chat_projects_columns = {row[1] for row in cursor.fetchall()}

    # Add knowledge_path column if missing
    if "knowledge_path" not in chat_projects_columns:
        cursor.execute("ALTER TABLE chat_projects ADD COLUMN knowledge_path TEXT")
        print("Migration: Added 'knowledge_path' column to chat_projects")


if __name__ == "__main__":
    # Allow running directly to initialize the database
    init_database()
