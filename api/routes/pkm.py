"""
PKM (Personal Knowledge Management) API Routes

Endpoints for managing markdown notes stored in user's filesystem.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from api.routes.auth import require_auth
from api.schemas.pkm import (
    BacklinksResponse,
    FileTreeResponse,
    FolderCreateRequest,
    NoteContent,
    NoteCreateRequest,
    NoteListResponse,
    NoteMetadata,
    NoteUpdateRequest,
    ReindexResponse,
    SearchRequest,
    SearchResponse,
)
from database.operations_pkm import (
    create_folder,
    delete_folder,
    delete_note_file,
    delete_note_metadata,
    get_backlinks,
    get_note_metadata,
    list_files_recursive,
    list_notes_metadata,
    read_note_file,
    reindex_all_notes,
    search_notes,
    upsert_note_metadata,
    write_note_file,
)

router = APIRouter(prefix="/pkm", tags=["pkm"])


# =============================================================================
# FILE TREE
# =============================================================================

@router.get("/tree", response_model=FileTreeResponse)
async def get_file_tree(current_user=Depends(require_auth)):
    """Get the file/folder tree for the user's PKM directory."""
    items = list_files_recursive(current_user.id)
    return FileTreeResponse(items=items, total=len(items))


# =============================================================================
# NOTES - LIST & SEARCH
# =============================================================================

@router.get("/notes", response_model=NoteListResponse)
async def list_notes(
    folder: str = None,
    limit: int = 100,
    offset: int = 0,
    current_user=Depends(require_auth),
):
    """List all notes (metadata) for the user."""
    notes = list_notes_metadata(
        user_id=current_user.id,
        folder=folder,
        limit=limit,
        offset=offset,
    )
    return NoteListResponse(notes=notes, total=len(notes))


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    current_user=Depends(require_auth),
):
    """Search notes by title or content."""
    results = search_notes(
        user_id=current_user.id,
        query=request.query,
        limit=request.limit,
    )
    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results),
    )


# =============================================================================
# NOTES - CRUD
# =============================================================================

@router.get("/notes/{file_path:path}", response_model=NoteContent)
async def get_note(
    file_path: str,
    current_user=Depends(require_auth),
):
    """Get a note's content and metadata."""
    # Read file content
    content = read_note_file(current_user.id, file_path)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {file_path}",
        )

    # Get metadata (may not exist yet if file was created externally)
    metadata = get_note_metadata(current_user.id, file_path)

    if metadata:
        return NoteContent(
            file_path=file_path,
            title=metadata["title"],
            content=content,
            created_at=metadata.get("created_at"),
            updated_at=metadata.get("updated_at"),
            word_count=metadata.get("word_count", 0),
            links_to=metadata.get("links_to", []),
            linked_from=metadata.get("linked_from", []),
            linked_jobs=metadata.get("linked_jobs", []),
        )
    else:
        # File exists but no metadata - index it now
        upsert_note_metadata(current_user.id, file_path, content)
        metadata = get_note_metadata(current_user.id, file_path)

        return NoteContent(
            file_path=file_path,
            title=metadata["title"] if metadata else file_path,
            content=content,
            created_at=metadata.get("created_at") if metadata else None,
            updated_at=metadata.get("updated_at") if metadata else None,
            word_count=metadata.get("word_count", 0) if metadata else 0,
            links_to=metadata.get("links_to", []) if metadata else [],
            linked_from=metadata.get("linked_from", []) if metadata else [],
            linked_jobs=metadata.get("linked_jobs", []) if metadata else [],
        )


@router.post("/notes", response_model=NoteContent, status_code=status.HTTP_201_CREATED)
async def create_note(
    request: NoteCreateRequest,
    current_user=Depends(require_auth),
):
    """Create a new note."""
    # Check if file already exists
    existing = read_note_file(current_user.id, request.file_path)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Note already exists: {request.file_path}",
        )

    # Write file
    success = write_note_file(current_user.id, request.file_path, request.content)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create note file",
        )

    # Index metadata
    metadata = upsert_note_metadata(current_user.id, request.file_path, request.content)

    return NoteContent(
        file_path=request.file_path,
        title=metadata.get("title", request.file_path),
        content=request.content,
        created_at=metadata.get("created_at"),
        updated_at=metadata.get("updated_at"),
        word_count=metadata.get("word_count", 0),
        links_to=metadata.get("links_to", []) if isinstance(metadata.get("links_to"), list) else [],
        linked_from=metadata.get("linked_from", []) if isinstance(metadata.get("linked_from"), list) else [],
        linked_jobs=metadata.get("linked_jobs", []) if isinstance(metadata.get("linked_jobs"), list) else [],
    )


@router.put("/notes/{file_path:path}", response_model=NoteContent)
async def update_note(
    file_path: str,
    request: NoteUpdateRequest,
    current_user=Depends(require_auth),
):
    """Update a note's content."""
    # Check if file exists
    existing = read_note_file(current_user.id, file_path)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {file_path}",
        )

    # Write updated content
    success = write_note_file(current_user.id, file_path, request.content)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update note file",
        )

    # Update metadata index
    metadata = upsert_note_metadata(current_user.id, file_path, request.content)

    return NoteContent(
        file_path=file_path,
        title=metadata.get("title", file_path),
        content=request.content,
        created_at=metadata.get("created_at"),
        updated_at=metadata.get("updated_at"),
        word_count=metadata.get("word_count", 0),
        links_to=metadata.get("links_to", []) if isinstance(metadata.get("links_to"), list) else [],
        linked_from=metadata.get("linked_from", []) if isinstance(metadata.get("linked_from"), list) else [],
        linked_jobs=metadata.get("linked_jobs", []) if isinstance(metadata.get("linked_jobs"), list) else [],
    )


@router.delete("/notes/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    file_path: str,
    current_user=Depends(require_auth),
):
    """Delete a note."""
    # Delete file
    file_deleted = delete_note_file(current_user.id, file_path)
    if not file_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note not found: {file_path}",
        )

    # Delete metadata
    delete_note_metadata(current_user.id, file_path)

    return None


# =============================================================================
# BACKLINKS
# =============================================================================

@router.get("/backlinks/{file_path:path}", response_model=BacklinksResponse)
async def get_note_backlinks(
    file_path: str,
    current_user=Depends(require_auth),
):
    """Get all notes that link to this note."""
    backlinks = get_backlinks(current_user.id, file_path)
    return BacklinksResponse(
        file_path=file_path,
        backlinks=backlinks,
        total=len(backlinks),
    )


# =============================================================================
# FOLDERS
# =============================================================================

@router.post("/folders", status_code=status.HTTP_201_CREATED)
async def create_folder_endpoint(
    request: FolderCreateRequest,
    current_user=Depends(require_auth),
):
    """Create a new folder."""
    success = create_folder(current_user.id, request.path)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create folder",
        )
    return {"message": f"Folder created: {request.path}"}


@router.delete("/folders/{folder_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder_endpoint(
    folder_path: str,
    current_user=Depends(require_auth),
):
    """Delete an empty folder."""
    success = delete_folder(current_user.id, folder_path)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete folder (may not be empty or not exist)",
        )
    return None


# =============================================================================
# REINDEX
# =============================================================================

@router.post("/reindex", response_model=ReindexResponse)
async def reindex(current_user=Depends(require_auth)):
    """Rebuild the metadata index for all notes."""
    count = reindex_all_notes(current_user.id)
    return ReindexResponse(
        indexed_count=count,
        message=f"Successfully indexed {count} notes",
    )
