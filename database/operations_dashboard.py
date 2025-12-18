"""
Apex Assistant - Dashboard Database Operations

CRUD operations for task management.
"""

import sqlite3
from datetime import datetime, date
from pathlib import Path
from typing import Optional, List, Dict, Any


def get_db_path(db_path: Optional[Path] = None) -> Path:
    """Get the path to the database."""
    if db_path:
        return db_path
    return Path(__file__).parent.parent / "apex_assistant.db"


def _get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Get a database connection with row factory."""
    path = get_db_path(db_path)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ============================================
# TASK LIST OPERATIONS
# ============================================

def get_task_lists(
    user_id: int,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """Get all task lists for a user."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT tl.*,
            (SELECT COUNT(*) FROM user_tasks t WHERE t.list_id = tl.id AND t.status != 'completed') as task_count
        FROM task_lists tl
        WHERE tl.user_id = ?
        ORDER BY tl.sort_order, tl.created_at
    """, (user_id,))

    lists = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return lists


def get_task_list(
    list_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    """Get a specific task list."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM task_lists
        WHERE id = ? AND user_id = ?
    """, (list_id, user_id))

    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_task_list(
    user_id: int,
    name: str,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new task list."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Get max sort order
    cursor.execute(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM task_lists WHERE user_id = ?",
        (user_id,)
    )
    sort_order = cursor.fetchone()[0]

    cursor.execute("""
        INSERT INTO task_lists (user_id, name, icon, color, is_system, sort_order)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (user_id, name, icon, color, sort_order))

    list_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return list_id


def update_task_list(
    list_id: int,
    user_id: int,
    name: Optional[str] = None,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    sort_order: Optional[int] = None,
    db_path: Optional[Path] = None
) -> bool:
    """Update a task list."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Check ownership and not system list
    cursor.execute(
        "SELECT is_system FROM task_lists WHERE id = ? AND user_id = ?",
        (list_id, user_id)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False

    updates = []
    params = []

    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if icon is not None:
        updates.append("icon = ?")
        params.append(icon)
    if color is not None:
        updates.append("color = ?")
        params.append(color)
    if sort_order is not None:
        updates.append("sort_order = ?")
        params.append(sort_order)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([list_id, user_id])
        cursor.execute(f"""
            UPDATE task_lists SET {', '.join(updates)}
            WHERE id = ? AND user_id = ?
        """, params)
        conn.commit()

    conn.close()
    return True


def delete_task_list(
    list_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> bool:
    """Delete a task list (only non-system lists)."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Check ownership and not system list
    cursor.execute(
        "SELECT is_system FROM task_lists WHERE id = ? AND user_id = ?",
        (list_id, user_id)
    )
    row = cursor.fetchone()
    if not row or row["is_system"]:
        conn.close()
        return False

    cursor.execute("DELETE FROM task_lists WHERE id = ?", (list_id,))
    conn.commit()
    conn.close()
    return True


# ============================================
# TASK OPERATIONS
# ============================================

def get_tasks(
    user_id: int,
    list_id: Optional[int] = None,
    status: Optional[str] = None,
    is_my_day: Optional[bool] = None,
    is_important: Optional[bool] = None,
    due_date: Optional[str] = None,
    parent_id: Optional[int] = None,
    include_subtasks: bool = True,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """Get tasks with optional filters."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM user_tasks WHERE user_id = ?"
    params: List[Any] = [user_id]

    if list_id is not None:
        query += " AND list_id = ?"
        params.append(list_id)

    if status is not None:
        query += " AND status = ?"
        params.append(status)

    if is_my_day is not None:
        if is_my_day:
            today = date.today().isoformat()
            query += " AND is_my_day = 1 AND (my_day_date = ? OR my_day_date IS NULL)"
            params.append(today)
        else:
            query += " AND is_my_day = 0"

    if is_important is not None:
        query += " AND is_important = ?"
        params.append(1 if is_important else 0)

    if due_date is not None:
        query += " AND due_date = ?"
        params.append(due_date)

    if parent_id is not None:
        query += " AND parent_id = ?"
        params.append(parent_id)
    elif not include_subtasks:
        query += " AND parent_id IS NULL"

    query += " ORDER BY sort_order, created_at DESC"

    cursor.execute(query, params)
    tasks = [dict(row) for row in cursor.fetchall()]

    # Get subtask counts for each task
    for task in tasks:
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed
            FROM user_tasks
            WHERE parent_id = ?
        """, (task["id"],))
        subtask_row = cursor.fetchone()
        task["subtask_total"] = subtask_row["total"] or 0
        task["subtask_completed"] = subtask_row["completed"] or 0

    conn.close()
    return tasks


