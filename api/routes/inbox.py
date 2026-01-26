"""
Apex Assistant - Inbox Routes

REST API endpoints for GTD-style quick capture inbox.
Items can be captured and later processed into tasks, notes, or projects.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional
import os
from pathlib import Path
from datetime import datetime

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    InboxSource, ConvertedToType,
    InboxItemCreate, InboxItemUpdate, InboxItemResponse, InboxResponse,
)
from api.repositories.inbox_repository import InboxRepository

router = APIRouter()

# Upload directory for inbox files (legacy support)
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "inbox"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_inbox_repo() -> InboxRepository:
    """Get inbox repository instance."""
    return InboxRepository()


# ============================================
# INBOX ENDPOINTS
# ============================================

@router.get("/inbox", response_model=InboxResponse)
async def list_inbox_items(
    processed: Optional[bool] = Query(None, description="Filter by processed status"),
    source: Optional[InboxSource] = Query(None, description="Filter by source"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Get inbox items.

    By default returns unprocessed items. Use `processed=true` to see
    processed items, or `processed=false` to explicitly get unprocessed only.
    """
    if processed is False or processed is None:
        items = await repo.find_unprocessed(user.id, limit=limit, offset=offset)
    else:
        items = await repo.find_by_user(user.id, limit=limit, offset=offset)
        if processed is True:
            items = [i for i in items if i.processed]

    # Filter by source if provided
    if source:
        items = [i for i in items if i.source == source]

    # Count unprocessed
    unprocessed = await repo.find_unprocessed(user.id, limit=1000)
    unprocessed_count = len(unprocessed)

    return InboxResponse(
        items=items,
        total=len(items),
        unprocessed_count=unprocessed_count,
    )


@router.post("/inbox", response_model=InboxItemResponse)
async def quick_capture(
    data: InboxItemCreate,
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Quick capture an item to inbox.

    This is designed for fast capture - minimal fields required.
    Items can be processed later into tasks, notes, or projects.

    Sources:
    - `manual`: Typed in by user
    - `voice`: Voice transcription
    - `email`: Forwarded from email
    - `chrome_extension`: Captured from browser
    """
    item = await repo.quick_capture(
        user_id=user.id,
        content=data.content,
        source=data.source,
        source_url=data.source_url,
    )
    return item


@router.post("/inbox/upload", response_model=InboxItemResponse)
async def upload_inbox_file(
    file: UploadFile = File(...),
    source: InboxSource = Form("manual"),
    content: Optional[str] = Form(None),
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Upload a file to inbox.

    Saves file to local storage and creates inbox item with reference.
    File content can be processed later.
    """
    # Create user-specific upload directory
    user_dir = UPLOAD_DIR / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = user_dir / safe_filename

    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create inbox item with file reference
    item_content = content or f"File: {file.filename}"
    item = await repo.quick_capture(
        user_id=user.id,
        content=item_content,
        source=source,
        source_url=str(file_path),
    )

    return item


@router.get("/inbox/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    item_id: int,
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Get a specific inbox item."""
    item = await repo.find_by_id(item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return item


@router.patch("/inbox/{item_id}", response_model=InboxItemResponse)
async def update_inbox_item(
    item_id: int,
    data: InboxItemUpdate,
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Update an inbox item."""
    existing = await repo.find_by_id(item_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    item = await repo.update(item_id, update_data)
    return item


@router.delete("/inbox/{item_id}")
async def delete_inbox_item(
    item_id: int,
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Delete an inbox item."""
    existing = await repo.find_by_id(item_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    # Delete associated file if exists
    if existing.source_url and os.path.exists(existing.source_url):
        try:
            os.remove(existing.source_url)
        except Exception:
            pass  # Log but don't fail if file deletion fails

    success = await repo.delete(item_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete item")

    return {"status": "ok", "deleted": True}


# ============================================
# PROCESSING ACTIONS
# ============================================

@router.post("/inbox/{item_id}/process", response_model=InboxItemResponse)
async def mark_processed(
    item_id: int,
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Mark an inbox item as processed without conversion.

    Use this when the item doesn't need to become a task/note/project,
    but you still want to mark it as handled.
    """
    existing = await repo.find_by_id(item_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    item = await repo.mark_processed(item_id)
    return item


@router.post("/inbox/{item_id}/convert-to-task")
async def convert_to_task(
    item_id: int,
    list_id: Optional[int] = Query(None, description="Task list ID"),
    project_id: Optional[int] = Query(None, description="Project to assign to"),
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Convert an inbox item to a task.

    Creates a new task with the inbox item's content as the title,
    marks the inbox item as processed, and links them.
    """
    existing = await repo.find_by_id(item_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    if existing.processed:
        raise HTTPException(status_code=400, detail="Item already processed")

    result = await repo.convert_to_task(
        item_id,
        user_id=user.id,
        list_id=list_id,
        project_id=project_id,
    )

    return {
        "status": "ok",
        "converted_to": "task",
        "task_id": result["task_id"],
        "inbox_item": result["inbox_item"],
    }


@router.post("/inbox/{item_id}/convert-to-note")
async def convert_to_note(
    item_id: int,
    note_type: Optional[str] = Query("note", description="Note type"),
    project_id: Optional[int] = Query(None, description="Project to assign to"),
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """
    Convert an inbox item to a note.

    Creates a new note with the inbox item's content,
    marks the inbox item as processed, and links them.
    """
    existing = await repo.find_by_id(item_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    if existing.processed:
        raise HTTPException(status_code=400, detail="Item already processed")

    result = await repo.convert_to_note(
        item_id,
        user_id=user.id,
        note_type=note_type,
        project_id=project_id,
    )

    return {
        "status": "ok",
        "converted_to": "note",
        "note_id": result["note_id"],
        "inbox_item": result["inbox_item"],
    }


# ============================================
# COUNT ENDPOINT (Legacy Support)
# ============================================

@router.get("/inbox/count/unprocessed")
async def get_unprocessed_count(
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Get count of unprocessed inbox items."""
    items = await repo.find_unprocessed(user.id, limit=1000)
    return {"count": len(items)}


# ============================================
# BULK OPERATIONS
# ============================================

@router.post("/inbox/bulk-delete")
async def bulk_delete(
    item_ids: list[int],
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Delete multiple inbox items."""
    deleted_count = 0

    for item_id in item_ids:
        item = await repo.find_by_id(item_id)
        if item and item.user_id == user.id:
            # Delete associated file if exists
            if item.source_url and os.path.exists(item.source_url):
                try:
                    os.remove(item.source_url)
                except Exception:
                    pass

            success = await repo.delete(item_id)
            if success:
                deleted_count += 1

    return {
        "status": "ok",
        "deleted_count": deleted_count,
        "requested_count": len(item_ids),
    }


@router.post("/inbox/bulk-process")
async def bulk_process(
    item_ids: list[int],
    user: UserProfile = Depends(require_auth),
    repo: InboxRepository = Depends(get_inbox_repo),
):
    """Mark multiple inbox items as processed."""
    processed_count = 0

    for item_id in item_ids:
        item = await repo.find_by_id(item_id)
        if item and item.user_id == user.id and not item.processed:
            await repo.mark_processed(item_id)
            processed_count += 1

    return {
        "status": "ok",
        "processed_count": processed_count,
        "requested_count": len(item_ids),
    }
