"""
Google Calendar Service.

Handles OAuth flow and Calendar API operations for Google Calendar integration.
Tokens are stored in Supabase for persistence across sessions.
"""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from dataclasses import dataclass

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from api.services.supabase_client import get_service_client

logger = logging.getLogger("apex_assistant.google_calendar")

# OAuth 2.0 scopes for Google Calendar
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
]


@dataclass
class GoogleCalendarConfig:
    """Configuration for Google Calendar OAuth."""
    client_id: str
    client_secret: str
    redirect_uri: str

    @classmethod
    def from_env(cls) -> "GoogleCalendarConfig":
        """Load configuration from environment variables."""
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.environ.get(
            "GOOGLE_REDIRECT_URI",
            "http://localhost:8000/api/auth/google/callback"
        )

        if not client_id or not client_secret:
            raise ValueError(
                "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set "
                "for Google Calendar integration"
            )

        return cls(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
        )


@dataclass
class CalendarEvent:
    """Represents a calendar event."""
    id: str
    summary: str
    description: Optional[str]
    start: str  # ISO datetime
    end: str  # ISO datetime
    location: Optional[str]
    all_day: bool
    html_link: Optional[str]
    attendees: Optional[list[str]] = None
    calendar_id: Optional[str] = None


@dataclass
class CalendarInfo:
    """Represents a Google Calendar."""
    id: str
    summary: str
    primary: bool
    background_color: Optional[str]
    access_role: str  # 'reader', 'writer', 'owner'


