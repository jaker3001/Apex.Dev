"""
PKM (Personal Knowledge Management) Database Schema

This module defines the database tables for storing PKM note metadata.
Actual note content is stored as .md files in uploads/pkm/{user_id}/

Tables:
- pkm_notes: Metadata index for notes (for search, links, etc.)
"""

import sqlite3
from pathlib import Path

# Database path - same as main assistant DB
DB_PATH = Path(__file__).parent.parent / "apex_assistant.db"


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_pkm_tables():
    """Initialize PKM tables in the database."""
    conn = get_connection()
    cursor = conn.cursor()

    # PKM Notes metadata index
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pkm_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,           -- Relative path from user's PKM root
            title TEXT NOT NULL,               -- Extracted from filename or first H1
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            word_count INTEGER DEFAULT 0,

            -- Link tracking (JSON arrays)
            links_to TEXT DEFAULT '[]',        -- Notes this note links to
            linked_from TEXT DEFAULT '[]',     -- Notes that link to this note

            -- Job integration
            linked_jobs TEXT DEFAULT '[]',     -- Job numbers [[job:xxx]] found in content

            -- Search optimization
            content_preview TEXT,              -- First ~200 chars for preview

            UNIQUE(user_id, file_path),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Indexes for common queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pkm_notes_user
        ON pkm_notes(user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pkm_notes_title
        ON pkm_notes(title)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_pkm_notes_updated
        ON pkm_notes(user_id, updated_at DESC)
    """)

    conn.commit()
    conn.close()

    print("PKM tables initialized successfully")


if __name__ == "__main__":
    init_pkm_tables()
