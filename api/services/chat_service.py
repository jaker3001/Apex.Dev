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
    get_conversation,
    get_messages_by_conversation,
    create_task,
    update_task,
    register_agent,
    update_agent_usage,
    get_chat_project,
    get_project_by_job_number,
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
        self.current_model: Optional[str] = None  # Track current model for mid-conversation switching
        self.chat_project_id: Optional[int] = None  # Linked Chat Mode project
        self._cancel_requested: bool = False  # Flag for stream cancellation

        # Ensure database is initialized
        init_database(db_path)

    def _build_options(self, project_context: Optional[str] = None) -> ClaudeAgentOptions:
        """Build ClaudeAgentOptions with current configuration.

        Args:
            project_context: Optional additional context from Chat Mode project
        """
        mcp_servers = get_active_mcp_servers(self.db_path)

        # Build system prompt with optional project context
        append_prompt = APEX_SYSTEM_PROMPT
        if project_context:
            append_prompt = f"{project_context}\n\n{APEX_SYSTEM_PROMPT}"

        return ClaudeAgentOptions(
            system_prompt={
                "type": "preset",
                "preset": "claude_code",
                "append": append_prompt,
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

    def _build_project_context(self, project_id: int) -> Optional[str]:
        """Build context string from a Chat Mode project.

        Args:
            project_id: ID of the chat project

        Returns:
            Context string to inject into system prompt, or None
        """
        project = get_chat_project(project_id, self.db_path)
        if not project:
            return None

        context_parts = []
        context_parts.append(f"=== CHAT MODE PROJECT: {project.get('name')} ===")

        if project.get("description"):
            context_parts.append(f"Description: {project.get('description')}")

        if project.get("instructions"):
            context_parts.append(f"\n**Custom Instructions:**\n{project.get('instructions')}")

        # If linked to a job, pull in job context
        linked_job = project.get("linked_job_number")
        if linked_job:
            job = get_project_by_job_number(linked_job)
            if job:
                context_parts.append(f"\n**Linked Job: {linked_job}**")
                context_parts.append(f"- Client: {job.get('client_name', 'Unknown')}")
                context_parts.append(f"- Status: {job.get('status', 'Unknown')}")
                context_parts.append(f"- Type: {job.get('loss_type', 'Unknown')}")
                if job.get("property_address"):
                    context_parts.append(f"- Property: {job.get('property_address')}")
                if job.get("description"):
                    context_parts.append(f"- Description: {job.get('description')}")

                context_parts.append("\nYou have access to query the apex_operations.db database for more details about this job if needed.")

        return "\n".join(context_parts)

    async def start_session(self, chat_project_id: Optional[int] = None, user_id: Optional[int] = None) -> None:
        """Start a new chat session.

        Args:
            chat_project_id: Optional Chat Mode project ID for context injection
            user_id: Optional user ID for conversation ownership
        """
        self.user_id = user_id
        # Build project context if a project is linked
        project_context = None
        if chat_project_id:
            self.chat_project_id = chat_project_id
            project_context = self._build_project_context(chat_project_id)

        options = self._build_options(project_context=project_context)
        self.client = ClaudeSDKClient(options=options)
        await self.client.connect()

        # Create conversation record with project link
        self.conversation_id = create_conversation(
            session_id=self.session_id,
            user_id=self.user_id,
            db_path=self.db_path,
        )

        # Link conversation to project if specified
        if chat_project_id:
            update_conversation(
                self.conversation_id,
                chat_project_id=chat_project_id,
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

    async def resume_session(self, conversation_id: int) -> None:
        """Resume an existing chat session.

        Args:
            conversation_id: ID of the conversation to resume
        """
        # Verify conversation exists
        conversation = get_conversation(conversation_id, self.db_path)
        if not conversation:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Load project context if conversation is linked to a project
        project_context = None
        chat_project_id = conversation.get("chat_project_id")
        if chat_project_id:
            self.chat_project_id = chat_project_id
            project_context = self._build_project_context(chat_project_id)

        options = self._build_options(project_context=project_context)
        self.client = ClaudeSDKClient(options=options)
        await self.client.connect()

        # Use existing conversation
        self.conversation_id = conversation_id

        # Update session_id in conversation record
        update_conversation(
            conversation_id,
            session_id=self.session_id,
            is_active=1,
            db_path=self.db_path,
        )

        # Load previous messages and inject as context
        messages = get_messages_by_conversation(conversation_id, limit=10, db_path=self.db_path)
        if messages:
            # Build conversation context for Claude
            context_parts = ["[Resuming conversation - Previous messages for context:]"]
            for msg in messages:
                role = msg.get("role", "unknown").capitalize()
                content = msg.get("content", "")
                if content:
                    # Truncate very long messages
                    if len(content) > 500:
                        content = content[:500] + "..."
                    context_parts.append(f"{role}: {content}")
            context_parts.append("[End of previous context - Continue the conversation]")

            # Inject context as a system message
            context_message = "\n\n".join(context_parts)
            await self.client.query(context_message)
            # Consume the response silently (don't yield to user)
            async for _ in self.client.receive_response():
                pass

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

    def cancel_stream(self) -> None:
        """Request cancellation of the current streaming response."""
        self._cancel_requested = True

    async def send_message_streaming(
        self,
        user_input: str,
        model: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Send a message and yield streaming events.

        Args:
            user_input: The user's message
            model: Optional model ID to use for this message (supports mid-conversation switching)

        Yields:
            Events dict with type and data for WebSocket delivery:
            - {"type": "text_delta", "content": "..."}
            - {"type": "tool_use", "tool": {"name": "...", "input": {...}, "status": "running"}}
            - {"type": "tool_result", "tool": {"name": "...", "output": ..., "status": "completed"}}
            - {"type": "cancelled"} when stream is cancelled

        Note: Model switching is handled by the Claude SDK. The model parameter allows
        the frontend to request a specific model for each message.
        """
        if not self.client:
            raise RuntimeError("Session not started. Call start_session() first.")

        # Reset cancellation flag at start of new message
        self._cancel_requested = False

        # Start task tracking
        self.current_metrics = TaskMetrics()
        self.current_metrics.start()
        self.current_task_id = create_task(
            description=user_input[:500],
            conversation_id=self.conversation_id,
            input_type="text",
            db_path=self.db_path,
        )

        # Switch model if requested and different from current
        if model and model != self.current_model:
            await self.client.set_model(model)
            self.current_model = model

        # Send message to Claude
        await self.client.query(user_input)

        # Track response for database
        response_text = ""
        tools_used = []
        current_tool_id = None
        # Map tool IDs to their names for reliable correlation
        tool_id_to_name: dict[str, str] = {}

        cancelled = False
        try:
            async for message in self.client.receive_response():
                # Check for cancellation request
                if self._cancel_requested:
                    cancelled = True
                    yield {"type": "cancelled"}
                    break

                # Process assistant messages
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        # Check again after each block
                        if self._cancel_requested:
                            cancelled = True
                            yield {"type": "cancelled"}
                            break

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

                    if cancelled:
                        break

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
        finally:
            # If cancelled, update task status
            if cancelled and self.current_task_id:
                self.current_metrics.complete(success=False)
                update_task(
                    self.current_task_id,
                    status="failed",
                    outcome="Cancelled by user",
                    db_path=self.db_path,
                )

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
