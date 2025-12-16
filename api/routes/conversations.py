"""
Apex Assistant - Conversation Routes

REST endpoints for managing conversation history.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import get_conversation, get_connection
from api.schemas.chat import ConversationResponse, ConversationListResponse

router = APIRouter()


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    active_only: bool = Query(default=False),
):
    """
    List all conversations with pagination.

    Args:
        limit: Maximum number of conversations to return
        offset: Number of conversations to skip
        active_only: If true, only return active conversations
    """
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM conversations"
    params = []

    if active_only:
        query += " WHERE is_active = 1"

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    # Get total count
    count_query = "SELECT COUNT(*) FROM conversations"
    if active_only:
        count_query += " WHERE is_active = 1"
    cursor.execute(count_query)
    total = cursor.fetchone()[0]

    conn.close()

    conversations = [dict(row) for row in rows]

    return {
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation_detail(conversation_id: int):
    """
    Get a specific conversation by ID.
    """
    conversation = get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get associated tasks
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM tasks WHERE conversation_id = ? ORDER BY timestamp",
        (conversation_id,)
    )
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {
        **conversation,
        "tasks": tasks,
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

    return {
        "conversation_id": conversation_id,
        "session_id": session_id,
        "message": "Use this session_id to connect to /ws/chat/{session_id}",
    }
