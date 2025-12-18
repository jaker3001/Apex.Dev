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
    user_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new conversation and return its ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO conversations (session_id, user_id, is_active)
        VALUES (?, ?, 1)
    """, (session_id, user_id))

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


# =============================================================================
# MESSAGE OPERATIONS
# =============================================================================

def create_message(
    conversation_id: int,
    role: str,
    content: Optional[str] = None,
    model_id: Optional[str] = None,
    model_name: Optional[str] = None,
    tools_used: Optional[list] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new message and return its ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    tools_json = json.dumps(tools_used) if tools_used else None

    cursor.execute("""
        INSERT INTO messages (conversation_id, role, content, model_id, model_name, tools_used)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (conversation_id, role, content, model_id, model_name, tools_json))

    message_id = cursor.lastrowid

    # Update conversation message count and last model
    cursor.execute("""
        UPDATE conversations
        SET message_count = message_count + 1,
            last_model_id = COALESCE(?, last_model_id)
        WHERE id = ?
    """, (model_id, conversation_id))

    conn.commit()
    conn.close()
    return message_id


def get_messages_by_conversation(
    conversation_id: int,
    limit: Optional[int] = None,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get all messages for a conversation."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = """
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
    """
    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query, (conversation_id,))
    rows = cursor.fetchall()
    conn.close()

    messages = []
    for row in rows:
        msg = dict(row)
        if msg.get("tools_used"):
            msg["tools_used"] = json.loads(msg["tools_used"])
        messages.append(msg)
    return messages


def get_conversations_with_preview(
    limit: int = 50,
    include_inactive: bool = False,
    user_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get conversations with first message preview, optionally filtered by user."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = """
        SELECT
            c.id,
            c.timestamp,
            c.title,
            c.session_id,
            c.is_active,
            c.last_model_id,
            c.message_count,
            c.user_id,
            (SELECT content FROM messages m
             WHERE m.conversation_id = c.id
             ORDER BY m.timestamp ASC LIMIT 1) as preview
        FROM conversations c
        WHERE 1=1
    """
    params = []
    if not include_inactive:
        query += " AND c.is_active = 1"
    if user_id is not None:
        query += " AND c.user_id = ?"
        params.append(user_id)
    query += " ORDER BY c.timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def update_conversation_title(
    conversation_id: int,
    title: str,
    db_path: Optional[Path] = None
) -> None:
    """Update a conversation's title."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE conversations SET title = ? WHERE id = ?
    """, (title, conversation_id))

    conn.commit()
    conn.close()


def delete_conversation(
    conversation_id: int,
    db_path: Optional[Path] = None
) -> None:
    """Delete a conversation and all its messages."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Messages will be deleted via CASCADE, but let's be explicit
    cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))

    conn.commit()
    conn.close()


# =============================================================================
# ACTIVITY LOG OPERATIONS
# =============================================================================

def log_activity(
    log_type: str,
    data: dict,
    session_id: Optional[str] = None,
    conversation_id: Optional[int] = None,
    severity: str = "info",
    db_path: Optional[Path] = None
) -> int:
    """Log an activity for debugging/troubleshooting."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO activity_logs (log_type, session_id, conversation_id, data, severity)
        VALUES (?, ?, ?, ?, ?)
    """, (log_type, session_id, conversation_id, json.dumps(data), severity))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def get_activity_logs(
    log_type: Optional[str] = None,
    session_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get activity logs with optional filtering."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    query = "SELECT * FROM activity_logs WHERE 1=1"
    params = []

    if log_type:
        query += " AND log_type = ?"
        params.append(log_type)
    if session_id:
        query += " AND session_id = ?"
        params.append(session_id)
    if severity:
        query += " AND severity = ?"
        params.append(severity)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    logs = []
    for row in rows:
        log = dict(row)
        if log.get("data"):
            log["data"] = json.loads(log["data"])
        logs.append(log)
    return logs


# =============================================================================
# CHAT PROJECT OPERATIONS (Claude Desktop style projects for Chat Mode)
# =============================================================================

def create_chat_project(
    name: str,
    description: Optional[str] = None,
    instructions: Optional[str] = None,
    knowledge_path: Optional[str] = None,
    linked_job_number: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    """Create a new chat project and return its ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO chat_projects (name, description, instructions, knowledge_path, linked_job_number)
        VALUES (?, ?, ?, ?, ?)
    """, (name, description, instructions, knowledge_path, linked_job_number))

    project_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return project_id


def get_chat_project(
    project_id: int,
    db_path: Optional[Path] = None
) -> Optional[dict]:
    """Get a chat project by ID."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM chat_projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()

    return dict(row) if row else None


def get_all_chat_projects(
    db_path: Optional[Path] = None
) -> list[dict]:
    """Get all chat projects."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM chat_projects ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def update_chat_project(
    project_id: int,
    db_path: Optional[Path] = None,
    **kwargs
) -> None:
    """Update a chat project with the given fields."""
    if not kwargs:
        return

    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Always update updated_at timestamp
    kwargs["updated_at"] = datetime.now().isoformat()

    set_clause = ", ".join(f"{key} = ?" for key in kwargs.keys())
    values = list(kwargs.values()) + [project_id]

    cursor.execute(f"UPDATE chat_projects SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_chat_project(
    project_id: int,
    db_path: Optional[Path] = None
) -> None:
    """Delete a chat project."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Remove project reference from conversations
    cursor.execute(
        "UPDATE conversations SET chat_project_id = NULL WHERE chat_project_id = ?",
        (project_id,)
    )

    # Delete the project
    cursor.execute("DELETE FROM chat_projects WHERE id = ?", (project_id,))

    conn.commit()
    conn.close()
