"""
Time Tracking API routes.
Handles clock in/out and time entry management.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timedelta

from api.routes.auth import require_auth
from api.schemas.hub import (
    ClockInRequest,
    ClockOutRequest,
    TimeEntryResponse,
    TimeEntryUpdate,
    TimeEntriesListResponse,
    ClockStatusResponse,
)
from database.operations_hub import (
    clock_in,
    clock_out,
    get_current_clock_in,
    get_time_entries,
    update_time_entry,
)

router = APIRouter()


def calculate_duration_minutes(clock_in_str: str, clock_out_str: Optional[str]) -> Optional[int]:
    """Calculate duration in minutes between clock in and clock out."""
    if not clock_out_str:
        return None

    try:
        clock_in_dt = datetime.fromisoformat(clock_in_str)
        clock_out_dt = datetime.fromisoformat(clock_out_str)
        delta = clock_out_dt - clock_in_dt
        return int(delta.total_seconds() / 60)
    except Exception:
        return None


def entry_to_response(entry: dict) -> TimeEntryResponse:
    """Convert a time entry dict to response model."""
    duration = calculate_duration_minutes(entry["clock_in"], entry.get("clock_out"))
    is_active = entry.get("clock_out") is None

    return TimeEntryResponse(
        id=entry["id"],
        user_id=entry["user_id"],
        clock_in=entry["clock_in"],
        clock_out=entry.get("clock_out"),
        project_id=entry.get("project_id"),
        notes=entry.get("notes"),
        break_minutes=entry.get("break_minutes", 0),
        created_at=entry["created_at"],
        updated_at=entry["updated_at"],
        duration_minutes=duration,
        is_active=is_active
    )


@router.get("/time/status", response_model=ClockStatusResponse)
async def get_clock_status(
    current_user = Depends(require_auth)
):
    """Get current clock status (are we clocked in?)."""
    current_entry = get_current_clock_in(current_user.id)

    # Calculate today's total worked time
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_entries = get_time_entries(
        user_id=current_user.id,
        start_date=today_start,
        limit=100
    )

    today_total = 0
    for entry in today_entries:
        if entry.get("clock_out"):
            duration = calculate_duration_minutes(entry["clock_in"], entry["clock_out"])
            if duration:
                today_total += duration - entry.get("break_minutes", 0)
        elif entry.get("clock_in"):
            # Active entry - calculate time so far
            duration = calculate_duration_minutes(entry["clock_in"], datetime.now().isoformat())
            if duration:
                today_total += duration

    return ClockStatusResponse(
        is_clocked_in=current_entry is not None,
        current_entry=entry_to_response(current_entry) if current_entry else None,
        today_total_minutes=today_total
    )


@router.post("/time/clock-in", response_model=TimeEntryResponse)
async def clock_in_endpoint(
    request: ClockInRequest,
    current_user = Depends(require_auth)
):
    """Clock in - start a new time entry."""
    try:
        entry = clock_in(
            user_id=current_user.id,
            project_id=request.project_id,
            notes=request.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not entry:
        raise HTTPException(status_code=500, detail="Failed to clock in")

    return entry_to_response(entry)


@router.post("/time/clock-out", response_model=TimeEntryResponse)
async def clock_out_endpoint(
    request: ClockOutRequest,
    current_user = Depends(require_auth)
):
    """Clock out - complete the current time entry."""
    entry = clock_out(
        user_id=current_user.id,
        notes=request.notes,
        break_minutes=request.break_minutes
    )

    if not entry:
        raise HTTPException(status_code=400, detail="Not currently clocked in")

    return entry_to_response(entry)


@router.get("/time/entries", response_model=TimeEntriesListResponse)
async def list_time_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    project_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(require_auth)
):
    """List time entries for the current user."""
    entries = get_time_entries(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        limit=limit,
        offset=offset
    )

    current_entry = get_current_clock_in(current_user.id)

    return TimeEntriesListResponse(
        entries=[entry_to_response(e) for e in entries],
        total=len(entries),
        current_entry=entry_to_response(current_entry) if current_entry else None
    )


@router.patch("/time/entries/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry_endpoint(
    entry_id: int,
    update: TimeEntryUpdate,
    current_user = Depends(require_auth)
):
    """Update a time entry (for corrections)."""
    entry = update_time_entry(
        entry_id=entry_id,
        user_id=current_user.id,
        clock_in=update.clock_in,
        clock_out=update.clock_out,
        project_id=update.project_id,
        notes=update.notes,
        break_minutes=update.break_minutes
    )

    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")

    return entry_to_response(entry)
