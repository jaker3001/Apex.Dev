"""
Google OAuth Routes for Calendar Integration.

Handles the OAuth flow for connecting Google Calendar to user accounts.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from api.routes.auth import require_auth, UserResponse

logger = logging.getLogger("apex_assistant.google_auth")

router = APIRouter()


class GoogleCalendarStatus(BaseModel):
    """Response model for Google Calendar connection status."""
    connected: bool
    email: Optional[str] = None
    selectedCalendarIds: Optional[list[str]] = None
    syncEnabled: Optional[bool] = None
    connectedAt: Optional[str] = None


class GoogleCalendarInfo(BaseModel):
    """Model for a Google Calendar."""
    id: str
    summary: str
    primary: bool
    backgroundColor: Optional[str] = None
    accessRole: str


class GoogleCalendarsResponse(BaseModel):
    """Response model for list of calendars."""
    calendars: list[GoogleCalendarInfo]


class GoogleCalendarSettings(BaseModel):
    """Settings update request."""
    selectedCalendarIds: Optional[list[str]] = None
    syncEnabled: Optional[bool] = None


def get_calendar_service():
    """Get the Google Calendar service, or raise error if not configured."""
    try:
        from api.services.google_calendar import get_google_calendar_service
        return get_google_calendar_service()
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar integration not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )


@router.get("/auth/google/authorize")
async def google_authorize(current_user: UserResponse = Depends(require_auth)):
    """
    Start the Google OAuth flow.

    Redirects the user to Google's consent page.
    """
    service = get_calendar_service()

    # Use user ID as state for verification
    user_id = str(current_user.id)
    authorization_url, state = service.get_authorization_url(user_id)

    return RedirectResponse(url=authorization_url)


@router.get("/auth/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """
    Handle the OAuth callback from Google.

    This endpoint receives the authorization code and exchanges it for tokens.
    """
    if error:
        logger.error(f"Google OAuth error: {error}")
        return HTMLResponse(
            content=_oauth_result_page(success=False, error=error),
            status_code=400,
        )

    try:
        service = get_calendar_service()
        result = await service.handle_oauth_callback(code=code, state=state)

        logger.info(f"Google Calendar connected for user {state}")

        return HTMLResponse(
            content=_oauth_result_page(
                success=True,
                email=result.get("email"),
            ),
        )
    except Exception as e:
        logger.exception(f"OAuth callback error: {e}")
        return HTMLResponse(
            content=_oauth_result_page(success=False, error=str(e)),
            status_code=500,
        )


@router.get("/auth/google/status", response_model=GoogleCalendarStatus)
async def google_status(current_user: UserResponse = Depends(require_auth)):
    """
    Check if Google Calendar is connected for the current user.
    """
    try:
        service = get_calendar_service()
        status = await service.get_connection_status(str(current_user.id))
        return GoogleCalendarStatus(**status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking Google status: {e}")
        return GoogleCalendarStatus(connected=False)


@router.post("/auth/google/disconnect")
async def google_disconnect(current_user: UserResponse = Depends(require_auth)):
    """
    Disconnect Google Calendar from the user's account.
    """
    service = get_calendar_service()

    try:
        await service.disconnect(str(current_user.id))
        return {"success": True, "message": "Google Calendar disconnected"}
    except Exception as e:
        logger.exception(f"Error disconnecting Google: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect Google Calendar")


@router.get("/auth/google/calendars", response_model=GoogleCalendarsResponse)
async def list_google_calendars(current_user: UserResponse = Depends(require_auth)):
    """
    List all Google Calendars available to the user.
    """
    service = get_calendar_service()

    try:
        calendars = await service.list_calendars(str(current_user.id))
        return GoogleCalendarsResponse(
            calendars=[
                GoogleCalendarInfo(
                    id=cal.id,
                    summary=cal.summary,
                    primary=cal.primary,
                    backgroundColor=cal.background_color,
                    accessRole=cal.access_role,
                )
                for cal in calendars
            ]
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.exception(f"Error listing calendars: {e}")
        raise HTTPException(status_code=500, detail="Failed to list calendars")


@router.put("/auth/google/settings", response_model=GoogleCalendarStatus)
async def update_google_settings(
    settings: GoogleCalendarSettings,
    current_user: UserResponse = Depends(require_auth),
):
    """
    Update Google Calendar sync settings.
    """
    service = get_calendar_service()

    try:
        updated = await service.update_settings(
            user_id=str(current_user.id),
            selected_calendar_ids=settings.selectedCalendarIds,
            sync_enabled=settings.syncEnabled,
        )
        return GoogleCalendarStatus(**updated)
    except Exception as e:
        logger.exception(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update settings")


def _oauth_result_page(success: bool, email: Optional[str] = None, error: Optional[str] = None) -> str:
    """
    Generate HTML page to display OAuth result and communicate back to opener.
    """
    if success:
        title = "Connected!"
        message = f"Successfully connected Google Calendar{' for ' + email if email else ''}."
        icon = "✓"
        icon_color = "#22c55e"  # green
        message_type = "google-auth-success"
    else:
        title = "Connection Failed"
        message = f"Failed to connect Google Calendar: {error or 'Unknown error'}"
        icon = "✗"
        icon_color = "#ef4444"  # red
        message_type = "google-auth-error"

    return f"""
<!DOCTYPE html>
<html>
<head>
    <title>{title} - Apex Assistant</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }}
        .container {{
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            max-width: 400px;
            margin: 20px;
        }}
        .icon {{
            font-size: 64px;
            color: {icon_color};
            margin-bottom: 20px;
        }}
        h1 {{
            font-size: 24px;
            margin-bottom: 12px;
        }}
        p {{
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
        }}
        .close-hint {{
            margin-top: 20px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">{icon}</div>
        <h1>{title}</h1>
        <p>{message}</p>
        <p class="close-hint">This window will close automatically...</p>
    </div>
    <script>
        // Communicate result to opener window
        if (window.opener) {{
            window.opener.postMessage({{ type: '{message_type}' }}, '*');
        }}
        // Close window after a short delay
        setTimeout(() => {{
            window.close();
        }}, 2000);
    </script>
</body>
</html>
"""
