"""
PKM Pydantic Schemas

Request/response models for the PKM Notes API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# =============================================================================
# FILE SYSTEM ITEMS
# =============================================================================

class FileSystemItem(BaseModel):
    """A file or folder in the PKM directory."""
    type: str = Field(..., description="'file' or 'folder'")
    name: str = Field(..., description="File or folder name")
    path: str = Field(..., description="Relative path from PKM root")


class FileTreeResponse(BaseModel):
    """Response containing the file tree."""
    items: list[FileSystemItem]
    total: int


# =============================================================================
# NOTE METADATA
# =============================================================================

class NoteMetadata(BaseModel):
    """Note metadata from the database index."""
    id: int
    user_id: int
    file_path: str
    title: str
    created_at: datetime
    updated_at: datetime
    word_count: int = 0
    links_to: list[str] = []
    linked_from: list[str] = []
    linked_jobs: list[str] = []
    content_preview: Optional[str] = None


class NoteListResponse(BaseModel):
    """Response containing a list of notes."""
    notes: list[NoteMetadata]
    total: int


# =============================================================================
# NOTE CONTENT
# =============================================================================

class NoteContent(BaseModel):
    """Full note with content."""
    file_path: str
    title: str
    content: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    word_count: int = 0
    links_to: list[str] = []
    linked_from: list[str] = []
    linked_jobs: list[str] = []


class NoteResponse(BaseModel):
    """Response for a single note (used by repository)."""
    id: int
    user_id: str
    title: str
    content: Optional[str] = None
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime


class NoteCreateRequest(BaseModel):
    """Request to create a new note."""
    file_path: str = Field(..., description="Path for the new note (e.g., 'folder/note-name')")
    content: str = Field("", description="Initial markdown content")


class NoteUpdateRequest(BaseModel):
    """Request to update a note."""
    content: str = Field(..., description="New markdown content")


class NoteRenameRequest(BaseModel):
    """Request to rename/move a note."""
    new_path: str = Field(..., description="New path for the note")


# =============================================================================
# FOLDER OPERATIONS
# =============================================================================

class FolderCreateRequest(BaseModel):
    """Request to create a folder."""
    path: str = Field(..., description="Path for the new folder")


class FolderDeleteRequest(BaseModel):
    """Request to delete a folder."""
    path: str = Field(..., description="Path of the folder to delete")


# =============================================================================
# SEARCH
# =============================================================================

class SearchRequest(BaseModel):
    """Request to search notes."""
    query: str = Field(..., min_length=1, description="Search query")
    limit: int = Field(20, ge=1, le=100, description="Max results")


class SearchResponse(BaseModel):
    """Search results."""
    query: str
    results: list[NoteMetadata]
    total: int


# =============================================================================
# BACKLINKS
# =============================================================================

class BacklinksResponse(BaseModel):
    """Response containing backlinks for a note."""
    file_path: str
    backlinks: list[NoteMetadata]
    total: int


# =============================================================================
# REINDEX
# =============================================================================

class ReindexResponse(BaseModel):
    """Response from reindex operation."""
    indexed_count: int
    message: str
