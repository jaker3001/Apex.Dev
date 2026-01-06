"""
Apex Assistant - Server Runner

This script ensures the correct asyncio event loop policy is set on Windows
before starting the uvicorn server. This is required for the Claude Agent SDK
which uses subprocess spawning.
"""

import asyncio
import sys

# CRITICAL: Set Windows event loop policy BEFORE importing anything else
# This must happen before any asyncio operations
if sys.platform == "win32":
    # ProactorEventLoop is required for subprocess support on Windows
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    # Create and set the event loop immediately
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

import uvicorn

if __name__ == "__main__":
    # Run the server with explicit loop configuration
    config = uvicorn.Config(
        "api.main:app",
        host="0.0.0.0",
        port=8001,
        loop="asyncio",  # Use asyncio loop (with our policy)
    )
    server = uvicorn.Server(config)

    # Run directly in the event loop we created
    if sys.platform == "win32":
        asyncio.get_event_loop().run_until_complete(server.serve())
    else:
        server.run()
