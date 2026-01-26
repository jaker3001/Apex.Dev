"""
Repository for business.activity_log table.

Manages unified event log for activity tracking.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.operations import ActivityLogResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.activity_log")


class ActivityLogRepository(BaseRepository[ActivityLogResponse]):
    """Repository for activity log entries."""

    def __init__(self):
        super().__init__(
            table_name="activity_log",
            schema="business",
            model=ActivityLogResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> List[ActivityLogResponse]:
        """
        Find all activity log entries for a job.

        Args:
            job_id: Job ID
            limit: Max results
            offset: Skip N results

        Returns:
            List of activity entries (newest first)
        """
        return await self.find_all(
            filters={"job_id": job_id},
            order_by="-created_at",
            limit=limit,
            offset=offset,
        )

    async def find_by_event_type(
        self,
        job_id: int,
        event_type: str,
        limit: int = 50,
    ) -> List[ActivityLogResponse]:
        """
        Find activity entries by event type.

        Args:
            job_id: Job ID
            event_type: Event type to filter
            limit: Max results

        Returns:
            List of activity entries
        """
        return await self.find_all(
            filters={"job_id": job_id, "event_type": event_type},
            order_by="-created_at",
            limit=limit,
        )

    async def find_by_entity(
        self,
        entity_type: str,
        entity_id: int,
        limit: int = 50,
    ) -> List[ActivityLogResponse]:
        """
        Find activity entries for a specific entity.

        Args:
            entity_type: Type of entity (estimate, payment, etc.)
            entity_id: Entity ID
            limit: Max results

        Returns:
            List of activity entries
        """
        return await self.find_all(
            filters={"entity_type": entity_type, "entity_id": entity_id},
            order_by="-created_at",
            limit=limit,
        )

    async def log_activity(
        self,
        job_id: int,
        event_type: str,
        description: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        amount: Optional[float] = None,
        actor_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ActivityLogResponse:
        """
        Create a new activity log entry.

        Args:
            job_id: Job ID
            event_type: Type of event
            description: Human-readable description
            entity_type: Optional entity type
            entity_id: Optional entity ID
            old_value: Optional previous value
            new_value: Optional new value
            amount: Optional amount involved
            actor_id: Optional contact ID of person who performed action
            metadata: Optional additional data

        Returns:
            Created activity log entry
        """
        import json

        data = {
            "job_id": job_id,
            "event_type": event_type,
            "description": description,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "old_value": old_value,
            "new_value": new_value,
            "amount": amount,
            "actor_id": actor_id,
            "metadata": json.dumps(metadata) if metadata else None,
        }

        return await self.create(data)

    async def find_recent(
        self,
        limit: int = 50,
        job_id: Optional[int] = None,
    ) -> List[ActivityLogResponse]:
        """
        Find recent activity across all jobs or for a specific job.

        Args:
            limit: Max results
            job_id: Optional job filter

        Returns:
            List of recent activity entries
        """
        try:
            query = self._get_table().select("*")

            if job_id:
                query = query.eq("job_id", job_id)

            result = (
                query
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding recent activity: {e}")
            raise handle_supabase_error(e)

    async def find_financial_activity(
        self,
        job_id: int,
        limit: int = 50,
    ) -> List[ActivityLogResponse]:
        """
        Find financial-related activity (estimates, payments, receipts).

        Args:
            job_id: Job ID
            limit: Max results

        Returns:
            List of financial activity entries
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("job_id", job_id)
                .in_(
                    "event_type",
                    [
                        "estimate_created", "estimate_updated", "estimate_status_changed",
                        "payment_received", "payment_updated",
                        "receipt_added", "receipt_updated",
                    ]
                )
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding financial activity for job {job_id}: {e}")
            raise handle_supabase_error(e)
