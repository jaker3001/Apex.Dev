"""
CRUD operations for Dashboard Hub tables.
Handles inbox_items, notifications, and time_entries.
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "apex_assistant.db"


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# =============================================================================
# INBOX OPERATIONS
# =============================================================================

def create_inbox_item(
    user_id: int,
    item_type: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    file_path: Optional[str] = None,
    file_size: Optional[int] = None,
    mime_type: Optional[str] = None,
    project_id: Optional[int] = None
) -> dict:
    """Create a new inbox item (quick capture)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO inbox_items (user_id, type, title, content, file_path, file_size, mime_type, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, item_type, title, content, file_path, file_size, mime_type, project_id))

    item_id = cursor.lastrowid
    conn.commit()

    # Fetch and return the created item
    cursor.execute("SELECT * FROM inbox_items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_inbox_items(
    user_id: int,
    processed: Optional[bool] = None,
    item_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """Get inbox items for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM inbox_items WHERE user_id = ?"
    params = [user_id]

    if processed is not None:
        query += " AND processed = ?"
        params.append(1 if processed else 0)

    if item_type:
        query += " AND type = ?"
        params.append(item_type)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_inbox_item(item_id: int, user_id: int) -> Optional[dict]:
    """Get a single inbox item."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM inbox_items WHERE id = ? AND user_id = ?",
        (item_id, user_id)
    )
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def update_inbox_item(
    item_id: int,
    user_id: int,
    title: Optional[str] = None,
    content: Optional[str] = None,
    project_id: Optional[int] = None,
    processed: Optional[bool] = None
) -> Optional[dict]:
    """Update an inbox item."""
    conn = get_connection()
    cursor = conn.cursor()

    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title)

    if content is not None:
        updates.append("content = ?")
        params.append(content)

    if project_id is not None:
        updates.append("project_id = ?")
        params.append(project_id)

    if processed is not None:
        updates.append("processed = ?")
        params.append(1 if processed else 0)
        if processed:
            updates.append("processed_at = ?")
            params.append(datetime.now().isoformat())

    if not updates:
        conn.close()
        return get_inbox_item(item_id, user_id)

    query = f"UPDATE inbox_items SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    params.extend([item_id, user_id])

    cursor.execute(query, params)
    conn.commit()
    conn.close()

    return get_inbox_item(item_id, user_id)


def delete_inbox_item(item_id: int, user_id: int) -> bool:
    """Delete an inbox item."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM inbox_items WHERE id = ? AND user_id = ?",
        (item_id, user_id)
    )
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return deleted


def get_inbox_count(user_id: int, processed: bool = False) -> int:
    """Get count of inbox items."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM inbox_items WHERE user_id = ? AND processed = ?",
        (user_id, 1 if processed else 0)
    )
    count = cursor.fetchone()[0]
    conn.close()

    return count


# =============================================================================
# NOTIFICATION OPERATIONS
# =============================================================================

def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: Optional[str] = None,
    source_type: Optional[str] = None,
    source_id: Optional[int] = None,
    link: Optional[str] = None
) -> dict:
    """Create a new notification."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO notifications (user_id, type, title, message, source_type, source_id, link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, notification_type, title, message, source_type, source_id, link))

    notif_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM notifications WHERE id = ?", (notif_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_notifications(
    user_id: int,
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """Get notifications for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM notifications WHERE user_id = ?"
    params = [user_id]

    if unread_only:
        query += " AND is_read = 0"

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def mark_notification_read(notif_id: int, user_id: int) -> bool:
    """Mark a notification as read."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE notifications
        SET is_read = 1, read_at = ?
        WHERE id = ? AND user_id = ?
    """, (datetime.now().isoformat(), notif_id, user_id))

    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return updated


def mark_all_notifications_read(user_id: int) -> int:
    """Mark all notifications as read for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE notifications
        SET is_read = 1, read_at = ?
        WHERE user_id = ? AND is_read = 0
    """, (datetime.now().isoformat(), user_id))

    count = cursor.rowcount
    conn.commit()
    conn.close()

    return count


