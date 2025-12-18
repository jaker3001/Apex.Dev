"""
Inbox API routes for quick captures.
Handles notes, photos, audio, documents, and tasks in the inbox.
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import os
from pathlib import Path
from datetime import datetime

from api.routes.auth import require_auth
from api.schemas.hub import (
    InboxItemCreate,
    InboxItemUpdate,
    InboxItemResponse,
    InboxListResponse,
    LinkToJobRequest,
)
from database.operations_hub import (
    create_inbox_item,
    get_inbox_items,
    get_inbox_item,
    update_inbox_item,
    delete_inbox_item,
    get_inbox_count,
)

router = APIRouter()

# Upload directory for inbox files
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "inbox"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/inbox", response_model=InboxListResponse)
async def list_inbox_items(
    processed: Optional[bool] = None,
    item_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(require_auth)
):
    """List inbox items for the current user."""
    items = get_inbox_items(
        user_id=current_user.id,
        processed=processed,
        item_type=item_type,
        limit=limit,
        offset=offset
    )
    unprocessed_count = get_inbox_count(current_user.id, processed=False)

    return InboxListResponse(
        items=[InboxItemResponse(**item) for item in items],
        total=len(items),
        unprocessed_count=unprocessed_count
    )


@router.post("/inbox", response_model=InboxItemResponse)
async def create_inbox_item_endpoint(
    item: InboxItemCreate,
    current_user = Depends(require_auth)
):
    """Create a new inbox item (quick capture)."""
    result = create_inbox_item(
        user_id=current_user.id,
        item_type=item.type,
        title=item.title,
        content=item.content,
        file_path=item.file_path,
        file_size=item.file_size,
        mime_type=item.mime_type,
        project_id=item.project_id
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to create inbox item")

    return InboxItemResponse(**result)


@router.post("/inbox/upload", response_model=InboxItemResponse)
async def upload_inbox_file(
    file: UploadFile = File(...),
    item_type: str = Form(...),
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    project_id: Optional[int] = Form(None),
    current_user = Depends(require_auth)
):
    """Upload a file to inbox (photo, audio, document)."""
    if item_type not in ['photo', 'audio', 'document']:
        raise HTTPException(status_code=400, detail="Invalid item type for file upload")

    # Create user-specific upload directory
    user_dir = UPLOAD_DIR / str(current_user.id)
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

    # Create inbox item
    result = create_inbox_item(
        user_id=current_user.id,
        item_type=item_type,
        title=title or file.filename,
        content=content,
        file_path=str(file_path),
        file_size=len(contents),
        mime_type=file.content_type,
        project_id=project_id
    )

    if not result:
        # Clean up file if DB insert failed
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to create inbox item")

    return InboxItemResponse(**result)


@router.get("/inbox/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item_endpoint(
    item_id: int,
    current_user = Depends(require_auth)
):
    """Get a specific inbox item."""
    item = get_inbox_item(item_id, current_user.id)

    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(**item)


@router.patch("/inbox/{item_id}", response_model=InboxItemResponse)
async def update_inbox_item_endpoint(
    item_id: int,
    update: InboxItemUpdate,
    current_user = Depends(require_auth)
):
    """Update an inbox item."""
    result = update_inbox_item(
        item_id=item_id,
        user_id=current_user.id,
        title=update.title,
        content=update.content,
        project_id=update.project_id,
        processed=update.processed
    )

    if not result:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(**result)


@router.post("/inbox/{item_id}/link", response_model=InboxItemResponse)
async def link_inbox_item_to_job(
    item_id: int,
    link: LinkToJobRequest,
    current_user = Depends(require_auth)
):
    """Link an inbox item to a job."""
    result = update_inbox_item(
        item_id=item_id,
        user_id=current_user.id,
        project_id=link.project_id
    )

    if not result:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(**result)


@router.post("/inbox/{item_id}/process", response_model=InboxItemResponse)
async def mark_inbox_item_processed(
    item_id: int,
    current_user = Depends(require_auth)
):
    """Mark an inbox item as processed."""
    result = update_inbox_item(
        item_id=item_id,
        user_id=current_user.id,
        processed=True
    )

    if not result:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    return InboxItemResponse(**result)


@router.delete("/inbox/{item_id}")
async def delete_inbox_item_endpoint(
    item_id: int,
    current_user = Depends(require_auth)
):
    """Delete an inbox item."""
    # Get item first to check for file
    item = get_inbox_item(item_id, current_user.id)

    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")

    # Delete associated file if exists
    if item.get("file_path") and os.path.exists(item["file_path"]):
        try:
            os.remove(item["file_path"])
        except Exception:
            pass  # Log but don't fail if file deletion fails

    # Delete DB record
    success = delete_inbox_item(item_id, current_user.id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete inbox item")

    return {"success": True, "message": "Inbox item deleted"}


@router.get("/inbox/count/unprocessed")
async def get_unprocessed_count(
    current_user = Depends(require_auth)
):
    """Get count of unprocessed inbox items."""
    count = get_inbox_count(current_user.id, processed=False)
    return {"count": count}
