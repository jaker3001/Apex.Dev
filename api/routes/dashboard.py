"""
Dashboard API routes.

Endpoints for dashboard features: tasks, personal projects, and notes.
Uses Supabase when enabled via feature flags.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from api.middleware.auth_middleware import require_auth
from api.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse, TasksResponse
from api.schemas.pkm import NoteResponse
from config import FeatureFlags
import logging

logger = logging.getLogger("apex_assistant.routes.dashboard")

router = APIRouter()


# ============================================
# TASK ENDPOINTS
# ============================================

@router.get("/dashboard/tasks", response_model=TasksResponse)
async def get_my_tasks(
    list_id: Optional[int] = Query(None, description="Filter by task list"),
    status: Optional[str] = Query(None, description="Filter by status"),
    user = Depends(require_auth),
):
    """
    Get tasks for the current user.

    Returns tasks with optional filtering by list and status.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        # Use Supabase service
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        tasks = await service.get_user_tasks(
            user_id=user["id"],
            list_id=list_id,
            status=status,
        )

        return {"tasks": tasks, "total": len(tasks)}

    else:
        # Use legacy SQLite operations
        from database.operations_dashboard import get_user_tasks

        tasks = get_user_tasks(
            user_id=user["id"],
            list_id=list_id,
            status=status,
        )

        return {"tasks": tasks, "total": len(tasks)}


@router.get("/dashboard/my-day", response_model=TasksResponse)
async def get_my_day(user = Depends(require_auth)):
    """
    Get tasks marked as 'My Day' for the current user.

    Returns tasks that are marked to be shown in the My Day view.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        tasks = await service.get_my_day_tasks(user_id=user["id"])

        return {"tasks": tasks, "total": len(tasks)}

    else:
        from database.operations_dashboard import get_my_day_tasks

        tasks = get_my_day_tasks(user_id=user["id"])

        return {"tasks": tasks, "total": len(tasks)}


@router.get("/dashboard/tasks/important", response_model=TasksResponse)
async def get_important_tasks(
    include_completed: bool = Query(False, description="Include completed tasks"),
    user = Depends(require_auth),
):
    """
    Get tasks marked as important.

    Returns tasks flagged as important with optional inclusion of completed tasks.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        tasks = await service.get_important_tasks(
            user_id=user["id"],
            include_completed=include_completed,
        )

        return {"tasks": tasks, "total": len(tasks)}

    else:
        from database.operations_dashboard import get_important_tasks

        tasks = get_important_tasks(
            user_id=user["id"],
            include_completed=include_completed,
        )

        return {"tasks": tasks, "total": len(tasks)}


@router.get("/dashboard/tasks/overdue", response_model=TasksResponse)
async def get_overdue_tasks(user = Depends(require_auth)):
    """
    Get overdue tasks.

    Returns tasks that are past their due date and not completed.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        tasks = await service.get_overdue_tasks(user_id=user["id"])

        return {"tasks": tasks, "total": len(tasks)}

    else:
        from database.operations_dashboard import get_overdue_tasks

        tasks = get_overdue_tasks(user_id=user["id"])

        return {"tasks": tasks, "total": len(tasks)}


@router.post("/dashboard/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    user = Depends(require_auth),
):
    """
    Create a new task.

    Creates a task for the current user with the provided details.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        return await service.create_task(user_id=user["id"], data=task)

    else:
        from database.operations_dashboard import create_task as create_task_legacy

        task_dict = task.model_dump(exclude_unset=True)
        task_dict["user_id"] = user["id"]

        return create_task_legacy(**task_dict)


@router.patch("/dashboard/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task: TaskUpdate,
    user = Depends(require_auth),
):
    """
    Update a task.

    Updates the specified task with new details. User must own the task.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService
        from api.services.supabase_errors import ResourceNotFoundError

        try:
            service = DashboardService()
            return await service.update_task(
                task_id=task_id,
                user_id=user["id"],
                data=task,
            )
        except ResourceNotFoundError:
            raise HTTPException(status_code=404, detail="Task not found")

    else:
        from database.operations_dashboard import update_task as update_task_legacy

        task_dict = task.model_dump(exclude_unset=True)
        return update_task_legacy(task_id, **task_dict)


@router.post("/dashboard/tasks/{task_id}/complete", response_model=TaskResponse)
async def mark_task_completed(
    task_id: int,
    user = Depends(require_auth),
):
    """
    Mark a task as completed.

    Sets the task status to completed and records completion timestamp.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        return await service.mark_task_completed(
            task_id=task_id,
            user_id=user["id"],
        )

    else:
        from database.operations_dashboard import mark_task_completed as mark_completed_legacy

        return mark_completed_legacy(task_id, user_id=user["id"])


@router.delete("/dashboard/tasks/{task_id}")
async def delete_task(
    task_id: int,
    user = Depends(require_auth),
):
    """
    Delete a task.

    Permanently deletes the specified task. User must own the task.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService
        from api.services.supabase_errors import ResourceNotFoundError

        try:
            service = DashboardService()
            success = await service.delete_task(
                task_id=task_id,
                user_id=user["id"],
            )

            if success:
                return {"status": "success", "message": "Task deleted"}
            else:
                raise HTTPException(status_code=404, detail="Task not found")

        except ResourceNotFoundError:
            raise HTTPException(status_code=404, detail="Task not found")

    else:
        from database.operations_dashboard import delete_task as delete_task_legacy

        success = delete_task_legacy(task_id, user_id=user["id"])

        if success:
            return {"status": "success", "message": "Task deleted"}
        else:
            raise HTTPException(status_code=404, detail="Task not found")


# ============================================
# NOTE ENDPOINTS
# ============================================

@router.get("/dashboard/notes")
async def get_my_notes(
    limit: int = Query(50, description="Max results"),
    offset: int = Query(0, description="Skip N results"),
    user = Depends(require_auth),
):
    """
    Get notes for the current user.

    Returns PKM notes with pagination.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        notes = await service.get_user_notes(
            user_id=user["id"],
            limit=limit,
            offset=offset,
        )

        return {"notes": notes, "total": len(notes)}

    else:
        from database.operations_pkm import get_user_notes

        notes = get_user_notes(
            user_id=user["id"],
            limit=limit,
            offset=offset,
        )

        return {"notes": notes, "total": len(notes)}


@router.get("/dashboard/notes/search")
async def search_notes(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, description="Max results"),
    user = Depends(require_auth),
):
    """
    Search notes by title or content.

    Returns notes matching the search query.
    """
    if FeatureFlags.USE_SUPABASE_DASHBOARD:
        from api.services.dashboard_service import DashboardService

        service = DashboardService()
        notes = await service.search_notes(
            user_id=user["id"],
            search_term=q,
            limit=limit,
        )

        return {"notes": notes, "total": len(notes)}

    else:
        from database.operations_pkm import search_notes

        notes = search_notes(
            user_id=user["id"],
            search_term=q,
            limit=limit,
        )

        return {"notes": notes, "total": len(notes)}
