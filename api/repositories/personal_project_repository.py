"""
Repository for dashboard.projects table.

Manages personal projects (separate from business jobs).
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.second_brain import ProjectResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.personal_project")


class PersonalProjectRepository(BaseRepository[ProjectResponse]):
    """Repository for personal projects."""

    def __init__(self):
        super().__init__(
            table_name="projects",
            schema="dashboard",
            model=ProjectResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        status: Optional[str] = None,
        include_archived: bool = False,
    ) -> List[ProjectResponse]:
        """
        Find all projects for a user.

        Args:
            user_id: User UUID
            status: Optional filter by status
            include_archived: Include archived projects

        Returns:
            List of projects
        """
        try:
            query = (
                self._get_table()
                .select(
                    """
                    *,
                    area:tags!area_id(id, name, icon, color, type),
                    goal:goals!goal_id(id, name, status, icon, color)
                    """
                )
                .eq("user_id", user_id)
            )

            if status:
                query = query.eq("status", status)

            if not include_archived:
                query = query.eq("archived", False)

            result = query.order("sort_order").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding projects for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_active(self, user_id: str) -> List[ProjectResponse]:
        """Find projects with status 'doing'."""
        return await self.find_by_user(user_id, status="doing")

    async def find_planned(self, user_id: str) -> List[ProjectResponse]:
        """Find projects with status 'planned'."""
        return await self.find_by_user(user_id, status="planned")

    async def find_on_hold(self, user_id: str) -> List[ProjectResponse]:
        """Find projects with status 'on_hold'."""
        return await self.find_by_user(user_id, status="on_hold")

    async def find_completed(self, user_id: str) -> List[ProjectResponse]:
        """Find projects with status 'done'."""
        return await self.find_by_user(user_id, status="done")

    async def find_by_area(
        self,
        user_id: str,
        area_id: int,
    ) -> List[ProjectResponse]:
        """
        Find projects in a specific area.

        Args:
            user_id: User UUID
            area_id: Area tag ID

        Returns:
            List of projects
        """
        return await self.find_all(
            filters={"user_id": user_id, "area_id": area_id, "archived": False},
            order_by="sort_order",
        )

    async def find_by_goal(
        self,
        user_id: str,
        goal_id: int,
    ) -> List[ProjectResponse]:
        """
        Find projects linked to a specific goal.

        Args:
            user_id: User UUID
            goal_id: Goal ID

        Returns:
            List of projects
        """
        return await self.find_all(
            filters={"user_id": user_id, "goal_id": goal_id, "archived": False},
            order_by="sort_order",
        )

    async def find_with_details(
        self,
        project_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Find project with full details including task counts.

        Args:
            project_id: Project ID

        Returns:
            Project with details if found
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    area:tags!area_id(id, name, icon, color, type),
                    goal:goals!goal_id(id, name, status, icon, color),
                    tasks:tasks(id, status),
                    notes:notes(id)
                    """
                )
                .eq("id", project_id)
                .execute()
            )

            if not result.data:
                return None

            data = result.data[0]

            # Calculate task counts
            tasks = data.pop("tasks", [])
            data["task_count"] = len(tasks)
            data["completed_task_count"] = sum(
                1 for t in tasks if t.get("status") == "completed"
            )

            # Calculate note count
            notes = data.pop("notes", [])
            data["note_count"] = len(notes)

            return data

        except Exception as e:
            logger.error(f"Error finding project with details {project_id}: {e}")
            raise handle_supabase_error(e)

    async def search(
        self,
        user_id: str,
        search_term: str,
        limit: int = 20,
    ) -> List[ProjectResponse]:
        """
        Search projects by name or description.

        Args:
            user_id: User UUID
            search_term: Search string
            limit: Max results

        Returns:
            List of matching projects
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("archived", False)
                .or_(
                    f"name.ilike.%{search_term}%,"
                    f"description.ilike.%{search_term}%"
                )
                .order("name")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error searching projects: {e}")
            raise handle_supabase_error(e)

    async def complete(self, project_id: int) -> ProjectResponse:
        """
        Mark a project as completed.

        Args:
            project_id: Project ID

        Returns:
            Updated project
        """
        from datetime import datetime

        return await self.update(
            project_id,
            {
                "status": "done",
                "completed_at": datetime.utcnow().isoformat(),
            }
        )

    async def update_totals(
        self,
        project_id: int,
        total_spent: Optional[float] = None,
        total_income: Optional[float] = None,
    ) -> ProjectResponse:
        """
        Update project accounting totals.

        Args:
            project_id: Project ID
            total_spent: New spent total
            total_income: New income total

        Returns:
            Updated project
        """
        data = {}
        if total_spent is not None:
            data["total_spent"] = total_spent
        if total_income is not None:
            data["total_income"] = total_income

        if data:
            return await self.update(project_id, data)

        return await self.find_by_id(project_id)

    async def reorder(
        self,
        user_id: str,
        project_ids: List[int],
    ) -> List[ProjectResponse]:
        """
        Reorder projects for a user.

        Args:
            user_id: User UUID
            project_ids: List of project IDs in desired order

        Returns:
            List of updated projects
        """
        updated = []
        for index, project_id in enumerate(project_ids):
            p = await self.update(project_id, {"sort_order": index})
            updated.append(p)
        return updated
