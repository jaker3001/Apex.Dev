"""
Apex Assistant - MCP Module

Manages MCP server connections for external tool integrations.
"""

from .connections import MCPConnectionManager, get_active_mcp_servers

__all__ = ["MCPConnectionManager", "get_active_mcp_servers"]
