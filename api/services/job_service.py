"""
Business logic service for restoration jobs/projects.

Handles project-related operations with business rules and validation.
"""
from typing import List, Optional, Dict, Any
from api.repositories.job_repository import JobRepository
from api.schemas.operations import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)
from api.services.supabase_errors import ResourceNotFoundError, ValidationError
import logging

logger = logging.getLogger("apex_assistant.service.job")


class JobService:
    """Service for managing restoration projects/jobs."""

    def __init__(self):
        self.repo = JobRepository()

    async def get_job(self, job_id: int) -> ProjectResponse:
        """
        Get a job by ID.

        Args:
            job_id: Job ID

        Returns:
            Job data

        Raises:
            ResourceNotFoundError if job not found
        """
        job = await self.repo.find_by_id(job_id)

        if not job:
            raise ResourceNotFoundError("Job", job_id)

        return job

    async def get_job_by_number(self, job_number: str) -> ProjectResponse:
        """
        Get a job by job number.

        Args:
            job_number: Unique job number

        Returns:
            Job data

        Raises:
            ResourceNotFoundError if job not found
        """
        job = await self.repo.find_by_job_number(job_number)

        if not job:
            raise ResourceNotFoundError("Job", job_number)

        return job

    async def get_job_full(self, job_id: int) -> Dict[str, Any]:
        """
        Get a job with all related data.

        Args:
            job_id: Job ID

        Returns:
            Dict with job and all relations (client, carrier, estimates, etc.)

        Raises:
            ResourceNotFoundError if job not found
        """
        job = await self.repo.find_with_relations(job_id)

        if not job:
            raise ResourceNotFoundError("Job", job_id)

        return job

    async def list_jobs(
        self,
        status: Optional[str] = None,
        client_id: Optional[int] = None,
        active_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ProjectResponse]:
        """
        List jobs with optional filtering.

        Args:
            status: Filter by status
            client_id: Filter by client
            active_only: Only return active jobs
            limit: Max results
            offset: Skip N results

        Returns:
            List of jobs
        """
        if active_only:
            return await self.repo.find_active_jobs(limit, offset)

        if status:
            return await self.repo.find_by_status(status, limit, offset)

        if client_id:
            return await self.repo.find_by_client(client_id, limit, offset)

        return await self.repo.find_all(
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def search_jobs(self, search_term: str, limit: int = 50) -> List[ProjectResponse]:
        """
        Search jobs by job number, address, or other fields.

        Args:
            search_term: Search string
            limit: Max results

        Returns:
            List of matching jobs
        """
        return await self.repo.search_jobs(search_term, limit)

    async def create_job(self, data: ProjectCreate) -> ProjectResponse:
        """
        Create a new job.

        Args:
            data: Job creation data

        Returns:
            Created job

        Raises:
            ValidationError if data is invalid
        """
        # Business logic: auto-generate job number if not provided
        if not data.job_number:
            data.job_number = await self._generate_job_number(
                data.damage_category if hasattr(data, 'damage_category') else None
            )

        # Validate required fields
        if not data.address:
            raise ValidationError("Job address is required", field="address")

        job_dict = data.model_dump(exclude_unset=True)
        return await self.repo.create(job_dict)

    async def update_job(
        self,
        job_id: int,
        data: ProjectUpdate,
    ) -> ProjectResponse:
        """
        Update a job.

        Args:
            job_id: Job ID
            data: Update data

        Returns:
            Updated job

        Raises:
            ResourceNotFoundError if job not found
            ValidationError if status transition is invalid
        """
        # Verify job exists
        existing = await self.get_job(job_id)

        # Business logic: validate status transitions
        if data.status and data.status != existing.status:
            self._validate_status_transition(existing.status, data.status)

        update_dict = data.model_dump(exclude_unset=True)
        return await self.repo.update(job_id, update_dict)

    async def delete_job(self, job_id: int) -> bool:
        """
        Delete a job.

        Args:
            job_id: Job ID

        Returns:
            True if deleted

        Raises:
            ResourceNotFoundError if job not found
        """
        # Verify job exists
        await self.get_job(job_id)

        return await self.repo.delete(job_id)

    async def get_job_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about jobs.

        Returns:
            Dict with counts by status and other metrics
        """
        status_counts = await self.repo.count_by_status()

        return {
            "by_status": status_counts,
            "total": sum(status_counts.values()),
        }

    def _validate_status_transition(self, from_status: str, to_status: str) -> None:
        """
        Validate status transitions based on business rules.

        Args:
            from_status: Current status
            to_status: New status

        Raises:
            ValidationError if transition is invalid
        """
        # Example: Can't go from 'complete' to 'active'
        invalid_transitions = {
            "complete": ["lead", "pending", "active", "inspection"],
            "closed": ["lead", "pending", "active", "complete", "inspection"],
        }

        if from_status in invalid_transitions:
            if to_status in invalid_transitions[from_status]:
                raise ValidationError(
                    f"Cannot transition from {from_status} to {to_status}"
                )

    async def _generate_job_number(self, job_type: Optional[str] = None) -> str:
        """
        Generate next job number.

        Args:
            job_type: Optional job type for prefix

        Returns:
            Generated job number
        """
        # Implementation: Get latest job number and increment
        # This is a simplified version - actual implementation should use
        # database sequences or atomic operations
        import datetime

        year = datetime.datetime.now().year
        prefix = "W" if job_type == "water" else "F" if job_type == "fire" else "R"

        # Get count of jobs this year
        # This is simplified - in production, use a proper sequence
        all_jobs = await self.repo.find_all(limit=1, order_by="-created_at")

        if all_jobs and all_jobs[0].job_number:
            # Extract number and increment
            try:
                last_num = int(all_jobs[0].job_number.split("-")[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f"{prefix}-{year}-{new_num:04d}"
