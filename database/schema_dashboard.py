"""
Apex Assistant - Dashboard Database Schema

Tables for task management, notes, calendar, and file storage.
Phase 1: Task Management
"""

import sqlite3
from pathlib import Path
from typing import Optional


def get_dashboard_db_path(db_path: Optional[Path] = None) -> Path:
    """Get the path to the dashboard database."""
    if db_path:
        return db_path
    return Path(__file__).parent.parent / "apex_assistant.db"


def init_dashboard_tables(db_path: Optional[Path] = None) -> None:
    """Initialize dashboard tables in the assistant database."""
    path = get_dashboard_db_path(db_path)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON")

    # ============================================
    # TASK MANAGEMENT TABLES
    # ============================================

    # Task Lists (Inbox, My Day, Important, custom lists)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            is_system INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # User Tasks (renamed from 'tasks' to avoid conflict with analytics tasks table)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            list_id INTEGER,
            parent_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
            priority TEXT DEFAULT 'none' CHECK(priority IN ('none', 'low', 'medium', 'high')),
            due_date TEXT,
            due_time TEXT,
            reminder_at DATETIME,
            is_important INTEGER DEFAULT 0,
            is_my_day INTEGER DEFAULT 0,
            my_day_date TEXT,
            project_id INTEGER,
            recurrence_rule TEXT,
            completed_at DATETIME,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (list_id) REFERENCES task_lists(id) ON DELETE SET NULL,
            FOREIGN KEY (parent_id) REFERENCES user_tasks(id) ON DELETE CASCADE
        )
    """)

    # Create indexes for common queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_user ON user_tasks(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_list ON user_tasks(list_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_parent ON user_tasks(parent_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_due_date ON user_tasks(due_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_tasks_my_day ON user_tasks(is_my_day, my_day_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_lists_user ON task_lists(user_id)")

    conn.commit()
    conn.close()
    print(f"Dashboard tables initialized at: {path}")


def create_default_task_lists(user_id: int, db_path: Optional[Path] = None) -> None:
    """Create default system task lists for a new user."""
    path = get_dashboard_db_path(db_path)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Check if user already has system lists
    cursor.execute(
        "SELECT COUNT(*) FROM task_lists WHERE user_id = ? AND is_system = 1",
        (user_id,)
    )
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Create default lists
    default_lists = [
        ("Inbox", "inbox", None, 1, 0),
        ("My Day", "sun", None, 1, 1),
        ("Important", "star", None, 1, 2),
        ("Planned", "calendar", None, 1, 3),
    ]

    for name, icon, color, is_system, sort_order in default_lists:
        cursor.execute("""
            INSERT INTO task_lists (user_id, name, icon, color, is_system, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, name, icon, color, is_system, sort_order))

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_dashboard_tables()
