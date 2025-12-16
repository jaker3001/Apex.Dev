#!/usr/bin/env python3
"""
Apex Assistant - Main Entry Point

A personalized AI assistant for Apex Restoration LLC built on the Claude Agent SDK.

Usage:
    python main.py              # Start interactive session
    python main.py --api        # Start API server for web UI
    python main.py --init-db    # Initialize database only
    python main.py --help       # Show help

Requirements:
    - Python 3.10+
    - ANTHROPIC_API_KEY environment variable set
    - Claude Code CLI installed (bundled with claude-agent-sdk)
"""

import asyncio
import argparse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from database import init_database
from agents import ApexOrchestrator
from mcp_manager import MCPConnectionManager


def check_api_key() -> bool:
    """Check if ANTHROPIC_API_KEY is set."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable is not set.")
        print("\nTo set it:")
        print("  1. Get your API key from https://console.anthropic.com/")
        print("  2. Create a .env file with: ANTHROPIC_API_KEY=your_key_here")
        print("     Or set it in your environment: export ANTHROPIC_API_KEY=your_key_here")
        return False
    return True


def start_api_server(port: int = 8000):
    """Start the FastAPI server for the web UI."""
    try:
        import uvicorn
        from api.main import app
    except ImportError as e:
        print(f"ERROR: Missing dependencies for API server: {e}")
        print("\nInstall with: pip install fastapi uvicorn python-multipart websockets")
        sys.exit(1)

    print("=" * 60)
    print("  APEX ASSISTANT API SERVER")
    print(f"  Running on http://localhost:{port}")
    print("  API docs at http://localhost:{port}/docs")
    print("=" * 60)
    print()

    uvicorn.run(app, host="0.0.0.0", port=port)


def setup_example_mcp_connections():
    """Set up some example MCP connections (disabled by default)."""
    manager = MCPConnectionManager()

    # Example: Playwright browser automation
    manager.add_stdio_server(
        name="playwright",
        command="npx",
        args=["@playwright/mcp@latest"],
    )

    # Example: Filesystem access (if needed for specific directories)
    # manager.add_stdio_server(
    #     name="filesystem",
    #     command="npx",
    #     args=["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
    # )

    print("Example MCP connections added (disabled by default).")
    print("Use MCPConnectionManager to enable them when needed.")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Apex Assistant - AI assistant for Apex Restoration LLC",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py              Start interactive session
  python main.py --api        Start API server for web UI (port 8000)
  python main.py --init-db    Initialize the database
  python main.py --setup-mcp  Add example MCP server configurations

For more information, see the README or requirements document.
        """,
    )

    parser.add_argument(
        "--api",
        action="store_true",
        help="Start the API server for the web UI",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for the API server (default: 8000)",
    )
    parser.add_argument(
        "--init-db",
        action="store_true",
        help="Initialize the SQLite database",
    )
    parser.add_argument(
        "--setup-mcp",
        action="store_true",
        help="Set up example MCP server connections",
    )
    parser.add_argument(
        "--working-dir",
        type=Path,
        default=None,
        help="Working directory for file operations",
    )

    args = parser.parse_args()

    # Handle init-db command
    if args.init_db:
        init_database()
        print("Database initialized successfully.")
        return

    # Handle setup-mcp command
    if args.setup_mcp:
        init_database()  # Ensure DB exists
        setup_example_mcp_connections()
        return

    # Handle API server command
    if args.api:
        if not check_api_key():
            sys.exit(1)
        init_database()
        start_api_server(port=args.port)
        return

    # For interactive session, check API key
    if not check_api_key():
        sys.exit(1)

    # Initialize database if needed
    init_database()

    # Print welcome message
    print("=" * 60)
    print("  APEX ASSISTANT")
    print("  AI Assistant for Apex Restoration LLC")
    print("=" * 60)
    print()

    # Start the orchestrator
    orchestrator = ApexOrchestrator(
        working_directory=args.working_dir,
    )

    try:
        asyncio.run(orchestrator.run_interactive())
    except KeyboardInterrupt:
        print("\n\nGoodbye!")


if __name__ == "__main__":
    main()
