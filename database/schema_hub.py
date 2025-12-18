"""
Database schema for the Dashboard Hub.
Tables: inbox_items, notifications, time_entries
Stored in apex_assistant.db alongside user data.
"""

import sqlite3
from pathlib import Path

# Database path (same as main assistant DB)
DB_PATH = Path(__file__).parent.parent / "apex_assistant.db"


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_hub_tables():
    """Initialize hub tables in the database."""
    conn = get_connection()
    cursor = conn.cursor()

    # Inbox items - for quick captures (notes, photos, audio, documents, tasks)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inbox_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('note', 'photo', 'audio', 'document', 'task')),
            title TEXT,
            content TEXT,
            file_path TEXT,
            file_size INTEGER,
            mime_type TEXT,
            project_id INTEGER,
            processed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Indexes for inbox
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_inbox_user_processed
        ON inbox_items(user_id, processed)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_inbox_user_created
        ON inbox_items(user_id, created_at DESC)
    """)

    # Notifications - for @mentions, alerts, reminders
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('mention', 'assignment', 'reminder', 'alert', 'system')),
            title TEXT NOT NULL,
            message TEXT,
            source_type TEXT,
            source_id INTEGER,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            read_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Indexes for notifications
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
        ON notifications(user_id, is_read, created_at DESC)
    """)

    # Time entries - for clock in/out
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            clock_in DATETIME NOT NULL,
            clock_out DATETIME,
            project_id INTEGER,
            notes TEXT,
            break_minutes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Indexes for time entries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_time_entries_user_date
        ON time_entries(user_id, clock_in DESC)
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_hub_tables()
    print("Hub tables initialized successfully.")
