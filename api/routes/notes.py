"""
Apex Assistant - Notes Routes

REST API endpoints for notes with full Ultimate Brain types.
Supports linking notes to tasks, projects, jobs, people, and events.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    NoteType, LinkableType,
    NoteCreate, NoteUpdate, NoteResponse, NotesResponse,
    NoteLinkResponse,
)
from api.repositories.note_repository_v2 import NoteRepositoryV2

router = APIRouter()


def get_note_repo() -> NoteRepositoryV2:
    """Get note repository instance."""
    return NoteRepositoryV2()


# ============================================
# NOTE ENDPOINTS
# ============================================

@router.get("/notes", response_model=NotesResponse)
async def list_notes(
    type: Optional[NoteType] = Query(None, description="Filter by note type"),
    tag_id: Optional[int] = Query(None, description="Filter by tag"),
    project_id: Optional[int] = Query(None, description="Filter by project"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    is_pinned: Optional[bool] = Query(None, description="Filter pinned"),
    include_archived: bool = Query(False, description="Include archived notes"),
    search: Optional[str] = Query(None, description="Search in title/content"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """
    Get notes with optional filters.

    Note types include:
    - `note`: General note
    - `journal`: Daily journal entry
    - `meeting`: Meeting notes with attendees
    - `web_clip`: Saved web content with source URL
    - `idea`: Quick ideas and thoughts
    - `reference`: Reference material
    - `voice_note`: Audio recording transcription
    - `book`, `lecture`, `plan`, `recipe`: Specialized types
    """
    if type == "journal":
        notes = await repo.find_journals(
            user.id,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )
    elif type == "meeting":
        notes = await repo.find_meetings(
            user.id,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )
    elif type == "web_clip":
        notes = await repo.find_web_clips(
            user.id,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )
    elif type == "idea":
        notes = await repo.find_ideas(
            user.id,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )
    elif type:
        notes = await repo.find_by_type(
            user.id, type,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )
    else:
        notes = await repo.find_by_user(
            user.id,
            include_archived=include_archived,
            limit=limit,
            offset=offset,
        )

    # Filter by project
    if project_id:
        notes = [n for n in notes if n.project_id == project_id]

    # Filter favorites/pinned
    if is_favorite is not None:
        notes = [n for n in notes if n.is_favorite == is_favorite]
    if is_pinned is not None:
        notes = [n for n in notes if n.is_pinned == is_pinned]

    # Search filter
    if search:
        search_lower = search.lower()
        notes = [
            n for n in notes
            if search_lower in n.title.lower()
            or (n.content and search_lower in n.content.lower())
        ]

    return NotesResponse(notes=notes, total=len(notes))


@router.post("/notes", response_model=NoteResponse)
async def create_note(
    data: NoteCreate,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """
    Create a new note.

    Notes can be linked to tags, tasks, and people during creation.
    Use `tag_ids`, `linked_task_ids`, `linked_person_ids` arrays.
    """
    note_data = data.model_dump(exclude={"tag_ids", "linked_task_ids", "linked_person_ids"})
    note_data["user_id"] = user.id

    # Calculate word count if content provided
    if data.content:
        note_data["word_count"] = len(data.content.split())

    note = await repo.create(note_data)

    # Add tags if provided
    if data.tag_ids:
        for tag_id in data.tag_ids:
            await repo.add_tag(note.id, tag_id)

    # Add task links if provided
    if data.linked_task_ids:
        for task_id in data.linked_task_ids:
            await repo.add_link(note.id, "task", task_id)

    # Add person links if provided
    if data.linked_person_ids:
        for person_id in data.linked_person_ids:
            await repo.add_link(note.id, "person", person_id)

    # Fetch full note with relations
    note = await repo.find_by_id(note.id)
    return note


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Get a specific note with all linked entities."""
    note = await repo.find_by_id(note_id)
    if not note or note.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Update a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    # Recalculate word count if content changed
    if "content" in update_data and update_data["content"]:
        update_data["word_count"] = len(update_data["content"].split())

    note = await repo.update(note_id, update_data)
    return note


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Delete a note and all its links."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    success = await repo.delete(note_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete note")

    return {"status": "ok", "deleted": True}


