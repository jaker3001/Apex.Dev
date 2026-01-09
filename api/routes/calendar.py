"""
Calendar API routes.

Provides calendar event CRUD operations using Google Calendar integration.
"""

import logging
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends

from api.routes.auth import require_auth, UserResponse
from api.schemas.hub import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
    CalendarEventsListResponse,
)

logger = logging.getLogger("apex_assistant.calendar")

router = APIRouter()


def get_calendar_service():
    """Get the Google Calendar service instance."""
    try:
        from api.services.google_calendar import get_google_calendar_service
        return get_google_calendar_service()
    except ValueError:
        # Service not configured - return None to fall back to empty responses
        return None


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


@router.get("/calendar/events", response_model=CalendarEventsListResponse)
async def get_calendar_events(
    view: str = "week",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Get calendar events for a given view/date range.

    If Google Calendar is connected, fetches real events.
    Otherwise returns an empty list.
    """
    # Calculate date range if not fully specified
    if start_date and end_date:
        start = start_date
        end = end_date
    else:
        start, end = get_date_range(view, start_date)

    service = get_calendar_service()

    events = []

    if service:
        try:
            calendar_events = await service.list_events(
                user_id=str(current_user.id),
                start_date=start,
                end_date=end,
            )

            events = [
                CalendarEventResponse(
                    id=event.id,
                    summary=event.summary,
                    description=event.description,
                    start=event.start,
                    end=event.end,
                    location=event.location,
                    all_day=event.all_day,
                    html_link=event.html_link,
                )
                for event in calendar_events
            ]

        except Exception as e:
            logger.warning(f"Failed to fetch Google Calendar events: {e}")
            # Return empty list on error

    return CalendarEventsListResponse(
        events=events,
        view=view,
        start_date=start,
        end_date=end
    )


@router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(
    event: CalendarEventCreate,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Create a new calendar event.

    Requires Google Calendar to be connected.
    """
    service = get_calendar_service()

    if not service:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration not configured."
        )

    try:
        created = await service.create_event(
            user_id=str(current_user.id),
            summary=event.summary,
            start=event.start,
            end=event.end,
            description=event.description,
            location=event.location,
            all_day=event.all_day,
        )

        return CalendarEventResponse(
            id=created.id,
            summary=created.summary,
            description=created.description,
            start=created.start,
            end=created.end,
            location=created.location,
            all_day=created.all_day,
            html_link=created.html_link,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail="Please connect your Google Calendar first."
        )
    except Exception as e:
        logger.exception(f"Failed to create calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create event: {str(e)}"
        )


@router.put("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    event_id: str,
    event: CalendarEventUpdate,
    current_user: UserResponse = Depends(require_auth)
):
    """
    Update an existing calendar event.

    Requires Google Calendar to be connected.
    """
    service = get_calendar_service()

    if not service:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration not configured."
        )

    try:
        updated = await service.update_event(
            user_id=str(current_user.id),
            event_id=event_id,
            summary=event.summary,
            start=event.start,
            end=event.end,
            description=event.description,
            location=event.location,
        )

        return CalendarEventResponse(
            id=updated.id,
            summary=updated.summary,
            description=updated.description,
            start=updated.start,
            end=updated.end,
            location=updated.location,
            all_day=updated.all_day,
            html_link=updated.html_link,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail="Please connect your Google Calendar first."
        )
    except Exception as e:
        logger.exception(f"Failed to update calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update event: {str(e)}"
        )


@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    calendar_id: str = "primary",
    current_user: UserResponse = Depends(require_auth)
):
    """
    Delete a calendar event.

    Requires Google Calendar to be connected.
    """
    service = get_calendar_service()

    if not service:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration not configured."
        )

    try:
        await service.delete_event(
            user_id=str(current_user.id),
            event_id=event_id,
            calendar_id=calendar_id,
        )

        return {"success": True, "message": "Event deleted"}

    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail="Please connect your Google Calendar first."
        )
    except Exception as e:
        logger.exception(f"Failed to delete calendar event: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete event: {str(e)}"
        )
