"""
Apex Assistant - MCP Routes

REST endpoints for managing MCP server connections.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import (
    get_mcp_connections,
    save_mcp_connection,
    update_mcp_connection_status,
)
from mcp_manager import MCPConnectionManager

router = APIRouter()


class MCPServerCreate(BaseModel):
    """Schema for creating a new MCP server connection."""
    name: str
    server_type: str  # stdio, sse, http
    # For stdio
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    # For sse/http
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None


class MCPServerUpdate(BaseModel):
    """Schema for updating an MCP server connection."""
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None


@router.get("/mcp")
async def list_mcp_servers(
    active_only: bool = Query(default=False),
):
    """
    List all configured MCP server connections.
    """
    connections = get_mcp_connections(active_only=active_only)
    return {"servers": connections}


@router.get("/mcp/{server_name}")
async def get_mcp_server(server_name: str):
    """
    Get a specific MCP server configuration.
    """
    connections = get_mcp_connections()
    server = next(
        (c for c in connections if c["name"] == server_name),
        None
    )

    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    return server


@router.post("/mcp")
async def create_mcp_server(server: MCPServerCreate):
    """
    Add a new MCP server configuration.
    """
    manager = MCPConnectionManager()

    if server.server_type == "stdio":
        if not server.command:
            raise HTTPException(
                status_code=400,
                detail="Command is required for stdio servers"
            )

        conn_id = manager.add_stdio_server(
            name=server.name,
            command=server.command,
            args=server.args,
            env=server.env,
        )

    elif server.server_type == "sse":
        if not server.url:
            raise HTTPException(
                status_code=400,
                detail="URL is required for SSE servers"
            )

        conn_id = manager.add_sse_server(
            name=server.name,
            url=server.url,
            headers=server.headers,
        )

    elif server.server_type == "http":
        if not server.url:
            raise HTTPException(
                status_code=400,
                detail="URL is required for HTTP servers"
            )

        conn_id = manager.add_http_server(
            name=server.name,
            url=server.url,
            headers=server.headers,
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid server type: {server.server_type}. Must be stdio, sse, or http"
        )

    return {
        "id": conn_id,
        "name": server.name,
        "message": "MCP server added successfully",
    }


@router.put("/mcp/{server_name}")
async def update_mcp_server(server_name: str, update: MCPServerUpdate):
    """
    Update an MCP server configuration.
    """
    import json
    from database import get_connection

    connections = get_mcp_connections()
    server = next(
        (c for c in connections if c["name"] == server_name),
        None
    )

    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    # Build new config
    config = server["config"].copy()

    if update.command is not None:
        config["command"] = update.command
    if update.args is not None:
        config["args"] = update.args
    if update.env is not None:
        config["env"] = update.env
    if update.url is not None:
        config["url"] = update.url
    if update.headers is not None:
        config["headers"] = update.headers

    # Update in database
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE mcp_connections SET config = ? WHERE name = ?",
        (json.dumps(config), server_name)
    )
    conn.commit()
    conn.close()

    return {"message": "MCP server updated successfully"}


@router.delete("/mcp/{server_name}")
async def delete_mcp_server(server_name: str):
    """
    Delete an MCP server configuration.
    """
    from database import get_connection

    connections = get_mcp_connections()
    server = next(
        (c for c in connections if c["name"] == server_name),
        None
    )

    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM mcp_connections WHERE name = ?", (server_name,))
    conn.commit()
    conn.close()

    return {"message": "MCP server deleted successfully"}


@router.post("/mcp/{server_name}/enable")
async def enable_mcp_server(server_name: str):
    """
    Enable an MCP server connection.
    """
    manager = MCPConnectionManager()
    manager.enable(server_name)

    return {"message": f"MCP server '{server_name}' enabled"}


@router.post("/mcp/{server_name}/disable")
async def disable_mcp_server(server_name: str):
    """
    Disable an MCP server connection.
    """
    manager = MCPConnectionManager()
    manager.disable(server_name)

    return {"message": f"MCP server '{server_name}' disabled"}


@router.get("/mcp/{server_name}/test")
async def test_mcp_server(server_name: str):
    """
    Test an MCP server connection.

    TODO: Implement actual connection testing.
    """
    connections = get_mcp_connections()
    server = next(
        (c for c in connections if c["name"] == server_name),
        None
    )

    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found")

    # TODO: Actually test the connection
    return {
        "message": "Connection testing not yet implemented",
        "server": server_name,
        "status": server["status"],
    }
