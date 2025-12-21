"""
Repository for dashboard.conversations table.

Manages AI chat conversation metadata.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from pydantic import BaseModel
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.conversation")


class ConversationResponse(BaseModel):
    """Response model for conversations."""
    id: int
    user_id: str
    session_id: str
    title: Optional[str] = None
    is_active: bool = True
    chat_project_id: Optional[int] = None
    message_count: int = 0
    last_model_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationRepository(BaseRepository[ConversationResponse]):
    """Repository for AI conversations."""

    def __init__(self):
        super().__init__(
            table_name="conversations",
            schema="dashboard",
            model=ConversationResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        is_active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ConversationResponse]:
        """
        Find conversations for a specific user.

        Args:
            user_id: User UUID
            is_active: Filter by active status
            limit: Max results
            offset: Skip N results

        Returns:
            List of conversations
        """
        filters = {"user_id": user_id}

        if is_active is not None:
            filters["is_active"] = is_active

        return await self.find_all(
            filters=filters,
            order_by="-updated_at",
            limit=limit,
            offset=offset,
        )

    async def find_by_session_id(self, session_id: str) -> Optional[ConversationResponse]:
        """
        Find conversation by session ID.

        Args:
            session_id: Session UUID

        Returns:
            Conversation if found, None otherwise
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("session_id", session_id)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding conversation by session: {e}")
            raise handle_supabase_error(e)

    async def find_by_project(
        self,
        user_id: str,
        chat_project_id: int,
    ) -> List[ConversationResponse]:
        """
        Find conversations linked to a specific chat project.

        Args:
            user_id: User UUID
            chat_project_id: Chat project ID

        Returns:
            List of conversations
        """
        return await self.find_all(
            filters={"user_id": user_id, "chat_project_id": chat_project_id},
            order_by="-updated_at",
        )

    async def find_active(self, user_id: str) -> List[ConversationResponse]:
        """
        Find active conversations for a user.

        Args:
            user_id: User UUID

        Returns:
            List of active conversations
        """
        return await self.find_by_user(user_id, is_active=True)

    async def increment_message_count(
        self,
        conversation_id: int,
    ) -> ConversationResponse:
        """
        Increment message count for a conversation.

        Args:
            conversation_id: Conversation ID

        Returns:
            Updated conversation
        """
        try:
            # Get current count
            conversation = await self.find_by_id(conversation_id)
            if not conversation:
                from api.services.supabase_errors import ResourceNotFoundError
                raise ResourceNotFoundError("Conversation", conversation_id)

            new_count = conversation.message_count + 1

            return await self.update(
                conversation_id,
                {"message_count": new_count}
            )

        except Exception as e:
            logger.error(f"Error incrementing message count: {e}")
            raise handle_supabase_error(e)
