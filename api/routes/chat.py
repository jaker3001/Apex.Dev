"""
Apex Assistant - Chat Routes

WebSocket endpoint for real-time chat with streaming responses.
"""

import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.responses import JSONResponse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger("apex_assistant.chat")

from api.services.chat_service import ChatService
from api.services.title_service import generate_conversation_title
from api.services.file_service import get_file_service, UploadedFile
from api.schemas.chat import ChatMessage, StreamEvent
from database import create_message, log_activity, get_messages_by_conversation, get_conversation, update_conversation_title

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

# Store active WebSocket connections
class ConnectionManager:
    """Manages WebSocket connections for chat sessions."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.chat_services: dict[str, ChatService] = {}

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str,
        conversation_id: Optional[int] = None,
        chat_project_id: Optional[int] = None,
    ):
        """Accept a new WebSocket connection, optionally resuming a conversation or with project context."""
        await websocket.accept()
        self.active_connections[session_id] = websocket

        # Create a new chat service for this session
        if session_id not in self.chat_services:
            service = ChatService()
            try:
                if conversation_id:
                    # Resume existing conversation (project context loaded from conversation)
                    await service.resume_session(conversation_id)
                else:
                    # Start new session with optional project context
                    await service.start_session(chat_project_id=chat_project_id)
                self.chat_services[session_id] = service
            except Exception as e:
                logger.error(f"Failed to start session for {session_id}: {e}", exc_info=True)
                # Send error to client and close
                await websocket.send_json({
                    "type": "error",
                    "message": f"Failed to start chat session: {str(e)}"
                })
                await websocket.close()
                raise

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


async def _generate_and_send_title(
    session_id: str,
    conversation_id: int,
    user_message: str,
    assistant_response: str,
    manager: ConnectionManager,
) -> None:
    """Generate a title for the conversation and send it to the client."""
    try:
        title = await generate_conversation_title(user_message, assistant_response)
        if title:
            # Update database
            update_conversation_title(conversation_id, title)

            # Send to client
            await manager.send_event(session_id, {
                "type": "title_update",
                "conversation_id": conversation_id,
                "title": title,
            })

            log_activity(
                log_type="chat",
                data={"action": "title_generated", "title": title},
                session_id=session_id,
                conversation_id=conversation_id,
            )
    except Exception as e:
        log_activity(
            log_type="error",
            data={"action": "title_generation_failed", "error": str(e)},
            session_id=session_id,
            conversation_id=conversation_id,
            severity="warning",
        )


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    conversation_id: Optional[int] = None,
    chat_project_id: Optional[int] = None,
):
    """
    WebSocket endpoint for real-time chat.

    Query Parameters:
    - conversation_id: Optional ID of conversation to resume
    - chat_project_id: Optional Chat Mode project ID for context injection

    Protocol:
    - Client sends: {"type": "message", "content": "...", "model": "...", "files": [...]}
    - Server sends:
        - {"type": "init", "session_id": "...", "conversation_id": ..., "history": [...], "chatProjectId": ...}
        - {"type": "stream_start", "model": "...", "model_name": "..."}
        - {"type": "text_delta", "content": "..."}
        - {"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}
        - {"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}
        - {"type": "stream_end", "task_id": ..., "message_id": ...}
        - {"type": "error", "message": "..."}
    """
    await manager.connect(websocket, session_id, conversation_id=conversation_id, chat_project_id=chat_project_id)

    # Log connection
    log_activity(
        log_type="websocket",
        data={"action": "connect", "session_id": session_id},
        session_id=session_id,
    )

    try:
        # Send init event with session info and history (if resuming)
        service = manager.get_service(session_id)
        init_event = {
            "type": "init",
            "session_id": session_id,
            "conversation_id": service.conversation_id if service else None,
            "resumed": conversation_id is not None,
            "chatProjectId": service.chat_project_id if service else None,
        }

        # If resuming, include last 10 messages for context
        if conversation_id and service and service.conversation_id:
            messages = get_messages_by_conversation(service.conversation_id, limit=10)
            # Transform messages for frontend (camelCase + format)
            history = []
            for msg in messages:
                history.append({
                    "id": msg.get("id"),
                    "role": msg.get("role"),
                    "content": msg.get("content"),
                    "model": msg.get("model_id"),
                    "modelName": get_model_display_name(msg.get("model_id")) if msg.get("model_id") else None,
                    "toolsUsed": msg.get("tools_used"),
                    "timestamp": msg.get("timestamp"),
                })
            init_event["history"] = history

        await manager.send_event(session_id, init_event)

        # Track current model and previous model for switch detection
        current_model = "claude-sonnet-4-5"  # Default model (SDK naming)
        previous_model = None
        is_first_exchange = not (conversation_id is not None)  # True if new conversation

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

                    # Generate title after first successful exchange
                    if is_first_exchange and response_content and service.conversation_id:
                        is_first_exchange = False  # Only do this once
                        # Generate title asynchronously (don't block the main loop)
                        asyncio.create_task(
                            _generate_and_send_title(
                                session_id=session_id,
                                conversation_id=service.conversation_id,
                                user_message=content,
                                assistant_response=response_content,
                                manager=manager,
                            )
                        )

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
                # Request stream cancellation
                service = manager.get_service(session_id)
                if service:
                    service.cancel_stream()
                    log_activity(
                        log_type="chat",
                        data={"action": "cancel_stream"},
                        session_id=session_id,
                        conversation_id=service.conversation_id,
                    )

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

    Supports:
    - Text files: .txt, .py, .js, .ts, .json, .md, .csv, etc.
    - Images: .png, .jpg, .jpeg, .gif, .webp
    - PDFs: .pdf

    Returns file metadata and extracted content (for text/PDF).
    """
    if not file.filename:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "No filename provided"},
        )

    try:
        # Read file content
        content = await file.read()

        # Get file service and save
        file_service = get_file_service()
        uploaded = await file_service.save_upload(
            filename=file.filename,
            content=content,
            session_id=session_id,
        )

        # Log the upload
        log_activity(
            log_type="file",
            data={
                "action": "upload",
                "file_id": uploaded.id,
                "filename": uploaded.original_name,
                "file_type": uploaded.file_type,
                "size": uploaded.size,
            },
            session_id=session_id,
        )

        # Return file info for frontend
        response_data = {
            "status": "ok",
            "file": {
                "id": uploaded.id,
                "name": uploaded.original_name,
                "type": uploaded.file_type,
                "mime_type": uploaded.mime_type,
                "size": uploaded.size,
                "has_text": uploaded.extracted_text is not None,
            },
        }

        # Include text preview for text/PDF files
        if uploaded.extracted_text:
            preview = uploaded.extracted_text[:500]
            if len(uploaded.extracted_text) > 500:
                preview += "..."
            response_data["file"]["text_preview"] = preview

        # Include image metadata
        if uploaded.metadata:
            response_data["file"]["metadata"] = uploaded.metadata

        return JSONResponse(content=response_data)

    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(e)},
        )
    except Exception as e:
        log_activity(
            log_type="error",
            data={"action": "upload_failed", "error": str(e)},
            session_id=session_id,
            severity="error",
        )
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "File upload failed"},
        )


@router.get("/chat/files/{session_id}/{file_id}")
async def get_file_info(session_id: str, file_id: str):
    """
    Get information about an uploaded file.
    """
    file_service = get_file_service()
    file_path = file_service.get_file(file_id, session_id)

    if not file_path:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "File not found"},
        )

    return JSONResponse(content={
        "status": "ok",
        "file_id": file_id,
        "path": str(file_path),
        "exists": file_path.exists(),
    })


@router.delete("/chat/files/{session_id}/{file_id}")
async def delete_uploaded_file(session_id: str, file_id: str):
    """
    Delete an uploaded file.
    """
    file_service = get_file_service()
    deleted = file_service.delete_file(file_id, session_id)

    if not deleted:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "File not found"},
        )

    log_activity(
        log_type="file",
        data={"action": "delete", "file_id": file_id},
        session_id=session_id,
    )

    return JSONResponse(content={"status": "ok", "deleted": True})
