"""
Apex Assistant - Database Module

SQLite database for tracking tasks, conversations, agents, and automation opportunities.
"""

from .schema import init_database, get_connection
from .operations import (
    # Task operations
    create_task,
    update_task,
    get_task,
    get_tasks_by_category,
    # Conversation operations
    create_conversation,
    update_conversation,
    get_conversation,
    # Message operations
    create_message,
    get_messages_by_conversation,
    get_conversations_with_preview,
    update_conversation_title,
    delete_conversation,
    # Agent operations
    register_agent,
    update_agent_usage,
    get_agent,
    get_all_agents,
    # Automation candidate operations
    create_automation_candidate,
    update_automation_candidate,
    get_automation_candidates,
    # File operations
    log_file_processed,
    get_files_for_task,
    # MCP connection operations
    save_mcp_connection,
    get_mcp_connections,
    update_mcp_connection_status,
    # Activity log operations
    log_activity,
    get_activity_logs,
)

__all__ = [
    "init_database",
    "get_connection",
    "create_task",
    "update_task",
    "get_task",
    "get_tasks_by_category",
    "create_conversation",
    "update_conversation",
    "get_conversation",
    "create_message",
    "get_messages_by_conversation",
    "get_conversations_with_preview",
    "update_conversation_title",
    "delete_conversation",
    "register_agent",
    "update_agent_usage",
    "get_agent",
    "get_all_agents",
    "create_automation_candidate",
    "update_automation_candidate",
    "get_automation_candidates",
    "log_file_processed",
    "get_files_for_task",
    "save_mcp_connection",
    "get_mcp_connections",
    "update_mcp_connection_status",
    "log_activity",
    "get_activity_logs",
]
