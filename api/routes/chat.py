"""
Apex Assistant - Chat Routes

WebSocket endpoint for real-time chat with streaming responses.
"""

import asyncio
import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import JSONResponse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.services.chat_service import ChatService
from api.schemas.chat import ChatMessage, StreamEvent
from database import create_message, log_activity

router = APIRouter()

# Model ID to display name mapping
MODEL_DISPLAY_NAMES = {
    "claude-sonnet-4-20250514": "Sonnet 4",
    "claude-opus-4-20250514": "Opus 4",
    "claude-3-5-sonnet-20241022": "Sonnet 3.5",
    "claude-3-5-haiku-20241022": "Haiku 3.5",
}


def get_model_display_name(model_id: str) -> str:
    """Get the display name for a model ID."""
    return MODEL_DISPLAY_NAMES.get(model_id, model_id)

# Store active WebSocket connections
class ConnectionManager:
    """Manages WebSocket connections for chat sessions."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.chat_services: dict[str, ChatService] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # Create a new chat service for this session
        if session_id not in self.chat_services:
            service = ChatService()
            await service.start_session()
            self.chat_services[session_id] = service

    def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_event(self, session_id: str, event: dict):
        """Send an event to a specific session."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(event)

    def get_service(self, session_id: str) -> Optional[ChatService]:
        """Get the chat service for a session."""
        return self.chat_services.get(session_id)

    async def close_session(self, session_id: str):
        """Close a chat session and cleanup."""
        if session_id in self.chat_services:
            await self.chat_services[session_id].end_session()
            del self.chat_services[session_id]


manager = ConnectionManager()


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat.

    Protocol:
    - Client sends: {"type": "message", "content": "...", "model": "...", "files": [...]}
    - Server sends:
        - {"type": "init", "session_id": "...", "conversation_id": ...}
        - {"type": "stream_start", "model": "...", "model_name": "..."}
        - {"type": "text_delta", "content": "..."}
        - {"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}
        - {"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}
        - {"type": "stream_end", "task_id": ..., "message_id": ...}
        - {"type": "error", "message": "..."}
    """
    await manager.connect(websocket, session_id)

    # Log connection
    log_activity(
        log_type="websocket",
        data={"action": "connect", "session_id": session_id},
        session_id=session_id,
    )

    try:
        # Send init event with session info
        service = manager.get_service(session_id)
        await manager.send_event(session_id, {
            "type": "init",
            "session_id": session_id,
            "conversation_id": service.conversation_id if service else None,
        })

        # Track current model and previous model for switch detection
        current_model = "claude-sonnet-4-5-20250514"  # Default model
        previous_model = None

        while True:
            # Receive message from client
            data = await websocket.receive_json()

            if data.get("type") == "message":
                content = data.get("content", "")
                model_id = data.get("model", current_model)

                if not content.strip():
                    continue

                # Get the chat service
                service = manager.get_service(session_id)
                if not service:
                    await manager.send_event(session_id, {
                        "type": "error",
                        "message": "Session not initialized",
                    })
                    continue

                # Detect model switch
                if previous_model and model_id != previous_model:
                    log_activity(
                        log_type="model",
                        data={
                            "action": "switch",
                            "from_model": previous_model,
                            "to_model": model_id,
                        },
                        session_id=session_id,
                        conversation_id=service.conversation_id,
                    )
                    # Send model switch event to frontend
                    await manager.send_event(session_id, {
                        "type": "model_switch",
                        "from_model": previous_model,
                        "from_model_name": get_model_display_name(previous_model),
                        "to_model": model_id,
                        "to_model_name": get_model_display_name(model_id),
                    })

                current_model = model_id
                previous_model = model_id

                # Save user message to database
                user_message_id = create_message(
                    conversation_id=service.conversation_id,
                    role="user",
                    content=content,
                )

                # Send stream start with model info
                model_name = get_model_display_name(model_id)
                await manager.send_event(session_id, {
                    "type": "stream_start",
                    "model": model_id,
                    "model_name": model_name,
                })

                # Track response for saving
                response_content = ""
                tools_used = []

                try:
                    # Stream the response
                    async for event in service.send_message_streaming(content, model=model_id):
                        await manager.send_event(session_id, event)

                        # Collect response content
                        if event.get("type") == "text_delta":
                            response_content += event.get("content", "")
                        elif event.get("type") == "tool_use":
                            tools_used.append(event.get("tool", {}))

                    # Save assistant message to database
                    assistant_message_id = create_message(
                        conversation_id=service.conversation_id,
                        role="assistant",
                        content=response_content,
                        model_id=model_id,
                        model_name=model_name,
                        tools_used=tools_used if tools_used else None,
                    )

                    # Send stream end with message ID
                    await manager.send_event(session_id, {
                        "type": "stream_end",
                        "task_id": service.current_task_id,
                        "message_id": assistant_message_id,
                        "model": model_id,
                        "model_name": model_name,
                    })

                except Exception as e:
                    log_activity(
                        log_type="error",
                        data={"error": str(e), "content": content[:200]},
                        session_id=session_id,
                        conversation_id=service.conversation_id,
                        severity="error",
                    )
                    await manager.send_event(session_id, {
                        "type": "error",
                        "message": str(e),
                    })

            elif data.get("type") == "cancel":
                # TODO: Implement cancellation
                pass

    except WebSocketDisconnect:
        log_activity(
            log_type="websocket",
            data={"action": "disconnect", "session_id": session_id},
            session_id=session_id,
        )
        manager.disconnect(session_id)
    except Exception as e:
        log_activity(
            log_type="error",
            data={"error": str(e)},
            session_id=session_id,
            severity="error",
        )
        await manager.send_event(session_id, {
            "type": "error",
            "message": str(e),
        })
        manager.disconnect(session_id)


@router.post("/chat/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    """
    Upload a file for use in chat.

    Returns the file path that can be referenced in subsequent messages.
    """
    # TODO: Implement file upload handling
    # For now, save to a temp directory and return the path
    return JSONResponse({
        "status": "ok",
        "filename": file.filename,
        "message": "File upload not yet implemented",
    })
