"""
Calendar API routes.
Wraps Google Calendar MCP tools for the frontend.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta
import httpx
import os

from api.routes.auth import require_auth
from api.schemas.hub import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
    CalendarEventsListResponse,
)

router = APIRouter()

# n8n MCP endpoint for Google Calendar
N8N_WEBHOOK_BASE = os.getenv("N8N_WEBHOOK_BASE", "")


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
    current_user = Depends(require_auth)
):
    """Get calendar events for a given view/date range."""
    start, end = get_date_range(view, start_date)

    # For now, return empty list - will integrate with MCP later
    # This allows the frontend to be built while we work on MCP integration
    events = []

    # TODO: Call n8n MCP webhook for Google Calendar
    # try:
    #     async with httpx.AsyncClient() as client:
    #         response = await client.post(
    #             f"{N8N_WEBHOOK_BASE}/calendar/events",
    #             json={"after": start, "before": end}
    #         )
    #         if response.status_code == 200:
    #             data = response.json()
    #             events = [CalendarEventResponse(...) for e in data]
    # except Exception as e:
    #     pass  # Return empty list on error

    return CalendarEventsListResponse(
        events=events,
        view=view,
        start_date=start,
        end_date=end
    )


@router.post("/calendar/events", response_model=CalendarEventResponse)
async def create_calendar_event(
    event: CalendarEventCreate,
    current_user = Depends(require_auth)
):
    """Create a new calendar event."""
    # TODO: Call n8n MCP webhook for Google Calendar
    # For now, return a mock response
    raise HTTPException(
        status_code=501,
        detail="Calendar integration pending. Use Google Calendar directly for now."
    )


@router.put("/calendar/events/{event_id}", response_model=CalendarEventResponse)
async def update_calendar_event(
    event_id: str,
    event: CalendarEventUpdate,
    current_user = Depends(require_auth)
):
    """Update a calendar event."""
    # TODO: Call n8n MCP webhook for Google Calendar
    raise HTTPException(
        status_code=501,
        detail="Calendar integration pending. Use Google Calendar directly for now."
    )


@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    current_user = Depends(require_auth)
):
    """Delete a calendar event."""
    # TODO: Call n8n MCP webhook for Google Calendar
    raise HTTPException(
        status_code=501,
        detail="Calendar integration pending. Use Google Calendar directly for now."
    )
