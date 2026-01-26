"""
Apex Assistant - Calendars Routes

REST API endpoints for managing user calendars (My Calendars).
Calendars are used to organize events by category/purpose.
"""

from fastapi import APIRouter, Depends, HTTPException

from api.routes.auth import require_auth, UserProfile
from api.schemas.hub import (
    CalendarCreate,
    CalendarUpdate,
    CalendarResponse,
    CalendarsListResponse,
)
from api.repositories.calendar_repository import CalendarRepository

router = APIRouter()


def get_calendar_repo() -> CalendarRepository:
    """Get calendar repository instance."""
    return CalendarRepository()


# ============================================
# CALENDAR ENDPOINTS
# ============================================


@router.get("/calendars", response_model=CalendarsListResponse)
async def list_calendars(
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Get all calendars for the current user.

    Returns calendars ordered by sort_order, then name.
    """
    calendars = await repo.find_by_user(user.id)
    return CalendarsListResponse(
        calendars=[
            CalendarResponse(
                id=c.id,
                name=c.name,
                color=c.color,
                description=c.description,
                is_visible=c.is_visible,
                is_default=c.is_default,
                sort_order=c.sort_order,
            )
            for c in calendars
        ]
    )


@router.post("/calendars", response_model=CalendarResponse)
async def create_calendar(
    data: CalendarCreate,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Create a new calendar.

    New calendars are visible by default but not set as the default calendar.
    """
    calendar_data = data.model_dump()
    calendar_data["user_id"] = user.id

    # Get current count for sort_order
    existing = await repo.find_by_user(user.id)
    calendar_data["sort_order"] = len(existing)

    # If this is the first calendar, make it the default
    if len(existing) == 0:
        calendar_data["is_default"] = True

    calendar = await repo.create(calendar_data)

    return CalendarResponse(
        id=calendar.id,
        name=calendar.name,
        color=calendar.color,
        description=calendar.description,
        is_visible=calendar.is_visible,
        is_default=calendar.is_default,
        sort_order=calendar.sort_order,
    )


@router.get("/calendars/{calendar_id}", response_model=CalendarResponse)
async def get_calendar(
    calendar_id: int,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """Get a specific calendar by ID."""
    calendar = await repo.find_by_id(calendar_id)
    if not calendar or calendar.user_id != user.id:
        raise HTTPException(status_code=404, detail="Calendar not found")

    return CalendarResponse(
        id=calendar.id,
        name=calendar.name,
        color=calendar.color,
        description=calendar.description,
        is_visible=calendar.is_visible,
        is_default=calendar.is_default,
        sort_order=calendar.sort_order,
    )


@router.patch("/calendars/{calendar_id}", response_model=CalendarResponse)
async def update_calendar(
    calendar_id: int,
    data: CalendarUpdate,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Update a calendar.

    Supports updating name, color, description, is_visible, and sort_order.
    """
    # Verify ownership
    existing = await repo.find_by_id(calendar_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Calendar not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return CalendarResponse(
            id=existing.id,
            name=existing.name,
            color=existing.color,
            description=existing.description,
            is_visible=existing.is_visible,
            is_default=existing.is_default,
            sort_order=existing.sort_order,
        )

    calendar = await repo.update(calendar_id, update_data)

    return CalendarResponse(
        id=calendar.id,
        name=calendar.name,
        color=calendar.color,
        description=calendar.description,
        is_visible=calendar.is_visible,
        is_default=calendar.is_default,
        sort_order=calendar.sort_order,
    )


@router.delete("/calendars/{calendar_id}")
async def delete_calendar(
    calendar_id: int,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Delete a calendar.

    Note: This will NOT delete events in the calendar.
    Events should be reassigned or deleted separately.
    Cannot delete the default calendar if other calendars exist.
    """
    existing = await repo.find_by_id(calendar_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Calendar not found")

    # Check if this is the default calendar
    if existing.is_default:
        all_calendars = await repo.find_by_user(user.id)
        if len(all_calendars) > 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the default calendar. Set another calendar as default first.",
            )

    success = await repo.delete(calendar_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete calendar")

    return {"status": "ok", "deleted": True}


@router.post("/calendars/{calendar_id}/default", response_model=CalendarResponse)
async def set_default_calendar(
    calendar_id: int,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Set a calendar as the default.

    The default calendar is used when creating events without specifying a calendar.
    Only one calendar can be the default at a time.
    """
    calendar = await repo.set_default(calendar_id, user.id)

    return CalendarResponse(
        id=calendar.id,
        name=calendar.name,
        color=calendar.color,
        description=calendar.description,
        is_visible=calendar.is_visible,
        is_default=calendar.is_default,
        sort_order=calendar.sort_order,
    )


@router.post("/calendars/{calendar_id}/visibility", response_model=CalendarResponse)
async def toggle_calendar_visibility(
    calendar_id: int,
    user: UserProfile = Depends(require_auth),
    repo: CalendarRepository = Depends(get_calendar_repo),
):
    """
    Toggle a calendar's visibility.

    Hidden calendars' events are not shown in the calendar view.
    """
    existing = await repo.find_by_id(calendar_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Calendar not found")

    calendar = await repo.toggle_visibility(
        calendar_id, user.id, not existing.is_visible
    )

    return CalendarResponse(
        id=calendar.id,
        name=calendar.name,
        color=calendar.color,
        description=calendar.description,
        is_visible=calendar.is_visible,
        is_default=calendar.is_default,
        sort_order=calendar.sort_order,
    )
