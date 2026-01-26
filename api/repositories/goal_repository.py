"""
Repository for dashboard.goals and dashboard.milestones tables.

Manages long-term goals and their milestones.
"""
from typing import List, Optional, Dict, Any
from api.repositories.base import BaseRepository
from api.schemas.second_brain import GoalResponse, MilestoneResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.goal")


class GoalRepository(BaseRepository[GoalResponse]):
    """Repository for goals."""

    def __init__(self):
        super().__init__(
            table_name="goals",
            schema="dashboard",
            model=GoalResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        status: Optional[str] = None,
        include_archived: bool = False,
    ) -> List[GoalResponse]:
        """
        Find all goals for a user.

        Args:
            user_id: User UUID
            status: Optional filter by status (dream, active, achieved)
            include_archived: Include archived goals

        Returns:
            List of goals
        """
        try:
            query = (
                self._get_table()
                .select(
                    """
                    *,
                    milestones:milestones(*)
                    """
                )
                .eq("user_id", user_id)
            )

            if status:
                query = query.eq("status", status)

            if not include_archived:
                query = query.eq("archived", False)

            result = query.order("created_at", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding goals for user {user_id}: {e}")
            raise handle_supabase_error(e)

    async def find_dreams(self, user_id: str) -> List[GoalResponse]:
        """Find all dream goals for a user."""
        return await self.find_by_user(user_id, status="dream")

    async def find_active(self, user_id: str) -> List[GoalResponse]:
        """Find all active goals for a user."""
        return await self.find_by_user(user_id, status="active")

    async def find_achieved(self, user_id: str) -> List[GoalResponse]:
        """Find all achieved goals for a user."""
        return await self.find_by_user(user_id, status="achieved")

    async def find_by_tag(
        self,
        user_id: str,
        tag_id: int,
    ) -> List[GoalResponse]:
        """
        Find goals linked to a specific area tag.

        Args:
            user_id: User UUID
            tag_id: Tag ID

        Returns:
            List of goals
        """
        return await self.find_all(
            filters={"user_id": user_id, "tag_id": tag_id},
            order_by="-created_at",
        )

    async def find_with_projects(
        self,
        goal_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Find goal with related projects.

        Args:
            goal_id: Goal ID

        Returns:
            Goal with projects if found
        """
        try:
            result = (
                self._get_table()
                .select(
                    """
                    *,
                    milestones:milestones(*),
                    projects:projects(id, name, status, priority, icon, color)
                    """
                )
                .eq("id", goal_id)
                .execute()
            )

            if not result.data:
                return None

            return result.data[0]

        except Exception as e:
            logger.error(f"Error finding goal with projects {goal_id}: {e}")
            raise handle_supabase_error(e)

    async def activate(self, goal_id: int) -> GoalResponse:
        """
        Activate a dream goal.

        Args:
            goal_id: Goal ID

        Returns:
            Updated goal
        """
        from datetime import datetime

        return await self.update(
            goal_id,
            {
                "status": "active",
                "goal_set": datetime.utcnow().strftime("%Y-%m-%d"),
            }
        )

    async def achieve(self, goal_id: int) -> GoalResponse:
        """
        Mark a goal as achieved.

        Args:
            goal_id: Goal ID

        Returns:
            Updated goal
        """
        from datetime import datetime

        return await self.update(
            goal_id,
            {
                "status": "achieved",
                "achieved_at": datetime.utcnow().isoformat(),
            }
        )


class MilestoneRepository(BaseRepository[MilestoneResponse]):
    """Repository for goal milestones."""

    def __init__(self):
        super().__init__(
            table_name="milestones",
            schema="dashboard",
            model=MilestoneResponse,
        )

    async def find_by_goal(self, goal_id: int) -> List[MilestoneResponse]:
        """
        Find all milestones for a goal.

        Args:
            goal_id: Goal ID

        Returns:
            List of milestones
        """
        return await self.find_all(
            filters={"goal_id": goal_id},
            order_by="sort_order",
        )

    async def complete(self, milestone_id: int) -> MilestoneResponse:
        """
        Mark a milestone as completed.

        Args:
            milestone_id: Milestone ID

        Returns:
            Updated milestone
        """
        from datetime import datetime

        return await self.update(
            milestone_id,
            {"completed_at": datetime.utcnow().isoformat()}
        )

    async def uncomplete(self, milestone_id: int) -> MilestoneResponse:
        """
        Un-complete a milestone.

        Args:
            milestone_id: Milestone ID

        Returns:
            Updated milestone
        """
        return await self.update(
            milestone_id,
            {"completed_at": None}
        )

    async def reorder(
        self,
        milestone_ids: List[int],
    ) -> List[MilestoneResponse]:
        """
        Reorder milestones within a goal.

        Args:
            milestone_ids: List of milestone IDs in desired order

        Returns:
            List of updated milestones
        """
        updated = []
        for index, milestone_id in enumerate(milestone_ids):
            m = await self.update(milestone_id, {"sort_order": index})
            updated.append(m)
        return updated
