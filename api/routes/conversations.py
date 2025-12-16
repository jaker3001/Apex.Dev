"""
Apex Assistant - Conversation Routes

REST endpoints for managing conversation history.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import (
    get_conversation,
    get_connection,
    get_conversations_with_preview,
    get_messages_by_conversation,
    update_conversation_title,
    delete_conversation as db_delete_conversation,
    log_activity,
)
from api.schemas.chat import ConversationResponse, ConversationListResponse

router = APIRouter()

# Model ID to display name mapping (SDK model names)
MODEL_DISPLAY_NAMES = {
    "claude-sonnet-4-5": "Sonnet 4.5",
    "claude-opus-4-5": "Opus 4.5",
    "claude-sonnet-4-0": "Sonnet 4",
    "claude-haiku-4-5": "Haiku 4.5",
}


def get_model_display_name(model_id: str) -> str:
    """Get the display name for a model ID."""
    return MODEL_DISPLAY_NAMES.get(model_id, model_id)


def to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase."""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def transform_conversation(conv: dict) -> dict:
    """Transform conversation dict to camelCase for frontend."""
    return {
        "id": conv.get("id"),
        "sessionId": conv.get("session_id"),
        "title": conv.get("title"),
        "preview": conv.get("preview"),
        "lastModelId": conv.get("last_model_id"),
        "lastModelName": conv.get("last_model_name"),
        "messageCount": conv.get("message_count", 0),
        "createdAt": conv.get("timestamp"),
        "updatedAt": conv.get("timestamp"),
        "isActive": bool(conv.get("is_active", 1)),
    }


@router.get("/conversations")
async def list_conversations(
    limit: int = Query(default=50, le=100),
    include_inactive: bool = Query(default=False),
):
    """
    List all conversations with preview of first message.

    Returns conversations with:
    - id, title, timestamp
    - preview (first message content)
    - lastModelId and lastModelName (camelCase for frontend)
    - messageCount
    """
    conversations = get_conversations_with_preview(
        limit=limit,
        include_inactive=include_inactive,
    )

    # Add model display names and transform to camelCase
    result = []
    for conv in conversations:
        model_id = conv.get("last_model_id")
        conv["last_model_name"] = get_model_display_name(model_id) if model_id else None
        # Truncate preview if too long
        if conv.get("preview"):
            conv["preview"] = conv["preview"][:100] + "..." if len(conv["preview"]) > 100 else conv["preview"]
        result.append(transform_conversation(conv))

    return {
        "conversations": result,
        "total": len(result),
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(conversation_id: int):
    """
    Get a specific conversation by ID with all messages.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages for this conversation
    messages = get_messages_by_conversation(conversation_id)

    # Add model display names to messages
    for msg in messages:
        model_id = msg.get("model_id")
        msg["model_name"] = get_model_display_name(model_id) if model_id else None

    # Get associated tasks
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM tasks WHERE conversation_id = ? ORDER BY timestamp",
        (conversation_id,)
    )
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Add model display name to conversation
    model_id = conversation.get("last_model_id")
    conversation["last_model_name"] = get_model_display_name(model_id) if model_id else None

    return {
        **conversation,
        "messages": messages,
        "tasks": tasks,
    }


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: int,
    limit: Optional[int] = Query(default=None),
):
    """
    Get messages for a specific conversation.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = get_messages_by_conversation(conversation_id, limit=limit)

    # Add model display names
    for msg in messages:
        model_id = msg.get("model_id")
        msg["model_name"] = get_model_display_name(model_id) if model_id else None

    return {
        "conversation_id": conversation_id,
        "messages": messages,
        "total": len(messages),
    }


@router.post("/conversations/{conversation_id}/resume")
async def resume_conversation(conversation_id: int):
    """
    Resume a previous conversation session.

    Returns the session_id that can be used with the WebSocket endpoint.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    session_id = conversation.get("session_id")

    if not session_id:
        raise HTTPException(
            status_code=400,
            detail="Conversation has no session_id for resumption"
        )

    # Log the resume action
    log_activity(
        log_type="websocket",
        data={"action": "resume", "conversation_id": conversation_id},
        session_id=session_id,
        conversation_id=conversation_id,
    )

    return {
        "conversation_id": conversation_id,
        "session_id": session_id,
        "message": "Use this session_id to connect to /ws/chat/{session_id}",
    }


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: int,
    title: Optional[str] = None,
):
    """
    Update a conversation's title.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if title:
        update_conversation_title(conversation_id, title)

    return {"status": "ok", "conversation_id": conversation_id}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    """
    Delete a conversation and all its messages.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Log before deleting
    log_activity(
        log_type="api",
        data={"action": "delete_conversation", "conversation_id": conversation_id},
        severity="warning",
    )

    db_delete_conversation(conversation_id)

    return {"status": "ok", "message": f"Conversation {conversation_id} deleted"}
