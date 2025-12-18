"""
Notifications API routes.
Handles @mentions, alerts, reminders, and system notifications.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from api.routes.auth import require_auth
from api.schemas.hub import (
    NotificationResponse,
    NotificationsListResponse,
)
from database.operations_hub import (
    get_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    delete_notification,
    get_unread_notification_count,
)

router = APIRouter()


@router.get("/notifications", response_model=NotificationsListResponse)
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(require_auth)
):
    """List notifications for the current user."""
    notifications = get_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    unread_count = get_unread_notification_count(current_user.id)

    return NotificationsListResponse(
        notifications=[NotificationResponse(**n) for n in notifications],
        unread_count=unread_count
    )


@router.get("/notifications/count")
async def get_notification_count(
    current_user = Depends(require_auth)
):
    """Get unread notification count (for bell badge)."""
    count = get_unread_notification_count(current_user.id)
    return {"unread_count": count}


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_as_read(
    notif_id: int,
    current_user = Depends(require_auth)
):
    """Mark a notification as read."""
    success = mark_notification_read(notif_id, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True, "message": "Notification marked as read"}


@router.post("/notifications/read-all")
async def mark_all_as_read(
    current_user = Depends(require_auth)
):
    """Mark all notifications as read."""
    count = mark_all_notifications_read(current_user.id)
    return {"success": True, "marked_count": count}


@router.delete("/notifications/{notif_id}")
async def delete_notification_endpoint(
    notif_id: int,
    current_user = Depends(require_auth)
):
    """Delete a notification."""
    success = delete_notification(notif_id, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True, "message": "Notification deleted"}
