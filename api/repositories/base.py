"""
Base repository with generic CRUD operations.

This module implements the repository pattern to abstract Supabase access.
All specific repositories should inherit from BaseRepository.
"""
from typing import Generic, TypeVar, List, Optional, Dict, Any
from pydantic import BaseModel
from supabase import Client
from api.services.supabase_client import get_client
from api.services.supabase_errors import (
    ResourceNotFoundError,
    DatabaseError,
    handle_supabase_error
)
import logging

logger = logging.getLogger("apex_assistant.repository")

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """
    Generic repository for database operations.

    Implements the repository pattern to abstract Supabase access.
    Subclass this for specific entities (projects, tasks, etc.).
    """

    def __init__(
        self,
        table_name: str,
        schema: str = "public",
        model: Optional[type[T]] = None,
        client: Optional[Client] = None,
    ):
        """
        Initialize repository.

        Args:
            table_name: Name of the database table
            schema: Schema name (default: "public")
            model: Pydantic model for response validation
            client: Optional Supabase client (uses default if not provided)
        """
        self.table_name = table_name
        self.schema = schema
        self.model = model
        self._client = client

    @property
    def client(self) -> Client:
        """Get Supabase client."""
        return self._client or get_client()

    def _get_table(self):
        """Get table reference with schema."""
        if self.schema != "public":
            return self.client.schema(self.schema).table(self.table_name)
        return self.client.table(self.table_name)

    async def find_by_id(self, id: any) -> Optional[T]:
        """
        Find a record by ID.

        Args:
            id: Primary key value

        Returns:
            Model instance or None if not found
        """
        try:
            result = self._get_table().select("*").eq("id", id).execute()

            if not result.data:
                return None

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def find_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[T]:
        """
        Find all records matching filters.

        Args:
            filters: Dict of column: value filters
            order_by: Column to order by (prefix with - for DESC)
            limit: Max number of records
            offset: Number of records to skip

        Returns:
            List of model instances
        """
        try:
            query = self._get_table().select("*")

            # Apply filters
            if filters:
                for key, value in filters.items():
                    if value is None:
                        query = query.is_(key, "null")
                    else:
                        query = query.eq(key, value)

            # Apply ordering
            if order_by:
                ascending = not order_by.startswith("-")
                column = order_by.lstrip("-")
                query = query.order(column, desc=not ascending)

            # Apply pagination
            if limit:
                query = query.limit(limit)
            if offset:
                query = query.offset(offset)

            result = query.execute()

            if self.model:
                return [self.model(**item) for item in result.data]
            return result.data

        except Exception as e:
            raise handle_supabase_error(e)

    async def create(self, data: Dict[str, Any]) -> T:
        """
        Create a new record.

        Args:
            data: Dictionary of column values

        Returns:
            Created model instance
        """
        try:
            result = self._get_table().insert(data).execute()

            if not result.data:
                raise DatabaseError("Insert returned no data")

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def update(self, id: any, data: Dict[str, Any]) -> T:
        """
        Update a record by ID.

        Args:
            id: Primary key value
            data: Dictionary of column values to update

        Returns:
            Updated model instance
        """
        try:
            result = (
                self._get_table()
                .update(data)
                .eq("id", id)
                .execute()
            )

            if not result.data:
                raise ResourceNotFoundError(self.table_name, id)

            return self.model(**result.data[0]) if self.model else result.data[0]

        except Exception as e:
            raise handle_supabase_error(e)

    async def delete(self, id: any) -> bool:
        """
        Delete a record by ID.

        Args:
            id: Primary key value

        Returns:
            True if deleted, False if not found
        """
        try:
            result = self._get_table().delete().eq("id", id).execute()
            return len(result.data) > 0

        except Exception as e:
            raise handle_supabase_error(e)

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records matching filters.

        Args:
            filters: Dict of column: value filters

        Returns:
            Count of matching records
        """
        try:
            query = self._get_table().select("*", count="exact")

            if filters:
                for key, value in filters.items():
                    if value is None:
                        query = query.is_(key, "null")
                    else:
                        query = query.eq(key, value)

            result = query.execute()
            return result.count

        except Exception as e:
            raise handle_supabase_error(e)

    async def exists(self, id: any) -> bool:
        """
        Check if a record exists by ID.

        Args:
            id: Primary key value

        Returns:
            True if exists, False otherwise
        """
        try:
            result = self._get_table().select("id").eq("id", id).execute()
            return len(result.data) > 0
        except Exception:
            return False
