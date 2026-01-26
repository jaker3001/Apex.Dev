"""
Repository for dashboard.tags table.

Manages PARA tags (Areas, Resources, Entities).
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.second_brain import TagResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.tag")


class TagRepository(BaseRepository[TagResponse]):
    """Repository for PARA tags."""

    def __init__(self):
        super().__init__(
            table_name="tags",
            schema="dashboard",
            model=TagResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        tag_type: Optional[str] = None,
        include_archived: bool = False,
    ) -> List[TagResponse]:
        """
        Find all tags for a user.

        Args:
            user_id: User UUID
            tag_type: Optional filter by type (area, resource, entity)
            include_archived: Include archived tags

        Returns:
            List of tags
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
            )

            if tag_type:
                query = query.eq("type", tag_type)

            if not include_archived:
                query = query.eq("archived", False)

            result = query.order("sort_order").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding tags for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_areas(self, user_id: str) -> List[TagResponse]:
        """Find all area tags for a user."""
        return await self.find_by_user(user_id, tag_type="area")

    async def find_resources(self, user_id: str) -> List[TagResponse]:
        """Find all resource tags for a user."""
        return await self.find_by_user(user_id, tag_type="resource")

    async def find_entities(self, user_id: str) -> List[TagResponse]:
        """Find all entity tags for a user."""
        return await self.find_by_user(user_id, tag_type="entity")

    async def find_favorites(self, user_id: str) -> List[TagResponse]:
        """
        Find favorite tags for a user.

        Args:
            user_id: User UUID

        Returns:
            List of favorite tags
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_favorite", True)
                .eq("archived", False)
                .order("sort_order")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding favorite tags: {e}")
            raise handle_supabase_error(e)

    async def find_children(self, parent_tag_id: int) -> List[TagResponse]:
        """
        Find child tags of a parent.

        Args:
            parent_tag_id: Parent tag ID

        Returns:
            List of child tags
        """
        return await self.find_all(
            filters={"parent_tag_id": parent_tag_id},
            order_by="sort_order",
        )

    async def find_root_tags(
        self,
        user_id: str,
        tag_type: Optional[str] = None,
    ) -> List[TagResponse]:
        """
        Find tags without a parent (root level).

        Args:
            user_id: User UUID
            tag_type: Optional type filter

        Returns:
            List of root-level tags
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .is_("parent_tag_id", "null")
                .eq("archived", False)
            )

            if tag_type:
                query = query.eq("type", tag_type)

            result = query.order("sort_order").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding root tags: {e}")
            raise handle_supabase_error(e)

    async def find_with_hierarchy(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Find all tags with hierarchical structure.

        Returns nested structure with children.

        Args:
            user_id: User UUID

        Returns:
            List of tags with nested children
        """
        all_tags = await self.find_by_user(user_id)

        # Build hierarchy
        tag_map = {tag.id: {**tag.model_dump(), "children": []} for tag in all_tags}
        root_tags = []

        for tag in all_tags:
            if tag.parent_tag_id and tag.parent_tag_id in tag_map:
                tag_map[tag.parent_tag_id]["children"].append(tag_map[tag.id])
            else:
                root_tags.append(tag_map[tag.id])

        return root_tags

    async def find_by_name(
        self,
        user_id: str,
        name: str,
        tag_type: Optional[str] = None,
    ) -> Optional[TagResponse]:
        """
        Find tag by exact name.

        Args:
            user_id: User UUID
            name: Tag name
            tag_type: Optional type filter

        Returns:
            Tag if found
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("name", name)
            )

            if tag_type:
                query = query.eq("type", tag_type)

            result = query.execute()

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding tag by name: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        user_id: str,
        search_term: str,
        limit: int = 20,
    ) -> List[TagResponse]:
        """
        Search tags by name.

        Args:
            user_id: User UUID
            search_term: Search string
            limit: Max results

        Returns:
            List of matching tags
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .ilike("name", f"%{search_term}%")
                .eq("archived", False)
                .order("name")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching tags: {e}")
            raise handle_supabase_error(e)
