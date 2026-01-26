"""
Repository for dashboard.calendars table.

Manages user calendars (My Calendars) for organizing events.
"""
from typing import List, Optional
from pydantic import BaseModel
from api.repositories.base import BaseRepository
from api.services.supabase_client import get_service_client
from api.services.supabase_errors import handle_supabase_error, ResourceNotFoundError
import logging

logger = logging.getLogger("apex_assistant.repository.calendar")


class CalendarDB(BaseModel):
    """Database model for calendars table."""
    id: int
    user_id: str
    name: str
    color: str
    description: Optional[str] = None
    is_visible: bool = True
    is_default: bool = False
    sort_order: int = 0
    created_at: str
    updated_at: str


class CalendarRepository(BaseRepository[CalendarDB]):
    """Repository for dashboard calendars (My Calendars)."""

    def __init__(self):
        # Use service client to bypass RLS - authorization is handled in route handlers
        super().__init__(
            table_name="calendars",
            schema="dashboard",
            model=CalendarDB,
            client=get_service_client(),
        )

    async def find_by_user(self, user_id: str) -> List[CalendarDB]:
        """
        Find all calendars for a user.

        Args:
            user_id: User UUID

        Returns:
            List of calendars ordered by sort_order
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .order("sort_order")
                .order("name")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding calendars by user: {e}")
            raise handle_supabase_error(e)

    async def find_visible(self, user_id: str) -> List[CalendarDB]:
        """
        Find all visible calendars for a user.

        Args:
            user_id: User UUID

        Returns:
            List of visible calendars ordered by sort_order
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_visible", True)
                .order("sort_order")
                .order("name")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding visible calendars: {e}")
            raise handle_supabase_error(e)

    async def find_default(self, user_id: str) -> Optional[CalendarDB]:
        """
        Find the default calendar for a user.

        Args:
            user_id: User UUID

        Returns:
            Default calendar or None if not set
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_default", True)
                .limit(1)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding default calendar: {e}")
            raise handle_supabase_error(e)

    async def set_default(self, calendar_id: int, user_id: str) -> CalendarDB:
        """
        Set a calendar as the default for a user.

        Unsets any existing default first.

        Args:
            calendar_id: Calendar ID to set as default
            user_id: User UUID (for authorization check)

        Returns:
            Updated calendar
        """
        try:
            # First verify ownership
            existing = await self.find_by_id(calendar_id)
            if not existing or existing.user_id != user_id:
                raise ResourceNotFoundError("Calendar", calendar_id)

            # Unset any existing default
            self._get_table().update({"is_default": False}).eq(
                "user_id", user_id
            ).eq("is_default", True).execute()

            # Set new default
            result = (
                self._get_table()
                .update({"is_default": True})
                .eq("id", calendar_id)
                .execute()
            )

            if not result.data:
                raise ResourceNotFoundError("Calendar", calendar_id)

            return self.model(**result.data[0])

        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error setting default calendar: {e}")
            raise handle_supabase_error(e)

    async def toggle_visibility(
        self, calendar_id: int, user_id: str, is_visible: bool
    ) -> CalendarDB:
        """
        Toggle visibility of a calendar.

        Args:
            calendar_id: Calendar ID
            user_id: User UUID (for authorization check)
            is_visible: New visibility state

        Returns:
            Updated calendar
        """
        try:
            # Verify ownership
            existing = await self.find_by_id(calendar_id)
            if not existing or existing.user_id != user_id:
                raise ResourceNotFoundError("Calendar", calendar_id)

            result = (
                self._get_table()
                .update({"is_visible": is_visible})
                .eq("id", calendar_id)
                .execute()
            )

            if not result.data:
                raise ResourceNotFoundError("Calendar", calendar_id)

            return self.model(**result.data[0])

        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error toggling calendar visibility: {e}")
            raise handle_supabase_error(e)

    async def reorder(
        self, user_id: str, calendar_ids: List[int]
    ) -> List[CalendarDB]:
        """
        Reorder calendars based on provided ID order.

        Args:
            user_id: User UUID
            calendar_ids: List of calendar IDs in desired order

        Returns:
            Updated calendars in new order
        """
        try:
            updated = []
            for idx, cal_id in enumerate(calendar_ids):
                result = (
                    self._get_table()
                    .update({"sort_order": idx})
                    .eq("id", cal_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if result.data:
                    updated.append(self.model(**result.data[0]))

            return updated

        except Exception as e:
            logger.error(f"Error reordering calendars: {e}")
            raise handle_supabase_error(e)
