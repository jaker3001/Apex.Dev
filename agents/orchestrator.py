"""
Apex Assistant - Orchestrator Agent

Main agent that handles user interactions and delegates to specialized sub-agents.
Uses ClaudeSDKClient for continuous conversation with session memory.
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
    ToolUseBlock,
    ToolResultBlock,
    ResultMessage,
)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

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


class ApexOrchestrator:
    """
    Main orchestrator agent for Apex Assistant.

    Maintains a continuous conversation session with Claude, tracks tasks,
    and logs metrics to the database for automation opportunity analysis.
    """

    def __init__(
        self,
        working_directory: Optional[Path] = None,
        db_path: Optional[Path] = None,
    ):
        """
        Initialize the orchestrator.

        Args:
            working_directory: Directory for file operations (defaults to current)
            db_path: Path to SQLite database (defaults to project default)
        """
        self.working_directory = working_directory or Path.cwd()
        self.db_path = db_path
        self.client: Optional[ClaudeSDKClient] = None
        self.conversation_id: Optional[int] = None
        self.session_id: Optional[str] = None
        self.current_task_id: Optional[int] = None
        self.current_metrics: Optional[TaskMetrics] = None

        # Ensure database is initialized
        init_database(db_path)

        # Register this agent
        register_agent(
            name="orchestrator",
            description="Main Apex Assistant orchestrator agent",
            capabilities=["conversation", "file_handling", "task_delegation", "mcp_integration"],
            db_path=db_path,
        )

    def _build_options(self) -> ClaudeAgentOptions:
        """Build ClaudeAgentOptions with current configuration."""
        # Get active MCP servers from database
        mcp_servers = get_active_mcp_servers(self.db_path)

        return ClaudeAgentOptions(
            # Use Claude Code's system prompt + our custom additions
            system_prompt={
                "type": "preset",
                "preset": "claude_code",
                "append": APEX_SYSTEM_PROMPT,
            },
            # Core tools for file operations and task execution
            allowed_tools=[
                "Read",
                "Write",
                "Edit",
                "Bash",
                "Glob",
                "Grep",
                "WebSearch",
                "WebFetch",
                "Task",  # Enable sub-agents
            ],
            # MCP servers from database
            mcp_servers=mcp_servers,
            # Auto-accept file edits (can be changed to "default" for manual approval)
            permission_mode="acceptEdits",
            # Working directory
            cwd=str(self.working_directory),
        )

    async def start_session(self) -> None:
        """Start a new conversation session."""
        options = self._build_options()
        self.client = ClaudeSDKClient(options=options)
        await self.client.connect()

        # Create conversation record
        self.conversation_id = create_conversation(db_path=self.db_path)

        # Update agent usage
        update_agent_usage("orchestrator", self.db_path)

        print("Apex Assistant session started.")
        print("Type 'exit' to end the session, 'help' for commands.\n")

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

        print("\nSession ended.")

    async def send_message(self, user_input: str) -> str:
        """
        Send a message and get a response.

        Args:
            user_input: The user's message

        Returns:
            The assistant's response text
        """
        if not self.client:
            raise RuntimeError("Session not started. Call start_session() first.")

        # Start task tracking
        self.current_metrics = TaskMetrics()
        self.current_metrics.start()
        self.current_task_id = create_task(
            description=user_input[:500],  # Truncate long inputs
            conversation_id=self.conversation_id,
            input_type="text",
            db_path=self.db_path,
        )

        # Send message to Claude
        await self.client.query(user_input)

        # Collect response
        response_text = ""
        tools_used = []

        async for message in self.client.receive_response():
            # Capture session ID from init message
            if hasattr(message, 'subtype') and message.subtype == 'init':
                if hasattr(message, 'data') and 'session_id' in message.data:
                    self.session_id = message.data['session_id']
                    update_conversation(
                        self.conversation_id,
                        session_id=self.session_id,
                        db_path=self.db_path,
                    )

            # Process assistant messages
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        response_text += block.text
                    elif isinstance(block, ToolUseBlock):
                        tools_used.append(block.name)
                        self.current_metrics.record_tool(block.name)
                        self.current_metrics.add_step(f"Used {block.name}")

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

        return response_text

    async def run_interactive(self) -> None:
        """Run an interactive conversation loop."""
        await self.start_session()

        try:
            while True:
                try:
                    # Get user input
                    user_input = input("\nYou: ").strip()

                    if not user_input:
                        continue

                    # Handle special commands
                    if user_input.lower() == "exit":
                        break
                    elif user_input.lower() == "help":
                        self._print_help()
                        continue

                    # Send message and print response
                    print("\nAssistant: ", end="", flush=True)
                    response = await self.send_message(user_input)
                    print(response)

                except KeyboardInterrupt:
                    print("\n\nInterrupted. Type 'exit' to quit.")
                    continue

        finally:
            await self.end_session()

    def _print_help(self) -> None:
        """Print help information."""
        print("""
Apex Assistant Commands:
------------------------
exit    - End the session
help    - Show this help message

You can ask me to:
- Review or create estimates
- Draft line item justifications
- Write emails to adjusters
- Process documents and images
- Research industry standards
- Help with general business tasks

All tasks are logged for analysis and potential automation.
""")


async def main():
    """Entry point for running the orchestrator directly."""
    orchestrator = ApexOrchestrator()
    await orchestrator.run_interactive()


if __name__ == "__main__":
    asyncio.run(main())
