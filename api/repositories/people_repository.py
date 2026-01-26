"""
Repository for dashboard.people table.

Manages personal contacts (separate from business contacts).
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.second_brain import PersonResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.people")


class PeopleRepository(BaseRepository[PersonResponse]):
    """Repository for personal contacts."""

    def __init__(self):
        super().__init__(
            table_name="people",
            schema="dashboard",
            model=PersonResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        include_archived: bool = False,
    ) -> List[PersonResponse]:
        """
        Find all people for a user.

        Args:
            user_id: User UUID
            include_archived: Include archived people

        Returns:
            List of people
        """
        try:
            query = (
                self._get_table()
                .select(
                    """
                    *,
                    tags:people_tags(tag:tags(*))
                    """
                )
                .eq("user_id", user_id)
            )

            if not include_archived:
                query = query.eq("archived", False)

            result = query.order("name").execute()

            # Flatten tags from join
            people = []
            for item in result.data:
                tags_data = item.pop("tags", [])
                item["tags"] = [t["tag"] for t in tags_data if t.get("tag")]
                people.append(self.model(**item))

            return people

        except Exception as e:
            logger.error(f"Error finding people for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_favorites(self, user_id: str) -> List[PersonResponse]:
        """
        Find favorite people for a user.

        Args:
            user_id: User UUID

        Returns:
            List of favorite people
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_favorite", True)
                .eq("archived", False)
                .order("name")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding favorite people: {e}")
            raise handle_supabase_error(e)

    async def find_by_relationship(
        self,
        user_id: str,
        relationship: str,
    ) -> List[PersonResponse]:
        """
        Find people by relationship type.

        Args:
            user_id: User UUID
            relationship: Relationship type (family, friend, colleague, etc.)

        Returns:
            List of people
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .contains("relationship", [relationship])
                .eq("archived", False)
                .order("name")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding people by relationship: {e}")
            raise handle_supabase_error(e)

    async def find_by_tag(
        self,
        user_id: str,
        tag_id: int,
    ) -> List[PersonResponse]:
        """
        Find people with a specific tag.

        Args:
            user_id: User UUID
            tag_id: Tag ID

        Returns:
            List of people
        """
        try:
            # Query through the join table
            result = (
                self.client.schema("dashboard")
                .table("people_tags")
                .select("person:people(*)")
                .eq("tag_id", tag_id)
                .execute()
            )

            people = []
            for item in result.data:
                person_data = item.get("person")
                if person_data and person_data.get("user_id") == user_id:
                    people.append(self.model(**person_data))

            return people

        except Exception as e:
            logger.error(f"Error finding people by tag: {e}")
            raise handle_supabase_error(e)

    async def find_needing_check_in(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[PersonResponse]:
        """
        Find people due for a check-in.

        Returns people where next_check_in is today or earlier.

        Args:
            user_id: User UUID
            limit: Max results

        Returns:
            List of people needing check-in
        """
        try:
            from datetime import date
            today = date.today().isoformat()

            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .lte("next_check_in", today)
                .eq("archived", False)
                .order("next_check_in")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding people needing check-in: {e}")
            raise handle_supabase_error(e)

    async def find_by_birthday_month(
        self,
        user_id: str,
        month: int,
    ) -> List[PersonResponse]:
        """
        Find people with birthdays in a specific month.

        Args:
            user_id: User UUID
            month: Month number (1-12)

        Returns:
            List of people
        """
        try:
            # We need to extract month from birthday
            # In PostgreSQL: EXTRACT(MONTH FROM birthday::date) = month
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("archived", False)
                .not_.is_("birthday", "null")
                .execute()
            )

            # Filter in Python since Supabase doesn't have good month extraction
            people = []
            for item in result.data:
                birthday = item.get("birthday")
                if birthday:
                    bday_month = int(birthday.split("-")[1])
                    if bday_month == month:
                        people.append(self.model(**item))

            return people

        except Exception as e:
            logger.error(f"Error finding people by birthday month: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        user_id: str,
        search_term: str,
        limit: int = 20,
    ) -> List[PersonResponse]:
        """
        Search people by name, email, or company.

        Args:
            user_id: User UUID
            search_term: Search string
            limit: Max results

        Returns:
            List of matching people
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("archived", False)
                .or_(
                    f"name.ilike.%{search_term}%,"
                    f"email.ilike.%{search_term}%,"
                    f"company.ilike.%{search_term}%"
                )
                .order("name")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching people: {e}")
            raise handle_supabase_error(e)

    async def record_check_in(
        self,
        person_id: int,
        next_check_in: Optional[str] = None,
    ) -> PersonResponse:
        """
        Record a check-in with a person.

        Args:
            person_id: Person ID
            next_check_in: Optional next check-in date

        Returns:
            Updated person
        """
        from datetime import date

        data = {"last_check_in": date.today().isoformat()}
        if next_check_in:
            data["next_check_in"] = next_check_in

        return await self.update(person_id, data)

    async def add_tag(self, person_id: int, tag_id: int) -> None:
        """
        Add a tag to a person.

        Args:
            person_id: Person ID
            tag_id: Tag ID
        """
        try:
            self.client.schema("dashboard").table("people_tags").insert({
                "person_id": person_id,
                "tag_id": tag_id,
            }).execute()
        except Exception as e:
            logger.error(f"Error adding tag to person: {e}")
            raise handle_supabase_error(e)

    async def remove_tag(self, person_id: int, tag_id: int) -> None:
        """
        Remove a tag from a person.

        Args:
            person_id: Person ID
            tag_id: Tag ID
        """
        try:
            self.client.schema("dashboard").table("people_tags").delete().eq(
                "person_id", person_id
            ).eq("tag_id", tag_id).execute()
        except Exception as e:
            logger.error(f"Error removing tag from person: {e}")
            raise handle_supabase_error(e)
