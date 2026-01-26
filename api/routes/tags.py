"""
Apex Assistant - Tags Routes

REST API endpoints for PARA-style tag management.
Tags are organized by type: Area, Resource, Entity.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    TagType, TagCreate, TagUpdate, TagResponse, TagsResponse,
)
from api.repositories.tag_repository import TagRepository

router = APIRouter()


def get_tag_repo() -> TagRepository:
    """Get tag repository instance."""
    return TagRepository()


# ============================================
# TAG ENDPOINTS
# ============================================

@router.get("/tags", response_model=TagsResponse)
async def list_tags(
    type: Optional[TagType] = Query(None, description="Filter by tag type"),
    parent_id: Optional[int] = Query(None, description="Filter by parent tag"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    include_archived: bool = Query(False, description="Include archived tags"),
    hierarchical: bool = Query(False, description="Return with children nested"),
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """
    Get tags with optional filters.

    Use `type` to filter by PARA type (area, resource, entity).
    Use `hierarchical=true` to get nested parent/child structure.
    """
    if hierarchical:
        tags = await repo.find_with_hierarchy(user.id)
    elif type:
        if type == "area":
            tags = await repo.find_areas(user.id, include_archived=include_archived)
        elif type == "resource":
            tags = await repo.find_resources(user.id, include_archived=include_archived)
        elif type == "entity":
            tags = await repo.find_entities(user.id, include_archived=include_archived)
        else:
            tags = await repo.find_by_user(user.id, include_archived=include_archived)
    elif parent_id:
        tags = await repo.find_children(parent_id)
    else:
        tags = await repo.find_by_user(user.id, include_archived=include_archived)

    # Filter favorites if requested
    if is_favorite is not None:
        tags = [t for t in tags if t.is_favorite == is_favorite]

    return TagsResponse(tags=tags, total=len(tags))


@router.post("/tags", response_model=TagResponse)
async def create_tag(
    data: TagCreate,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Create a new tag."""
    tag_data = data.model_dump()
    tag_data["user_id"] = user.id

    tag = await repo.create(tag_data)
    return tag


@router.get("/tags/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    include_children: bool = Query(False, description="Include child tags"),
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Get a specific tag."""
    tag = await repo.find_by_id(tag_id)
    if not tag or tag.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    if include_children:
        children = await repo.find_children(tag_id)
        tag.children = children

    return tag


@router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Update a tag."""
    # Verify ownership
    existing = await repo.find_by_id(tag_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    tag = await repo.update(tag_id, update_data)
    return tag


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """
    Delete a tag.

    This will also remove the tag from any linked items
    (notes, tasks, people, etc.).
    """
    existing = await repo.find_by_id(tag_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Check for children
    children = await repo.find_children(tag_id)
    if children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete tag with children. Delete or reassign children first."
        )

    success = await repo.delete(tag_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete tag")

    return {"status": "ok", "deleted": True}


@router.post("/tags/{tag_id}/favorite", response_model=TagResponse)
async def toggle_favorite(
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Toggle favorite status for a tag."""
    existing = await repo.find_by_id(tag_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag = await repo.update(tag_id, {"is_favorite": not existing.is_favorite})
    return tag


@router.post("/tags/{tag_id}/archive", response_model=TagResponse)
async def archive_tag(
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Archive a tag."""
    existing = await repo.find_by_id(tag_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag = await repo.update(tag_id, {"archived": True})
    return tag


@router.post("/tags/{tag_id}/unarchive", response_model=TagResponse)
async def unarchive_tag(
    tag_id: int,
    user: UserProfile = Depends(require_auth),
    repo: TagRepository = Depends(get_tag_repo),
):
    """Unarchive a tag."""
    existing = await repo.find_by_id(tag_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    tag = await repo.update(tag_id, {"archived": False})
    return tag
