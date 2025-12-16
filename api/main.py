"""
Apex Assistant - FastAPI Application

Main entry point for the API server.
Provides REST endpoints and WebSocket connections for the UI.

Usage:
    python main.py --api              # Start API server on port 8000
    uvicorn api.main:app --reload     # Development mode with auto-reload
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import init_database, init_apex_ops_database
from api.routes import chat, agents, skills, mcp, analytics, conversations, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup and shutdown."""
    # Startup
    init_database()
    print("Assistant database initialized")
    init_apex_ops_database()
    print("Operations database initialized")
    yield
    # Shutdown
    print("Shutting down API server")


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
        "http://localhost:3000",      # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(conversations.router, prefix="/api", tags=["conversations"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(skills.router, prefix="/api", tags=["skills"])
app.include_router(mcp.router, prefix="/api", tags=["mcp"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(projects.router, prefix="/api", tags=["projects"])


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
