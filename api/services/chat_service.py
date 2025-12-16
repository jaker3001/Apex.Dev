"""
Apex Assistant - Chat Service

Wraps the ApexOrchestrator for API usage with streaming support.
"""

import asyncio
import uuid
from typing import AsyncGenerator, Optional
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
)

from config import APEX_SYSTEM_PROMPT
from database import (
    init_database,
    create_conversation,
    update_conversation,
    create_task,
    update_task,
    register_agent,
    update_agent_usage,
)
from mcp_manager import get_active_mcp_servers
from utils import TaskMetrics


class ChatService:
    """
    Chat service for API usage.

    Provides streaming responses suitable for WebSocket delivery.
    """

    def __init__(
        self,
        working_directory: Optional[Path] = None,
        db_path: Optional[Path] = None,
    ):
        """
        Initialize the chat service.

        Args:
            working_directory: Directory for file operations
            db_path: Path to SQLite database
        """
        self.working_directory = working_directory or Path.cwd()
        self.db_path = db_path
        self.client: Optional[ClaudeSDKClient] = None
        self.conversation_id: Optional[int] = None
        self.session_id: str = str(uuid.uuid4())
        self.current_task_id: Optional[int] = None
        self.current_metrics: Optional[TaskMetrics] = None

        # Ensure database is initialized
        init_database(db_path)

    def _build_options(self) -> ClaudeAgentOptions:
        """Build ClaudeAgentOptions with current configuration."""
        mcp_servers = get_active_mcp_servers(self.db_path)

        return ClaudeAgentOptions(
            system_prompt={
                "type": "preset",
                "preset": "claude_code",
                "append": APEX_SYSTEM_PROMPT,
            },
            allowed_tools=[
                "Read",
                "Write",
                "Edit",
                "Bash",
                "Glob",
                "Grep",
                "WebSearch",
                "WebFetch",
                "Task",
            ],
            mcp_servers=mcp_servers,
            permission_mode="acceptEdits",
            cwd=str(self.working_directory),
        )

    async def start_session(self) -> None:
        """Start a new chat session."""
        options = self._build_options()
        self.client = ClaudeSDKClient(options=options)
        await self.client.connect()

        # Create conversation record
        self.conversation_id = create_conversation(
            session_id=self.session_id,
            db_path=self.db_path,
        )

        # Register/update agent usage
        register_agent(
            name="orchestrator",
            description="Main Apex Assistant orchestrator agent",
            capabilities=["conversation", "file_handling", "task_delegation", "mcp_integration"],
            db_path=self.db_path,
        )
        update_agent_usage("orchestrator", self.db_path)

    async def end_session(self) -> None:
        """End the current session."""
        if self.client:
            await self.client.disconnect()
            self.client = None

        if self.conversation_id:
            update_conversation(
                self.conversation_id,
                is_active=0,
                db_path=self.db_path,
            )

    async def send_message_streaming(
        self,
        user_input: str,
    ) -> AsyncGenerator[dict, None]:
        """
        Send a message and yield streaming events.

        Args:
            user_input: The user's message

        Yields:
            Events dict with type and data for WebSocket delivery:
            - {"type": "text_delta", "content": "..."}
            - {"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}
            - {"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}
        """
        if not self.client:
            raise RuntimeError("Session not started. Call start_session() first.")

        # Start task tracking
        self.current_metrics = TaskMetrics()
        self.current_metrics.start()
        self.current_task_id = create_task(
            description=user_input[:500],
            conversation_id=self.conversation_id,
            input_type="text",
            db_path=self.db_path,
        )

        # Send message to Claude
        await self.client.query(user_input)

        # Track response for database
        response_text = ""
        tools_used = []
        current_tool_id = None
        # Map tool IDs to their names for reliable correlation
        tool_id_to_name: dict[str, str] = {}

        try:
            async for message in self.client.receive_response():
                # Process assistant messages
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            response_text += block.text
                            yield {
                                "type": "text_delta",
                                "content": block.text,
                            }

                        elif isinstance(block, ToolUseBlock):
                            tools_used.append(block.name)
                            self.current_metrics.record_tool(block.name)
                            self.current_metrics.add_step(f"Used {block.name}")
                            current_tool_id = block.id if hasattr(block, 'id') else block.name
                            # Store mapping for reliable tool result correlation
                            tool_id_to_name[current_tool_id] = block.name

                            yield {
                                "type": "tool_use",
                                "tool": {
                                    "id": current_tool_id,
                                    "name": block.name,
                                    "input": block.input if hasattr(block, 'input') else {},
                                    "status": "running",
                                },
                            }

                        elif isinstance(block, ToolResultBlock):
                            # Use tool_use_id to properly correlate with the original tool_use event
                            result_tool_id = block.tool_use_id if hasattr(block, 'tool_use_id') else current_tool_id
                            # Look up the tool name from our mapping
                            result_tool_name = tool_id_to_name.get(result_tool_id, "unknown")
                            yield {
                                "type": "tool_result",
                                "tool": {
                                    "id": result_tool_id,
                                    "name": result_tool_name,
                                    "output": block.content if hasattr(block, 'content') else str(block),
                                    "status": "completed",
                                },
                            }

                # Handle final result
                if isinstance(message, ResultMessage):
                    self.current_metrics.complete(success=not message.is_error)

                    # Update task with metrics
                    update_task(
                        self.current_task_id,
                        status="completed" if not message.is_error else "failed",
                        outcome=response_text[:1000] if response_text else None,
                        agent_used="orchestrator",
                        **self.current_metrics.to_dict(),
                        db_path=self.db_path,
                    )

        except Exception as e:
            # Update task as failed on error
            if self.current_task_id:
                update_task(
                    self.current_task_id,
                    status="failed",
                    outcome=str(e),
                    db_path=self.db_path,
                )
            raise

    async def send_message(self, user_input: str) -> str:
        """
        Send a message and return the full response.

        Non-streaming version for simple use cases.
        """
        full_response = ""
        async for event in self.send_message_streaming(user_input):
            if event["type"] == "text_delta":
                full_response += event["content"]
        return full_response
