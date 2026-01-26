"""
Repository for business.media table.

Manages photos and documents attached to jobs.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import MediaResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.media")


class MediaRepository(BaseRepository[MediaResponse]):
    """Repository for job media (photos, documents)."""

    def __init__(self):
        super().__init__(
            table_name="media",
            schema="business",
            model=MediaResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        file_type: Optional[str] = None,
    ) -> List[MediaResponse]:
        """
        Find all media for a job.

        Args:
            job_id: Job ID
            file_type: Optional filter by file type

        Returns:
            List of media records
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
            )

            if file_type:
                query = query.eq("file_type", file_type)

            result = query.order("uploaded_at", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding media for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_photos(self, job_id: int) -> List[MediaResponse]:
        """Find all photos for a job."""
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
                .in_("file_type", ["image/jpeg", "image/png", "image/gif", "image/webp"])
                .order("uploaded_at", desc=True)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding photos for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_documents(self, job_id: int) -> List[MediaResponse]:
        """Find all documents (non-images) for a job."""
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
                .not_.in_("file_type", ["image/jpeg", "image/png", "image/gif", "image/webp"])
                .order("uploaded_at", desc=True)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding documents for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def count_by_job(self, job_id: int) -> int:
        """
        Count media files for a job.

        Args:
            job_id: Job ID

        Returns:
            Count of media files
        """
        return await self.count(filters={"job_id": job_id})

    async def find_by_filename(
        self,
        job_id: int,
        file_name: str,
    ) -> Optional[MediaResponse]:
        """
        Find media by filename within a job.

        Args:
            job_id: Job ID
            file_name: File name to search

        Returns:
            Media record if found
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
                .eq("file_name", file_name)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding media by filename: {e}")
            raise handle_supabase_error(e)
