"""
Repository for business.jobs table.

Manages restoration project/job data.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import ProjectResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.job")


class JobRepository(BaseRepository[ProjectResponse]):
    """Repository for restoration projects/jobs."""

    def __init__(self):
        super().__init__(
            table_name="jobs",
            schema="business",
            model=ProjectResponse,
        )

    async def find_by_job_number(self, job_number: str) -> Optional[ProjectResponse]:
        """
        Find project by job number.

        Args:
            job_number: Unique job number

        Returns:
            Project if found, None otherwise
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_number", job_number)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding job by number {job_number}: {e}")
            raise handle_supabase_error(e)

    async def find_with_relations(self, id: int) -> Optional[Dict[str, Any]]:
        """
        Find project with all related data.

        Uses PostgREST resource embedding to fetch:
        - Client info
        - Carrier/insurance info
        - Contacts
        - Estimates
        - Payments
        - Notes
        - Media
        - Labor entries
        - Receipts
        - Work orders

        Args:
            id: Job ID

        Returns:
            Dict with job and all related data, or None if not found
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    client:clients(*),
                    carrier:organizations(*),
                    contacts:job_contacts(*, contact:contacts(*)),
                    estimates(*),
                    payments(*),
                    notes(*),
                    media(*),
                    labor_entries(*),
                    receipts(*),
                    work_orders(*)
                    """
                )
                .eq("id", id)
                .execute()
            )

            if not result.data:
                return None

            return result.data[0]

        except Exception as e:
            logger.error(f"Error finding job with relations {id}: {e}")
            raise handle_supabase_error(e)

    async def find_by_status(
        self,
        status: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """
        Find projects by status with pagination.

        Args:
            status: Job status
            limit: Max results
            offset: Skip N results

        Returns:
            List of projects
        """
        return await self.find_all(
            filters={"status": status},
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def find_by_client(
        self,
        client_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """
        Find projects for a specific client.

        Args:
            client_id: Client ID
            limit: Max results
            offset: Skip N results

        Returns:
            List of projects
        """
        return await self.find_all(
            filters={"client_id": client_id},
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def find_active_jobs(
        self,
        limit: int = 100,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """
        Find all active jobs (not completed/closed).

        Args:
            limit: Max results
            offset: Skip N results

        Returns:
            List of active projects
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .in_("status", ["lead", "pending", "active", "inspection"])
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding active jobs: {e}")
            raise handle_supabase_error(e)

    async def search_jobs(
        self,
        search_term: str,
        limit: int = 50,
    ) -> List[ProjectResponse]:
        """
        Search jobs by job number, address, or client name.

        Args:
            search_term: Search string
            limit: Max results

        Returns:
            List of matching projects
        """
        try:
            # This is a simplified version. In production, you'd use
            # full-text search or multiple OR conditions
            result = (
                self._get_table()
                .select("*")
                .or_(f"job_number.ilike.%{search_term}%,address.ilike.%{search_term}%")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching jobs: {e}")
            raise handle_supabase_error(e)

    async def count_by_status(self) -> Dict[str, int]:
        """
        Get count of jobs grouped by status.

        Returns:
            Dict mapping status to count
        """
        try:
            # This would ideally use a group by query
            # For now, we'll fetch all and count manually
            result = (
                self._get_table()
                .select("status")
                .execute()
            )

            counts = {}
            for row in result.data:
                status = row.get("status", "unknown")
                counts[status] = counts.get(status, 0) + 1

            return counts

        except Exception as e:
            logger.error(f"Error counting by status: {e}")
            raise handle_supabase_error(e)
