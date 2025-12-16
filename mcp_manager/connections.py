"""
Apex Assistant - MCP Connection Manager

Manages configuration and status of MCP server connections.
"""

from typing import Any, Optional
from pathlib import Path

from database import (
    save_mcp_connection,
    get_mcp_connections,
    update_mcp_connection_status,
)


class MCPConnectionManager:
    """
    Manages MCP server connections for Apex Assistant.

    Provides methods to add, remove, enable, and disable MCP servers.
    Connection configs are persisted to the SQLite database.
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path

    def add_stdio_server(
        self,
        name: str,
        command: str,
        args: Optional[list[str]] = None,
        env: Optional[dict[str, str]] = None,
    ) -> int:
        """
        Add a stdio-based MCP server.

        Args:
            name: Unique name for this connection
            command: Command to run (e.g., "npx", "python")
            args: Command arguments
            env: Environment variables

        Returns:
            Connection ID
        """
        config = {
            "command": command,
            "args": args or [],
        }
        if env:
            config["env"] = env

        return save_mcp_connection(
            name=name,
            server_type="stdio",
            config=config,
            db_path=self.db_path
        )

    def add_sse_server(
        self,
        name: str,
        url: str,
        headers: Optional[dict[str, str]] = None,
    ) -> int:
        """
        Add an SSE-based MCP server.

        Args:
            name: Unique name for this connection
            url: Server URL
            headers: Optional HTTP headers

        Returns:
            Connection ID
        """
        config = {
            "type": "sse",
            "url": url,
        }
        if headers:
            config["headers"] = headers

        return save_mcp_connection(
            name=name,
            server_type="sse",
            config=config,
            db_path=self.db_path
        )

    def add_http_server(
        self,
        name: str,
        url: str,
        headers: Optional[dict[str, str]] = None,
    ) -> int:
        """
        Add an HTTP-based MCP server.

        Args:
            name: Unique name for this connection
            url: Server URL
            headers: Optional HTTP headers

        Returns:
            Connection ID
        """
        config = {
            "type": "http",
            "url": url,
        }
        if headers:
            config["headers"] = headers

        return save_mcp_connection(
            name=name,
            server_type="http",
            config=config,
            db_path=self.db_path
        )

    def enable(self, name: str) -> None:
        """Enable an MCP connection."""
        update_mcp_connection_status(
            name=name,
            status="active",
            db_path=self.db_path
        )

    def disable(self, name: str) -> None:
        """Disable an MCP connection."""
        update_mcp_connection_status(
            name=name,
            status="inactive",
            db_path=self.db_path
        )

    def set_error(self, name: str, error_message: str) -> None:
        """Mark a connection as having an error."""
        update_mcp_connection_status(
            name=name,
            status="error",
            error_message=error_message,
            db_path=self.db_path
        )

    def list_connections(self, active_only: bool = False) -> list[dict]:
        """Get all configured MCP connections."""
        return get_mcp_connections(
            active_only=active_only,
            db_path=self.db_path
        )


def get_active_mcp_servers(db_path: Optional[Path] = None) -> dict[str, dict[str, Any]]:
    """
    Get active MCP server configurations formatted for ClaudeAgentOptions.

    Returns:
        Dictionary mapping server names to their configurations,
        ready to pass to ClaudeAgentOptions(mcp_servers=...).
    """
    connections = get_mcp_connections(active_only=True, db_path=db_path)

    mcp_servers = {}
    for conn in connections:
        name = conn["name"]
        server_type = conn["server_type"]
        config = conn["config"]

        if server_type == "stdio":
            mcp_servers[name] = {
                "command": config["command"],
                "args": config.get("args", []),
            }
            if "env" in config:
                mcp_servers[name]["env"] = config["env"]

        elif server_type == "sse":
            mcp_servers[name] = {
                "type": "sse",
                "url": config["url"],
            }
            if "headers" in config:
                mcp_servers[name]["headers"] = config["headers"]

        elif server_type == "http":
            mcp_servers[name] = {
                "type": "http",
                "url": config["url"],
            }
            if "headers" in config:
                mcp_servers[name]["headers"] = config["headers"]

    return mcp_servers
