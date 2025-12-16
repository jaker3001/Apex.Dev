"""
Apex Assistant - Database Operations

CRUD operations for all database tables.
"""

import json
from datetime import datetime
from typing import Any, Optional
from pathlib import Path

from .schema import get_connection, DEFAULT_DB_PATH


# =============================================================================
# TASK OPERATIONS
# =============================================================================

def create_task(
    description: str,
    category: Optional[str] = None,
    input_type: Optional[str] = None,
    conversation_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new task and return its ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO tasks (description, category, input_type, conversation_id, status)
        VALUES (?, ?, ?, ?, 'in_progress')
    """, (description, category, input_type, conversation_id))

    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id


def update_task(
    task_id: int,
    db_path: Optional[Path] = None,
    **kwargs
) -> None:
    """Update a task with the given fields."""
    if not kwargs:
        return

    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Handle JSON fields
    if "tools_used" in kwargs and isinstance(kwargs["tools_used"], list):
        kwargs["tools_used"] = json.dumps(kwargs["tools_used"])

    # Build UPDATE statement
    set_clause = ", ".join(f"{key} = ?" for key in kwargs.keys())
    values = list(kwargs.values()) + [task_id]

    cursor.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_task(task_id: int, db_path: Optional[Path] = None) -> Optional[dict]:
    """Get a task by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        task = dict(row)
        # Parse JSON fields
        if task.get("tools_used"):
            task["tools_used"] = json.loads(task["tools_used"])
        return task
    return None


def get_tasks_by_category(
    category: str,
    limit: int = 50,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get tasks by category."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM tasks
        WHERE category = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (category, limit))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


# =============================================================================
# CONVERSATION OPERATIONS
# =============================================================================

def create_conversation(
    session_id: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new conversation and return its ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO conversations (session_id, is_active)
        VALUES (?, 1)
    """, (session_id,))

    conv_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return conv_id


def update_conversation(
    conversation_id: int,
    db_path: Optional[Path] = None,
    **kwargs
) -> None:
    """Update a conversation."""
    if not kwargs:
        return

    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Handle JSON fields
    if "related_task_ids" in kwargs and isinstance(kwargs["related_task_ids"], list):
        kwargs["related_task_ids"] = json.dumps(kwargs["related_task_ids"])

    set_clause = ", ".join(f"{key} = ?" for key in kwargs.keys())
    values = list(kwargs.values()) + [conversation_id]

    cursor.execute(f"UPDATE conversations SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_conversation(
    conversation_id: int,
    db_path: Optional[Path] = None
) -> Optional[dict]:
    """Get a conversation by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        conv = dict(row)
        if conv.get("related_task_ids"):
            conv["related_task_ids"] = json.loads(conv["related_task_ids"])
        return conv
    return None


# =============================================================================
# AGENT OPERATIONS
# =============================================================================

def register_agent(
    name: str,
    description: str,
    capabilities: Optional[list[str]] = None,
    db_path: Optional[Path] = None
) -> int:
    """Register a new agent or return existing ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Check if agent already exists
    cursor.execute("SELECT id FROM agents WHERE name = ?", (name,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return existing["id"]

    # Create new agent
    capabilities_json = json.dumps(capabilities) if capabilities else None

    cursor.execute("""
        INSERT INTO agents (name, description, capabilities)
        VALUES (?, ?, ?)
    """, (name, description, capabilities_json))

    agent_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return agent_id


def update_agent_usage(
    name: str,
    db_path: Optional[Path] = None
) -> None:
    """Increment usage count and update last_used timestamp."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE agents
        SET times_used = times_used + 1, last_used = CURRENT_TIMESTAMP
        WHERE name = ?
    """, (name,))

    conn.commit()
    conn.close()


def get_agent(name: str, db_path: Optional[Path] = None) -> Optional[dict]:
    """Get an agent by name."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM agents WHERE name = ?", (name,))
    row = cursor.fetchone()
    conn.close()

    if row:
        agent = dict(row)
        if agent.get("capabilities"):
            agent["capabilities"] = json.loads(agent["capabilities"])
        return agent
    return None


def get_all_agents(
    active_only: bool = True,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get all registered agents."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM agents"
    if active_only:
        query += " WHERE is_active = 1"
    query += " ORDER BY times_used DESC"

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    agents = []
    for row in rows:
        agent = dict(row)
        if agent.get("capabilities"):
            agent["capabilities"] = json.loads(agent["capabilities"])
        agents.append(agent)
    return agents


# =============================================================================
# AUTOMATION CANDIDATE OPERATIONS
# =============================================================================

def create_automation_candidate(
    pattern_description: str,
    suggested_automation: Optional[str] = None,
    automation_type: Optional[str] = None,
    related_task_ids: Optional[list[int]] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new automation candidate."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    task_ids_json = json.dumps(related_task_ids) if related_task_ids else None

    cursor.execute("""
        INSERT INTO automation_candidates
        (pattern_description, suggested_automation, automation_type, related_task_ids)
        VALUES (?, ?, ?, ?)
    """, (pattern_description, suggested_automation, automation_type, task_ids_json))

    candidate_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return candidate_id


def update_automation_candidate(
    candidate_id: int,
    db_path: Optional[Path] = None,
    **kwargs
) -> None:
    """Update an automation candidate."""
    if not kwargs:
        return

    conn = get_connection(db_path)
    cursor = conn.cursor()

    if "related_task_ids" in kwargs and isinstance(kwargs["related_task_ids"], list):
        kwargs["related_task_ids"] = json.dumps(kwargs["related_task_ids"])

    set_clause = ", ".join(f"{key} = ?" for key in kwargs.keys())
    values = list(kwargs.values()) + [candidate_id]

    cursor.execute(f"UPDATE automation_candidates SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_automation_candidates(
    status: Optional[str] = None,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get automation candidates, optionally filtered by status."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    if status:
        cursor.execute("""
            SELECT * FROM automation_candidates
            WHERE status = ?
            ORDER BY frequency DESC
        """, (status,))
    else:
        cursor.execute("""
            SELECT * FROM automation_candidates
            ORDER BY frequency DESC
        """)

    rows = cursor.fetchall()
    conn.close()

    candidates = []
    for row in rows:
        candidate = dict(row)
        if candidate.get("related_task_ids"):
            candidate["related_task_ids"] = json.loads(candidate["related_task_ids"])
        candidates.append(candidate)
    return candidates


# =============================================================================
# FILE OPERATIONS
# =============================================================================

def log_file_processed(
    filename: str,
    file_type: Optional[str] = None,
    file_path: Optional[str] = None,
    task_id: Optional[int] = None,
    purpose: Optional[str] = None,
    file_size: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    """Log a processed file."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO files_processed
        (filename, file_type, file_path, task_id, purpose, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (filename, file_type, file_path, task_id, purpose, file_size))

    file_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return file_id


def get_files_for_task(
    task_id: int,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get all files associated with a task."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM files_processed
        WHERE task_id = ?
        ORDER BY timestamp
    """, (task_id,))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


# =============================================================================
# MCP CONNECTION OPERATIONS
# =============================================================================

def save_mcp_connection(
    name: str,
    server_type: str,
    config: dict[str, Any],
    db_path: Optional[Path] = None
) -> int:
    """Save or update an MCP connection configuration."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    config_json = json.dumps(config)

    # Try to update existing, otherwise insert
    cursor.execute("SELECT id FROM mcp_connections WHERE name = ?", (name,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE mcp_connections
            SET server_type = ?, config = ?
            WHERE name = ?
        """, (server_type, config_json, name))
        conn_id = existing["id"]
    else:
        cursor.execute("""
            INSERT INTO mcp_connections (name, server_type, config)
            VALUES (?, ?, ?)
        """, (name, server_type, config_json))
        conn_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return conn_id


def get_mcp_connections(
    active_only: bool = False,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get all MCP connections."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM mcp_connections"
    if active_only:
        query += " WHERE status = 'active'"
    query += " ORDER BY name"

    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()

    connections = []
    for row in rows:
        mcp_conn = dict(row)
        mcp_conn["config"] = json.loads(mcp_conn["config"])
        connections.append(mcp_conn)
    return connections


def update_mcp_connection_status(
    name: str,
    status: str,
    error_message: Optional[str] = None,
    db_path: Optional[Path] = None
) -> None:
    """Update an MCP connection's status."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    if status == "active":
        cursor.execute("""
            UPDATE mcp_connections
            SET status = ?, error_message = NULL, last_used = CURRENT_TIMESTAMP
            WHERE name = ?
        """, (status, name))
    else:
        cursor.execute("""
            UPDATE mcp_connections
            SET status = ?, error_message = ?
            WHERE name = ?
        """, (status, error_message, name))

    conn.commit()
    conn.close()
