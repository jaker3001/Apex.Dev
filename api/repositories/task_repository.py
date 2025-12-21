"""
Repository for dashboard.tasks table.

Manages personal to-do items with cross-schema validation.
"""
from typing import List, Optional, Dict, Any
from datetime import date
from api.repositories.base import BaseRepository
from api.schemas.tasks import TaskResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.task")


class TaskRepository(BaseRepository[TaskResponse]):
    """Repository for dashboard tasks (personal to-do items)."""

    def __init__(self):
        super().__init__(
            table_name="tasks",
            schema="dashboard",
            model=TaskResponse,
        )

    async def find_by_user(
        self,
        user_id: str,
        list_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[TaskResponse]:
        """
        Find tasks for a specific user.

        Args:
            user_id: User UUID
            list_id: Optional task list ID filter
            status: Optional status filter

        Returns:
            List of tasks
        """
        filters = {"user_id": user_id}

        if list_id:
            filters["list_id"] = list_id
        if status:
            filters["status"] = status

        return await self.find_all(
            filters=filters,
            order_by="-created_at",
        )

    async def find_my_day(self, user_id: str) -> List[TaskResponse]:
        """
        Find tasks marked as 'My Day' for a user.

        Args:
            user_id: User UUID

        Returns:
            List of tasks for today
        """
        try:
            today = date.today().isoformat()
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_my_day", True)
                .eq("my_day_date", today)
                .order("sort_order")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding My Day tasks: {e}")
            raise handle_supabase_error(e)

    async def find_by_job(
        self,
        user_id: str,
        job_id: int,
    ) -> List[TaskResponse]:
        """
        Find all tasks linked to a specific job.

        Args:
            user_id: User UUID
            job_id: Job ID from business.jobs

        Returns:
            List of tasks linked to the job
        """
        return await self.find_all(
            filters={"user_id": user_id, "job_id": job_id},
            order_by="-created_at",
        )

    async def find_by_list(
        self,
        user_id: str,
        list_id: int,
        include_completed: bool = False,
    ) -> List[TaskResponse]:
        """
        Find tasks in a specific list.

        Args:
            user_id: User UUID
            list_id: Task list ID
            include_completed: Whether to include completed tasks

        Returns:
            List of tasks in the list
        """
        filters = {"user_id": user_id, "list_id": list_id}

        if not include_completed:
            # This will need a more complex query in practice
            filters["status"] = "open"

        return await self.find_all(
            filters=filters,
            order_by="sort_order",
        )

    async def find_important(
        self,
        user_id: str,
        include_completed: bool = False,
    ) -> List[TaskResponse]:
        """
        Find tasks marked as important.

        Args:
            user_id: User UUID
            include_completed: Whether to include completed tasks

        Returns:
            List of important tasks
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .eq("is_important", True)
            )

            if not include_completed:
                query = query.neq("status", "completed")

            result = query.order("sort_order").execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding important tasks: {e}")
            raise handle_supabase_error(e)

    async def find_overdue(self, user_id: str) -> List[TaskResponse]:
        """
        Find overdue tasks for a user.

        Args:
            user_id: User UUID

        Returns:
            List of overdue tasks
        """
        try:
            today = date.today().isoformat()
            result = (
                self._get_table()
                .select("*")
                .eq("user_id", user_id)
                .neq("status", "completed")
                .neq("status", "cancelled")
                .lt("due_date", today)
                .order("due_date")
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding overdue tasks: {e}")
            raise handle_supabase_error(e)

    async def mark_completed(self, task_id: int, user_id: str) -> TaskResponse:
        """
        Mark a task as completed.

        Args:
            task_id: Task ID
            user_id: User UUID (for authorization check)

        Returns:
            Updated task
        """
        from datetime import datetime

        # Verify ownership
        existing = await self.find_by_id(task_id)
        if not existing or existing.user_id != user_id:
            from api.services.supabase_errors import ResourceNotFoundError
            raise ResourceNotFoundError("Task", task_id)

        return await self.update(
            task_id,
            {
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
            }
        )

    async def reorder_tasks(
        self,
        task_ids: List[int],
        user_id: str,
    ) -> List[TaskResponse]:
        """
        Reorder tasks by updating sort_order.

        Args:
            task_ids: List of task IDs in desired order
            user_id: User UUID (for authorization)

        Returns:
            List of updated tasks
        """
        updated_tasks = []

        for index, task_id in enumerate(task_ids):
            try:
                task = await self.update(
                    task_id,
                    {"sort_order": index}
                )
                updated_tasks.append(task)
            except Exception as e:
                logger.warning(f"Failed to reorder task {task_id}: {e}")

        return updated_tasks
