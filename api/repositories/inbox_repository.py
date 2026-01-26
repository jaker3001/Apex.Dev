"""
Repository for dashboard.inbox_items table.

Manages GTD inbox for quick capture.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.second_brain import InboxItemResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.inbox")


class InboxRepository(BaseRepository[InboxItemResponse]):
    """Repository for inbox items (GTD quick capture)."""

    def __init__(self):
        super().__init__(
            table_name="inbox_items",
            schema="dashboard",
            model=InboxItemResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        include_processed: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> List[InboxItemResponse]:
        """
        Find all inbox items for a user.

        Args:
            user_id: User UUID
            include_processed: Include already processed items
            limit: Max results
            offset: Skip N results

        Returns:
            List of inbox items
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
            )

            if not include_processed:
                query = query.eq("processed", False)

            result = (
                query
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding inbox items for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_unprocessed(
        self,
        user_id: str,
        limit: int = 100,
    ) -> List[InboxItemResponse]:
        """
        Find all unprocessed inbox items.

        Args:
            user_id: User UUID
            limit: Max results

        Returns:
            List of unprocessed items
        """
        return await self.find_by_user(user_id, include_processed=False, limit=limit)

    async def count_unprocessed(self, user_id: str) -> int:
        """
        Count unprocessed inbox items.

        Args:
            user_id: User UUID

        Returns:
            Count of unprocessed items
        """
        return await self.count(filters={"user_id": user_id, "processed": False})

    async def find_by_source(
        self,
        user_id: str,
        source: str,
        include_processed: bool = False,
    ) -> List[InboxItemResponse]:
        """
        Find inbox items by source.

        Args:
            user_id: User UUID
            source: Source type (manual, voice, email, chrome_extension)
            include_processed: Include processed items

        Returns:
            List of inbox items
        """
        filters = {"user_id": user_id, "source": source}
        if not include_processed:
            filters["processed"] = False

        return await self.find_all(
            filters=filters,
            order_by="-created_at",
        )

    async def mark_processed(
        self,
        item_id: int,
        converted_to_type: Optional[str] = None,
        converted_to_id: Optional[int] = None,
    ) -> InboxItemResponse:
        """
        Mark an inbox item as processed.

        Args:
            item_id: Inbox item ID
            converted_to_type: What it was converted to (task, note, project, event)
            converted_to_id: ID of the created entity

        Returns:
            Updated inbox item
        """
        from datetime import datetime

        data = {
            "processed": True,
            "processed_at": datetime.utcnow().isoformat(),
        }

        if converted_to_type:
            data["converted_to_type"] = converted_to_type
        if converted_to_id:
            data["converted_to_id"] = converted_to_id

        return await self.update(item_id, data)

    async def convert_to_task(
        self,
        item_id: int,
        user_id: str,
        task_data: dict,
    ) -> tuple:
        """
        Convert inbox item to a task.

        Args:
            item_id: Inbox item ID
            user_id: User UUID
            task_data: Data for creating the task

        Returns:
            Tuple of (created_task, updated_inbox_item)
        """
        from api.repositories.task_repository import TaskRepository

        # Create the task
        task_repo = TaskRepository()
        task_data["user_id"] = user_id
        task = await task_repo.create(task_data)

        # Mark inbox item as processed
        inbox_item = await self.mark_processed(
            item_id,
            converted_to_type="task",
            converted_to_id=task.id,
        )

        return task, inbox_item

    async def convert_to_note(
        self,
        item_id: int,
        user_id: str,
        note_data: dict,
    ) -> tuple:
        """
        Convert inbox item to a note.

        Args:
            item_id: Inbox item ID
            user_id: User UUID
            note_data: Data for creating the note

        Returns:
            Tuple of (created_note, updated_inbox_item)
        """
        from api.repositories.note_repository_v2 import NoteRepositoryV2

        # Create the note
        note_repo = NoteRepositoryV2()
        note_data["user_id"] = user_id
        note = await note_repo.create(note_data)

        # Mark inbox item as processed
        inbox_item = await self.mark_processed(
            item_id,
            converted_to_type="note",
            converted_to_id=note.id,
        )

        return note, inbox_item

    async def bulk_delete_processed(
        self,
        user_id: str,
        older_than_days: int = 30,
    ) -> int:
        """
        Delete processed inbox items older than N days.

        Args:
            user_id: User UUID
            older_than_days: Delete items older than this many days

        Returns:
            Number of deleted items
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat()

            result = (
                self._get_table()
                .delete()
                .eq("user_id", user_id)
                .eq("processed", True)
                .lt("processed_at", cutoff)
                .execute()
            )

            return len(result.data)

        except Exception as e:
            logger.error(f"Error bulk deleting processed inbox items: {e}")
            raise handle_supabase_error(e)

    async def quick_capture(
        self,
        user_id: str,
        content: str,
        source: str = "manual",
        source_url: Optional[str] = None,
    ) -> InboxItemResponse:
        """
        Quick capture an item to inbox.

        Args:
            user_id: User UUID
            content: Item content
            source: Source type
            source_url: Optional source URL

        Returns:
            Created inbox item
        """
        data = {
            "user_id": user_id,
            "content": content,
            "source": source,
        }
        if source_url:
            data["source_url"] = source_url

        return await self.create(data)