# ============================================
# NOTE ACTIONS
# ============================================

@router.post("/notes/{note_id}/favorite", response_model=NoteResponse)
async def toggle_favorite(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Toggle favorite status."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    note = await repo.update(note_id, {"is_favorite": not existing.is_favorite})
    return note


@router.post("/notes/{note_id}/pin", response_model=NoteResponse)
async def toggle_pin(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Toggle pinned status."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    note = await repo.update(note_id, {"is_pinned": not existing.is_pinned})
    return note


@router.post("/notes/{note_id}/archive", response_model=NoteResponse)
async def archive_note(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Archive a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    note = await repo.update(note_id, {"archived": True})
    return note


@router.post("/notes/{note_id}/unarchive", response_model=NoteResponse)
async def unarchive_note(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Unarchive a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    note = await repo.update(note_id, {"archived": False})
    return note


# ============================================
# TAG MANAGEMENT
# ============================================

@router.post("/notes/{note_id}/tags/{tag_id}", response_model=NoteResponse)
async def add_tag_to_note(
    note_id: int,
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Add a tag to a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    success = await repo.add_tag(note_id, tag_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add tag")

    note = await repo.find_by_id(note_id)
    return note


@router.delete("/notes/{note_id}/tags/{tag_id}", response_model=NoteResponse)
async def remove_tag_from_note(
    note_id: int,
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Remove a tag from a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    success = await repo.remove_tag(note_id, tag_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove tag")

    note = await repo.find_by_id(note_id)
    return note


# ============================================
# LINK MANAGEMENT (Polymorphic)
# ============================================

@router.get("/notes/{note_id}/links", response_model=List[NoteLinkResponse])
async def get_note_links(
    note_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Get all links for a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    return existing.links


@router.post("/notes/{note_id}/links")
async def add_link_to_note(
    note_id: int,
    linkable_type: LinkableType = Query(..., description="Type of linked entity"),
    linkable_id: int = Query(..., description="ID of linked entity"),
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """
    Add a link from a note to another entity.

    Linkable types:
    - `task`: Link to a task
    - `project`: Link to a personal project
    - `job`: Link to a business job
    - `person`: Link to a personal contact
    - `event`: Link to a calendar event
    """
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    success = await repo.add_link(note_id, linkable_type, linkable_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to add link")

    note = await repo.find_by_id(note_id)
    return {"status": "ok", "links": note.links}


@router.delete("/notes/{note_id}/links")
async def remove_link_from_note(
    note_id: int,
    linkable_type: LinkableType = Query(..., description="Type of linked entity"),
    linkable_id: int = Query(..., description="ID of linked entity"),
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """Remove a link from a note."""
    existing = await repo.find_by_id(note_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found")

    success = await repo.remove_link(note_id, linkable_type, linkable_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove link")

    note = await repo.find_by_id(note_id)
    return {"status": "ok", "links": note.links}


# ============================================
# FIND NOTES BY LINKED ENTITY
# ============================================

@router.get("/notes/linked-to/{linkable_type}/{linkable_id}", response_model=NotesResponse)
async def get_notes_linked_to(
    linkable_type: LinkableType,
    linkable_id: int,
    user: UserProfile = Depends(require_auth),
    repo: NoteRepositoryV2 = Depends(get_note_repo),
):
    """
    Find all notes linked to a specific entity.

    Useful for showing related notes on task, project, or person detail pages.
    """
    notes = await repo.find_notes_linked_to(linkable_type, linkable_id)

    # Filter to only user's notes
    notes = [n for n in notes if n.user_id == user.id]

    return NotesResponse(notes=notes, total=len(notes))
