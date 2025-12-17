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
    # Media operations
    create_media,
    get_media,
    get_media_for_project,
    update_media,
    delete_media,
    # Labor entry operations
    create_labor_entry,
    get_labor_entry,
    get_labor_entries_for_project,
    update_labor_entry,
    delete_labor_entry,
    # Receipt operations
    create_receipt,
    get_receipt,
    get_receipts_for_project,
    update_receipt,
    delete_receipt,
    # Work order operations
    create_work_order,
    get_work_order,
    get_work_orders_for_project,
    update_work_order,
    delete_work_order,
    # Activity log operations (operations_apex version)
    log_project_activity,
    get_activity_for_project,
    # Accounting operations
    get_project_accounting_summary,
    update_ready_to_invoice,
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
    # Chat project operations
    create_chat_project,
    get_chat_project,
    get_all_chat_projects,
    update_chat_project,
    delete_chat_project,
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
    # Chat project operations
    "create_chat_project",
    "get_chat_project",
    "get_all_chat_projects",
    "update_chat_project",
    "delete_chat_project",
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
    # Media operations
    "create_media",
    "get_media",
    "get_media_for_project",
    "update_media",
    "delete_media",
    # Labor entry operations
    "create_labor_entry",
    "get_labor_entry",
    "get_labor_entries_for_project",
    "update_labor_entry",
    "delete_labor_entry",
    # Receipt operations
    "create_receipt",
    "get_receipt",
    "get_receipts_for_project",
    "update_receipt",
    "delete_receipt",
    # Work order operations
    "create_work_order",
    "get_work_order",
    "get_work_orders_for_project",
    "update_work_order",
    "delete_work_order",
    # Activity log operations (project-specific)
    "log_project_activity",
    "get_activity_for_project",
    # Accounting operations
    "get_project_accounting_summary",
    "update_ready_to_invoice",
]
