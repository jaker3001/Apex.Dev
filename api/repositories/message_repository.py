"""
Repository for dashboard.messages table.

Manages AI chat messages within conversations.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from pydantic import BaseModel
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.message")


class MessageResponse(BaseModel):
    """Response model for messages."""
    id: int
    conversation_id: int
    role: str  # 'user' or 'assistant'
    content: str
    model_id: Optional[str] = None
    model_name: Optional[str] = None
    tools_used: Optional[List[str]] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class MessageRepository(BaseRepository[MessageResponse]):
    """Repository for AI messages."""

    def __init__(self):
        super().__init__(
            table_name="messages",
            schema="dashboard",
            model=MessageResponse,
        )

    async def find_by_conversation(
        self,
        conversation_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> List[MessageResponse]:
        """
        Find messages for a specific conversation.

        Args:
            conversation_id: Conversation ID
            limit: Max results
            offset: Skip N results

        Returns:
            List of messages ordered by creation time
        """
        return await self.find_all(
            filters={"conversation_id": conversation_id},
            order_by="created_at",
            limit=limit,
            offset=offset,
        )

    async def find_recent_by_conversation(
        self,
        conversation_id: int,
        limit: int = 10,
    ) -> List[MessageResponse]:
        """
        Find recent messages for conversation resumption.

        Args:
            conversation_id: Conversation ID
            limit: Number of recent messages

        Returns:
            List of most recent messages
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            # Reverse to get chronological order
            messages = [self.model(**item) for item in reversed(result.data)]
            return messages

        except Exception as e:
            logger.error(f"Error finding recent messages: {e}")
            raise handle_supabase_error(e)

    async def count_by_conversation(self, conversation_id: int) -> int:
        """
        Count messages in a conversation.

        Args:
            conversation_id: Conversation ID

        Returns:
            Message count
        """
        return await self.count(filters={"conversation_id": conversation_id})

    async def create_user_message(
        self,
        conversation_id: int,
        content: str,
    ) -> MessageResponse:
        """
        Create a user message.

        Args:
            conversation_id: Conversation ID
            content: Message content

        Returns:
            Created message
        """
        return await self.create({
            "conversation_id": conversation_id,
            "role": "user",
            "content": content,
        })

    async def create_assistant_message(
        self,
        conversation_id: int,
        content: str,
        model_id: Optional[str] = None,
        model_name: Optional[str] = None,
        tools_used: Optional[List[str]] = None,
    ) -> MessageResponse:
        """
        Create an assistant message.

        Args:
            conversation_id: Conversation ID
            content: Message content
            model_id: Model identifier
            model_name: Model name
            tools_used: List of tools used

        Returns:
            Created message
        """
        return await self.create({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": content,
            "model_id": model_id,
            "model_name": model_name,
            "tools_used": tools_used,
        })