def get_task(
    task_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    """Get a specific task with its subtasks."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM user_tasks WHERE id = ? AND user_id = ?
    """, (task_id, user_id))

    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    task = dict(row)

    # Get subtasks
    cursor.execute("""
        SELECT * FROM user_tasks WHERE parent_id = ?
        ORDER BY sort_order, created_at
    """, (task_id,))
    task["subtasks"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return task


def create_task(
    user_id: int,
    title: str,
    list_id: Optional[int] = None,
    parent_id: Optional[int] = None,
    description: Optional[str] = None,
    priority: str = "none",
    due_date: Optional[str] = None,
    due_time: Optional[str] = None,
    is_important: bool = False,
    is_my_day: bool = False,
    project_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new task."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Get max sort order for the list/parent
    if parent_id:
        cursor.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM user_tasks WHERE parent_id = ?",
            (parent_id,)
        )
    elif list_id:
        cursor.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM user_tasks WHERE list_id = ? AND parent_id IS NULL",
            (list_id,)
        )
    else:
        cursor.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM user_tasks WHERE user_id = ? AND list_id IS NULL AND parent_id IS NULL",
            (user_id,)
        )
    sort_order = cursor.fetchone()[0]

    my_day_date = date.today().isoformat() if is_my_day else None

    cursor.execute("""
        INSERT INTO user_tasks (
            user_id, list_id, parent_id, title, description,
            status, priority, due_date, due_time,
            is_important, is_my_day, my_day_date, project_id, sort_order
        )
        VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, list_id, parent_id, title, description,
        priority, due_date, due_time,
        1 if is_important else 0,
        1 if is_my_day else 0,
        my_day_date,
        project_id,
        sort_order
    ))

    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id


def update_task(
    task_id: int,
    user_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    list_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None,
    due_time: Optional[str] = None,
    is_important: Optional[bool] = None,
    is_my_day: Optional[bool] = None,
    sort_order: Optional[int] = None,
    db_path: Optional[Path] = None
) -> bool:
    """Update a task."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Check ownership
    cursor.execute("SELECT id FROM user_tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return False

    updates = []
    params = []

    if title is not None:
        updates.append("title = ?")
        params.append(title)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if list_id is not None:
        updates.append("list_id = ?")
        params.append(list_id if list_id > 0 else None)
    if status is not None:
        updates.append("status = ?")
        params.append(status)
        if status == "completed":
            updates.append("completed_at = CURRENT_TIMESTAMP")
        else:
            updates.append("completed_at = NULL")
    if priority is not None:
        updates.append("priority = ?")
        params.append(priority)
    if due_date is not None:
        updates.append("due_date = ?")
        params.append(due_date if due_date else None)
    if due_time is not None:
        updates.append("due_time = ?")
        params.append(due_time if due_time else None)
    if is_important is not None:
        updates.append("is_important = ?")
        params.append(1 if is_important else 0)
    if is_my_day is not None:
        updates.append("is_my_day = ?")
        params.append(1 if is_my_day else 0)
        if is_my_day:
            updates.append("my_day_date = ?")
            params.append(date.today().isoformat())
    if sort_order is not None:
        updates.append("sort_order = ?")
        params.append(sort_order)

    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.extend([task_id, user_id])
        cursor.execute(f"""
            UPDATE user_tasks SET {', '.join(updates)}
            WHERE id = ? AND user_id = ?
        """, params)
        conn.commit()

    conn.close()
    return True


def delete_task(
    task_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> bool:
    """Delete a task and its subtasks."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    # Check ownership
    cursor.execute("SELECT id FROM user_tasks WHERE id = ? AND user_id = ?", (task_id, user_id))
    if not cursor.fetchone():
        conn.close()
        return False

    # Cascading delete handles subtasks via FK
    cursor.execute("DELETE FROM user_tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return True


def complete_task(
    task_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> bool:
    """Mark a task as completed."""
    return update_task(task_id, user_id, status="completed", db_path=db_path)


def add_task_to_my_day(
    task_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> bool:
    """Add a task to My Day."""
    return update_task(task_id, user_id, is_my_day=True, db_path=db_path)


def remove_task_from_my_day(
    task_id: int,
    user_id: int,
    db_path: Optional[Path] = None
) -> bool:
    """Remove a task from My Day."""
    return update_task(task_id, user_id, is_my_day=False, db_path=db_path)


def get_my_day_tasks(
    user_id: int,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """Get all My Day tasks for today."""
    return get_tasks(user_id, is_my_day=True, include_subtasks=False, db_path=db_path)


def get_important_tasks(
    user_id: int,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """Get all important tasks."""
    return get_tasks(user_id, is_important=True, include_subtasks=False, db_path=db_path)


def get_planned_tasks(
    user_id: int,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    """Get all tasks with due dates."""
    conn = _get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM user_tasks
        WHERE user_id = ? AND due_date IS NOT NULL AND parent_id IS NULL
        ORDER BY due_date, due_time, sort_order
    """, (user_id,))

    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks
