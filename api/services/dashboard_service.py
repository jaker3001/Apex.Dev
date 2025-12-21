"""
Business logic service for dashboard features.

Manages tasks, personal projects, and notes with business rules.
"""
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from api.repositories.task_repository import TaskRepository
from api.repositories.project_repository import ProjectRepository, DashboardProjectResponse
from api.repositories.note_repository import NoteRepository
from api.repositories.cross_schema_validator import CrossSchemaValidator
from api.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from api.schemas.pkm import NoteResponse
from api.services.supabase_errors import (
    ResourceNotFoundError,
    ValidationError,
    CrossSchemaValidationError
)
import logging

logger = logging.getLogger("apex_assistant.service.dashboard")


class DashboardService:
    """Service for managing dashboard features (tasks, projects, notes)."""

    def __init__(self):
        self.task_repo = TaskRepository()
        self.project_repo = ProjectRepository()
        self.note_repo = NoteRepository()
        self.validator = CrossSchemaValidator()

    # ============================================
    # TASK OPERATIONS
    # ============================================

    async def get_user_tasks(
        self,
        user_id: str,
        list_id: Optional[int] = None,
        status: Optional[str] = None,
    ) -> List[TaskResponse]:
        """
        Get tasks for a user with optional filters.

        Args:
            user_id: User UUID
            list_id: Optional list filter
            status: Optional status filter

        Returns:
            List of tasks
        """
        return await self.task_repo.find_by_user(user_id, list_id, status)

    async def get_my_day_tasks(self, user_id: str) -> List[TaskResponse]:
        """
        Get tasks marked as 'My Day' for a user.

        Args:
            user_id: User UUID

        Returns:
            List of My Day tasks
        """
        return await self.task_repo.find_my_day(user_id)

    async def get_important_tasks(
        self,
        user_id: str,
        include_completed: bool = False,
    ) -> List[TaskResponse]:
        """
        Get important tasks for a user.

        Args:
            user_id: User UUID
            include_completed: Include completed tasks

        Returns:
            List of important tasks
        """
        return await self.task_repo.find_important(user_id, include_completed)

    async def get_overdue_tasks(self, user_id: str) -> List[TaskResponse]:
        """
        Get overdue tasks for a user.

        Args:
            user_id: User UUID

        Returns:
            List of overdue tasks
        """
        return await self.task_repo.find_overdue(user_id)

    async def get_job_tasks(self, user_id: str, job_id: int) -> List[TaskResponse]:
        """
        Get tasks linked to a specific job.

        Args:
            user_id: User UUID
            job_id: Job ID

        Returns:
            List of tasks linked to the job
        """
        # Validate job exists
        if not await self.validator.validate_job_reference(job_id):
            raise CrossSchemaValidationError(
                "dashboard",
                "business",
                f"Job {job_id} does not exist"
            )

        return await self.task_repo.find_by_job(user_id, job_id)

    async def create_task(
        self,
        user_id: str,
        data: TaskCreate,
    ) -> TaskResponse:
        """
        Create a new task.

        Args:
            user_id: User UUID
            data: Task creation data

        Returns:
            Created task

        Raises:
            CrossSchemaValidationError if job_id is invalid
        """
        # Validate job reference if provided
        if hasattr(data, 'project_id') and data.project_id:
            if not await self.validator.validate_job_reference(data.project_id):
                raise CrossSchemaValidationError(
                    "dashboard",
                    "business",
                    f"Job {data.project_id} does not exist"
                )

        task_dict = data.model_dump(exclude_unset=True)
        task_dict["user_id"] = user_id
        task_dict["status"] = "open"

        return await self.task_repo.create(task_dict)

    async def update_task(
        self,
        task_id: int,
        user_id: str,
        data: TaskUpdate,
    ) -> TaskResponse:
        """
        Update a task.

        Args:
            task_id: Task ID
            user_id: User UUID (for authorization)
            data: Update data

        Returns:
            Updated task

        Raises:
            ResourceNotFoundError if task not found or not owned by user
        """
        # Verify ownership
        existing = await self.task_repo.find_by_id(task_id)
        if not existing or existing.user_id != user_id:
            raise ResourceNotFoundError("Task", task_id)

        update_dict = data.model_dump(exclude_unset=True)
        return await self.task_repo.update(task_id, update_dict)

    async def mark_task_completed(
        self,
        task_id: int,
        user_id: str,
    ) -> TaskResponse:
        """
        Mark a task as completed.

        Args:
            task_id: Task ID
            user_id: User UUID

        Returns:
            Updated task
        """
        return await self.task_repo.mark_completed(task_id, user_id)

    async def delete_task(self, task_id: int, user_id: str) -> bool:
        """
        Delete a task.

        Args:
            task_id: Task ID
            user_id: User UUID

        Returns:
            True if deleted

        Raises:
            ResourceNotFoundError if task not found or not owned by user
        """
        # Verify ownership
        existing = await self.task_repo.find_by_id(task_id)
        if not existing or existing.user_id != user_id:
            raise ResourceNotFoundError("Task", task_id)

        return await self.task_repo.delete(task_id)

    # ============================================
    # PROJECT OPERATIONS
    # ============================================

    async def get_user_projects(
        self,
        user_id: str,
        include_archived: bool = False,
    ) -> List[DashboardProjectResponse]:
        """
        Get personal projects for a user.

        Args:
            user_id: User UUID
            include_archived: Include archived projects

        Returns:
            List of projects
        """
        return await self.project_repo.find_by_user(user_id, include_archived)

    async def create_project(
        self,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
    ) -> DashboardProjectResponse:
        """
        Create a new personal project.

        Args:
            user_id: User UUID
            name: Project name
            description: Optional description
            color: Optional color
            icon: Optional icon

        Returns:
            Created project
        """
        return await self.project_repo.create({
            "user_id": user_id,
            "name": name,
            "description": description,
            "color": color,
            "icon": icon,
            "is_active": True,
        })

    async def update_project(
        self,
        project_id: int,
        user_id: str,
        **kwargs,
    ) -> DashboardProjectResponse:
        """
        Update a project.

        Args:
            project_id: Project ID
            user_id: User UUID
            **kwargs: Fields to update

        Returns:
            Updated project

        Raises:
            ResourceNotFoundError if project not found or not owned by user
        """
        # Verify ownership
        existing = await self.project_repo.find_by_id(project_id)
        if not existing or existing.user_id != user_id:
            raise ResourceNotFoundError("Project", project_id)

        return await self.project_repo.update(project_id, kwargs)

    # ============================================
    # NOTE OPERATIONS
    # ============================================

    async def get_user_notes(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[NoteResponse]:
        """
        Get notes for a user.

        Args:
            user_id: User UUID
            limit: Max results
            offset: Skip N results

        Returns:
            List of notes
        """
        return await self.note_repo.find_by_user(user_id, limit, offset)

    async def search_notes(
        self,
        user_id: str,
        search_term: str,
        limit: int = 50,
    ) -> List[NoteResponse]:
        """
        Search notes by title or content.

        Args:
            user_id: User UUID
            search_term: Search string
            limit: Max results

        Returns:
            List of matching notes
        """
        return await self.note_repo.search_notes(user_id, search_term, limit)

    async def get_job_notes(self, user_id: str, job_id: int) -> List[NoteResponse]:
        """
        Get notes linked to a specific job.

        Args:
            user_id: User UUID
            job_id: Job ID

        Returns:
            List of notes
        """
        # Validate job exists
        if not await self.validator.validate_job_reference(job_id):
            raise CrossSchemaValidationError(
                "dashboard",
                "business",
                f"Job {job_id} does not exist"
            )

        return await self.note_repo.find_by_job(user_id, job_id)
