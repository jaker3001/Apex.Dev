"""
Apex Assistant - Database Module

SQLite database for tracking tasks, conversations, agents, and automation opportunities.
Also includes the Apex Operations database for project management.
"""

from .schema import init_database, get_connection
from .schema_apex import get_ops_connection, init_apex_ops_database, APEX_OPS_DB_PATH

# Apex Operations database functions
from .operations_apex import (
    # Organization operations
    create_organization,
    get_organization,
    get_organizations,
    update_organization,
    delete_organization,
    # Contact operations
    create_contact,
    get_contact,
    get_contacts_by_organization,
    search_contacts,
    update_contact,
    delete_contact,
    # Client operations
    create_client,
    get_client,
    get_clients,
    search_clients,
    update_client,
    delete_client,
    # Project operations
    create_project,
    get_project,
    get_project_by_job_number,
    get_projects,
    get_project_full,
    get_project_stats,
    update_project,
    update_project_status,
    delete_project,
    # Project contact operations
    assign_contact_to_project,
    get_contacts_for_project,
    remove_contact_from_project,
    # Note operations
    create_note,
    get_notes_for_project,
    update_note,
    delete_note,
    # Estimate operations
    create_estimate,
    get_estimates_for_project,
    update_estimate,
    update_estimate_status,
    # Payment operations
    create_payment,
    get_payments_for_project,
    update_payment,
)

# Apex Assistant database functions
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
)

__all__ = [
    # Original assistant database
    "init_database",
    "get_connection",
    "create_task",
    "update_task",
    "get_task",
    "get_tasks_by_category",
    "create_conversation",
    "update_conversation",
    "get_conversation",
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
    # Apex Operations database
    "get_ops_connection",
    "init_apex_ops_database",
    "APEX_OPS_DB_PATH",
    # Organization operations
    "create_organization",
    "get_organization",
    "get_organizations",
    "update_organization",
    "delete_organization",
    # Contact operations
    "create_contact",
    "get_contact",
    "get_contacts_by_organization",
    "search_contacts",
    "update_contact",
    "delete_contact",
    # Client operations
    "create_client",
    "get_client",
    "get_clients",
    "search_clients",
    "update_client",
    "delete_client",
    # Project operations
    "create_project",
    "get_project",
    "get_project_by_job_number",
    "get_projects",
    "get_project_full",
    "get_project_stats",
    "update_project",
    "update_project_status",
    "delete_project",
    # Project contact operations
    "assign_contact_to_project",
    "get_contacts_for_project",
    "remove_contact_from_project",
    # Note operations
    "create_note",
    "get_notes_for_project",
    "update_note",
    "delete_note",
    # Estimate operations
    "create_estimate",
    "get_estimates_for_project",
    "update_estimate",
    "update_estimate_status",
    # Payment operations
    "create_payment",
    "get_payments_for_project",
    "update_payment",
]
