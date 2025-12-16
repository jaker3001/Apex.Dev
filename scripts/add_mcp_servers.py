"""
Add MCP servers from WSL Claude Code config to Apex Assistant database.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import init_database
from mcp_manager import MCPConnectionManager


def main():
    # Initialize database
    init_database()

    # Create connection manager
    manager = MCPConnectionManager()

    print("Adding MCP servers to Apex Assistant...\n")

    # 1. Limitless (stdio)
    try:
        conn_id = manager.add_stdio_server(
            name="limitless",
            command="node",
            args=["/home/frank/mcp-limitless-server/dist/server.js"],
            env={"LIMITLESS_API_KEY": "sk-1a436859-334f-4e95-8d36-c2b9d0216099"}
        )
        manager.enable("limitless")
        print(f"[OK] Added 'limitless' (stdio) - ID: {conn_id}")
    except Exception as e:
        print(f"[FAIL] Failed to add 'limitless': {e}")

    # 2. Zoho Projects (SSE)
    try:
        conn_id = manager.add_sse_server(
            name="zoho-projects",
            url="https://projects-905890034.zohomcp.com/mcp/message?key=d4337633eff5b49f04509566fbe1a2a4"
        )
        manager.enable("zoho-projects")
        print(f"[OK] Added 'zoho-projects' (sse) - ID: {conn_id}")
    except Exception as e:
        print(f"[FAIL] Failed to add 'zoho-projects': {e}")

    # 3. n8n-apex (SSE)
    try:
        conn_id = manager.add_sse_server(
            name="n8n-apex",
            url="https://n8n.ezwerk.net/mcp/56dd7430-a7dd-4bdd-a4ca-cadd6b7b78b3"
        )
        manager.enable("n8n-apex")
        print(f"[OK] Added 'n8n-apex' (sse) - ID: {conn_id}")
    except Exception as e:
        print(f"[FAIL] Failed to add 'n8n-apex': {e}")

    # List all connections
    print("\nCurrent MCP connections:")
    connections = manager.list_connections()
    for conn in connections:
        status = "enabled" if conn.get("is_active") else "disabled"
        print(f"  - {conn['name']} ({conn['server_type']}) [{status}]")

    print("\nDone! Restart the backend server to use the new MCP servers.")


if __name__ == "__main__":
    main()
