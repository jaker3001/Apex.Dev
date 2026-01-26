"""
Repository for dashboard.notes, note_tags, note_links, note_media tables.

Enhanced note repository with full Ultimate Brain note types and linking.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.second_brain import NoteResponse, NoteLinkResponse, NoteMediaResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.note_v2")


class NoteRepositoryV2(BaseRepository[NoteResponse]):
    """Repository for notes with full linking support."""

    def __init__(self):
        super().__init__(
            table_name="notes",
            schema="dashboard",
            model=NoteResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        note_type: Optional[str] = None,
        include_archived: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> List[NoteResponse]:
        """
        Find all notes for a user.

        Args:
            user_id: User UUID
            note_type: Optional filter by note type
            include_archived: Include archived notes
            limit: Max results
            offset: Skip N results

        Returns:
            List of notes
        """
        try:
            query = (
                self._get_table()
                .select(
                    """
                    *,
                    tags:note_tags(tag:tags(*)),
                    links:note_links(*),
                    media:note_media(*)
                    """
                )
                .eq("user_id", user_id)
            )

            if note_type:
                query = query.eq("type", note_type)

            if not include_archived:
                query = query.eq("archived", False)

            result = (
                query
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
                .execute()
            )

            # Flatten tags from join
            notes = []
            for item in result.data:
                tags_data = item.pop("tags", [])
                item["tags"] = [t["tag"] for t in tags_data if t.get("tag")]
                notes.append(self.model(**item))

            return notes

        except Exception as e:
            logger.error(f"Error finding notes for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_by_type(
        self,
        user_id: str,
        note_type: str,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """Find notes of a specific type."""
        return await self.find_by_user(user_id, note_type=note_type, limit=limit)

    async def find_journals(self, user_id: str, limit: int = 50) -> List[NoteResponse]:
        """Find journal entries."""
        return await self.find_by_type(user_id, "journal", limit)

    async def find_meetings(self, user_id: str, limit: int = 50) -> List[NoteResponse]:
        """Find meeting notes."""
        return await self.find_by_type(user_id, "meeting", limit)

    async def find_web_clips(self, user_id: str, limit: int = 50) -> List[NoteResponse]:
        """Find web clips."""
        return await self.find_by_type(user_id, "web_clip", limit)

    async def find_ideas(self, user_id: str, limit: int = 50) -> List[NoteResponse]:
        """Find ideas."""
        return await self.find_by_type(user_id, "idea", limit)

    async def find_favorites(self, user_id: str) -> List[NoteResponse]:
        """
        Find favorite notes for a user.

        Args:
            user_id: User UUID

        Returns:
            List of favorite notes
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_favorite", True)
                .eq("archived", False)
                .order("created_at", desc=True)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding favorite notes: {e}")
            raise handle_supabase_error(e)

    async def find_pinned(self, user_id: str) -> List[NoteResponse]:
        """
        Find pinned notes for a user.

        Args:
            user_id: User UUID

        Returns:
            List of pinned notes
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_pinned", True)
                .eq("archived", False)
                .order("created_at", desc=True)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding pinned notes: {e}")
            raise handle_supabase_error(e)

    async def find_by_project(
        self,
        project_id: int,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Find notes for a project.

        Args:
            project_id: Project ID
            limit: Max results

        Returns:
            List of notes
        """
        return await self.find_all(
            filters={"project_id": project_id, "archived": False},
            order_by="-created_at",
            limit=limit,
        )

    async def find_by_tag(
        self,
        user_id: str,
        tag_id: int,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Find notes with a specific tag.

        Args:
            user_id: User UUID
            tag_id: Tag ID
            limit: Max results

        Returns:
            List of notes
        """
        try:
            # Query through the join table
            result = (
                self.client.schema("dashboard")
                .table("note_tags")
                .select("note:notes(*)")
                .eq("tag_id", tag_id)
                .limit(limit)
                .execute()
            )

            notes = []
            for item in result.data:
                note_data = item.get("note")
                if note_data and note_data.get("user_id") == user_id:
                    notes.append(self.model(**note_data))

            return notes

        except Exception as e:
            logger.error(f"Error finding notes by tag: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        user_id: str,
        search_term: str,
        note_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Search notes by title or content.

        Args:
            user_id: User UUID
            search_term: Search string
            note_type: Optional type filter
            limit: Max results

        Returns:
            List of matching notes
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("archived", False)
                .or_(
                    f"title.ilike.%{search_term}%,"
                    f"content.ilike.%{search_term}%"
                )
            )

            if note_type:
                query = query.eq("type", note_type)

            result = (
                query
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching notes: {e}")
            raise handle_supabase_error(e)

    async def add_tag(self, note_id: int, tag_id: int) -> None:
        """Add a tag to a note."""
        try:
            self.client.schema("dashboard").table("note_tags").insert({
                "note_id": note_id,
                "tag_id": tag_id,
            }).execute()
        except Exception as e:
            logger.error(f"Error adding tag to note: {e}")
            raise handle_supabase_error(e)

    async def remove_tag(self, note_id: int, tag_id: int) -> None:
        """Remove a tag from a note."""
        try:
            self.client.schema("dashboard").table("note_tags").delete().eq(
                "note_id", note_id
            ).eq("tag_id", tag_id).execute()
        except Exception as e:
            logger.error(f"Error removing tag from note: {e}")
            raise handle_supabase_error(e)

    async def add_link(
        self,
        note_id: int,
        linkable_type: str,
        linkable_id: int,
    ) -> NoteLinkResponse:
        """
        Add a link from note to another entity.

        Args:
            note_id: Note ID
            linkable_type: Type of linked entity (task, event, project, job, person)
            linkable_id: ID of linked entity

        Returns:
            Created link
        """
        try:
            result = (
                self.client.schema("dashboard")
                .table("note_links")
                .insert({
                    "note_id": note_id,
                    "linkable_type": linkable_type,
                    "linkable_id": linkable_id,
                })
                .execute()
            )

            return NoteLinkResponse(**result.data[0])

        except Exception as e:
            logger.error(f"Error adding link to note: {e}")
            raise handle_supabase_error(e)

    async def remove_link(
        self,
        note_id: int,
        linkable_type: str,
        linkable_id: int,
    ) -> None:
        """Remove a link from a note."""
        try:
            (
                self.client.schema("dashboard")
                .table("note_links")
                .delete()
                .eq("note_id", note_id)
                .eq("linkable_type", linkable_type)
                .eq("linkable_id", linkable_id)
                .execute()
            )
        except Exception as e:
            logger.error(f"Error removing link from note: {e}")
            raise handle_supabase_error(e)

    async def find_links(self, note_id: int) -> List[NoteLinkResponse]:
        """
        Find all links for a note.

        Args:
            note_id: Note ID

        Returns:
            List of links
        """
        try:
            result = (
                self.client.schema("dashboard")
                .table("note_links")
                .select("*")
                .eq("note_id", note_id)
                .execute()
            )

            return [NoteLinkResponse(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding note links: {e}")
            raise handle_supabase_error(e)

    async def find_notes_linked_to(
        self,
        linkable_type: str,
        linkable_id: int,
    ) -> List[NoteResponse]:
        """
        Find all notes linked to a specific entity.

        Args:
            linkable_type: Type of entity
            linkable_id: Entity ID

        Returns:
            List of linked notes
        """
        try:
            result = (
                self.client.schema("dashboard")
                .table("note_links")
                .select("note:notes(*)")
                .eq("linkable_type", linkable_type)
                .eq("linkable_id", linkable_id)
                .execute()
            )

            notes = []
            for item in result.data:
                note_data = item.get("note")
                if note_data:
                    notes.append(self.model(**note_data))

            return notes

        except Exception as e:
            logger.error(f"Error finding notes linked to entity: {e}")
            raise handle_supabase_error(e)

    async def add_media(
        self,
        note_id: int,
        file_name: str,
        file_url: str,
        file_type: Optional[str] = None,
        file_size: Optional[int] = None,
        caption: Optional[str] = None,
    ) -> NoteMediaResponse:
        """
        Add media attachment to a note.

        Args:
            note_id: Note ID
            file_name: File name
            file_url: URL to file
            file_type: MIME type
            file_size: Size in bytes
            caption: Optional caption

        Returns:
            Created media record
        """
        try:
            result = (
                self.client.schema("dashboard")
                .table("note_media")
                .insert({
                    "note_id": note_id,
                    "file_name": file_name,
                    "file_url": file_url,
                    "file_type": file_type,
                    "file_size": file_size,
                    "caption": caption,
                })
                .execute()
            )

            return NoteMediaResponse(**result.data[0])

        except Exception as e:
            logger.error(f"Error adding media to note: {e}")
            raise handle_supabase_error(e)

    async def remove_media(self, media_id: int) -> None:
        """Remove media attachment from a note."""
        try:
            (
                self.client.schema("dashboard")
                .table("note_media")
                .delete()
                .eq("id", media_id)
                .execute()
            )
        except Exception as e:
            logger.error(f"Error removing media from note: {e}")
            raise handle_supabase_error(e)
