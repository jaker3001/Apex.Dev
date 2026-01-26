"""
Calendar API routes.

Provides calendar event CRUD operations using local Supabase storage.
Google Calendar integration is optional and can be added later as a sync layer.
"""

import logging
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends

from api.routes.auth import require_auth, UserResponse
from api.repositories.event_repository import EventRepository
from api.schemas.hub import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
    CalendarEventsListResponse,
)

logger = logging.getLogger("apex_assistant.calendar")

router = APIRouter()

# Repository instance
event_repo = EventRepository()


def get_date_range(view: str, start_date: Optional[str] = None) -> tuple[str, str]:
    """Get start and end dates based on view type."""
    if start_date:
        try:
            base = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            base = datetime.now()
    else:
        base = datetime.now()

    # Start of the day
    base = base.replace(hour=0, minute=0, second=0, microsecond=0)

    if view == "day":
        end = base + timedelta(days=1)
    elif view == "3day":
        end = base + timedelta(days=3)
    elif view == "week":
        # Start from Monday of current week
        days_since_monday = base.weekday()
        base = base - timedelta(days=days_since_monday)
        end = base + timedelta(days=7)
    elif view == "month":
        # Start from first of month
        base = base.replace(day=1)
        # End at first of next month
        if base.month == 12:
            end = base.replace(year=base.year + 1, month=1)
        else:
            end = base.replace(month=base.month + 1)
    else:
        # Default to week
        end = base + timedelta(days=7)

    return base.isoformat(), end.isoformat()


def db_event_to_response(event) -> CalendarEventResponse:
    """Convert database event to API response format."""
    return CalendarEventResponse(
        id=str(event.id),
        summary=event.title,
        description=event.description,
        start=event.start_time,
        end=event.end_time,
        location=event.location,
        all_day=event.all_day,
        html_link=event.external_link,
        attendees=None,
        calendar_id=None,
    )


@router.get("/calendar/events", response_model=CalendarEventsListResponse)
async def get_calendar_events(
    view: str = "week",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Get calendar events for a given view/date range.

    Fetches events from local Supabase storage.
    """
    # Calculate date range if not fully specified
    if start_date and end_date:
        start = start_date
        end = end_date
    else:
        start, end = get_date_range(view, start_date)

    try:
        db_events = await event_repo.find_by_date_range(
            user_id=str(current_user.id),
            start_date=start,
            end_date=end,
        )

        events = [db_event_to_response(event) for event in db_events]

        return CalendarEventsListResponse(
            events=events,
            view=view,
            start_date=start,
            end_date=end
        )

    except Exception as e:
        logger.exception(f"Failed to fetch calendar events: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch events: {str(e)}"
        )


@router.get("/calendar/events/upcoming")
async def get_upcoming_events(
    limit: int = 5,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Get upcoming events for dashboard display.
    """
    try:
        db_events = await event_repo.find_upcoming(
            user_id=str(current_user.id),
            limit=limit,
        )

        return {
            "events": [db_event_to_response(event) for event in db_events],
            "count": len(db_events),
        }

    except Exception as e:
        logger.exception(f"Failed to fetch upcoming events: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch upcoming events: {str(e)}"
        )


@router.get("/calendar/events/today")
async def get_today_events(
    current_user: UserResponse = Depends(require_auth)
):
    """
    Get today's events for dashboard display.
    """
    try:
        db_events = await event_repo.find_today(
            user_id=str(current_user.id),
        )

        return {
            "events": [db_event_to_response(event) for event in db_events],
            "count": len(db_events),
        }

    except Exception as e:
        logger.exception(f"Failed to fetch today's events: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch today's events: {str(e)}"
        )


@router.get("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def get_calendar_event(
    event_id: int,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Get a single calendar event by ID.
    """
    try:
        event = await event_repo.find_by_id(event_id)

        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Event not found")

        return db_event_to_response(event)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to fetch event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch event: {str(e)}"
        )


@router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(
    event: CalendarEventCreate,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Create a new calendar event.

    Stores the event locally in Supabase.
    """
    try:
        # Prepare data for database
        event_data = {
            "user_id": str(current_user.id),
            "title": event.summary,
            "description": event.description,
            "location": event.location,
            "start_time": event.start,
            "end_time": event.end,
            "all_day": event.all_day,
        }

        created = await event_repo.create(event_data)

        return db_event_to_response(created)

    except Exception as e:
        logger.exception(f"Failed to create calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create event: {str(e)}"
        )


@router.put("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    event_id: int,
    event: CalendarEventUpdate,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Update an existing calendar event.
    """
    # First verify ownership
    existing = await event_repo.find_by_id(event_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    if existing.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        # Build update data, only including provided fields
        update_data = {}
        if event.summary is not None:
            update_data["title"] = event.summary
        if event.description is not None:
            update_data["description"] = event.description
        if event.start is not None:
            update_data["start_time"] = event.start
        if event.end is not None:
            update_data["end_time"] = event.end
        if event.location is not None:
            update_data["location"] = event.location

        if not update_data:
            # Nothing to update
            return db_event_to_response(existing)

        updated = await event_repo.update(event_id, update_data)

        return db_event_to_response(updated)

    except Exception as e:
        logger.exception(f"Failed to update calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update event: {str(e)}"
        )


@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: int,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Delete a calendar event.
    """
    # Verify ownership
    existing = await event_repo.find_by_id(event_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")

    if existing.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        await event_repo.delete(event_id)
        return {"success": True, "message": "Event deleted"}

    except Exception as e:
        logger.exception(f"Failed to delete calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete event: {str(e)}"
        )
