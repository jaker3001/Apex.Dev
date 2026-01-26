"""
Apex Assistant - FastAPI Application

Main entry point for the API server.
Provides REST endpoints and WebSocket connections for the UI.

Usage:
    python main.py --api              # Start API server on port 8000
    uvicorn api.main:app --reload     # Development mode with auto-reload
"""

import asyncio
import logging
import sys
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("apex_assistant")

# Load environment variables from .env file
load_dotenv()

# Fix for Windows subprocess support in asyncio
# The Claude Agent SDK uses subprocess to spawn Claude Code CLI,
# which requires ProactorEventLoop on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import init_database, init_apex_ops_database
from database.schema_hub import init_hub_tables
from database.schema_pkm import init_pkm_tables
from api.routes import chat, agents, skills, mcp, analytics, conversations, projects, auth, chat_projects, contacts, tasks
from api.routes import inbox, notifications, time_tracking, calendar, weather, pkm, drying, google_auth
# New Second Brain routes
from api.routes import tags, goals, personal_projects, people, notes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup and shutdown."""
    # Startup - SQLite initialization (legacy, will be removed after migration)
    import os
    skip_sqlite = os.environ.get("SKIP_SQLITE_INIT", "false").lower() == "true"

    if not skip_sqlite:
        try:
            init_database()
            logger.info("Assistant database initialized")
            init_apex_ops_database()
            logger.info("Operations database initialized")
            init_hub_tables()
            logger.info("Hub tables initialized")
            init_pkm_tables()
            logger.info("PKM tables initialized")
        except Exception as e:
            logger.warning(f"SQLite initialization skipped or failed: {e}")
            logger.info("Continuing with Supabase-only mode")
    else:
        logger.info("SQLite initialization skipped (SKIP_SQLITE_INIT=true)")

    yield
    # Shutdown
    logger.info("Shutting down API server")


app = FastAPI(
    title="Apex Assistant API",
    description="API backend for Apex Assistant - AI assistant for Apex Restoration LLC",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local development
# In production, replace with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # Vite dev server
        "http://localhost:5174",      # Vite alternate port
        "http://localhost:5175",      # Vite alternate port
        "http://localhost:5176",      # Vite alternate port
        "http://localhost:5177",      # Vite alternate port
        "http://localhost:5178",      # Vite alternate port
        "http://localhost:3000",      # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(conversations.router, prefix="/api", tags=["conversations"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(skills.router, prefix="/api", tags=["skills"])
app.include_router(mcp.router, prefix="/api", tags=["mcp"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(contacts.router, prefix="/api", tags=["contacts"])
app.include_router(chat_projects.router, prefix="/api", tags=["chat-projects"])
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
app.include_router(inbox.router, prefix="/api", tags=["inbox"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(time_tracking.router, prefix="/api", tags=["time"])
app.include_router(calendar.router, prefix="/api", tags=["calendar"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(pkm.router, prefix="/api", tags=["pkm"])
app.include_router(drying.router, prefix="/api", tags=["drying"])
app.include_router(google_auth.router, prefix="/api", tags=["google-auth"])
# Second Brain routes
app.include_router(tags.router, prefix="/api", tags=["tags"])
app.include_router(goals.router, prefix="/api", tags=["goals"])
app.include_router(personal_projects.router, prefix="/api", tags=["personal-projects"])
app.include_router(people.router, prefix="/api", tags=["people"])
app.include_router(notes.router, prefix="/api", tags=["notes"])

# Serve static frontend files in production (must be last to not override API routes)
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "name": "Apex Assistant API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": "connected",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
