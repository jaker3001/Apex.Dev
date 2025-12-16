"""
Apex Assistant - API Routes

All API route modules for the FastAPI application.
"""

from . import chat, conversations, agents, skills, mcp, analytics

__all__ = ["chat", "conversations", "agents", "skills", "mcp", "analytics"]
