"""
Repository for dashboard.notes table (PKM - Personal Knowledge Management).

Manages user notes with tags and linking.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.pkm import NoteResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.note")


class NoteRepository(BaseRepository[NoteResponse]):
    """Repository for PKM notes."""

    def __init__(self):
        super().__init__(
            table_name="notes",
            schema="dashboard",
            model=NoteResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[NoteResponse]:
        """
        Find notes for a specific user.

        Args:
            user_id: User UUID
            limit: Max results
            offset: Skip N results

        Returns:
            List of notes
        """
        return await self.find_all(
            filters={"user_id": user_id},
            order_by="-updated_at",
            limit=limit,
            offset=offset,
        )

    async def find_by_job(
        self,
        user_id: str,
        job_id: int,
    ) -> List[NoteResponse]:
        """
        Find notes linked to a specific job.

        Args:
            user_id: User UUID
            job_id: Job ID from business.jobs

        Returns:
            List of notes
        """
        return await self.find_all(
            filters={"user_id": user_id, "job_id": job_id},
            order_by="-created_at",
        )

    async def search_notes(
        self,
        user_id: str,
        search_term: str,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Search notes by title or content.

        Args:
            user_id: User UUID
            search_term: Search string
            limit: Max results

        Returns:
            List of matching notes
        """
        try:
            # Use full-text search if available, otherwise use ilike
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .or_(f"title.ilike.%{search_term}%,content.ilike.%{search_term}%")
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching notes: {e}")
            raise handle_supabase_error(e)

    async def find_recent(
        self,
        user_id: str,
        days: int = 7,
        limit: int = 20,
    ) -> List[NoteResponse]:
        """
        Find recently updated notes.

        Args:
            user_id: User UUID
            days: Number of days to look back
            limit: Max results

        Returns:
            List of recent notes
        """
        from datetime import datetime, timedelta

        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .gte("updated_at", cutoff_date)
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding recent notes: {e}")
            raise handle_supabase_error(e)

    async def find_by_tags(
        self,
        user_id: str,
        tags: List[str],
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Find notes with specific tags.

        Args:
            user_id: User UUID
            tags: List of tag names
            limit: Max results

        Returns:
            List of notes matching tags
        """
        try:
            # This assumes tags are stored as an array column
            # Adjust based on actual schema
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .contains("tags", tags)
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding notes by tags: {e}")
            raise handle_supabase_error(e)
