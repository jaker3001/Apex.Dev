"""
Apex Assistant - Chat Schemas

Pydantic models for chat-related requests and responses.
"""

from typing import Optional, List, Any, Literal
from pydantic import BaseModel
from datetime import datetime


class ChatMessage(BaseModel):
    """Schema for a chat message from the client."""
    type: Literal["message", "cancel", "resume"] = "message"
    content: Optional[str] = None
    files: Optional[List[str]] = None  # File paths
    session_id: Optional[str] = None


class ToolInfo(BaseModel):
    """Schema for tool usage information."""
    id: Optional[str] = None
    name: str
    input: Optional[dict] = None
    output: Optional[Any] = None
    status: Literal["running", "completed", "error"] = "running"


class StreamEvent(BaseModel):
    """Schema for streaming events sent to the client."""
    type: Literal[
        "init",
        "stream_start",
        "text_delta",
        "tool_use",
        "tool_result",
        "stream_end",
        "error",
    ]
    session_id: Optional[str] = None
    conversation_id: Optional[int] = None
    content: Optional[str] = None
    tool: Optional[ToolInfo] = None
    task_id: Optional[int] = None
    message: Optional[str] = None  # For error type


class TaskSummary(BaseModel):
    """Summary of a task within a conversation."""
    id: int
    timestamp: datetime
    description: str
    status: str
    category: Optional[str] = None
    complexity_score: Optional[int] = None
    time_to_complete: Optional[int] = None


class ConversationResponse(BaseModel):
    """Response schema for a single conversation."""
    id: int
    timestamp: datetime
    summary: Optional[str] = None
    session_id: Optional[str] = None
    is_active: bool = True
    tasks: Optional[List[TaskSummary]] = None


class ConversationListResponse(BaseModel):
    """Response schema for listing conversations."""
    conversations: List[dict]
    total: int
    limit: int
    offset: int
