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

router = APIRouter()

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
    - Client sends: {"type": "message", "content": "...", "files": [...]}
    - Server sends:
        - {"type": "init", "session_id": "...", "conversation_id": ...}
        - {"type": "stream_start"}
        - {"type": "text_delta", "content": "..."}
        - {"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}
        - {"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}
        - {"type": "stream_end", "task_id": ...}
        - {"type": "error", "message": "..."}
    """
    await manager.connect(websocket, session_id)

    try:
        # Send init event with session info
        service = manager.get_service(session_id)
        await manager.send_event(session_id, {
            "type": "init",
            "session_id": session_id,
            "conversation_id": service.conversation_id if service else None,
        })

        while True:
            # Receive message from client
            data = await websocket.receive_json()

            if data.get("type") == "message":
                content = data.get("content", "")

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

                # Send stream start
                await manager.send_event(session_id, {"type": "stream_start"})

                try:
                    # Stream the response
                    async for event in service.send_message_streaming(content):
                        await manager.send_event(session_id, event)

                    # Send stream end
                    await manager.send_event(session_id, {
                        "type": "stream_end",
                        "task_id": service.current_task_id,
                    })

                except Exception as e:
                    await manager.send_event(session_id, {
                        "type": "error",
                        "message": str(e),
                    })

            elif data.get("type") == "cancel":
                # TODO: Implement cancellation
                pass

    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
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
