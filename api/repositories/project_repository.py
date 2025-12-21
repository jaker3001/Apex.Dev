"""
Repository for dashboard.projects table.

Manages personal projects (not business jobs).
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from pydantic import BaseModel
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.project")


class DashboardProjectResponse(BaseModel):
    """Response model for dashboard projects."""
    id: int
    user_id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectRepository(BaseRepository[DashboardProjectResponse]):
    """Repository for dashboard projects (personal projects, not jobs)."""

    def __init__(self):
        super().__init__(
            table_name="projects",
            schema="dashboard",
            model=DashboardProjectResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        include_archived: bool = False,
    ) -> List[DashboardProjectResponse]:
        """
        Find projects for a specific user.

        Args:
            user_id: User UUID
            include_archived: Whether to include archived projects

        Returns:
            List of projects
        """
        filters = {"user_id": user_id}

        if not include_archived:
            filters["is_active"] = True

        return await self.find_all(
            filters=filters,
            order_by="sort_order",
        )

    async def find_active(self, user_id: str) -> List[DashboardProjectResponse]:
        """
        Find active projects for a user.

        Args:
            user_id: User UUID

        Returns:
            List of active projects
        """
        return await self.find_by_user(user_id, include_archived=False)

    async def reorder_projects(
        self,
        project_ids: List[int],
        user_id: str,
    ) -> List[DashboardProjectResponse]:
        """
        Reorder projects by updating sort_order.

        Args:
            project_ids: List of project IDs in desired order
            user_id: User UUID (for authorization)

        Returns:
            List of updated projects
        """
        updated_projects = []

        for index, project_id in enumerate(project_ids):
            try:
                project = await self.update(
                    project_id,
                    {"sort_order": index}
                )
                updated_projects.append(project)
            except Exception as e:
                logger.warning(f"Failed to reorder project {project_id}: {e}")

        return updated_projects
