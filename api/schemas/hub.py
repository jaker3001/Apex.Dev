"""
Pydantic schemas for Dashboard Hub API.
Covers inbox, notifications, time tracking, calendar, and weather.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# INBOX SCHEMAS
# =============================================================================

class InboxItemCreate(BaseModel):
    """Create a new inbox item (quick capture)."""
    type: Literal['note', 'photo', 'audio', 'document', 'task']
    title: Optional[str] = None
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    project_id: Optional[int] = None


class InboxItemUpdate(BaseModel):
    """Update an inbox item."""
    title: Optional[str] = None
    content: Optional[str] = None
    project_id: Optional[int] = None
    processed: Optional[bool] = None


class InboxItemResponse(BaseModel):
    """Inbox item response."""
    id: int
    user_id: int
    type: str
    title: Optional[str] = None
    content: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    project_id: Optional[int] = None
    processed: int
    created_at: str
    processed_at: Optional[str] = None


class InboxListResponse(BaseModel):
    """List of inbox items."""
    items: list[InboxItemResponse]
    total: int
    unprocessed_count: int


class LinkToJobRequest(BaseModel):
    """Link an inbox item to a job."""
    project_id: int


# =============================================================================
# NOTIFICATION SCHEMAS
# =============================================================================

class NotificationCreate(BaseModel):
    """Create a notification (internal use)."""
    user_id: int
    type: Literal['mention', 'assignment', 'reminder', 'alert', 'system']
    title: str
    message: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    link: Optional[str] = None


class NotificationResponse(BaseModel):
    """Notification response."""
    id: int
    user_id: int
    type: str
    title: str
    message: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    link: Optional[str] = None
    is_read: int
    created_at: str
    read_at: Optional[str] = None


class NotificationsListResponse(BaseModel):
    """List of notifications."""
    notifications: list[NotificationResponse]
    unread_count: int


# =============================================================================
# TIME TRACKING SCHEMAS
# =============================================================================

class ClockInRequest(BaseModel):
    """Clock in request."""
    project_id: Optional[int] = None
    notes: Optional[str] = None


class ClockOutRequest(BaseModel):
    """Clock out request."""
    notes: Optional[str] = None
    break_minutes: int = 0


class TimeEntryResponse(BaseModel):
    """Time entry response."""
    id: int
    user_id: int
    clock_in: str
    clock_out: Optional[str] = None
    project_id: Optional[int] = None
    notes: Optional[str] = None
    break_minutes: int = 0
    created_at: str
    updated_at: str
    # Computed fields
    duration_minutes: Optional[int] = None
    is_active: bool = False


class TimeEntryUpdate(BaseModel):
    """Update a time entry."""
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    project_id: Optional[int] = None
    notes: Optional[str] = None
    break_minutes: Optional[int] = None


class TimeEntriesListResponse(BaseModel):
    """List of time entries."""
    entries: list[TimeEntryResponse]
    total: int
    current_entry: Optional[TimeEntryResponse] = None


class ClockStatusResponse(BaseModel):
    """Current clock status."""
    is_clocked_in: bool
    current_entry: Optional[TimeEntryResponse] = None
    today_total_minutes: int = 0


# =============================================================================
# CALENDAR SCHEMAS
# =============================================================================

class CalendarEventCreate(BaseModel):
    """Create a calendar event."""
    summary: str
    description: Optional[str] = None
    start: str  # ISO datetime
    end: str    # ISO datetime
    location: Optional[str] = None
    all_day: bool = False


class CalendarEventUpdate(BaseModel):
    """Update a calendar event."""
    summary: Optional[str] = None
    description: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    location: Optional[str] = None


class CalendarEventResponse(BaseModel):
    """Calendar event response."""
    id: str
    summary: str
    description: Optional[str] = None
    start: str
    end: str
    location: Optional[str] = None
    all_day: bool = False
    html_link: Optional[str] = None
    attendees: Optional[list[str]] = None
    calendar_id: Optional[str] = None


class CalendarEventsListResponse(BaseModel):
    """List of calendar events."""
    events: list[CalendarEventResponse]
    view: str  # 'day', '3day', 'week', 'month'
    start_date: str
    end_date: str


# =============================================================================
# WEATHER SCHEMAS
# =============================================================================

class WeatherCondition(BaseModel):
    """Current weather condition."""
    temp_f: float
    temp_c: float
    condition: str
    icon: str
    humidity: int
    wind_mph: float
    wind_direction: str
    feels_like_f: float
    feels_like_c: float


class WeatherForecastDay(BaseModel):
    """Daily forecast."""
    date: str
    high_f: float
    low_f: float
    condition: str
    icon: str
    chance_of_rain: int
    chance_of_snow: int


class WeatherResponse(BaseModel):
    """Weather response."""
    location: str
    current: WeatherCondition
    forecast: list[WeatherForecastDay]
    alerts: list[str] = []
    last_updated: str