def delete_notification(notif_id: int, user_id: int) -> bool:
    """Delete a notification."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM notifications WHERE id = ? AND user_id = ?",
        (notif_id, user_id)
    )
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return deleted


def get_unread_notification_count(user_id: int) -> int:
    """Get count of unread notifications."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
        (user_id,)
    )
    count = cursor.fetchone()[0]
    conn.close()

    return count


# =============================================================================
# TIME ENTRY OPERATIONS
# =============================================================================

def clock_in(
    user_id: int,
    project_id: Optional[int] = None,
    notes: Optional[str] = None
) -> dict:
    """Clock in - create a new time entry."""
    conn = get_connection()
    cursor = conn.cursor()

    # Check if already clocked in
    cursor.execute(
        "SELECT id FROM time_entries WHERE user_id = ? AND clock_out IS NULL",
        (user_id,)
    )
    if cursor.fetchone():
        conn.close()
        raise ValueError("Already clocked in. Clock out first.")

    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO time_entries (user_id, clock_in, project_id, notes)
        VALUES (?, ?, ?, ?)
    """, (user_id, now, project_id, notes))

    entry_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def clock_out(
    user_id: int,
    notes: Optional[str] = None,
    break_minutes: int = 0
) -> Optional[dict]:
    """Clock out - complete the current time entry."""
    conn = get_connection()
    cursor = conn.cursor()

    # Find active clock-in
    cursor.execute(
        "SELECT id FROM time_entries WHERE user_id = ? AND clock_out IS NULL",
        (user_id,)
    )
    row = cursor.fetchone()

    if not row:
        conn.close()
        return None

    entry_id = row[0]
    now = datetime.now().isoformat()

    update_parts = ["clock_out = ?", "updated_at = ?"]
    params = [now, now]

    if notes:
        update_parts.append("notes = COALESCE(notes || ' | ', '') || ?")
        params.append(notes)

    if break_minutes > 0:
        update_parts.append("break_minutes = ?")
        params.append(break_minutes)

    params.append(entry_id)

    cursor.execute(
        f"UPDATE time_entries SET {', '.join(update_parts)} WHERE id = ?",
        params
    )
    conn.commit()

    cursor.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_current_clock_in(user_id: int) -> Optional[dict]:
    """Get the current active clock-in entry."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM time_entries WHERE user_id = ? AND clock_out IS NULL",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_time_entries(
    user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """Get time entries for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM time_entries WHERE user_id = ?"
    params = [user_id]

    if start_date:
        query += " AND clock_in >= ?"
        params.append(start_date)

    if end_date:
        query += " AND clock_in <= ?"
        params.append(end_date)

    if project_id:
        query += " AND project_id = ?"
        params.append(project_id)

    query += " ORDER BY clock_in DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def update_time_entry(
    entry_id: int,
    user_id: int,
    clock_in: Optional[str] = None,
    clock_out: Optional[str] = None,
    project_id: Optional[int] = None,
    notes: Optional[str] = None,
    break_minutes: Optional[int] = None
) -> Optional[dict]:
    """Update a time entry."""
    conn = get_connection()
    cursor = conn.cursor()

    updates = ["updated_at = ?"]
    params = [datetime.now().isoformat()]

    if clock_in is not None:
        updates.append("clock_in = ?")
        params.append(clock_in)

    if clock_out is not None:
        updates.append("clock_out = ?")
        params.append(clock_out)

    if project_id is not None:
        updates.append("project_id = ?")
        params.append(project_id)

    if notes is not None:
        updates.append("notes = ?")
        params.append(notes)

    if break_minutes is not None:
        updates.append("break_minutes = ?")
        params.append(break_minutes)

    params.extend([entry_id, user_id])

    cursor.execute(
        f"UPDATE time_entries SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
        params
    )
    conn.commit()

    cursor.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None