class GoogleCalendarService:
    """
    Service for Google Calendar operations.

    Handles OAuth flow and provides methods for:
    - Listing calendars
    - Listing events
    - Creating, updating, and deleting events
    """

    def __init__(self, config: Optional[GoogleCalendarConfig] = None):
        """Initialize the service with configuration."""
        self.config = config or GoogleCalendarConfig.from_env()
        self._supabase = get_service_client()

    def get_oauth_flow(self, state: Optional[str] = None) -> Flow:
        """Create an OAuth flow for the authorization process."""
        client_config = {
            "web": {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.config.redirect_uri],
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=self.config.redirect_uri,
        )

        if state:
            flow.state = state

        return flow

    def get_authorization_url(self, user_id: str) -> tuple[str, str]:
        """
        Generate the OAuth authorization URL.

        Args:
            user_id: The user ID to store in the state parameter

        Returns:
            Tuple of (authorization_url, state)
        """
        flow = self.get_oauth_flow()

        authorization_url, state = flow.authorization_url(
            access_type="offline",  # Get refresh token
            include_granted_scopes="true",
            prompt="consent",  # Force consent screen to get refresh token
            state=user_id,  # Use user_id as state for verification
        )

        return authorization_url, state

    async def handle_oauth_callback(
        self,
        code: str,
        state: str,
    ) -> dict[str, Any]:
        """
        Handle the OAuth callback and store tokens.

        Args:
            code: Authorization code from Google
            state: State parameter (contains user_id)

        Returns:
            Dict with user info and success status
        """
        user_id = state  # State contains the user_id

        flow = self.get_oauth_flow()
        flow.fetch_token(code=code)

        credentials = flow.credentials

        # Get user's Google email
        from googleapiclient.discovery import build as build_service
        oauth2_service = build_service("oauth2", "v2", credentials=credentials)
        user_info = oauth2_service.userinfo().get().execute()
        google_email = user_info.get("email")
        google_account_id = user_info.get("id")

        # Store tokens in Supabase
        token_data = {
            "user_id": user_id,
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
            "google_email": google_email,
            "google_account_id": google_account_id,
            "selected_calendar_ids": json.dumps(["primary"]),  # Default to primary calendar
            "sync_enabled": True,
        }

        # Upsert tokens (insert or update on conflict)
        result = self._supabase.table("app.user_google_tokens").upsert(
            token_data,
            on_conflict="user_id"
        ).execute()

        logger.info(f"Stored Google OAuth tokens for user {user_id}")

        return {
            "success": True,
            "email": google_email,
            "user_id": user_id,
        }

    async def get_credentials(self, user_id: str) -> Optional[Credentials]:
        """
        Get valid credentials for a user, refreshing if necessary.

        Args:
            user_id: The user's ID

        Returns:
            Valid Google credentials or None if not connected
        """
        # Fetch tokens from Supabase
        result = self._supabase.table("app.user_google_tokens").select(
            "access_token, refresh_token, token_expiry"
        ).eq("user_id", user_id).single().execute()

        if not result.data:
            return None

        token_data = result.data

        # Build credentials object
        credentials = Credentials(
            token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            expiry=datetime.fromisoformat(token_data["token_expiry"].replace("Z", "+00:00"))
            if token_data["token_expiry"] else None,
        )

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())

                # Update stored tokens
                self._supabase.table("app.user_google_tokens").update({
                    "access_token": credentials.token,
                    "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                }).eq("user_id", user_id).execute()

                logger.info(f"Refreshed Google tokens for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to refresh tokens for user {user_id}: {e}")
                return None

        return credentials

    async def get_connection_status(self, user_id: str) -> dict[str, Any]:
        """
        Get the Google Calendar connection status for a user.

        Args:
            user_id: The user's ID

        Returns:
            Dict with connection status and info
        """
        result = self._supabase.table("app.user_google_tokens").select(
            "google_email, selected_calendar_ids, sync_enabled, created_at"
        ).eq("user_id", user_id).single().execute()

        if not result.data:
            return {"connected": False}

        data = result.data
        selected_ids = json.loads(data["selected_calendar_ids"]) if data["selected_calendar_ids"] else []

        return {
            "connected": True,
            "email": data["google_email"],
            "selectedCalendarIds": selected_ids,
            "syncEnabled": data["sync_enabled"],
            "connectedAt": data["created_at"],
        }

    async def disconnect(self, user_id: str) -> bool:
        """
        Disconnect Google Calendar for a user.

        Args:
            user_id: The user's ID

        Returns:
            True if disconnected successfully
        """
        result = self._supabase.table("app.user_google_tokens").delete().eq(
            "user_id", user_id
        ).execute()

        logger.info(f"Disconnected Google Calendar for user {user_id}")
        return True

    async def list_calendars(self, user_id: str) -> list[CalendarInfo]:
        """
        List all calendars for a user.

        Args:
            user_id: The user's ID

        Returns:
            List of CalendarInfo objects
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            raise ValueError("User not connected to Google Calendar")

        service = build("calendar", "v3", credentials=credentials)

        calendars = []
        page_token = None

        while True:
            calendar_list = service.calendarList().list(
                pageToken=page_token
            ).execute()

            for cal in calendar_list.get("items", []):
                calendars.append(CalendarInfo(
                    id=cal["id"],
                    summary=cal.get("summary", ""),
                    primary=cal.get("primary", False),
                    background_color=cal.get("backgroundColor"),
                    access_role=cal.get("accessRole", "reader"),
                ))

            page_token = calendar_list.get("nextPageToken")
            if not page_token:
                break

        return calendars

    async def list_events(
        self,
        user_id: str,
        start_date: str,
        end_date: str,
        calendar_ids: Optional[list[str]] = None,
    ) -> list[CalendarEvent]:
        """
        List events from user's calendars.

        Args:
            user_id: The user's ID
            start_date: ISO datetime for range start
            end_date: ISO datetime for range end
            calendar_ids: Specific calendars to query (defaults to user's selected)

        Returns:
            List of CalendarEvent objects
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            return []

        # Get user's selected calendars if not specified
        if not calendar_ids:
            result = self._supabase.table("app.user_google_tokens").select(
                "selected_calendar_ids"
            ).eq("user_id", user_id).single().execute()

            if result.data and result.data["selected_calendar_ids"]:
                calendar_ids = json.loads(result.data["selected_calendar_ids"])
            else:
                calendar_ids = ["primary"]

        service = build("calendar", "v3", credentials=credentials)
        events = []

        for cal_id in calendar_ids:
            try:
                events_result = service.events().list(
                    calendarId=cal_id,
                    timeMin=start_date,
                    timeMax=end_date,
                    singleEvents=True,
                    orderBy="startTime",
                    maxResults=250,
                ).execute()

                for event in events_result.get("items", []):
                    # Handle all-day vs timed events
                    start = event["start"]
                    end = event["end"]

                    if "date" in start:
                        # All-day event
                        event_start = start["date"] + "T00:00:00Z"
                        event_end = end["date"] + "T23:59:59Z"
                        all_day = True
                    else:
                        event_start = start.get("dateTime", start.get("date"))
                        event_end = end.get("dateTime", end.get("date"))
                        all_day = False

                    # Get attendee emails
                    attendees = None
                    if "attendees" in event:
                        attendees = [a.get("email") for a in event["attendees"] if a.get("email")]

                    events.append(CalendarEvent(
                        id=event["id"],
                        summary=event.get("summary", "(No title)"),
                        description=event.get("description"),
                        start=event_start,
                        end=event_end,
                        location=event.get("location"),
                        all_day=all_day,
                        html_link=event.get("htmlLink"),
                        attendees=attendees,
                        calendar_id=cal_id,
                    ))

            except HttpError as e:
                logger.warning(f"Failed to fetch events from calendar {cal_id}: {e}")
                continue

        # Sort all events by start time
        events.sort(key=lambda e: e.start)

        return events

    async def create_event(
        self,
        user_id: str,
        summary: str,
        start: str,
        end: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
        all_day: bool = False,
        calendar_id: str = "primary",
    ) -> CalendarEvent:
        """
        Create a new calendar event.

        Args:
            user_id: The user's ID
            summary: Event title
            start: ISO datetime for event start
            end: ISO datetime for event end
            description: Optional event description
            location: Optional event location
            all_day: Whether this is an all-day event
            calendar_id: Calendar to create event in (default: primary)

        Returns:
            Created CalendarEvent
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            raise ValueError("User not connected to Google Calendar")

        service = build("calendar", "v3", credentials=credentials)

        # Build event body
        event_body: dict[str, Any] = {
            "summary": summary,
        }

        if description:
            event_body["description"] = description
        if location:
            event_body["location"] = location

        if all_day:
            # All-day events use 'date' instead of 'dateTime'
            event_body["start"] = {"date": start[:10]}
            event_body["end"] = {"date": end[:10]}
        else:
            event_body["start"] = {"dateTime": start, "timeZone": "UTC"}
            event_body["end"] = {"dateTime": end, "timeZone": "UTC"}

        result = service.events().insert(
            calendarId=calendar_id,
            body=event_body,
        ).execute()

        logger.info(f"Created event '{summary}' for user {user_id}")

        return CalendarEvent(
            id=result["id"],
            summary=result.get("summary", summary),
            description=result.get("description"),
            start=start,
            end=end,
            location=result.get("location"),
            all_day=all_day,
            html_link=result.get("htmlLink"),
            calendar_id=calendar_id,
        )

    async def update_event(
        self,
        user_id: str,
        event_id: str,
        summary: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
        calendar_id: str = "primary",
    ) -> CalendarEvent:
        """
        Update an existing calendar event.

        Args:
            user_id: The user's ID
            event_id: The event ID to update
            summary: New event title
            start: New start datetime
            end: New end datetime
            description: New description
            location: New location
            calendar_id: Calendar containing the event

        Returns:
            Updated CalendarEvent
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            raise ValueError("User not connected to Google Calendar")

        service = build("calendar", "v3", credentials=credentials)

        # Get existing event
        existing = service.events().get(
            calendarId=calendar_id,
            eventId=event_id,
        ).execute()

        # Update fields
        if summary is not None:
            existing["summary"] = summary
        if description is not None:
            existing["description"] = description
        if location is not None:
            existing["location"] = location
        if start is not None:
            existing["start"] = {"dateTime": start, "timeZone": "UTC"}
        if end is not None:
            existing["end"] = {"dateTime": end, "timeZone": "UTC"}

        result = service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=existing,
        ).execute()

        logger.info(f"Updated event {event_id} for user {user_id}")

        # Determine if all-day
        is_all_day = "date" in result.get("start", {})
        event_start = result["start"].get("dateTime") or result["start"].get("date")
        event_end = result["end"].get("dateTime") or result["end"].get("date")

        return CalendarEvent(
            id=result["id"],
            summary=result.get("summary", ""),
            description=result.get("description"),
            start=event_start,
            end=event_end,
            location=result.get("location"),
            all_day=is_all_day,
            html_link=result.get("htmlLink"),
            calendar_id=calendar_id,
        )

    async def delete_event(
        self,
        user_id: str,
        event_id: str,
        calendar_id: str = "primary",
    ) -> bool:
        """
        Delete a calendar event.

        Args:
            user_id: The user's ID
            event_id: The event ID to delete
            calendar_id: Calendar containing the event

        Returns:
            True if deleted successfully
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            raise ValueError("User not connected to Google Calendar")

        service = build("calendar", "v3", credentials=credentials)

        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id,
        ).execute()

        logger.info(f"Deleted event {event_id} for user {user_id}")
        return True

    async def update_settings(
        self,
        user_id: str,
        selected_calendar_ids: Optional[list[str]] = None,
        sync_enabled: Optional[bool] = None,
    ) -> dict[str, Any]:
        """
        Update calendar sync settings for a user.

        Args:
            user_id: The user's ID
            selected_calendar_ids: List of calendar IDs to sync
            sync_enabled: Whether sync is enabled

        Returns:
            Updated settings
        """
        update_data = {}

        if selected_calendar_ids is not None:
            update_data["selected_calendar_ids"] = json.dumps(selected_calendar_ids)
        if sync_enabled is not None:
            update_data["sync_enabled"] = sync_enabled

        if update_data:
            self._supabase.table("app.user_google_tokens").update(
                update_data
            ).eq("user_id", user_id).execute()

        return await self.get_connection_status(user_id)


# Singleton instance
_service_instance: Optional[GoogleCalendarService] = None


def get_google_calendar_service() -> GoogleCalendarService:
    """Get the singleton GoogleCalendarService instance."""
    global _service_instance
    if _service_instance is None:
        try:
            _service_instance = GoogleCalendarService()
        except ValueError as e:
            logger.warning(f"Google Calendar service not configured: {e}")
            raise
    return _service_instance
