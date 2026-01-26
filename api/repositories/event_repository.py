"""
Repository for dashboard.events table.

Manages calendar events with date range queries and filtering.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from api.repositories.base import BaseRepository
from api.services.supabase_client import get_service_client
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.event")


class EventDB(BaseModel):
    """Database model for events table."""
    id: int
    user_id: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: str
    end_time: str
    all_day: bool = False
    timezone: Optional[str] = "America/Denver"
    recurrence_rule: Optional[str] = None
    recurrence_parent_id: Optional[int] = None
    color: Optional[str] = None
    project_id: Optional[int] = None
    job_id: Optional[int] = None
    external_id: Optional[str] = None
    external_calendar_id: Optional[str] = None
    external_link: Optional[str] = None
    last_synced_at: Optional[str] = None
    archived: bool = False
    created_at: str
    updated_at: str


class EventRepository(BaseRepository[EventDB]):
    """Repository for dashboard events (calendar events)."""

    def __init__(self):
        # Use service client to bypass RLS - authorization is handled in route handlers
        super().__init__(
            table_name="events",
            schema="dashboard",
            model=EventDB,
            client=get_service_client(),
        )

    async def find_by_date_range(
        self,
        user_id: str,
        start_date: str,
        end_date: str,
        include_archived: bool = False,
    ) -> List[EventDB]:
        """
        Find events within a date range.

        Uses overlap logic: events that start before end_date AND end after start_date.

        Args:
            user_id: User UUID
            start_date: ISO datetime string for range start
            end_date: ISO datetime string for range end
            include_archived: Whether to include archived events

        Returns:
            List of events in the date range
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .lte("start_time", end_date)
                .gte("end_time", start_date)
            )

            if not include_archived:
                query = query.eq("archived", False)

            result = query.order("start_time").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding events by date range: {e}")
            raise handle_supabase_error(e)

    async def find_upcoming(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[EventDB]:
        """
        Find upcoming events starting from now.

        Args:
            user_id: User UUID
            limit: Maximum number of events to return

        Returns:
            List of upcoming events
        """
        try:
            now = datetime.utcnow().isoformat()
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("archived", False)
                .gte("start_time", now)
                .order("start_time")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding upcoming events: {e}")
            raise handle_supabase_error(e)

    async def find_by_project(
        self,
        user_id: str,
        project_id: int,
    ) -> List[EventDB]:
        """
        Find all events linked to a specific project.

        Args:
            user_id: User UUID
            project_id: Project ID

        Returns:
            List of events linked to the project
        """
        return await self.find_all(
            filters={"user_id": user_id, "project_id": project_id},
            order_by="-start_time",
        )

    async def find_by_job(
        self,
        user_id: str,
        job_id: int,
    ) -> List[EventDB]:
        """
        Find all events linked to a specific job.

        Args:
            user_id: User UUID
            job_id: Job ID from business.jobs

        Returns:
            List of events linked to the job
        """
        return await self.find_all(
            filters={"user_id": user_id, "job_id": job_id},
            order_by="-start_time",
        )

    async def find_today(self, user_id: str) -> List[EventDB]:
        """
        Find events happening today.

        Args:
            user_id: User UUID

        Returns:
            List of today's events
        """
        from datetime import date, timedelta

        today_start = datetime.combine(date.today(), datetime.min.time()).isoformat()
        today_end = datetime.combine(
            date.today() + timedelta(days=1), datetime.min.time()
        ).isoformat()

        return await self.find_by_date_range(user_id, today_start, today_end)

    async def find_by_external_id(
        self,
        user_id: str,
        external_id: str,
    ) -> Optional[EventDB]:
        """
        Find an event by its external (Google Calendar) ID.

        Args:
            user_id: User UUID
            external_id: Google Calendar event ID

        Returns:
            Event if found, None otherwise
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("external_id", external_id)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding event by external ID: {e}")
            raise handle_supabase_error(e)

    async def archive(self, event_id: int, user_id: str) -> EventDB:
        """
        Archive an event instead of deleting it.

        Args:
            event_id: Event ID
            user_id: User UUID (for authorization check)

        Returns:
            Updated event
        """
        existing = await self.find_by_id(event_id)
        if not existing or existing.user_id != user_id:
            from api.services.supabase_errors import ResourceNotFoundError
            raise ResourceNotFoundError("Event", event_id)

        return await self.update(event_id, {"archived": True})
