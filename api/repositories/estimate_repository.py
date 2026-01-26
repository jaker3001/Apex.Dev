"""
Repository for business.estimates table.

Manages estimate tracking with versions.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import EstimateResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.estimate")


class EstimateRepository(BaseRepository[EstimateResponse]):
    """Repository for job estimates."""

    def __init__(self):
        super().__init__(
            table_name="estimates",
            schema="business",
            model=EstimateResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        include_all_versions: bool = True,
    ) -> List[EstimateResponse]:
        """
        Find all estimates for a job.

        Args:
            job_id: Job ID
            include_all_versions: Include all versions or just latest

        Returns:
            List of estimates
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
            )

            result = query.order("version", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding estimates for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_latest_for_job(self, job_id: int) -> Optional[EstimateResponse]:
        """
        Find the latest estimate version for a job.

        Args:
            job_id: Job ID

        Returns:
            Latest estimate or None
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
                .order("version", desc=True)
                .limit(1)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding latest estimate for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_by_status(
        self,
        status: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[EstimateResponse]:
        """
        Find estimates by status.

        Args:
            status: Estimate status
            limit: Max results
            offset: Skip N results

        Returns:
            List of estimates
        """
        return await self.find_all(
            filters={"status": status},
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def find_pending(self, limit: int = 100) -> List[EstimateResponse]:
        """Find estimates pending approval."""
        return await self.find_by_status("submitted", limit=limit)

    async def find_with_revisions(self, limit: int = 100) -> List[EstimateResponse]:
        """Find estimates with revision requests."""
        return await self.find_by_status("revision_requested", limit=limit)

    async def get_next_version(self, job_id: int) -> int:
        """
        Get the next version number for a job's estimate.

        Args:
            job_id: Job ID

        Returns:
            Next version number
        """
        latest = await self.find_latest_for_job(job_id)
        if latest:
            return latest.version + 1
        return 1

    async def create_revision(
        self,
        job_id: int,
        data: Dict[str, Any],
    ) -> EstimateResponse:
        """
        Create a new revision of an estimate.

        Automatically sets the version number.

        Args:
            job_id: Job ID
            data: Estimate data

        Returns:
            Created estimate
        """
        data["job_id"] = job_id
        data["version"] = await self.get_next_version(job_id)
        data["status"] = "draft"
        return await self.create(data)

    async def sum_approved_by_job(self, job_id: int) -> float:
        """
        Get total approved estimate amount for a job.

        Args:
            job_id: Job ID

        Returns:
            Sum of approved estimates
        """
        try:
            result = (
                self._get_table()
                .select("amount")
                .eq("job_id", job_id)
                .eq("status", "approved")
                .execute()
            )

            total = sum(e.get("amount", 0) or 0 for e in result.data)
            return total

        except Exception as e:
            logger.error(f"Error summing approved estimates for job {job_id}: {e}")
            raise handle_supabase_error(e)
